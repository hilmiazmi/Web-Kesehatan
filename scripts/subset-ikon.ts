/**
 * Hasilkan subset CSS dan font untuk ikon Bootstrap Icons.
 *
 * Yang ini ada karena pengukuran, bukan karena perkiraan. Situs memakai 73
 * ikon dari 2078 yang tersedia, tapi `bootstrap-icons.woff2` yang penanggung
 * jawabannya berukuran 131 KB dan dikirim apa adanya ke setiap halaman. Font
 * sudah dikompresi, jadi gzip tidak mengecilkan-nya sama sekali.
 *
 * Dua hasil yang dihasilkan skrip ini:
 *
 * - `src/styles/icons/bootstrap-icons.css` — hanya aturan `.bi-*` yang dipakai
 *   di `src/`, bukan 2078 aturan. CSS asli 97 KB, gzip 14 KB.
 * - `src/styles/icons/fonts/bootstrap-icons-subset.woff` — font yang hanya
 *   memuat glif untuk ikon yang dipakai: 176 KB menjadi sekitar 8 KB.
 *
 * Font WOFF1 dipakai sebagai sumber, bukan WOFF2, karena `pyftsubset` butuh
 * modul `brotli` untuk membaca maupun menulis woff2 dan modul itu tidak
 * terpasang di mesin ini. WOFF1 memakai zlib yang sudah jadi di Python, dan
 * peramban mendukungnya.
 *
 * Jalankan ulang setiap kali ada ikon baru:
 *
 *     bun run subset-ikon
 *
 * Hasilnya ikut dik-commit supaya build produksi tidak bergantung pada
 * pyftsubset yang hanya ada di mesin pengembangan.
 * `tests/subset-ikon.test.ts` mengunci bahwa berkas hasil selalu cocok dengan
 * ikon yang benar-benar dipakai.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const AKAR = process.cwd();
const PAKET = path.join(AKAR, "node_modules/bootstrap-icons/font");
const CSS_ASLI = path.join(PAKET, "bootstrap-icons.css");
const FONT_ASLI = path.join(PAKET, "fonts/bootstrap-icons.woff");
const KELUARAN = path.join(AKAR, "src/styles/icons");
const KELUARAN_FONT = path.join(KELUARAN, "fonts/bootstrap-icons-subset.woff");

/** Semua berkas `.ts` dan `.tsx` di bawah `src/`. */
function berkasSumber(dir: string, keluar: string[] = []): string[] {
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) berkasSumber(penuh, keluar);
    else if (entri.name.endsWith(".ts") || entri.name.endsWith(".tsx")) keluar.push(penuh);
  }
  return keluar;
}

/**
 * Semua kelas ikon yang benar-benar muncul di `src/`.
 *
 * Pola `\bbi-` dipakai supaya yang ikut terambil hanya kelas ikon, bukan kata
 * yang kebetulan memuat huruf yang sama di tengah. `class="bi bi-x-lg"` dan
 * `className={`bi ${nama}`}` sama-sama tertangkap.
 */
function ikonDipakai(): Set<string> {
  const pola = /\bbi-[a-z0-9-]+/g;
  const found = new Set<string>();
  for (const berkas of berkasSumber(path.join(AKAR, "src"))) {
    for (const cocok of readFileSync(berkas, "utf8").matchAll(pola)) found.add(cocok[0]);
  }
  return found;
}

/**
 * Peta nama ikon ke codepoint-nya.
 *
 * Nilai di CSS ditulis sebagai escape empat digit, misalnya `content: "\f145"`.
 * Itu angka heksadesimal penuh `0xF145`, bukan `0x145`: huruf `f` di sana bagian
 * dari nilainya. Salah baca dengan membuang `f` membuat seluruh subset kosong
 * tanpa error apa pun, jadi nilainya di sini tidak boleh diubah.
 */
function petaCodepoint(): Map<string, number> {
  const pola = /\.bi-([a-z0-9-]+)::before \{ content: "\\([0-9a-fA-F]+)"; \}/g;
  const peta = new Map<string, number>();
  const css = readFileSync(CSS_ASLI, "utf8");

  for (const cocok of css.matchAll(pola)) {
    peta.set(`bi-${cocok[1]}`, Number.parseInt(cocok[2], 16));
  }
  return peta;
}

/**
 * Satu blok CSS lengkap, dari selector pembuka sampai kurung kurawal
 * penutupnya yang seimbang.
 *
 * Dipakai untuk mengambil blok dari CSS asli. Memotong dengan penanda teks
 * seperti `ambil(".bi::before,", "display: inline-block;")` ternyata menghasilkan
 * blok yang kurung kurawalnya tidak tertutup, dan itu membuat seluruh
 *subsection setelahnya tidak terbaca. Pencocokan kurung kurawal tidak punya
 * masalah itu.
 */
