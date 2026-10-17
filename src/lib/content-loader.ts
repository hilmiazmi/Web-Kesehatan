import { dbOrNull, type Db } from "@/server/db/client";
import {
  findArticle,
  listArticles,
  listDoctors,
  listSchedules,
  listMcuPackages,
  findMcuPackage,
} from "@/server/db/repo/content";
import { ARTICLES, MCU_PACKAGES, MCU_HOLIDAY_PACKAGES } from "@/data/home";
import { DOCTORS, type Doctor, type Day } from "@/data/doctors";
import { articleBody } from "@/data/article-body";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { COVER_BERITA } from "@/data/cover-berita";

/**
 * Sumber tunggal untuk isi data dinamis pada halaman publik.
 *
 * Acceptance Criteria butir 9 PRD bagian 12 berbunyi "Admin dapat menambah,
 * mengubah, dan menghapus berita, dan perubahannya tampil di situs publik".
 * Panel admin sudah bisa menulis ke tabel `articles`, `doctors`, dan `mcu_packages`,
 * tapi halaman publik sebelumnya masih membaca modul statis, jadi perubahan admin
 * tidak pernah terlihat pengunjung. Modul ini yang menutup celah itu.
 *
 * Tiga sumber, dan ketiganya dipanggil lewat fungsi yang sama:
 *
 * 1. `API_MODE=live` dengan database hidup: baris dari tabel yang bersangkutan.
 * 2. `API_MODE=snapshot` (pratinjau Vercel): data statis bawaan.
 * 3. Mode live tapi database tidak terjangkau atau kueri gagal: fallback ke
 *    data statis bawaan, dengan peringatan di log.
 *
 * Yang dicoba pertama selalu database, dan bukan sebaliknya. Membalik urutan
 * itu akan membuat pratinjau Vercel diam-diam memakai data build lama, sehingga
 * perubahan admin tidak terlihat justru di lingkungan yang paling sering dipakai
 * untuk demonstrasi.
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

/** Bentuk paket MCU untuk kartu dan daftar. */
export type PublicMcuPackage = {
  slug: string;
  title: string;
  price: number;
  items: string[];
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

/** Pemetaan hari ISO-8601 (1 = Senin) ke format hari bahasa Indonesia. */
const HARI_MAP: Record<number, Day> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
};

/**
 * Ambil daftar berita untuk halaman publik.
 *
 * Fallback ke data statis bukan hanya ketika mode snapshot. Database yang sudah
 * hidup tapi belum di-seed juga mengembalikan nol baris, dan halaman berita
 * yang kosong adalah halaman rusak: Acceptance Criteria butir 6 mensyaratkan
 * tidak ada halaman yatim, dan grid kosong tidak punya satu pun tautan keluar.
 * Karena itu nol baris diperlakukan sebagai "database belum berisi berita".
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

      if (dariDb.length > 0) return gabung(dariDb);

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
 * Gabungkan berita dari database dengan berita bawaan yang belum ada di sana.
 *
 * Database selalu menang untuk slug yang sama, jadi artikel yang diubah admin
 * di panel tidak akan muncul dua kali dengan isi berbeda.
 *
 * Berita bawaan yang slug-nya belum ada di database tetap ikut ditampilkan.
 * Semula tidak, dan akibatnya enam belas halaman artikel itu sempat jadi
 * halaman yatim: `generateStaticParams` di `/berita/[slug]` tetap membuat
 * halamannya, tapi tidak ada halaman yang menautkannya, sehingga `cek:tautan`
 * gagal dan pengunjung tidak punya jalan masuk ke sana.
 *
 * Urutannya ulang berdasarkan tanggal. Tanpa itu, berita bawaan selalu
 * menempel di bagian akhir daftar dan halaman `/berita` tampak seperti belum
 * pernah diperbarui, padahal isinya sudah bercampur.
 */
