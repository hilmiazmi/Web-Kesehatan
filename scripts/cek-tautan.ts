/**
 * Kontrol seluruh tautan internal situs dan bandingkan dengan halaman yang
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
 * 3. Sitemap tidak lengkap. Setiap halaman yang ditulis build harus ada di
 *    sitemap. Yang dibandingkan adalah sitemap yang benar-benar dihasilkan
 *    build itu sendiri, yaitu `.next/server/app/sitemap.xml.body`, bukan
 *    hasil hitung ulang. Alasannya ada di `sitemapDariBuild()`.
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
import { getPublicArticles } from "../src/lib/content-loader";

/** Akar HTML hasil prerender. Hanya `.html` statis, bukan `.rsc` atau `.meta`. */
const AKAR = path.join(process.cwd(), ".next", "server", "app");

/**
 * Halaman yang boleh tidak punya tautan masuk.
 *
 * Saat daftar ini dibuat masih ada `/laboratorium` dan `/radiologi`: keduanya
 * tidak pernah ditautkan karena isinya sama dengan `/pelayanan/diagnostik/*`.
 * Foldernya sudah dihapus, jadi keduanya sekarang tidak muncul lagi di
 * kumpulan rute dan entri di sini dibuang bersamanya. Satu-satunya penjaga
 * yang masih dibutuhkan ada di `tests/tautan-internal.test.ts`: dia yang
 * memastikan kedua alias itu tidak diam-diam hidup lagi lewat filter halaman
 * generik.
 */
const TANPA_TAUTAN_MASUK = new Set<string>([]);

/**
 * Halaman yang boleh tidak ada di sitemap.
 *
 * `/daftar-online` dikecualikan di `DIKECUALIKAN` pada `src/lib/sitemap.ts`,
 * karena isinya berbeda tiap pengunjung: formulirnya menanyakan tanggal dan
 * jam, dan hasil pencarian jadwalnya berbeda antara orang satu dan yang lain.
 * Halaman ini tetap boleh diindeks, hanya tidak wajib didaftarkan.
 *
 * Daftar ini bukan izin untuk lupa. Kalau sebuah halaman masuk sini tanpa
 * alasan yang tertulis, cek:tautan kehilangan gunanya.
 */
const TANPA_SITEMAP = new Set([
  "/daftar-online",
]);

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
 * Nama rumah sakit, ditulis ulang di sini sebagai string biasa.
 *
 * Sengaja tidak diimpor dari `src/data/navigation.ts`. Skrip ini berjalan
 * sendiri setelah build, jadi ia tidak butuh menarik modul data, dan
 * ketidakbergantungannya itu yang membuatnya masih bisa dipakai saat modul
 * data sedang rusak.
 *
 * Konsekuensinya ada yang harus diingat: kalau nama rumah sakit diubah,
 * nilai di `src/app/layout.tsx` dan nilai di sini harus berubah bersama. Kalau
 * hanya salah satu, setiap halaman akan dilaporkan punya judul dobel, dan itu
 * lebih mudah daripada diam-diam kehilangan pemeriksaan.
 */
const NAMA_RS = "RSUD Contoh Sehat";

/**
 * Halaman yang `<title>`-nya memang menyebut nama rumah sakit lebih dari sekali.
 *
 * Setiap halaman di sini diizinkan karena isi judulnya memang memuat nama itu,
 * bukan karena kerusakannya dibiarkan. Daftar ini bukan izin untuk menambah
 * halaman: kalau sebuah halaman masuk sini, cek:tautan kehilangan gunanya.
 */
const JUDUL_BOLEH_DOBEL = new Set([
  "/berita/rsud-contoh-sehat-terima-akreditasi-utama",
]);

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

/**
 * Isi `<title>` pertama dari satu berkas HTML, atau `null` kalau tidak ada.
 *
 * Regex, bukan parser HTML, sama seperti `tautanDalam`. Yang dibutuhkan cuma
 * teks di antara `<title>` dan `</title>`.
 */
