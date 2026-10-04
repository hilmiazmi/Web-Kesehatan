/**
 * Kropl seluruh tautan internal situs dan bandingkan dengan halaman yang
 * benar-benar ditulis build.
 *
 * Kenapa ini skrip terpisah dan bukan tes Vitest. Tes berjalan tanpa build,
 * sedangkan yang ingin diperiksa adalah HTML hasil prerender. Berkas HTML itu
 * ada di `.next/server/app` setelah `bun run build`, jadi skrip ini harus
 * dijalankan SETELAH build. Tidak ada server yang perlu dinyalakan.
 *
 * Yang diperiksa, semuanya tiga:
 *
 * 1. Tautan mati. Setiap `href` internal harus punya halaman yang benar-benar
 *    ditulis build. Ini yang menangkap nav path yang tidak ada di
 *    `collectNavPaths()`.
 * 2. Halaman tanpa tautan masuk. Setiap halaman harus menjadi tujuan setidaknya
 *    satu tautan, kecuali beranda. Ini yang menangkap halaman yang dirender
 *    hanya setelah JavaScript berjalan, atau slug yang tidak pernah ditautkan.
 * 3. Sitemap tidak lengkap. `collectSitemapPaths()` harus menghasilkan setiap
 *    halaman yang ditulis build. Fungsi itu memindai folder di `src/app`
 *    dan membaca modul data tiap route, jadi ia tidak bisa basi seperti
 *    daftar path manual. Yang dicek skrip ini adalah hasil akhirnya: apakah
 *    semua halaman yang benar-benar ditulis build sudah terdaftar di sana.
 *
 * Pengecualian pada nomor 2 dan 3 ditulis sebagai daftar, bukan dikecualikan
 * diam-diam. Kalau halaman memang tidak boleh punya tautan masuk, alasannya
 * harus tercatat di sini supaya bisa ditinjau ulang.
 *
 * ```bash
 * bun run build && bun run cek:tautan
 * ```
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { collectSitemapPaths } from "../src/lib/sitemap";

/** Akar HTML hasil prerender. Hanya `.html` statis, bukan `.rsc` atau `.meta`. */
const AKAR = path.join(process.cwd(), ".next", "server", "app");

/**
 * Halaman yang boleh tidak punya tautan masuk.
 *
 * `/laboratorium` dan `/radiologi` tidak pernah ditautkan karena isinya sama
 * dengan `/pelayanan/diagnostik/*`, dan keduanya juga dikecualikan dari
 * sitemap. Alasannya ada di roadmap bagian 3.8 dan perlu keputusan pemilik repo.
 */
const TANPA_TAUTAN_MASUK = new Set(["/laboratorium", "/radiologi"]);

/**
 * Halaman yang boleh tidak ada di sitemap.
 *
 * Dua URL yang sama persis dengan `/pelayanan/diagnostik/*`. Memasukkannya ke
 * sitemap berarti meminta mesin pencari mengindeks dua URL untuk isi yang sama,
 * jadi hanya URL kanonik yang didaftarkan. Halaman aslinya tetap ada dan tetap
 * menjawab 200.
 */
const TANPA_SITEMAP = new Set(["/laboratorium", "/radiologi"]);

/**
 * Rute internal Next.js, bukan halaman.
 *
 * `/_not-found` dan `/_global-error` ditulis build sebagai HTML, tapi keduanya
 * tidak boleh dihitung sebagai halaman situs. Keduanya tidak punya tautan masuk
 * dan tidak perlu ada di sitemap.
 */
const BUKAN_HALAMAN = new Set(["/_not-found", "/_global-error"]);

/**
 * Aset yang ditautkan dari HTML tapi bukan rute halaman.
 *
 * Awalan `/_next/` sudah ditangani terpisah. Sisanya adalah berkas yang dilayani
 * Next.js sebagai route handler, misalnya `favicon.ico` dan `opengraph-image`,
 * yang build tulis sebagai `.body` dan bukan `.html`, jadi tidak akan pernah
 * muncul di kumpulan rute.
 */
const EKSTENSI_ASET = /\.(?:ico|png|jpe?g|svg|webp|avif|gif|txt|xml|webmanifest|json|css|js|mjs)$/i;

/**
 * Ubah nama berkas HTML menjadi path rute.
 *
 * `index.html` berarti direktorinya sendiri, dan `.html` di akhir dibuang.
 */
