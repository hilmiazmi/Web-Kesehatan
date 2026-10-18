import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KATEGORI_MCU, namaDokter, slugifyDokter } from "@/lib/content-loader";

/**
 * Pemetaan dokter dari database ke bentuk halaman publik.
 *
 * Dua fungsi murni di sini lahir dari pemeriksaan terhadap PostgreSQL sungguhan,
 * dan keduanya salah sebelum diperbaiki. Tes ini mengunci perbaikannya.
 *
 * Bentuk baris yang jadi acuan ada di `registry.ts`, dan itu yang menentukan
 * arti tiap kolom:
 *
 * - `text("full_name", "Nama lengkap")`, jadi isinya nama tanpa gelar.
 * - `text("title", "Gelar")`, jadi isinya gelar di depan nama.
 *
 * Data seed memperkuat itu: `full_name` = "Ayu Lestari", `title` = "dr. Sp.JK".
 */

describe("namaDokter", () => {
  it("menaruh gelar di depan nama dan spesialisasi di belakang", () => {
    // Bentuk ini yang dipakai seluruh repo untuk nama dokter, misalnya
    // "dr. Annisa Rahma, Sp.A" di src/data/doctors.ts.
    expect(namaDokter("dr. Sp.JK", "Ayu Lestari")).toBe(
      "dr. Ayu Lestari, Sp.JK",
    );
  });

  it("memisahkan gelar depan dari penanda spesialis", () => {
    // Satu kolom `title` memuat keduanya: "dr." untuk depan, "Sp.JK" untuk
    // belakang. Keduanya harus berpindah tempat, bukan dipertahankan berurutan.
    expect(namaDokter("dr. Sp.JK", "Ayu Lestari")).toBe("dr. Ayu Lestari, Sp.JK");
    expect(namaDokter("dr. Sp.PD", "Citra Wulandari")).toBe("dr. Citra Wulandari, Sp.PD");
    expect(namaDokter("drg. Sp.BM", "Joko Santoso")).toBe("drg. Joko Santoso, Sp.BM");
  });

  it("tidak mengulang spesialisasi lengkap di nama", () => {
    // Spesialisasi lengkap sudah punya kolomnya sendiri di tabel jadwal.
    const hasil = namaDokter("dr. Sp.JK", "Ayu Lestari");
    expect(hasil).not.toContain("Jantung");
  });

  it("tetap benar kalau gelarnya hanya gelar depan", () => {
    expect(namaDokter("dr.", "Ayu Lestari")).toBe("dr. Ayu Lestari");
  });

  it("menangani gelar berlapis seperti Sp.PD-KHOM", () => {
    expect(namaDokter("dr. Sp.PD-KHOM", "Citra Wulandari")).toBe(
      "dr. Citra Wulandari, Sp.PD-KHOM",
    );
  });

  it("memakai nama saja kalau gelarnya kosong", () => {
    expect(namaDokter(null, "Ayu Lestari")).toBe("Ayu Lestari");
    expect(namaDokter("", "Ayu Lestari")).toBe("Ayu Lestari");
    expect(namaDokter("   ", "Ayu Lestari")).toBe("Ayu Lestari");
  });

  it("memakai nama saja kalau tidak ada gelar dan tidak ada spesialisasi", () => {
    expect(namaDokter(null, "Joko Santoso")).toBe("Joko Santoso");
  });

  it("membuang spasi berlebih di ujung gelar dan nama", () => {
    expect(namaDokter("  dr.  ", "  Ayu Lestari  ")).toBe("dr. Ayu Lestari");
  });

  it("tidak pernah menjadikan gelar sebagai nama depan", () => {
    // Kesalahan yang pernah ada: `${title} ${full_name}` menghasilkan
    // "dr. Sp.JK Ayu Lestari", jadi gelar spesialis terbaca seperti nama depan.
    const hasil = namaDokter("dr. Sp.JK", "Ayu Lestari");
    expect(hasil.startsWith("Ayu")).toBe(false);
    expect(hasil).toContain("Ayu Lestari");
  });
});

describe("slugifyDokter", () => {
  it("membuat slug berbentuk URL dari nama", () => {
    expect(slugifyDokter("Ayu Lestari")).toBe("ayu-lestari");
  });

  it("menghasilkan slug yang cocok dengan pola slug repo lain", () => {
    for (const nama of ["Ayu Lestari", "Joko Santoso", "Indah Safitri", "Nining Rahmawati"]) {
      expect(slugifyDokter(nama), nama).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("tidak menghasilkan garus hubung ganda atau di ujung", () => {
    for (const nama of ["Ayu  Lestari", " Ayu Lestari ", "Ayu - Lestari", "Ayu -- Lestari"]) {
      const s = slugifyDokter(nama);
      expect(s, nama).not.toMatch(/^-|-$|--/);
    }
  });

  it("dua dokter dengan nama berbeda tidak pernah dapat slug sama", () => {
    const nama = ["Ayu Lestari", "Joko Santoso", "Indah Safitri", "Nining Rahmawati"];
    const slug = nama.map(slugifyDokter);
    expect(new Set(slug).size).toBe(slug.length);
  });
});

describe("KATEGORI_MCU", () => {
  /**
   * Nama kategori di halaman pengunjung berbeda dari nilai kolom di database.
   *
   * `registry.ts` menawarkan `choice("category", "Kategori", ["reguler",
   * "health_meets_holiday"])`, sedangkan halaman publik memakai kata "holiday".
   * Selama pemetaan ini tidak ada, kategori holiday dikirim apa adanya ke SQL,
   * tidak ada baris yang cocok, dan halaman hari raya diam-diam selalu
   * menampilkan data statis: tidak ada galat, tidak ada peringatan, hanya isi
   * yang tidak pernah berubah.
   */
  it("memetakan holiday ke nilai yang dipakai database", () => {
    expect(KATEGORI_MCU.holiday).toBe("health_meets_holiday");
  });

  it("reguler tidak perlu diubah", () => {
    expect(KATEGORI_MCU.reguler).toBe("reguler");
  });

  it("semua nilai cocok dengan daftar pilihan di registry admin", () => {
    const registry = readFileSync(
      new URL("../src/server/admin/registry.ts", import.meta.url),
      "utf8",
    );

    for (const nilai of Object.values(KATEGORI_MCU)) {
      expect(registry, nilai).toContain(`"${nilai}"`);
    }
  });
});
