import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Penjaga nilai warna theme-color.
 *
 * Nilai itu ada di dua tempat: token `--rs-accent-theme-color` di
 * `tokens.css` dan export `viewport` di `src/app/layout.tsx`. Keduanya
 * menyatakan hal yang sama, jadi tidak boleh berbeda.
 *
 * `layout.tsx` dibaca sebagai teks, bukan diimpor. Mengimpornya menarik
 * `next/font/google`, yang butuh berkas font dan tidak bisa jalan di
 * lingkungan tes tanpa jaringan. Membaca berkas sumber juga secara tidak
 * sengaja membuat tes ini tidak bergantung pada hasil build.
 *
 * Bukti bahwa tag-nya benar-benar muncul di HTML hasil build tidak bisa
 * didapat dari sini, karena `viewport` hanya dibaca Next.js saat build.
 */

const AKAR = path.resolve(import.meta.dirname, "..");

/**
 * Nilai theme-color yang ditulis di `layout.tsx`.
 *
 * Pola yang dicari persis seperti yang ditulis di sana, termasuk spasi
 * setelah titik dua. Kalau ada yang menulisnya dengan gaya lain, tes ini
 * gagal dengan pesan yang menyebut berkasnya, bukan diam-diam lolos.
 */
function metaThemeColor(): string {
  const isi = readFileSync(path.join(AKAR, "src/app/layout.tsx"), "utf8");
  const cocok = isi.match(/themeColor:\s*"(#[0-9a-fA-F]{3,8})"/);
  if (!cocok) {
    throw new Error("themeColor tidak ditemukan di src/app/layout.tsx");
  }
  return cocok[1].toLowerCase();
}

/** Nilai token theme-color di `tokens.css`. */
function tokenThemeColor(): string {
  const css = readFileSync(path.join(AKAR, "src/styles/tokens.css"), "utf8");
  const cocok = css.match(/--rs-accent-theme-color:\s*(#[0-9a-fA-F]{3,8})/);
  if (!cocok) {
    throw new Error("token --rs-accent-theme-color tidak ada di tokens.css");
  }
  return cocok[1].toLowerCase();
}

describe("warna theme-color", () => {
  it("nilainya warna theme-color yang diukur, bukan warna aksen", () => {
    // PRD bagian 8.2 menyebut `#1A77CC` sebagai nilai theme-color pada
    // meta situs referensi. `--rs-accent` yang `#1977cc` bukan
    // kandidat di sini: itu warna tombol, latar, dan garis.
    expect(metaThemeColor()).toBe("#1a77cc");
  });

  it("token CSS dan meta tidak berbeda", () => {
    expect(tokenThemeColor()).toBe(metaThemeColor());
  });
});