function pathDariBerkas(relatif: string): string {
  const tanpaSuffix = relatif.replace(/\.html$/, "");
  const tanpaIndex = tanpaSuffix.replace(/(^|\/)index$/, "$1");
  return "/" + tanpaIndex.replace(/\/+$/, "");
}

/** Semua berkas HTML hasil prerender, sebagai path rute yang sudah bersih. */
async function kumpulkanRute(): Promise<string[]> {
  const hasil: string[] = [];

  const masuk = async (relatif: string): Promise<void> => {
    const isi = await readdir(path.join(AKAR, relatif), { withFileTypes: true });
    for (const entri of isi) {
      const anak = relatif ? `${relatif}/${entri.name}` : entri.name;
      if (entri.isDirectory()) {
        await masuk(anak);
      } else if (entri.name.endsWith(".html")) {
        hasil.push(pathDariBerkas(anak));
      }
    }
  };

  await masuk("");
  return hasil.sort();
}

/**
 * Semua `href` dan `src` internal dari satu berkas HTML.
 *
 * Regex, bukan parser HTML. Repo ini tidak punya parser sebagai dependensi, dan
 * untuk menghimpun tautan, pola `href="..."` sudah cukup. Yang dilewati:
 * tautan ke luar (`http`, `mailto`, `tel`), tautan ke atas (`#`), aset di
 * `/_next/`, dan berkas aset seperti `favicon.ico`.
 */
function tautanDalam(html: string): Set<string> {
  const keluar = new Set<string>();
  const pola = /(?:href|src)="([^"]*)"/g;

  for (const cocok of html.matchAll(pola)) {
    const nilai = cocok[1];
    if (!nilai.startsWith("/")) continue;
    if (nilai.startsWith("/_next/")) continue;
    // Buang fragment dan query string, karena keduanya tidak menentukan rute.
    const bersih = nilai.split("#")[0].split("?")[0];
    if (bersih === "") continue;
    if (EKSTENSI_ASET.test(bersih)) continue;
    keluar.add(bersih);
  }

  return keluar;
}

async function main(): Promise<void> {
  const rute = await kumpulkanRute();
  if (rute.length === 0) {
    console.error(
      `Tidak ada HTML di ${AKAR}. Jalankan \`bun run build\` lebih dulu.`,
    );
    process.exit(1);
  }

  const halaman = rute.filter((r) => !BUKAN_HALAMAN.has(r));
  const ada = new Set(halaman);
  const tautanMati = new Set<string>();
  const punyaTautanMasuk = new Set<string>();
  const semuaTautan = new Set<string>();

  for (const sumber of halaman) {
    const berkas = sumber === "/" ? "index" : sumber.slice(1);
    const html = await readFile(path.join(AKAR, `${berkas}.html`), "utf8");

    for (const tautan of tautanDalam(html)) {
      semuaTautan.add(tautan);
      if (!ada.has(tautan)) {
        tautanMati.add(`${sumber} -> ${tautan}`);
        continue;
      }
      if (!TANPA_TAUTAN_MASUK.has(tautan)) punyaTautanMasuk.add(tautan);
    }
  }

  const tanpaMasuk = halaman.filter(
    (r) => !punyaTautanMasuk.has(r) && !TANPA_TAUTAN_MASUK.has(r),
  );
  const diSitemap = new Set(collectSitemapPaths().map((e) => e.path));
  const tanpaSitemap = halaman.filter(
    (r) => !diSitemap.has(r) && !TANPA_SITEMAP.has(r),
  );

  let gagal = false;

  if (tautanMati.size > 0) {
    gagal = true;
    console.error(`\n${tautanMati.size} tautan mati:`);
    for (const baris of [...tautanMati].sort()) console.error(`  ${baris}`);
  }

  if (tanpaMasuk.length > 0) {
    gagal = true;
    console.error(`\n${tanpaMasuk.length} halaman tanpa tautan masuk:`);
    for (const r of tanpaMasuk) console.error(`  ${r}`);
  }

  if (tanpaSitemap.length > 0) {
    gagal = true;
    console.error(`\n${tanpaSitemap.length} halaman tidak ada di sitemap:`);
    for (const r of tanpaSitemap) console.error(`  ${r}`);
  }

  console.log(
    `\n${halaman.length} halaman, ${semuaTautan.size} tautan unik, ` +
      `${diSitemap.size} entri sitemap`,
  );

  if (gagal) {
    process.exit(1);
  }
  console.log("tidak ada tautan mati, semua halaman punya tautan masuk, sitemap lengkap");
}

await main();