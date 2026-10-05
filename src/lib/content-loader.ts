import { dbOrNull, type Db } from "@/server/db/client";
import { findArticle, listArticles } from "@/server/db/repo/content";
import { ARTICLES } from "@/data/home";
import { articleBody } from "@/data/article-body";
import { NEWS_PHOTOS, photo } from "@/data/images";

/**
 * Sumber tunggal untuk isi berita pada halaman publik.
 *
 * Acceptance Criteria butir 9 PRD bagian 12 berbunyi "Admin dapat menambah,
 * mengubah, dan menghapus berita, dan perubahannya tampil di situs publik".
 * Panel admin sudah bisa menulis ke tabel `articles`, tapi halaman `/berita`
 * masih membaca modul statis `src/data/home.ts`, jadi perubahan admin tidak
 * pernah terlihat pengunjung. Modul ini yang menutup celah itu.
 *
 * Tiga sumber, dan ketiganya dipanggil lewat fungsi yang sama:
 *
 * 1. `API_MODE=live` dengan database hidup: baris dari tabel `articles` yang
 *    `is_published = true`.
 * 2. `API_MODE=snapshot` (pratinjau Vercel): data statis `ARTICLES`.
 * 3. Mode live tapi database tidak terjangkau atau kueri gagal: data statis
 *    `ARTICLES`, dengan peringatan di log.
 *
 * Yang dicoba pertama selalu database, dan bukan sebaliknya. Membalik urutan
 * itu akan membuat pratinjau Vercel diam-diam memakai data build lama, sehingga
 * perubahan admin tidak terlihat justru di lingkungan yang paling sering dipakai
 * untuk demonstrasi.
 *
 * Data statis `ARTICLES` sudah persis berbentuk `PublicArticle`, jadi tidak ada
 * pemetaan yang perlu ditulis untuk cabangnya. Aturan yang sama berlaku untuk
 * modul statis lain: jangan menambahkan lapisan konversi yang tidak melakukan
 * apa pun.
 *
 * Snapshot JSON di `snapshot/articles.json` sengaja tidak dipakai di sini.
 * Berkas itu berisi muatan API, yaitu isi yang akan dibungkus `ok()`, bukan
 * bentuk modul data. Membacanya berarti memetakan dua lapis dan menyisakan dua
 * sumber kebenaran untuk isi berita yang sama. `denganSnapshot()` di
 * `src/server/api/snapshot.ts` tetap dipakai route handler, yang memang
 * berbicara dalam bentuk API.
 */

/** Bentuk berita untuk kartu dan daftar. */
export type PublicArticle = {
  slug: string;
  title: string;
  /** Tanggal `YYYY-MM-DD`, sama dengan bentuk yang dipakai data statis. */
  date: string;
  excerpt: string;
  category?: string;
  /** URL foto dari database, kalau admin mengisinya. */
  imageUrl?: string;
};

/** Bentuk berita untuk halaman detail. */
export type PublicArticleDetail = PublicArticle & {
  author?: string;
  metaDescription?: string;
  /** HTML hasil sanitasi markdown dari `render()`. */
  bodyHtml?: string;
  /** Paragraf cadangan untuk berita yang hanya ada di data statis. */
  paragraphs?: string[];
};

/**
 * Bentuk baris tabel `articles` yang dipakai pemetaan.
 *
 * Ditulis ulang di sini, bukan diimpor dari repo, supaya modul ini tidak
 * menarik `@/server/db/repo/content` ke dalam test pemetaan murni. Bentuknya
 * sama persis dengan tipe repo, jadi kompatibel secara struktural.
 */
type BarisArtikel = {
  slug: string;
  title: string;
  category: string | null;
  excerpt: string;
  cover_url: string | null;
  published_at: string;
};

type BarisArtikelDetail = BarisArtikel & {
  author: string | null;
  body_html: string;
  meta_description: string;
};

/**
 * Berapa banyak berita yang diambil sekaligus.
 *
 * `listArticles()` mewajibkan `limit`, dan halaman publik menampilkan seluruh
 * berita dalam satu grid tanpa paginasi, jadi angka ini perlu cukup besar untuk
 * isi sebenarnya. Dipakai 200, bukan 100, supaya tidak langsung terpotong begitu
 * admin menambah berita ke-seratus.
 */
