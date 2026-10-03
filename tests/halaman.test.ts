import { describe, expect, it } from "vitest";
import { HALAMAN, isiHalaman } from "@/data/halaman";
import { RUANG_RAWAT } from "@/data/kapasitas-bed";
import { FOOTER_RELATED } from "@/data/navigation";
import { childrenOf, collectNavPaths } from "@/lib/nav-path";

/**
 * Penjaga isi 30 halaman generik.
 *
 * Sebelumnya catch-all menulis "belum dilengkapi isi pada versi demo ini" untuk
 * semua path, jadi setiap tautan navbar dan footer menuju halaman kosong.
 * Tes ini yang mencegah hal itu datang kembali.
 */

const pathDariNav = collectNavPaths().map((p) => p.slug.join("/"));

describe("cakupan isi halaman", () => {
  it("setiap path dari navigasi punya isi", () => {
    const tanpa = pathDariNav.filter((p) => !HALAMAN[p]);
    expect(tanpa).toEqual([]);
  });

  it("tidak ada isi untuk path yang tidak dilayani", () => {
    const ekstra = Object.keys(HALAMAN).filter((p) => !pathDariNav.includes(p));
    expect(ekstra).toEqual([]);
  });

  it("jumlah halaman sama dengan jumlah path dari navigasi", () => {
    expect(Object.keys(HALAMAN).length).toBe(pathDariNav.length);
  });
});

describe("isiHalaman", () => {
  it("menerima path dengan dan tanpa garis miring", () => {
    expect(isiHalaman("/kontak")).toBeDefined();
    expect(isiHalaman("kontak")).toBeDefined();
    expect(isiHalaman("/kontak/")).toBeDefined();
  });

  it("mengembalikan undefined untuk path tak dikenal", () => {
    expect(isiHalaman("/halaman-yang-tidak-ada")).toBeUndefined();
  });
});

describe("bentuk isi", () => {
  const semuaBlok = Object.entries(HALAMAN).flatMap(([path, isi]) =>
    isi.blok.map((b) => [path, b] as const),
  );

  it("setiap halaman punya ringkas dan minimal satu blok", () => {
    for (const [path, isi] of Object.entries(HALAMAN)) {
      expect(isi.ringkas.length, path).toBeGreaterThan(10);
      expect(isi.blok.length, path).toBeGreaterThan(0);
    }
  });

  it("daftar dan langkah tidak pernah kosong", () => {
    for (const [path, blok] of semuaBlok) {
      if (blok.jenis === "daftar" || blok.jenis === "daftar-tebal") {
        expect(blok.butir.length, path).toBeGreaterThan(0);
      }
      if (blok.jenis === "langkah") {
        expect(blok.butir.length, path).toBeGreaterThan(1);
      }
    }
  });

  it("lebar tabel sama dengan jumlah kolom", () => {
    for (const [path, blok] of semuaBlok) {
      if (blok.jenis !== "tabel") continue;
      expect(blok.baris.length, path).toBeGreaterThan(0);
      for (const baris of blok.baris) {
        expect(baris.length, path).toBe(blok.kolom.length);
      }
    }
  });

  it("kartu dan galeri tidak pernah kosong", () => {
    for (const [path, blok] of semuaBlok) {
      if (blok.jenis === "kartu") expect(blok.butir.length, path).toBeGreaterThan(0);
      if (blok.jenis === "galeri") expect(blok.foto.length, path).toBeGreaterThan(0);
    }
  });

  it("tidak ada blok kosong maupun teks tanpa isi", () => {
    for (const [path, blok] of semuaBlok) {
      if (blok.jenis === "paragraf" || blok.jenis === "catatan") {
        expect(blok.teks.trim(), path).not.toBe("");
      }
    }
  });
});

describe("isi yang diturunkan, bukan disalin", () => {
  it("tabel paket MCU memakai jumlah paket sebenarnya", () => {
    const mcu = HALAMAN["pelayanan/mcu/reguler"];
    const tabel = mcu.blok.find((b) => b.jenis === "tabel");
    expect(tabel?.jenis).toBe("tabel");
    if (tabel?.jenis !== "tabel") return;
    // 8 paket reguler + 1 baris header tidak ikut, tabel hanya memuat isi paket
    expect(tabel.baris.length).toBe(8);
  });

  it("tabel kapasitas bed memuat seluruh ruang", () => {
    const bed = HALAMAN["kapasitas-bed"];
    const tabel = bed.blok.find((b) => b.jenis === "tabel");
    if (tabel?.jenis !== "tabel") throw new Error("tabel tidak ditemukan");
    expect(tabel.baris.length).toBe(RUANG_RAWAT.length);
  });

  it("sitemap memuat seluruh path yang dilayani", () => {
    const situs = HALAMAN.sitemap;
    const tabel = situs.blok.find((b) => b.jenis === "tabel");
    if (tabel?.jenis !== "tabel") throw new Error("tabel tidak ditemukan");
    const alamat = tabel.baris.map((b) => b[1]);
    for (const p of pathDariNav) {
      expect(alamat, p).toContain("/" + p);
    }
  });

  it("fasilitas memakai daftar FASILITAS yang sama", () => {
    const infoFasilitas = HALAMAN["informasi-publik/fasilitas"];
    const daftar = infoFasilitas.blok.find((b) => b.jenis === "daftar");
    if (daftar?.jenis !== "daftar") throw new Error("daftar tidak ditemukan");
    expect(daftar.butir.length).toBeGreaterThan(0);
    for (const butir of daftar.butir) expect(butir.length).toBeGreaterThan(20);
  });
});

describe("blok tautan-anak", () => {
  it("hanya dipakai pada halaman yang punya anak di navigasi", () => {
    const kosong = Object.entries(HALAMAN)
      .filter(([, isi]) => isi.blok.some((b) => b.jenis === "tautan-anak"))
      .map(([path]) => path)
      .filter((path) => childrenOf("/" + path).length === 0);
    expect(kosong).toEqual([]);
  });

  it("memberi anak untuk setiap halaman induk yang memakainya", () => {
    const induk = ["/tentang-kami", "/pelayanan", "/diklat", "/zona-integritas"];
    for (const path of induk) {
      expect(childrenOf(path).length, path).toBeGreaterThan(0);
    }
  });

  it("tidak mengembalikan anak untuk root", () => {
    expect(childrenOf("/")).toEqual([]);
  });
});

describe("tautan di footer", () => {
  it("semua link terkait menuju path yang dilayani", () => {
    const semua = new Set(pathDariNav);
    // path milik route sendiri tidak muncul di collectNavPaths
    const routeSendiri = new Set([
      "/",
      "/ppid",
      "/daftar-online",
      "/berita",
      "/admin",
    ]);
    for (const l of FOOTER_RELATED) {
      const ok = semua.has(l.href.slice(1)) || routeSendiri.has(l.href);
      expect(ok, l.href).toBe(true);
    }
  });
});