function gabung(dariDb: PublicArticle[]): PublicArticle[] {
  const adaDiDb = new Set(dariDb.map((a) => a.slug));
  const bawaan = ARTICLES.filter((a) => !adaDiDb.has(a.slug));

  return [...dariDb, ...bawaan].sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date),
  );
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
 * Ambil daftar dokter dan jadwal praktiknya untuk halaman publik `/jadwal-dokter`.
 *
 * Menggabungkan dokter dari database dengan data statis `DOCTORS` bawaan.
 * Jika admin menambah atau mengubah dokter di database, data tersebut langsung
 * tersedia di halaman publik. Dokter statis tetap dipertahankan sebagai fallback
 * jika belum ada di database, sehingga seluruh poliklinik dan spesialisasi tetap
 * memiliki jadwal lengkap.
 */
export async function getPublicDoctors(): Promise<Doctor[]> {
  const db = koneksiKonten();

  if (db) {
    try {
      const [dokterDb, jadwalDb] = await Promise.all([
        listDoctors(db),
        listSchedules(db, {}, 1000),
      ]);

      if (dokterDb.length > 0) {
        const jadwalPerDokter = new Map<string, Array<{ day: Day; time: string }>>();
        for (const j of jadwalDb) {
          const hari = HARI_MAP[j.day_of_week];
          if (!hari) continue;
          const daftar = jadwalPerDokter.get(j.doctor_id) ?? [];
          daftar.push({
            day: hari,
            time: `${j.start_time.slice(0, 5)}–${j.end_time.slice(0, 5)}`,
          });
          jadwalPerDokter.set(j.doctor_id, daftar);
        }

        const dariDb: Doctor[] = dokterDb.map((d) => {
          const specialty = d.specialty ?? "Umum";
          return {
            slug: slugifyDokter(d.full_name),
            name: namaDokter(d.title, d.full_name),
            specialty,
            schedule: jadwalPerDokter.get(d.id) ?? [],
          };
        });

        const slugAda = new Set(dariDb.map((d) => d.slug));
        const gabungan = [...dariDb];
        for (const statis of DOCTORS) {
          if (!slugAda.has(statis.slug)) {
            gabungan.push(statis);
          }
        }
        return gabungan;
      }
    } catch (err) {
      peringatkan("daftar dokter", err);
    }
  }

  return [...DOCTORS];
}

/**
 * Ambil daftar paket MCU untuk halaman publik.
 *
 * Kategori: "reguler" (bawaan) atau "holiday".
 * Mendukung pembacaan dinamis dari tabel `mcu_packages` jika database hidup,
 * dan fallback ke data statis `MCU_PACKAGES` atau `MCU_HOLIDAY_PACKAGES`.
 */
export async function getPublicMcuPackages(
  category: KategoriMcu = "reguler",
): Promise<PublicMcuPackage[]> {
  const statisFallback = category === "holiday" ? MCU_HOLIDAY_PACKAGES : MCU_PACKAGES;
  const db = koneksiKonten();

  if (db) {
    try {
      const rows = await listMcuPackages(db, KATEGORI_MCU[category]);
      if (rows.length > 0) {
        const dariDb: PublicMcuPackage[] = await Promise.all(
          rows.map(async (r) => {
            const detail = await findMcuPackage(db, r.slug);
            const items =
              detail && detail.items.length > 0
                ? detail.items.map((it) => it.item_name)
                : r.summary
                  ? [r.summary]
                  : [];
            return {
              slug: r.slug,
              title: r.name,
              price: r.price,
              items,
            };
          }),
        );

        const slugAda = new Set(dariDb.map((p) => p.slug));
        const gabungan = [...dariDb];
        for (const s of statisFallback) {
          if (!slugAda.has(s.slug)) {
            gabungan.push(s);
          }
        }
        return gabungan;
      }
    } catch (err) {
      peringatkan(`paket MCU ${category}`, err);
    }
  }

  return [...statisFallback];
}

/**
 * Ambil satu paket MCU untuk halaman detail (`/pelayanan/mcu/reguler/[slug]`
 * atau `/pelayanan/mcu/holiday/[slug]`).
 */