const BATAS_BERITA = 200;

/**
 * Ambil daftar berita untuk halaman publik.
 *
 * Fallback ke data statis bukan hanya ketika mode snapshot. Database yang sudah
 * hidup tapi belum di-seed juga mengembalikan nol baris, dan halaman berita
 * yang kosong adalah halaman rusak: Acceptance Criteria butir 6 mensyaratkan
 * tidak ada halaman yatim, dan grid kosong tidak punya satu pun tautan keluar.
 * Karena itu nol baris diperlakukan sebagai "database belum berisi berita".
 *
 * Konsekuensi yang diterima secara sadar: kalau admin menghapus seluruh isi
 * tabel, pengunjung kembali melihat enam belas berita bawaan. Itu pilihan yang
 * lebih baik daripada halaman kosong, dan cara mengubahnya adalah mengisi
 * database, bukan menghapus berkasnya.
 */
export async function getPublicArticles(): Promise<PublicArticle[]> {
  const db = koneksiKonten();

  if (db) {
    try {
      const hasil = await listArticles(db, {
        limit: BATAS_BERITA,
        offset: 0,
      });
      const dariDb = hasil.items
        .map(dariBarisArtikel)
        .filter((a): a is PublicArticle => a !== null);

      if (dariDb.length > 0) return dariDb;

      console.warn(
        "[konten] tabel articles kosong, data statis dipakai untuk /berita",
      );
    } catch (err) {
      peringatkan("daftar berita", err);
    }
  }

  return [...ARTICLES];
}

/**
 * Ambil satu berita untuk halaman detail.
 *
 * Urutannya tidak sama dengan `getPublicArticles()`, dan bedanya disengaja.
 * Di sini slug yang tidak ada di database **tidak** langsung berarti 404, karena
 * `generateStaticParams` masih membuat enam belas slug bawaan, dan database yang
 * baru di-seed pun belum tentu memuat keenam belas itu. Kalau slug hilang
 * dipecah menjadi 404 di sini, artikel yang tadinya tampil jadi hilang begitu
 * `API_MODE` berubah ke `live`.
 *
 * Sebaliknya, kalau slug ada di database tapi belum ada di data statis, slug itu
 * tetap dilayani. Itulah yang membuat artikel baru dari panel admin langsung
 * punya URL, dan `dynamicParams` yang mengizinkan route-nya.
 */
export async function getPublicArticle(
  slug: string,
): Promise<PublicArticleDetail | null> {
  const db = koneksiKonten();

  if (db) {
    try {
      const found = await findArticle(db, slug);
      const detail = found ? dariBarisArtikelDetail(found) : null;
      if (detail) return detail;
    } catch (err) {
      peringatkan(`berita "${slug}"`, err);
    }
  }

  return dariStatis(slug);
}

/**
 * Koneksi database untuk pembacaan konten, atau `null` untuk memakai data statis.
 *
 * `dbOrNull()` tidak hanya mengembalikan `null` di mode snapshot, ia juga
 * melempar galat konfigurasi kalau `DATABASE_URL` kosong di mode `live`.
 * `next build` di lingkungan tanpa environment apa pun akan tegas masuk ke sini,
 * jadi pemanggil wajib memperlakukan kondisi itu sebagai "tidak ada database",
 * bukan sebagai kegagalan.
 */
function koneksiKonten(): Db | null {
  try {
    return dbOrNull();
  } catch (err) {
    peringatkan("koneksi database", err);
    return null;
  }
}

/**
 * Catat masalah database tanpa menggagalkan halaman.
 *
 * Halaman publik harus tetap punya isi. Tapi galat tidak boleh hilang tanpa
 * jejak, karena begitu saja tidak ada yang tahu bahwa `API_MODE=live` sudah tidak
 * membaca database dan diam-diam menyajikan data lama. Satu baris per kegagalan,
 * tanpa nilai environment apa pun di dalamnya.
 */
function peringatkan(konteks: string, err: unknown): void {
  console.warn(
    `[konten] ${konteks} tidak terbaca, data statis dipakai:`,
    err instanceof Error ? err.message : String(err),
  );
}

