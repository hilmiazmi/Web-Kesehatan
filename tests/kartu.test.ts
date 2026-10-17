import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bentuk kartu dikunci lewat CSS, bukan lewat hasil render.
 *
 * Satu aturan pernah merusak beberapa halaman tanpa membuat tes lain gagal:
 * `.card` punya `height: 100%`. Aturan itu benar untuk kartu-kartu berita yang
 * duduk satu baris dan harus sama tinggi, tapi kartu juga dipakai sendirian
 * di dalam kolom yang isinya lebih panjang.
 *
 * Persentase terhadap tinggi induk yang kontennya ikut dipengaruhi kartu
 * sendiri itu lingkaran, dan browser menyelesaikannya dengan memakai tinggi
 * kolom. Di `/kontak` kartu formulir jadi setinggi seluruh kolom: isinya 494
 * piksel, kotaknya 1313, dan ada kotak putih kosong sepanjang 800 piksel di
 * bawah tombol kirim. Terukur di Chromium 1243 pada 8 Oktober 2026.
 *
 * Tinggi sama di dalam baris kartu tetap terjaga oleh `align-items: stretch`
 * milik wadah flex-nya, jadi menghapus aturan ini tidak merusak baris kartu.
 */

const akar = path.resolve(import.meta.dirname, "..");

/** CSS tanpa komentar, supaya pencarian tidak tersangkut di dalam penjelasan. */
const siteCss = readFileSync(path.join(akar, "src/styles/site.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Isi blok untuk selector itu, atau `null` kalau selector-nya tidak ada. */
function blok(selector: string): string | null {
  const pola = new RegExp(
    `(^|[},])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    "m",
  );
  return pola.exec(siteCss)?.[2] ?? null;
}

describe("kartu umum", () => {
  it("tidak memakai tinggi persen yang membentuk lingkaran", () => {
    const isi = blok(".card");
    expect(isi, "blok .card tidak ditemukan di site.css").not.toBeNull();
    // Rule ini tetap boleh ada di tempat lain, misalnya `.photo-box img`.
    // Yang diperiksa hanya blok kartunya.
    expect(isi).not.toMatch(/height\s*:\s*100%/);
  });

  it("tetap jadi wadah flex kolom", () => {
    // `.card-description { flex-grow: 1 }` bergantung pada kartu yang menjadi
    // wadah flex kolom. Menghapus `height: 100%` tidak boleh ikut mengubah
    // susunan di dalamnya.
    const isi = blok(".card");
    expect(isi).toMatch(/display\s*:\s*flex/);
    expect(isi).toMatch(/flex-direction\s*:\s*column/);
  });

  it("kartu di dalam baris tetap sama tinggi karena wadah flexnya", () => {
    // Tinggi sama tidak datang dari kartu, tapi dari sifat bawaan flex: item
    // meregang mengikuti tinggi silang wadah. Cek ini menjaga bahwa
    // perataannya dibiarkan apa adanya.
    const isi = blok(".card");
    expect(isi).not.toMatch(/align-self\s*:\s*flex-start/);
  });
});
