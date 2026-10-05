import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Cakupan `scripts/audit-teks.ts`.
 *
 * Skrip ini satu-satunya penjaga teks rusak yang berjalan otomatis. `AGENTS.md`
 * mencatat bahwa menulis ke berkas kadang menghasilkan karakter asing, jadi
 * selama penjaga itu tidak memanggilnya, tidak ada yang menangkap.
 *
 * Dua kelas kesalahan yang kalau lolos tidak terlihat dari mata:
 *
 * 1. Folder `docs` pernah dikecualikan dari penelusuran. Akibatnya
 *    `docs/design-tokens-terverifikasi.md` sampai memuat karakter Korea di
 *    dalam kalimat biasa, dan tidak ada yang salah selama berbulan-bulan.
 *    Folder lain semua sudah diperiksa, jadi yang bocor hanya satu.
 * 2. Pengecualian melebar tanpa alasan. Kalau `docs` masuk lagi ke daftar yang
 *    dilewati, atau isi `BERKAS_PEMILIK` berubah, penjaganya hilang tanpa ada
 *    yang memberi tahu.
 *
 * PRD dikecualikan berdasarkan nama berkas, bukan lewat folder. Alasannya tanda
 * centangnya memakai U+FE0F yang disengaja, dan PRD adalah berkas pemilik repo.
 */

const sumber = readFileSync(new URL("../scripts/audit-teks.ts", import.meta.url), "utf8");

describe("audit-teks tidak boleh mempersempit cakupannya", () => {
  it("folder docs ikut ditelusuri", () => {
    expect(sumber).toContain('kumpulkan(join(akar, "docs"))');
  });

  it("folder yang dilewati tetap empat, dan docs bukan salah satunya", () => {
    const blok = /const DILEWATI = new Set\(\[([^\]]*)\]\)/.exec(sumber);
    expect(blok, "konstante DILEWATI tidak ditemukan").not.toBeNull();

    const namaFolder = (blok?.[1] ?? "").match(/"[^"]+"/g) ?? [];
    for (const nama of ["node_modules", ".next", ".git", "archive"]) {
      expect(namaFolder, nama).toContain(`"${nama}"`);
    }
    expect(namaFolder).not.toContain('"docs"');
  });

  it("PRD dikecualikan berdasarkan nama berkas", () => {
    expect(sumber).toContain("prd-web-rumah-sakit.md");
    expect(sumber).toContain("contoh_prd.md");
    expect(sumber).toContain("BERKAS_PEMILIK.includes");
  });

  it("berkas lain di docs tidak dikecualikan", () => {
    for (const nama of ["roadmap.md", "catatan-teknis.md", "design-tokens-terverifikasi.md"]) {
      expect(sumber, nama).not.toContain(`"${nama}"`);
    }
  });
});