export async function getPublicMcuPackage(
  category: "reguler" | "holiday",
  slug: string,
): Promise<PublicMcuPackage | null> {
  const statisFallback = category === "holiday" ? MCU_HOLIDAY_PACKAGES : MCU_PACKAGES;
  const db = koneksiKonten();

  if (db) {
    try {
      const found = await findMcuPackage(db, slug);
      if (found) {
        const items =
          found.items.length > 0
            ? found.items.map((it) => it.item_name)
            : found.summary
              ? [found.summary]
              : [];
        return {
          slug: found.slug,
          title: found.name,
          price: found.price,
          items,
        };
      }
    } catch (err) {
      peringatkan(`detail paket MCU "${slug}"`, err);
    }
  }

  const statis = statisFallback.find((p) => p.slug === slug);
  return statis ? { ...statis } : null;
}

/**
 * Dua kategori paket MCU, dinamai dari sudut halaman pengunjung.
 *
 * Halaman publik memisahkan paket reguler dan paket hari raya, sedangkan kolom
 * `mcu_packages.category` di database memakai `reguler` dan
 * `health_meets_holiday`. Selama pemetaan itu tidak ditulis, kategori holiday
 * dikirim apa adanya ke SQL, tidak ada baris yang cocok, dan halaman hari raya
 * diam-diam selalu menampilkan data statis tanpa satu pun tanda bahwa database
 * tidak pernah dibaca. `choice("category", ...)` pada `registry.ts` memuat daftar
 * nilai yang sah, dan itulah yang harus dicocokkan.
 */
export type KategoriMcu = "reguler" | "holiday";

/** Nama kategori di halaman pengunjung ke nilai kolom di database. */
export const KATEGORI_MCU: Record<KategoriMcu, string> = {
  reguler: "reguler",
  holiday: "health_meets_holiday",
};

/**
 * Susun nama dokter dari kolom `title` dan `full_name`.
 *
 * Dua kolom itu tidak boleh disambung begitu saja. `registry.ts` menamai
 * `full_name` sebagai "Nama lengkap" dan `title` sebagai "Gelar", dan data seed
 * memperkuatnya: `full_name` = "Ayu Lestari", `title` = "dr. Sp.JK". Kalau
 * gelar ditempel di depan, hasilnya "dr. Sp.JK Ayu Lestari", sehingga gelar
 * spesialis terbaca seperti nama depan. Itu bukan teori: halaman
 * `/jadwal-dokter` sempat menampilkannya begitu.
 *
 * Satu kolom `title` bisa memuat dua bagian sekaligus, yaitu gelar depan dan
 * penanda spesialis. Keduanya dipisah pada potongan pertama yang diawali `Sp.`,
 * lalu gelar depan diletakkan sebelum nama dan penanda spesialis sesudahnya.
 * Bentuknya jadi sama dengan `DOCTORS` di `src/data/doctors.ts`, misalnya
 * "dr. Annisa Rahma, Sp.A".
 *
 * Spesialisasi lengkap tidak ikut ditambahkan. Nilainya sudah ditampilkan
 * sebagai kolom sendiri di tabel jadwal dan dipakai sebagai pilihan filter,
 * jadi menambahkannya lagi ke nama hanya mengulang informasi yang sama.
 */
export function namaDokter(title: string | null, nama: string): string {
  const namaBersih = nama.trim();
  const gelar = (title ?? "").trim();
  if (gelar === "") return namaBersih;

  const potongan = gelar.split(/\s+/);
  const mulaiSpesialis = potongan.findIndex((t) => /^Sp\./i.test(t));

  const depan = (mulaiSpesialis === -1 ? potongan : potongan.slice(0, mulaiSpesialis))
    .join(" ")
    .trim();
  const belakang =
    mulaiSpesialis === -1 ? "" : potongan.slice(mulaiSpesialis).join(" ").trim();

  const namaLengkap = [depan, namaBersih].filter(Boolean).join(" ").trim();
  return belakang === "" ? namaLengkap : `${namaLengkap}, ${belakang}`;
}

/**
 * Buat slug berbentuk URL dari nama dokter.
 *
 * Dipakai karena tabel `doctors` tidak punya kolom slug, sedangkan halaman
 * publik memakai slug sebagai kunci di `CariDokter`, `JadwalTabel`, dan id
 * jangkar `#dokter-<slug>`. Nama di database unik, jadi slugnya juga unik; itu
 * diperiksa `tests/dokter-publik.test.ts`.
 */