/**
 * Ubah satu baris tabel `articles` menjadi bentuk publik.
 *
 * Mengembalikan `null` untuk baris tanpa tanggal yang bisa dipakai. Tanggal
 * tidak pernah kosong di skema karena `published_at` adalah `NOT NULL`, tapi
 * `iso()` mengembalikan teks kosong untuk nilai yang tidak bisa diurai, dan satu
 * kartu berita bertanggal "Invalid Date" lebih buruk daripada kartu yang
 * dilewati.
 */
export function dariBarisArtikel(row: BarisArtikel): PublicArticle | null {
  const tanggal = tanggalPendek(row.published_at);
  if (tanggal === null) return null;

  return {
    slug: row.slug,
    title: row.title,
    date: tanggal,
    excerpt: row.excerpt,
    ...(row.category ? { category: row.category } : {}),
    ...(row.cover_url ? { imageUrl: row.cover_url } : {}),
  };
}

/** Sama seperti {@link dariBarisArtikel}, ditambah isi dan metadata. */
export function dariBarisArtikelDetail(
  row: BarisArtikelDetail,
): PublicArticleDetail | null {
  const dasar = dariBarisArtikel(row);
  if (dasar === null) return null;

  return {
    ...dasar,
    ...(row.author ? { author: row.author } : {}),
    ...(row.meta_description ? { metaDescription: row.meta_description } : {}),
    // `body_html` sudah melewati `render()` yang menyaring HTML. Isinya tidak
    // pernah kosong untuk berita dari database, tapi kalau kosong halaman detail
    // akan kehilangan semua paragrafnya, jadi nilai kosongnya sengaja diabaikan.
    ...(row.body_html ? { bodyHtml: row.body_html } : {}),
  };
}

/**
 * Ambil berita dari data statis.
 *
 * `null` kalau slug-nya memang tidak ada, dan itu yang membuat pemanggil bisa
 * memakai `notFound()`. Paragrafnya disusun dari ringkasan lewat
 * `articleBody()`, sama seperti sebelum modul ini ada.
 */
function dariStatis(slug: string): PublicArticleDetail | null {
  const artikel = ARTICLES.find((a) => a.slug === slug);
  if (!artikel) return null;

  return {
    slug: artikel.slug,
    title: artikel.title,
    date: artikel.date,
    excerpt: artikel.excerpt,
    paragraphs: articleBody(artikel.title, artikel.excerpt),
  };
}

/**
 * Sumber foto untuk kartu dan halaman detail berita.
 *
 * Dua kemungkinan, dan keduanya perlu perlakuan berbeda.
 *
 * Kalau admin mengisi `cover_url`, URL itu dipakai apa adanya dan Photo
 * diminta untuk tidak mengoptimasnya. `next/image` hanya mau memuat host yang
 * ada di `remotePatterns` pada `next.config.ts`,
 * sedangkan admin boleh memasukkan host apa pun yang diawali `http` atau
 * `https`. Tanpa `unoptimized`, satu URL dari luar daftar itu tidak sekadar
 * gagal dimuat, ia membuat permintaan ke `/_next/image` yang dijawab galat,
 * sehingga kartu berita tampil dengan kotak rusak. Dengan `unoptimized`, komponen
 * menulis `src` apa adanya ke `img` dan perkakas optimasi tidak pernah ikut,
 * sehingga daftar host tidak berlaku lagi.
 *
 * Kalau `cover_url` kosong, foto stok dari `NEWS_PHOTOS` dipakai bergiliran
 * seperti sebelumnya. Pilihan fotanya memakai indeks berita pada
 * `ARTICLES`, jadi tata letaknya tetap sama untuk pengunjung yang memakai data bawaan.
 */
export function fotoBerita(
  artikel: Pick<PublicArticle, "imageUrl">,
  index: number,
  lebar: number,
  tinggi: number,
): { src: string; unoptimized: boolean } {
  if (artikel.imageUrl) return { src: artikel.imageUrl, unoptimized: true };

  const dasar = NEWS_PHOTOS[index % NEWS_PHOTOS.length];
  return { src: photo(dasar, lebar, tinggi), unoptimized: false };
}

/** `YYYY-MM-DD` dari teks ISO, atau `null` kalau bukan tanggal. */
function tanggalPendek(nilai: string): string | null {
  const cocok = /^(\d{4}-\d{2}-\d{2})/.exec(nilai);
  if (!cocok) return null;
  return cocok[1];
}