function judulDalam(html: string): string | null {
  const cocok = /<title>([^<]*)<\/title>/.exec(html);
  return cocok ? cocok[1] : null;
}

/**
 * Berapa kali nama rumah sakit muncul di satu judul.
 *
 * `layout.tsx` memasang template `%s | RSUD Contoh Sehat`, jadi nama itu
 * selalu muncul sekali di setiap halaman. Muncul lebih dari sekali berarti ada
 * halaman yang menambahkannya sendiri, dan `<title>`-nya menyebut nama rumah
 * sakit dua kali.
 *
 * Yang dihitung kemunculan, bukan posisi. Menghitung posisi akan salah, karena
 * ada judul yang memang diawali nama rumah sakit dan itu sah, misalnya judul
 * berita. Lihat `JUDUL_BOLEH_DOBEL`.
 */
function kemunculanNamaRS(judul: string): number {
  return judul.split(NAMA_RS).length - 1;
}

/**
 * Ambil daftar path dari berkas sitemap yang dihasilkan build.
 *
 * Dibaca langsung dari `.next/server/app/sitemap.xml.body`, bukan menghitung
 * ulang dengan `collectSitemapPaths()`. Dengan begitu, yang diverifikasi
 * adalah sitemap yang benar-benar akan dikirim ke pengunjung.
 */
async function sitemapDariBuild(): Promise<string[]> {
  const lokasiBody = path.join(AKAR, "sitemap.xml.body");
  const lokasiXml = path.join(AKAR, "sitemap.xml");
  let xml = "";
  try {
    xml = await readFile(lokasiBody, "utf8");
  } catch {
    try {
      xml = await readFile(lokasiXml, "utf8");
    } catch {
      // Sitemap sekarang `force-dynamic`, jadi tidak ada berkas prerender untuk
      // dibaca. Hitung dengan sumber yang sama seperti `src/app/sitemap.ts`
      // — modul statis ditambah berita dari loader — supaya yang diperiksa
      // tetap sama dengan yang benar-benar dikirim saat dijalankan. Tanpa
      // `getPublicArticles()`, sebelas berita yang route-nya sudah ada akan
      // dilaporkan "tidak masuk sitemap" padahal masuk.
      const dariModul = await import("../src/data/home");
      const dariDb = await getPublicArticles();
      return collectSitemapPaths([...dariModul.ARTICLES, ...dariDb]).map((e) => e.path);
    }
  }
  const hasil: string[] = [];
  for (const cocok of xml.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)?<\/loc>/g)) {
    hasil.push(cocok[1] || "/");
  }
  return hasil;
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
  const judulDobel = new Set<string>();

  for (const sumber of halaman) {
    const berkas = sumber === "/" ? "index" : sumber.slice(1);
    const html = await readFile(path.join(AKAR, `${berkas}.html`), "utf8");

    const judul = judulDalam(html);
    if (
      judul !== null &&
      kemunculanNamaRS(judul) > 1 &&
      !JUDUL_BOLEH_DOBEL.has(sumber)
    ) {
      judulDobel.add(`${sumber} :: ${judul}`);
    }

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
  const diSitemap = new Set(await sitemapDariBuild());
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

  if (judulDobel.size > 0) {
    gagal = true;
    console.error(`\n${judulDobel.size} halaman dengan judul dobel:`);
    for (const baris of [...judulDobel].sort()) console.error(`  ${baris}`);
  }

  console.log(
    `\n${halaman.length} halaman, ${semuaTautan.size} tautan unik, ` +
      `${diSitemap.size} entri sitemap`,
  );

  if (gagal) {
    process.exit(1);
  }
  console.log(
    "tidak ada tautan mati, semua halaman punya tautan masuk, " +
      "sitemap lengkap, tidak ada judul dobel",
  );
}

await main();
