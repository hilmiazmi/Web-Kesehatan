import { describe, expect, it } from "vitest";
import { ARTICLES, MCU_PACKAGES, PRIORITY_SERVICES, SPECIALTIES } from "@/data/home";
import { DOCTORS, DOCTORS_BY_SPECIALTY } from "@/data/doctors";
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

  it("tidak memuat nama dokter yang tidak ada di DOCTORS", () => {
    // Inilah penjaga supaya daftar beranda tidak pernah jadi daftar kedua.
    // Kalau suatu saat ada nama yang ditambahkan langsung ke
    // DOCTORS_BY_SPECIALTY tanpa diturunkan dari DOCTORS, tes ini gagal.
    const dikenal = new Set(DOCTORS.map((d) => d.name));
    const asing: string[] = [];
    for (const daftar of Object.values(DOCTORS_BY_SPECIALTY)) {
      for (const nama of daftar) if (!dikenal.has(nama)) asing.push(nama);
    }
    expect(asing).toEqual([]);
  });

  it("menutup semua dokter yang punya jadwal", () => {
    // Kalau ada dokter yang somehow tidak masuk ke mana pun, widget beranda
    // akan menampilkan spesialis itu tanpa dropdown padahal halamannya punya
    // dokter. Jumlahnya harus sama.
    const diWidget = new Set(Object.values(DOCTORS_BY_SPECIALTY).flat());
    const hilang = DOCTORS.filter((d) => !diWidget.has(d.name)).map((d) => d.slug);
    expect(hilang).toEqual([]);
  });

  it("menaruh setiap dokter di bawah spesialisnya sendiri", () => {
    for (const dokter of DOCTORS) {
      const daftar = DOCTORS_BY_SPECIALTY[dokter.specialty] ?? [];
      expect(daftar, dokter.slug).toContain(dokter.name);
    }
  });
});