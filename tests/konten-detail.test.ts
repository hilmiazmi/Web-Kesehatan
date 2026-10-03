import { describe, expect, it } from "vitest";
import { CLINICS } from "@/data/clinics";
import { MANAGEMENT } from "@/data/manajemen";
import { PROFIL_MANAJEMEN } from "@/data/manajemen-profil";
import { DETAIL_CONTENT } from "@/data/detail-content";
import {
  ABOUT_SECTIONS,
  DIAGNOSTIC_SERVICES,
} from "@/data/informasi";
import { FACILITIES, PRIORITY_SERVICES } from "@/data/home";

/**
 * Bentuk data halaman detail.
 *
 * Halaman detail di bawah `/pelayanan` membaca `DETAIL_CONTENT` dengan kunci
 * berupa slug. Kalau ada slug yang tidak punya entri, halamannya masih
 * dirender tetapi isinya kosong; kalau ada kunci yang tidak dipakai, isinya
 * tidak akan pernah tampil. Keduanya lolos dari pemeriksaan tipe, jadi diuji
 * di sini.
 */

const slugFasilitas = FACILITIES.map((f) => f.slug);

function slugPrioritas(): string[] {
  return PRIORITY_SERVICES.map((p) => p.slug);
}

describe("DIRECTORY klinik", () => {
  it("memuat enam belas klinik", () => {
    expect(CLINICS).toHaveLength(16);
  });

  it("punya slug yang unik dan berbentuk URL", () => {
    const slug = CLINICS.map((c) => c.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("mengisi semua kolom yang dibaca ClinicDirectory", () => {
    for (const c of CLINICS) {
      expect(c.name.trim()).not.toBe("");
      expect(c.description.trim()).not.toBe("");
      expect(c.hours.trim()).not.toBe("");
      expect(c.services.length, `layanan ${c.slug}`).toBeGreaterThan(0);
      for (const s of c.services) expect(s.trim()).not.toBe("");
    }
  });
});

/**
 * Bentuk teks klinik yang sampai ke layar.
 *
 * `scripts/audit-teks.ts` menangkap karakter asing dan huruf kapital di tengah
 * kata, tapi tidak menangkap kelas yang paling sering merusak data klinik:
 * kata bahasa Inggris yang lolos karena memang huruf Latin (`Spirometry`,
 * `Biopsy`), `Terapi_family`, kalimat tanpa titik akhir, dan butir layanan
 * yang mengulang diri. Semuanya lolos pemeriksaan tipe dan audit teks, lalu
 * tampil apa adanya di halaman. Bentuknya deshalb diuji di sini.
 */
describe("teks klinik yang tampil di layar", () => {
  const deskripsi = CLINICS.flatMap((c) => [
    { asal: c.slug, teks: c.description },
    ...c.details.map((d) => ({ asal: d.slug, teks: d.description })),
  ]);
  const jam = CLINICS.flatMap((c) => [
    { asal: c.slug, teks: c.hours },
    ...c.details.map((d) => ({ asal: d.slug, teks: d.hours })),
  ]);
  const layanan = CLINICS.flatMap((c) => [
    ...c.services.map((s) => ({ asal: c.slug, teks: s })),
    ...c.details.flatMap((d) =>
      d.services.map((s) => ({ asal: d.slug, teks: s }))
    ),
  ]);

  it("tidak ada underscore di teks yang dirender", () => {
    const rusak = [...deskripsi, ...jam, ...layanan].filter((x) =>
      x.teks.includes("_")
    );
    expect(rusak.map((x) => `${x.asal}: ${x.teks}`)).toEqual([]);
  });

  it("deskripsi diakhiri titik", () => {
    const rusak = deskripsi.filter((x) => !x.teks.endsWith("."));
    expect(rusak.map((x) => `${x.asal}: ${x.teks}`)).toEqual([]);
  });

  it("jam praktik memakai pola 'Hari sampai Hari, 07.00 sampai 20.00'", () => {
    const pola = new RegExp(
      "^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu) sampai " +
        "(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), " +
        "[0-9]{2}[.][0-9]{2} sampai [0-9]{2}[.][0-9]{2}$"
    );
    const rusak = jam.filter((x) => !pola.test(x.teks));
    expect(rusak.map((x) => `${x.asal}: ${x.teks}`)).toEqual([]);
  });

  it("butir layanan tidak ada yang berulang dan tidak berujung titik", () => {
    for (const c of CLINICS) {
      expect(new Set(c.services).size, `tab ${c.slug}`).toBe(c.services.length);
      for (const d of c.details) {
        expect(new Set(d.services).size, `detail ${d.slug}`).toBe(
          d.services.length
        );
      }
    }
    const bertitik = layanan.filter((x) => x.teks.endsWith("."));
    expect(bertitik.map((x) => `${x.asal}: ${x.teks}`)).toEqual([]);
  });
});

describe("isi halaman detail", () => {
  const terpakai = [
    ...slugPrioritas(),
    ...slugFasilitas,
    ...DIAGNOSTIC_SERVICES.map((d) => d.slug),
  ];

  it("setiap slug punya isi", () => {
    const tanpa = terpakai.filter((s) => !DETAIL_CONTENT[s]);
    expect(tanpa).toEqual([]);
  });

  it("tidak ada isi yang tidak terpakai", () => {
    const dikenal = new Set<string>(terpakai);
    const yatim = Object.keys(DETAIL_CONTENT).filter((k) => !dikenal.has(k));
    expect(yatim).toEqual([]);
  });

  it("setiap isi punya butir yang tidak kosong", () => {
    for (const [slug, isi] of Object.entries(DETAIL_CONTENT)) {
      expect(isi.points.length, `butir ${slug}`).toBeGreaterThan(0);
      for (const p of isi.points) expect(p.trim(), `butir ${slug}`).not.toBe("");
    }
  });
});

describe("seksi profil", () => {
  it("memuat lima seksi sesuai urutan halaman acuan", () => {
    expect(ABOUT_SECTIONS.map((s) => s.title)).toEqual([
      "Visi dan Misi",
      "Budaya Kerja",
      "Company Profile",
      "Sejarah",
      "Maklumat Pelayanan",
    ]);
  });

  it("punya slug unik dan isi yang tidak kosong", () => {
    const slug = ABOUT_SECTIONS.map((s) => s.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of ABOUT_SECTIONS) {
      expect(s.lead.trim()).not.toBe("");
      expect(s.points.length, `butir ${s.slug}`).toBeGreaterThan(0);
    }
  });
});

describe("manajemen", () => {
  it("memuat delapan pimpinan dengan nama unik", () => {
    expect(MANAGEMENT).toHaveLength(8);
    const nama = MANAGEMENT.map((m) => m.name);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("mengisi nama, jabatan, dan ringkasan profil", () => {
    for (const m of MANAGEMENT) {
      expect(m.name.trim(), m.slug).not.toBe("");
      expect(m.role.trim(), m.slug).not.toBe("");
      expect(m.ringkas.length, m.slug).toBeGreaterThan(20);
    }
  });

  it("slug aman dipakai di URL dan tidak kembar", () => {
    const slug = MANAGEMENT.map((m) => m.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s, s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("setiap pimpinan punya profil, dan tidak ada profil tanpa pimpinan", () => {
    const punyaProfil = MANAGEMENT.map((m) => m.slug).filter(
      (s) => PROFIL_MANAJEMEN[s],
    );
    expect(punyaProfil).toEqual(MANAGEMENT.map((m) => m.slug));

    const slugAsing = Object.keys(PROFIL_MANAJEMEN).filter(
      (s) => !MANAGEMENT.some((m) => m.slug === s),
    );
    expect(slugAsing).toEqual([]);
  });

  it("tiap daftar di profil punya isi dan tidak kembar", () => {
    for (const [slug, profil] of Object.entries(PROFIL_MANAJEMEN)) {
      expect(profil.pendidikan.length, slug).toBeGreaterThan(0);
      expect(profil.riwayat.length, slug).toBeGreaterThan(0);
      expect(profil.fokus.length, slug).toBeGreaterThan(0);
      for (const daftar of [
        profil.pendidikan,
        profil.riwayat,
        profil.fokus,
      ]) {
        expect(new Set(daftar).size, slug).toBe(daftar.length);
        for (const butir of daftar) expect(butir.trim(), slug).not.toBe("");
      }
    }
  });
});

describe("layanan diagnostik", () => {
  it("memuat laboratorium dan radiologi", () => {
    expect(DIAGNOSTIC_SERVICES.map((d) => d.slug)).toEqual([
      "laboratorium",
      "radiologi",
    ]);
  });

  it("tiap layanan punya grup dan butir yang tidak kosong", () => {
    for (const d of DIAGNOSTIC_SERVICES) {
      expect(d.description.trim()).not.toBe("");
      expect(d.groups.length, `grup ${d.slug}`).toBeGreaterThan(0);
      for (const g of d.groups) {
        expect(g.name.trim()).not.toBe("");
        expect(g.points.length, `butir ${g.name}`).toBeGreaterThan(0);
      }
    }
  });
});
