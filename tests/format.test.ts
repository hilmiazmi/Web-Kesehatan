import { describe, expect, it } from "vitest";
import { formatDate, formatIDR, summarize } from "@/lib/format";

describe("formatDate", () => {
  it("menghasilkan tanggal Indonesia dengan nama bulan panjang", () => {
    expect(formatDate("2026-09-28")).toBe("28 September 2026");
  });

  it("tidak memakai nama bulan bahasa Inggris", () => {
    // "September" sama dalam kedua bahasa, jadi yang diperiksa bulan yang
    // benar-benar berbeda, yaitu Oktober.
    const hasil = formatDate("2026-10-02");
    expect(hasil).toContain("Oktober");
    expect(hasil).not.toContain("October");
  });

  it("memakai hari tanpa nol di depan", () => {
    expect(formatDate("2026-01-05")).toBe("5 Januari 2026");
  });
});

describe("formatIDR", () => {
  // Locale id-ID pada ICU memakai non-breaking space (U+00A0) antara "Rp"
  // dan angka, bukan space biasa. Fungsi bantu di bawah mengubahnya agar
  // perbandingan di bawah bisa ditulis normal.
  const normalisasiSpasi = (s: string) => s.replace(/\u00a0/g, " ");

  it("memakai awalan Rupiah dan pemisah ribuan titik", () => {
    expect(formatIDR(1150000)).toBe("Rp\u00a01.150.000");
  });

  it("tidak menyisakan desimal", () => {
    // maximumFractionDigits: 0 membuat 1.500,75 dibulatkan jadi 1.501.
    expect(formatIDR(1500.75)).toBe("Rp\u00a01.501");
  });

  it("memisahkan ribuan dengan titik, bukan koma", () => {
    expect(formatIDR(100000000)).toBe("Rp\u00a0100.000.000");
    expect(formatIDR(100000000)).not.toContain(",");
  });

  it("menangani nilai nol", () => {
    expect(formatIDR(0)).toBe("Rp\u00a00");
  });

  it("selalu diawali Rupiah dan diikuti angka", () => {
    for (const v of [0, 1500, 850000, 1150000, 100000000]) {
      expect(normalisasiSpasi(formatIDR(v))).toMatch(/^Rp [\d.]+$/);
    }
  });
});

describe("summarize", () => {
  it("memotong teks yang melebihi batas", () => {
    const panjang = "a".repeat(200);
    const hasil = summarize(panjang, 155);
    expect(hasil.length).toBeLessThanOrEqual(155);
    expect(hasil.endsWith("...")).toBe(true);
  });

  it("tidak mengubah teks yang sudah pendek", () => {
    expect(summarize("Pendek")).toBe("Pendek");
  });

  it("memangkas spasi di awal dan akhir sebelum menghitung", () => {
    expect(summarize("   Pendek   ")).toBe("Pendek");
  });

  it("menghormati batas kustom", () => {
    expect(summarize("abcdefghij", 5)).toBe("ab...");
  });
});