export function slugifyDokter(nama: string): string {
  return nama
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Koneksi database untuk pembacaan konten, atau `null` untuk memakai data statis.
 */
function koneksiKonten(): Db | null {
  try {
    return dbOrNull();
  } catch (err) {
    console.warn(
      `[konten] database dilewati: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

/** Format pesan peringatan yang seragam untuk seluruh pemanggilan repo. */
function peringatkan(konteks: string, err: unknown): void {
  console.warn(
    `[konten] kueri ${konteks} gagal, kembali ke data statis: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
}

/**
 * Ubah satu baris tabel `articles` menjadi bentuk publik.
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
    ...(row.body_html ? { bodyHtml: row.body_html } : {}),
  };
}

/**
 * Ambil berita dari data statis.
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
 * Host yang boleh dilewatkan perkakas optimasi gambar.
 *
 * Daftarnya cermin dari `remotePatterns` di `next.config.ts`. Host di luar
 * daftar — misalnya yang dimasukkan admin sembarangan — tetap memakai `src` apa
 * adanya, supaya `next/image` tidak menolaknya.
 *
 * Fungsi ini ada supaya URL dari host yang memang diizinkan tetap dioptimasi:
 * format WebP, lebar yang dipilih peramban, dan cache `/_next/image`. Sebelum
 * ini setiap `cover_url` dari database dipaksa `unoptimized`, padahal sebagian
 * besar datang dari host yang sudah terdaftar, jadi berita kehilangan optimasi
 * tanpa alasan.
 */
const HOST_DIIZINKAN = ["images.unsplash.com", "picsum.photos"];

export function hostGambarDiizinkan(url: string): boolean {
  for (const host of HOST_DIIZINKAN) {
    if (url.includes(`//${host}/`) || url.endsWith(`//${host}`)) return true;
  }
  return false;
}

/**
 * Sumber foto untuk kartu dan halaman detail berita.
<<<<<<< HEAD
=======
 *
 * Dua kemungkinan, dan keduanya perlu perlakuan berbeda.
 *
 * Kalau admin mengisi `cover_url`, URL itu dipakai apa adanya. Host di luar
 * daftar `HOST_DIIZINKAN` dipaksa tidak dioptimasi. `next/image` hanya mau memuat host yang
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
>>>>>>> origin/main
 */
export function fotoBerita(
  artikel: Pick<PublicArticle, "imageUrl" | "slug">,
  index: number,
  lebar: number,
  tinggi: number,
): { src: string; unoptimized: boolean } {
  if (artikel.imageUrl) {
    return {
      src: artikel.imageUrl,
      // Host di luar daftar tetap ditulis apa adanya: `next/image` menolak host
      // yang tidak terdaftar di `remotePatterns`, dan galat itu muncul sebagai
      // kotak kosong di kartu berita.
      unoptimized: !hostGambarDiizinkan(artikel.imageUrl),
    };
  }

  // Berita tanpa `cover_url` — termasuk seluruh `ARTICLES` statis — dulu selalu
  // memakai putaran `NEWS_PHOTOS` berdasarkan indeks. Indeks tidak tahu isi
  // beritanya, jadi foto yang muncul kebetulan. Yang konteksnya jelas dipetakan
  // lebih dulu; sisanya tetap memakai putaran lama supaya tata letak tidak
  // berubah untuk berita yang memang tidak punya pasangan.
  const peta = artikel.slug
    ? COVER_BERITA.find((c) => c.slug === artikel.slug)
    : undefined;
  if (peta) return { src: photo(peta.foto, lebar, tinggi), unoptimized: false };

  const dasar = NEWS_PHOTOS[index % NEWS_PHOTOS.length];
  return { src: photo(dasar, lebar, tinggi), unoptimized: false };
}

/** `YYYY-MM-DD` dari teks ISO, atau `null` kalau bukan tanggal. */
function tanggalPendek(nilai: string): string | null {
  const cocok = /^(\d{4}-\d{2}-\d{2})/.exec(nilai);
  if (!cocok) return null;
  return cocok[1];
}
