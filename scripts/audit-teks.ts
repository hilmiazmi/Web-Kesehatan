/**
 * Buang karakter asing yang tidak disengaja dari berkas sumber.
 *
 * Alat tulis kadang menyisipkan karakter dari aksara lain ke dalam prosa
 * Indonesia, termasuk di dalam nama variabel dan komentar. Karakter itu lolos
 * pemeriksaan mata dan lolos kompilasi, tapi membuat kode salah baca dan
 * merusak hasil audit audit karakter.
 *
 * Karakter yang memang disengaja tetap dipertahankan: tanda hubung panjang,
 * panah, perkalian, dan simbol lain yang lazim dipakai di komentar. Sisanya
 * dibuang, dan setiap pembuangan dicetak supaya bisa diperiksa.
 *
 * Jalankan sebagai skrip: `bun run audit:bersih -- --terapkan`
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

/** Karakter yang lazim dipakai dan sengaja ada di prosa. */
const JAGA = new Set([
  "–", // tanda hubung panjang
  "—", // em dash
  "…", // elipsis
  "×", // kali
  "≥", // lebih besar sama dengan
  "≤", // lebih kecil sama dengan
  "→", // panah
  "°", // derajat
  "±", // lebih kurang
  "·", // titik tengah
]);

/** Kategori Unicode yang aman: simbol,Modifier-symbol, dan operator. */
const KATEGORI_AMAN = new Set(["So", "Sm", "Sk"]);

type Temuan = { berkas: string; baris: number; kode: number; nama: string };

const temuan: Temuan[] = [];

export function auditTeks(berkas: string, teks: string): string {
  const hasil: string[] = [];

  teks.split("\n").forEach((baris, indeks) => {
    for (const huruf of baris) {
      const kode = huruf.codePointAt(0)!;

      if (kode < 128 || JAGA.has(huruf) || KATEGORI_AMAN.has(kategori(huruf))) continue;

      temuan.push({ berkas, baris: indeks + 1, kode, nama: nama(huruf) });
    }
    hasil.push(baris);
  });

  return hasil.join("\n");
}

function kategori(huruf: string): string {
  const kode = huruf.codePointAt(0)!;
  if (kode >= 0x0300 && kode <= 0x036f) return "Mn";
  // Alfabet Latin dan huruf tambahan tidak diterima di sini.
  return kategoriTabel(kode);
}

/** Tabel kategori yang disederhanakan, cukup untuk penyaringan. */
function kategoriTabel(kode: number): string {
  if (kode >= 0x2000 && kode <= 0x2bff) return "So"; // Operator dan simbol
  if (kode >= 0x1f000 && kode <= 0x1faff) return "So"; // Emoji
  return "L"; // Semua huruf dan angka lain dianggap mencurigakan.
}

function nama(huruf: string): string {
  const blok = (huruf.codePointAt(0)! >> 8) & 0xff;
  return `blok-U+${blok.toString(16).toUpperCase().padStart(2, "0")}`;
}

/**
 * Folder yang tidak boleh dibaca.
 *
 * Dipisah jadi konstanta, bukan ditulis inline di dalam `if`, supaya
 * `tests/audit-docs.test.ts` bisa mengunci isinya. Nilainya pernah memuat
 * `docs`, dan akibatnya karakter asing bisa menetap di dokumen selama berbulan-bulan
 * tanpa ada yang salah.
 */
const DILEWATI = new Set(["node_modules", ".next", ".git", "archive"]);

/**
 * Berkas yang isinya milik pemilik repo dan tidak boleh diubah.
 *
 * PRD memakai U+FE0F pada tanda centangnya. Selector itu membuat emoji tampil
 * berwarna di editor tertentu dan disengaja di sana, jadi menghapusnya berarti
 * mengubah berkas milik orang lain demi supaya audit sendiri terlihat bersih.
 */
const BERKAS_PEMILIK = ["prd-web-rumah-sakit.md", "contoh_prd.md"];

async function kumpulkan(direktori: string): Promise<string[]> {
  const isi = await readdir(direktori, { withFileTypes: true });
  const berkas: string[] = [];

  for (const entri of isi) {
    const penuh = join(direktori, entri.name);

    if (entri.isDirectory()) {
      if (DILEWATI.has(entri.name)) continue;
      berkas.push(...(await kumpulkan(penuh)));
      continue;
    }

    // PRD milik pemilik repo tidak boleh disentuh, dan tanda centangnya memakai
    // U+FE0F yang memang disengaja. Menghapus selector itu mengubah berkas yang
    // bukan milik kita, jadi kedua PRD dikecualikan, bukan folder `docs/`.
    if (BERKAS_PEMILIK.includes(entri.name)) continue;

    if (/\.(ts|tsx|js|mjs|css|md|json|sql)$/.test(entri.name)) berkas.push(penuh);
  }

  return berkas;
}

const akar = process.cwd();
const terapkan = process.argv.includes("--terapkan");
const target = process.argv.find((a) => a.startsWith("--jamak="))?.slice(7);

const daftar = target
  ? [target]
  : [
      ...(await kumpulkan(join(akar, "src"))),
      ...(await kumpulkan(join(akar, "scripts"))),
      ...(await kumpulkan(join(akar, "tests"))),
      ...(await kumpulkan(join(akar, "drizzle"))),
      ...(await kumpulkan(join(akar, "docs"))),
    ];

for (const berkas of daftar) {
  const asli = await readFile(berkas, "utf8");
  const bersih = auditTeks(relative(akar, berkas), asli);
  if (terapkan && bersih !== asli) await writeFile(berkas, bersih, "utf8");
}

if (temuan.length === 0) {
  console.log(`BERSIH (${daftar.length} berkas)`);
} else {
  for (const t of temuan) {
    console.log(`${t.berkas}:${t.baris}  U+${t.kode.toString(16).toUpperCase().padStart(4, "0")} (${t.nama})`);
  }
  console.log(`--- ${temuan.length} karakter mencurigakan`);
  if (!terapkan) console.log("jalankan ulang dengan --terapkan untuk membersihkannya");
}