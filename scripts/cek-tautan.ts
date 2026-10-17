/**
 * Kontrol seluruh tautan internal situs dan bandingkan dengan halaman yang
 * benar-benar ditulis build.
 *
 * Kenapa ini skrip terpisah dan bukan tes Vitest. Tes berjalan tanpa build,
 * sedangkan yang ingin diperiksa adalah HTML hasil prerender. Berkas HTML itu
 * ada di `.next/server/app` setelah `bun run build`, jadi skrip ini harus
 * dijalankan SETELAH build. Tidak ada server yang perlu dinyalakan.
 *
 * Yang diperiksa, semuanya empat:
 *
 * 1. Tautan mati. Setiap `href` internal harus punya halaman yang benar-benar
 *    ditulis build, atau cocok dengan rute dinamis yang dirender saat diminta.
 *    Ini yang menangkap nav path yang tidak ada di `collectNavPaths()`.
 * 2. Halaman tanpa tautan masuk. Setiap halaman harus menjadi tujuan setidaknya
 *    satu tautan, kecuali beranda. Ini yang menangkap halaman yang dirender
 *    hanya setelah JavaScript berjalan, atau slug yang tidak pernah ditautkan.
 * 3. Sitemap tidak lengkap, dua arah. Setiap halaman yang ditulis build harus
 *    ada di sitemap, dan setiap entri sitemap harus punya halaman atau cocok
 *    dengan rute dinamis yang dirender saat diminta. Yang dibandingkan adalah
 *    sitemap yang benar-benar dihasilkan build itu sendiri, yaitu
 *    `.next/server/app/sitemap.xml.body`, bukan hasil hitung ulang. Alasannya
 *    ada di `sitemapDariBuild()`.
 * 4. Tautan ke rute dinamis. Halaman seperti `/berita/<slug-dari-database>`
 *    tidak ditulis build, tapi dirender saat diminta karena `fallback`-nya
 *    blocking. Menyebutnya "mati" adalah tuduhan yang salah, dan itu pernah
 *    terjadi: 20 tautan berita dilaporkan mati padahal semuanya menjawab 200
 *    saat servernya hidup. Tautan seperti ini masuk keranjang sendiri dan wajib
 *    diverifikasi ke server hidup, bukan ditebak dari berkas build.
 *
 * Pengecualian pada nomor 2 dan 3 ditulis sebagai daftar, bukan dikecualikan
 * diam-diam. Kalau halaman memang tidak boleh punya tautan masuk, alasannya
 * harus tercatat di sini supaya bisa ditinjau ulang. `TANPA_PRERENDER`
 * mengecualikan entri sitemap yang memang tidak pernah di-prerender, dan
 * alasannya wajib tertulis di deklarasinya.
 *
 * ```bash
 * bun run build && bun run cek:tautan
 * # Kalau ada keranjang nomor 4, verifikasi langsung:
 * bun run cek:tautan --live=http://localhost:3000
 * ```
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { collectSitemapPaths, pathDariSitemapXml } from "../src/lib/sitemap";
import {
  entriDinamisDariManifest,
  halamanBayangan,
  ruteDinamisUntuk,
  type EntriRuteDinamis,
} from "../src/lib/nav-path";
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
 * Entri sitemap yang memang tidak punya HTML hasil prerender.
 *
 * `/admin/login` membutuhkan sesi, jadi selalu dirender saat diminta dan tidak
 * pernah ditulis build sebagai `.html`. Mendaftarkannya di sini bukan izin
 * untuk lupa: kalau suatu hari halaman login bisa di-prerender, entri ini
 * harus dibuang supaya pemeriksaannya kembali penuh.
 *
 * Daftar ini bukan tempat untuk halaman yang *seharusnya* punya HTML tapi
 * tidak ditulis build. Halaman seperti itu adalah bug build, bukan pengecualian.
 */
