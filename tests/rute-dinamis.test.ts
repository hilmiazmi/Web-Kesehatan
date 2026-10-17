import { describe, expect, it } from "vitest";
import {
  entriDinamisDariManifest,
  halamanBayangan,
  ruteDinamisUntuk,
  type EntriRuteDinamis,
} from "@/lib/nav-path";

/**
 * Golongan tautan untuk `scripts/cek-tautan.ts`.
 *
 * Dua fungsi murni di sini memutuskan apakah sebuah tautan tanpa HTML hasil
 * prerender boleh dianggap hidup. Aturannya ada tiga, dan ketiganya diuji
 * karena salah satu saja cukup untuk membuat gerbang berbohong:
 *
 * 1. `blocking: true` berarti slug yang tidak di-prerender dirender saat
 *    diminta. Tanpa pembedaan ini, 20 tautan berita dari database dilaporkan
 *    mati padahal semuanya menjawab 200.
 * 2. `fallback: false` berarti hanya slug hasil `generateStaticParams` yang
 *    hidup. Menyamakannya dengan blocking membuat tautan ke
 *    `/ppid/slug-asing` lolos diam-diam.
 * 3. Cocok pola belum membuktikan slugnya hidup. `/berita/tidak-ada` cocok
 *    polanya tapi dijawab 404, jadi pemanggil wajib verifikasi runtime.
 */

const BERITA: EntriRuteDinamis = {
  route: "/berita/[slug]",
  regex: "^/berita/([^/]+?)(?:/)?$",
  blocking: true,
};

const PPID: EntriRuteDinamis = {
  route: "/ppid/[slug]",
  regex: "^/ppid/([^/]+?)(?:/)?$",
  blocking: false,
};

function manifest(...entri: { fallback: unknown; routeRegex?: unknown }[]): unknown {
  const dynamicRoutes: Record<string, unknown> = {};
  entri.forEach((e, i) => {
    dynamicRoutes[`/rute-${i}/[slug]`] = e;
  });
  return { dynamicRoutes };
}

describe("entriDinamisDariManifest", () => {
  it("membaca blocking dari tiga bentuk fallback", () => {
    const hasil = entriDinamisDariManifest(
      manifest(
        { fallback: null, routeRegex: "^/a/([^/]+?)$" },
        { fallback: "blocking", routeRegex: "^/b/([^/]+?)$" },
        { fallback: true, routeRegex: "^/c/([^/]+?)$" },
        { fallback: false, routeRegex: "^/d/([^/]+?)$" },
      ),
    );

    expect(hasil.map((e) => e.blocking)).toEqual([true, true, true, false]);
  });

  it("fallback yang tidak dikenal berarti tidak blocking", () => {
    const hasil = entriDinamisDariManifest(
      manifest({ fallback: "entah", routeRegex: "^/a/([^/]+?)$" }),
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].blocking).toBe(false);
  });

  it("melewati entri tanpa routeRegex", () => {
    expect(entriDinamisDariManifest(manifest({ fallback: null }))).toEqual([]);
    expect(
      entriDinamisDariManifest(manifest({ fallback: null, routeRegex: "" })),
    ).toEqual([]);
    expect(
      entriDinamisDariManifest(
        manifest({ fallback: null, routeRegex: 42 as unknown }),
      ),
    ).toEqual([]);
  });

  it("manifest rusak memberi array kosong, bukan galat", () => {
    for (const buruk of [null, 42, "teks", [], {}, { dynamicRoutes: null }]) {
      expect(entriDinamisDariManifest(buruk)).toEqual([]);
    }
  });
});

describe("ruteDinamisUntuk", () => {
  it("mengembalikan pola rute yang cocok dan blocking", () => {
    expect(ruteDinamisUntuk("/berita/jam-layanan", [BERITA, PPID])).toBe(
      "/berita/[slug]",
    );
  });

  it("mengabaikan entri yang tidak blocking", () => {
    expect(ruteDinamisUntuk("/ppid/cari-informasi", [BERITA, PPID])).toBeNull();
  });

  it("mengembalikan null kalau tidak ada pola yang cocok", () => {
    expect(ruteDinamisUntuk("/jadwal-dokter", [BERITA, PPID])).toBeNull();
    expect(ruteDinamisUntuk("/berita", [BERITA, PPID])).toBeNull();
    expect(ruteDinamisUntuk("/", [BERITA, PPID])).toBeNull();
  });

  it("garis miring di akhir tetap cocok seperti perilaku Next", () => {
    expect(ruteDinamisUntuk("/berita/jam-layanan/", [BERITA])).toBe(
      "/berita/[slug]",
    );
  });

  it("regex rusak dilewati tanpa menggagalkan entri lain", () => {
    const rusak: EntriRuteDinamis = {
      route: "/rusak/[slug]",
      regex: "([tidak-valid",
      blocking: true,
    };

    expect(ruteDinamisUntuk("/berita/jam-layanan", [rusak, BERITA])).toBe(
      "/berita/[slug]",
    );
    expect(ruteDinamisUntuk("/rusak/apa-saja", [rusak])).toBeNull();
  });

  it("daftar kosong selalu null", () => {
    expect(ruteDinamisUntuk("/berita/apa-saja", [])).toBeNull();
  });
});

describe("halamanBayangan", () => {
  /**
   * Pilah halaman yatim menjadi bayangan fallback dan yatim betulan.
   *
   * Bayangan adalah halaman statis yang tidak ditautkan karena daftar isi
   * sudah digantikan konten database, misalnya 16 artikel statis saat mode
   * live. Tiga syaratnya kumulatif, dan setiap syarat ada tesnya sendiri di
   * bawah: bukti ada konten dinamis, URL tetap sah, dan URL tetap terindeks.
   * Tanpa ketiganya sekaligus, halaman itu yatim betulan.
   */
  const peta = new Set(["/berita/a-statis", "/berita/jam-layanan"]);

  it("tanpa bukti konten dinamis, semua yatim tetap yatim", () => {
    // Ini yang menjaga mode snapshot tetap ketat seperti dulu.
    expect(halamanBayangan(["/berita/a-statis"], peta, [BERITA], false)).toEqual([]);
  });

  it("yatim yang terindeks dan cocok pola adalah bayangan", () => {
    expect(halamanBayangan(["/berita/a-statis"], peta, [BERITA], true)).toEqual([
      "/berita/a-statis",
    ]);
  });

  it("yatim yang hilang dari sitemap bukan bayangan", () => {
    expect(
      halamanBayangan(["/berita/a-statis"], new Set<string>(), [BERITA], true),
    ).toEqual([]);
  });

  it("yatim yang polanya tidak blocking bukan bayangan", () => {
    const petaPpid = new Set(["/ppid/cari-informasi"]);
    expect(
      halamanBayangan(["/ppid/cari-informasi"], petaPpid, [BERITA, PPID], true),
    ).toEqual([]);
  });

  it("yatim yang tidak cocok pola mana pun bukan bayangan", () => {
    const petaLain = new Set(["/tentang-kami", ...peta]);
    expect(
      halamanBayangan(["/tentang-kami", "/berita/a-statis"], petaLain, [BERITA], true),
    ).toEqual(["/berita/a-statis"]);
  });

  it("daftar kosong memberi daftar kosong", () => {
    expect(halamanBayangan([], peta, [BERITA], true)).toEqual([]);
  });
});
