import { describe, expect, it } from "vitest";
import {
  ARTICLES,
  DOCTORS_BY_SPECIALTY,
  MCU_PACKAGES,
  PRIORITY_SERVICES,
  SPECIALTIES,
} from "@/data/home";
import { NEWS_PHOTOS, photo } from "@/data/images";

/**
 * Bentuk data konten.
 *
 * Halaman detail membaca properti-properti ini. Kalau ada yang hilang atau slug
 * bentrok, halaman gagal saat build dan tidak ketahuan sampai saat itu.
 */

describe("slug unik", () => {
  const kelompok = [
    ["ARTICLES", ARTICLES],
    ["PRIORITY_SERVICES", PRIORITY_SERVICES],
    ["MCU_PACKAGES", MCU_PACKAGES],
  ] as const;

  for (const [nama, daftar] of kelompok) {
    it(`${nama} punya slug yang unik dan berbentuk URL`, () => {
      const slug = daftar.map((d) => d.slug);
      expect(new Set(slug).size).toBe(slug.length);

      for (const s of slug) {
        expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(s).not.toMatch(/^-|-$/);
      }
    });
  }
});

describe("field wajib", () => {
  it("setiap berita punya tanggal yang bisa diformat", () => {
    for (const a of ARTICLES) {
      expect(a.title.trim()).not.toBe("");
      expect(a.excerpt.trim()).not.toBe("");
      expect(new Date(a.date).toString()).not.toBe("Invalid Date");
    }
  });

  it("setiap layanan prioritas punya judul dan deskripsi", () => {
    for (const s of PRIORITY_SERVICES) {
      expect(s.title.trim()).not.toBe("");
      expect(s.description.trim()).not.toBe("");
    }
  });

  it("setiap paket MCU punya harga dan rincian yang tidak kosong", () => {
    for (const p of MCU_PACKAGES) {
      expect(p.title.trim()).not.toBe("");
      expect(Number.isFinite(p.price)).toBe(true);
      expect(p.price).toBeGreaterThan(0);
      expect(Array.isArray(p.items)).toBe(true);
      expect(p.items.length).toBeGreaterThan(0);
    }
  });
});

describe("foto berita", () => {
  it("menyimpan id foto Unsplash, bukan URL lengkap", () => {
    // URL dibangun oleh helper photo() supaya ukuran dan mutu bisa diatur di
    // satu tempat. Kalau sebuah entri sudah berupa URL, pemanggilnya akan
    // salah merangkai.
    expect(NEWS_PHOTOS.length).toBeGreaterThan(0);
    for (const id of NEWS_PHOTOS) {
      expect(id.startsWith("http")).toBe(false);
      expect(id).toMatch(/^photo-[a-z0-9-]+$/);
    }
  });

  it("helper photo() menghasilkan URL Unsplash yang sah", () => {
    const url = photo(NEWS_PHOTOS[0], 640, 360);
    expect(url.startsWith("https://images.unsplash.com/")).toBe(true);
    expect(url).toContain("w=640");
    expect(url).toContain("h=360");
  });
});

describe("dokter per spesialisasi", () => {
  it("daftar dokter tidak pernah kosong untuk kunci yang ada", () => {
    for (const [nama, daftar] of Object.entries(DOCTORS_BY_SPECIALTY)) {
      expect(daftar.length, `spesialisasi ${nama}`).toBeGreaterThan(0);
      for (const d of daftar) expect(d.trim()).not.toBe("");
    }
  });

  it("semua kunci daftar dokter adalah spesialisasi yang memang bisa dipilih", () => {
    const pilihan = new Set<string>(SPECIALTIES);
    const asing = Object.keys(DOCTORS_BY_SPECIALTY).filter((k) => !pilihan.has(k));
    expect(asing).toEqual([]);
  });

  it("mendeteksi bakal masalah: banyak spesialisasi tanpa daftar dokter", () => {
    // Bukan kegagalan, tapi penanda yang harus diketahui. DoctorSearchCard
    // sudah menampilkan "Data dokter belum tersedia" untuk kasus ini; kalau
    // suatu saat daftar dokternya dilengkapi, angka ini akan turun dan
    // pengingat ini bisa dihapus.
    const tanpa = SPECIALTIES.filter((s) => !DOCTORS_BY_SPECIALTY[s]);
    expect(tanpa.length).toBeGreaterThan(0);
  });
});