const TANPA_PRERENDER = new Set([
  "/admin/login",
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
  return pathDariSitemapXml(xml);
}

/**
 * Daftar rute dinamis dari manifest hasil build.
 *
 * Berkasnya `.next/prerender-manifest.json`, bagian `dynamicRoutes`. Kalau
 * berkasnya tidak ada atau rusak, hasilnya array kosong, dan semua tautan
 * tanpa HTML kembali dilaporkan mati seperti dulu. Itu disengaja: tanpa daftar
 * yang bisa dipercaya, tidak ada dasar untuk mengklaim sebuah tautan akan
 * dirender saat diminta.
 */
async function ruteDinamisDariBuild(): Promise<EntriRuteDinamis[]> {
  let manifest: unknown = {};
  try {
    const isi = await readFile(
      path.join(process.cwd(), ".next", "prerender-manifest.json"),
      "utf8",
    );
    manifest = JSON.parse(isi) as unknown;
  } catch {
    return [];
  }
  return entriDinamisDariManifest(manifest);
}

/**
 * Periksa satu tautan ke server hidup, kembalikan status HTTP-nya.
 *
 * Dipakai flag `--live` untuk keranjang nomor 4. `"galat: ..."` berarti server
 * tidak menjawab sama sekali, dan itu sama matinya dengan 404.
 */
async function statusLangsung(
  basis: string,
  tautan: string,
): Promise<number | string> {
  try {
    const res = await fetch(`${basis}${tautan}`, {
      signal: AbortSignal.timeout(20000),
    });
    return res.status;
  } catch (err) {
    return `galat: ${err instanceof Error ? err.message : String(err)}`;
  }
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
  const dinamis = await ruteDinamisDariBuild();
  const tautanMati = new Set<string>();
  const punyaTautanMasuk = new Set<string>();
  const semuaTautan = new Set<string>();
  const judulDobel = new Set<string>();
  // Kunci tautan, nilai pola rute yang cocok, misalnya `/berita/[slug]`.
  const butuhServer = new Map<string, { pola: string; sumber: string[] }>();

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
      if (ada.has(tautan)) {
        if (!TANPA_TAUTAN_MASUK.has(tautan)) punyaTautanMasuk.add(tautan);
        continue;
      }
      const pola = ruteDinamisUntuk(tautan, dinamis);
      if (pola === null) {
        tautanMati.add(`${sumber} -> ${tautan}`);
        continue;
      }
      const catat = butuhServer.get(tautan) ?? { pola, sumber: [] };
      if (!catat.sumber.includes(sumber)) catat.sumber.push(sumber);
      butuhServer.set(tautan, catat);
    }
  }

  // Flag `--live=http://localhost:PORT` memverifikasi keranjang nomor 4 ke
  // server hidup. Tanpa flag, keranjang itu dilaporkan dan gerbang gagal,
  // karena klaim "semua tautan hidup" tidak boleh didasarkan pada tebakan.
  const liveArg = process.argv.find((a) => a.startsWith("--live="));
  const liveBase = liveArg ? liveArg.slice("--live=".length).replace(/\/+$/, "") : null;
  if (liveBase !== null && !/^https?:\/\//.test(liveBase)) {
    console.error(`Flag --live harus URL http(s), bukan "${liveBase}".`);
    process.exit(2);
  }

  const tanpaMasukMentah = halaman.filter(
    (r) => !punyaTautanMasuk.has(r) && !TANPA_TAUTAN_MASUK.has(r),
  );
  const diSitemap = new Set(await sitemapDariBuild());
  const tanpaSitemap = halaman.filter(
    (r) => !diSitemap.has(r) && !TANPA_SITEMAP.has(r),
  );
  // Entri sitemap tanpa HTML hasil prerender, dipilah dua: yang polanya tidak
  // cocok rute dinamis mana pun memang mati; yang cocok dirender saat diminta
  // dan ikut diverifikasi ke server hidup bersama keranjang nomor 4.
  const sitemapTanpaHalaman = [...diSitemap].filter(
    (p) => !ada.has(p) && !TANPA_PRERENDER.has(p),
  );
  const sitemapMati = sitemapTanpaHalaman.filter(
    (p) => ruteDinamisUntuk(p, dinamis) === null,
  );
  const sitemapDinamis = sitemapTanpaHalaman.filter(
    (p) => ruteDinamisUntuk(p, dinamis) !== null,
  );

  // Halaman yatim yang memenuhi syarat bayangan bukan kegagalan. Syaratnya
  // ada di `halamanBayangan()`; intinya hanya berlaku saat ada bukti daftar
  // isi digantikan konten dinamis, jadi mode snapshot tidak berubah perilakunya.
  const bayangan = new Set(
    halamanBayangan(tanpaMasukMentah, diSitemap, dinamis, butuhServer.size > 0),
  );
  const tanpaMasuk = tanpaMasukMentah.filter((r) => !bayangan.has(r));

  // Daftar URL yang wajib hidup menurut server, bukan menurut berkas build:
  // tautan dinamis dari keranjang nomor 4 ditambah entri sitemap yang hanya
  // ada saat dirender. Kunci URL, nilai label sumber untuk pesan galat.
  const perluHidup = new Map<string, string>();
  for (const t of butuhServer.keys()) perluHidup.set(t, "tautan");
  for (const u of sitemapDinamis) {
    if (!perluHidup.has(u)) perluHidup.set(u, "sitemap");
  }

  let terverifikasi = 0;
  if (liveBase !== null) {
    for (const tautan of [...perluHidup.keys()].sort()) {
      const status = await statusLangsung(liveBase, tautan);
      if (status === 200) {
        terverifikasi += 1;
        continue;
      }
      const catat = butuhServer.get(tautan);
      const dari = catat ? catat.sumber.join(", ") : "sitemap";
      tautanMati.add(`${dari} -> ${tautan} (HTTP ${status})`);
    }
  }

  let gagal = false;

  if (tautanMati.size > 0) {
    gagal = true;
    console.error(`\n${tautanMati.size} tautan mati:`);
    for (const baris of [...tautanMati].sort()) console.error(`  ${baris}`);
  }

  if (liveBase === null && butuhServer.size > 0) {
    gagal = true;
    console.error(
      `\n${butuhServer.size} tautan ke rute dinamis ` +
        `(perlu verifikasi runtime):`,
    );
    for (const t of [...butuhServer.keys()].sort()) {
      const catat = butuhServer.get(t);
      console.error(`  ${catat?.sumber.join(", ")} -> ${t} [${catat?.pola}]`);
    }
    console.error(
      "Jalankan ulang dengan --live=http://localhost:PORT untuk memverifikasi.",
    );
  }
  if (liveBase !== null && terverifikasi > 0) {
    console.log(
      `\n${terverifikasi} URL dinamis terverifikasi langsung (HTTP 200).`,
    );
  }

  if (tanpaMasuk.length > 0) {
    gagal = true;
    console.error(`\n${tanpaMasuk.length} halaman tanpa tautan masuk:`);
    for (const r of tanpaMasuk) console.error(`  ${r}`);
  }

  if (bayangan.size > 0) {
    console.log(
      `\n${bayangan.size} halaman bayangan fallback ` +
        `(disengaja, tetap 200 lewat fallback):`,
    );
    for (const r of [...bayangan].sort()) console.log(`  ${r}`);
  }

  if (tanpaSitemap.length > 0) {
    gagal = true;
    console.error(`\n${tanpaSitemap.length} halaman tidak ada di sitemap:`);
    for (const r of tanpaSitemap) console.error(`  ${r}`);
  }

  if (sitemapMati.length > 0) {
    gagal = true;
    console.error(`\n${sitemapMati.length} entri sitemap tanpa halaman:`);
    for (const r of sitemapMati.sort()) console.error(`  ${r}`);
  }

  if (judulDobel.size > 0) {
    gagal = true;
    console.error(`\n${judulDobel.size} halaman dengan judul dobel:`);
    for (const baris of [...judulDobel].sort()) console.error(`  ${baris}`);
  }

  let ringkasan =
    `\n${halaman.length} halaman, ${semuaTautan.size} tautan unik, ` +
    `${diSitemap.size} entri sitemap`;
  if (butuhServer.size > 0) ringkasan += `, ${butuhServer.size} dinamis`;
  if (bayangan.size > 0) ringkasan += `, ${bayangan.size} bayangan`;
  console.log(ringkasan);

  if (gagal) {
    process.exit(1);
  }
  console.log(
    "tidak ada tautan mati, semua halaman punya tautan masuk, " +
      "sitemap lengkap, tidak ada judul dobel",
  );
}

await main();