function blokCss(css: string, pembuka: string): string {
  const dari = css.indexOf(pembuka);
  if (dari === -1) return "";

  let kedalaman = 0;
  for (let i = dari; i < css.length; i += 1) {
    if (css[i] === "{") kedalaman += 1;
    else if (css[i] === "}") {
      kedalaman -= 1;
      if (kedalaman === 0) return css.slice(dari, i + 1);
    }
  }
  return "";
}

/**
 * Bagian atas `bootstrap-icons.css` yang bukan aturan ikon.
 *
 * `@font-face` tidak ikut diambil dari sumbernya karena menunjuk berkas font
 * di dalam `node_modules` dengan URL relatif yang tidak akan resolve kalau
 * disalin ke `src/`. `@font-face` ditulis ulang di sini, menunjuk font
 * subset yang dihasilkan skrip ini.
 *
 * Reset `.bi`, animasi `.bi-spin`, dan `@keyframes bi-spin` wajib ikut,
 * karena tanpa mereka ikon tidak tampil sama sekali meski glifnya ada.
 */
function aturanDasar(): string[] {
  const css = readFileSync(CSS_ASLI, "utf8");
  return [
    ".bi::before,\n[class^=\"bi-\"]::before,\n[class*=\" bi-\"]::before",
    ".bi-spin::before",
    "@keyframes bi-spin",
  ]
    .map((pembuka) => blokCss(css, pembuka))
    .filter((blok) => blok.length > 0);
}

const dipakai = ikonDipakai();
const peta = petaCodepoint();

const hilang = [...dipakai].filter((nama) => !peta.has(nama)).sort();
const ada = [...dipakai].filter((nama) => peta.has(nama)).sort();

if (dipakai.size === 0) {
  console.error("Tidak ada ikon ditemukan di src/. Something wrong with the scan.");
  process.exit(1);
}

if (hilang.length > 0) {
  console.error(`Ikon dipakai tapi tidak ada di bootstrap-icons: ${hilang.join(", ")}`);
  console.error("Kelas seperti itu merender kotak kosong. Ganti dengan ikon yang tersedia.");
  process.exit(1);
}

// Glif pertama bernama .notdef dan selalu ikut, jadi jumlah glif satu lebih
// dari jumlah ikon.
const codepoint = [...new Set(ada.map((nama) => peta.get(nama)!))].sort((a, b) => a - b);
const unicodes = codepoint.map((n) => `U+${n.toString(16).toUpperCase()}`).join(",");

mkdirSync(path.dirname(KELUARAN_FONT), { recursive: true });

const pyftsubset = spawnSync("pyftsubset", [
  FONT_ASLI,
  `--unicodes=${unicodes}`,
  `--output-file=${KELUARAN_FONT}`,
  "--flavor=woff",
], { encoding: "utf8" });

if (pyftsubset.status !== 0) {
  console.error("pyftsubset gagal:", pyftsubset.stderr || pyftsubset.error);
  process.exit(1);
}

const aturanIkon = ada.map(
  (nama) => `.${nama}::before { content: "\\${peta.get(nama)!.toString(16)}"; }`,
);

const css =
  `/* DIHASILKAN OLEH scripts/subset-ikon.ts. Jangan disunting manual. */\n` +
  `/* Sumber: node_modules/bootstrap-icons/font/bootstrap-icons.css */\n` +
  `/* Isi ${ada.length} ikon yang dipakai dari ${peta.size} yang tersedia. */\n\n` +
  `@font-face {\n` +
  `  font-display: block;\n` +
  `  font-family: "bootstrap-icons";\n` +
  `  src: url("./fonts/bootstrap-icons-subset.woff") format("woff");\n` +
  `}\n\n` +
  `${aturanDasar().join("\n\n")}\n\n` +
  `${aturanIkon.join("\n")}\n`;

writeFileSync(path.join(KELUARAN, "bootstrap-icons.css"), css, "utf8");

const asal = statSync(FONT_ASLI).size;
const kecil = statSync(KELUARAN_FONT).size;
const persen = (100 - (kecil / asal) * 100).toFixed(1);

console.log(`${ada.length} ikon dipakai dari ${peta.size} yang tersedia.`);
console.log(`CSS  : ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB (asal 97.2 KB)`);
console.log(`Font : ${(kecil / 1024).toFixed(1)} KB (asal ${(asal / 1024).toFixed(1)} KB, hemat ${persen}%)`);
console.log(`Hemat ${((asal - kecil) / 1024).toFixed(1)} KB per halaman, tanpa gzip.`);