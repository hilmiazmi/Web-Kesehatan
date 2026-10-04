import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";
import type { Db } from "../client";
import {
  articles,
  awards,
  doctorSchedules,
  doctorVisitQuotas,
  doctors,
  documents,
  faqs,
  galleryItems,
  heroSlides,
  insurancePartners,
  jobVacancies,
  mcuPackageItems,
  mcuPackages,
  pages,
  polyclinics,
  services,
  siteSettings,
  specialties,
  testimonials,
} from "../schema";
import { render, truncateWords } from "../../markdown";
import { isoWeekday } from "./appointments";
import { parseIsoDate } from "../../validation";
import { iso } from "./iso";

/**
 * Pembacaan konten publik.
 *
 * Aturan yang berlaku di seluruh file ini:
 *
 * * Kolom selalu disebutkan satu per satu. Tidak ada `SELECT *`, supaya
 *   menambah kolom baru tidak diam-diam ikut mengubah bentuk respons.
 * * Markdown dirender di sini, bukan di frontend, supaya sanitasi tidak bisa
 *   dilewati dan frontend tidak perlu library parser kedua.
 * * Waktu dikirim sebagai ISO 8601 dengan penanda `Z`. Backend Rust yang
 *   diarsipkan mengirim bentuk `timestamptz::text` milik PostgreSQL yang tidak
 *   bisa langsung dipakai `new Date()` di semua browser.
 */

/** Panjang ringkasan berita. */
export const ARTICLE_EXCERPT_LIMIT = 200;

/** Panjang meta description yang aman untuk mesin pencari. */
export const META_DESCRIPTION_LIMIT = 160;

/** Jumlah berita di section beranda. */
export const HOME_ARTICLE_LIMIT = 8;

// ---------------------------------------------------------------------------
// Katalog medis
// ---------------------------------------------------------------------------

/**
 * Bandingkan kolom enum dengan teks dari permintaan.
 *
 * PostgreSQL menolak nilai yang bukan anggota enum dengan galat
 * `invalid input value for enum`. Jadi `?category=kerjasama` pada tabel yang
 * hanya punya `reguler` dan `health_meets_holiday` akan jadi galat 500, bukan
 * daftar kosong seperti yang biasanya diharap orang.
 *
 * Kolomnya dik-cast ke `text` supaya perbandingannya tidak pernah gagal:
 * nilai yang tidak dikenal harus menghasilkan nol baris, bukan galat. Pola ini
 * sama dengan yang dipakai kueri SQL-mentah di backend Rust.
 */
function eqTeks(kolom: AnyColumn, nilai: string): SQL {
  return sql`${kolom}::text = ${nilai}`;
}

export type SpecialtyRow = { id: string; name: string; slug: string };

export async function listSpecialties(db: Db, onlyActive = true): Promise<SpecialtyRow[]> {
  const rows = await db
    .select({ id: specialties.id, name: specialties.name, slug: specialties.slug })
    .from(specialties)
    .where(onlyActive ? eq(specialties.isActive, true) : undefined)
    .orderBy(asc(specialties.sortOrder), asc(specialties.name));

  return rows;
}

export type PolyclinicRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
};

export async function listPolyclinics(db: Db): Promise<PolyclinicRow[]> {
  return db
    .select({
      id: polyclinics.id,
      name: polyclinics.name,
      slug: polyclinics.slug,
      description: polyclinics.description,
      location: polyclinics.location,
    })
    .from(polyclinics)
    .where(eq(polyclinics.isActive, true))
    .orderBy(asc(polyclinics.sortOrder), asc(polyclinics.name));
}

export type DoctorRow = {
  id: string;
  full_name: string;
  title: string | null;
  photo_url: string | null;
  /**
   * `specialty` dan `specialty_slug` dihapus seluruhnya kalau dokter belum
   * ditugaskan ke spesialis mana pun, bukan dikirim sebagai `null`.
   *
   * Alasannya bentuk lama yang jadi acuan snapshot: frontend memakai
   * `if ("specialty" in dokter)` untuk membedakan "belum ada spesialis" dari
   * "spesialisnya bernama kosong". Mengirim `null` membuat keduanya tidak bisa
   * dibedakan tanpa pemeriksaan tambahan di setiap tempat.
   */
  specialty?: string;
  specialty_slug?: string;
};

const DOCTOR_SELECT = {
  id: doctors.id,
  full_name: doctors.fullName,
  title: doctors.title,
  photo_url: doctors.photoUrl,
  specialty: specialties.name,
  specialty_slug: specialties.slug,
};

export async function listDoctors(
  db: Db,
  filter: { specialty?: string | null } = {},
): Promise<DoctorRow[]> {
  const syarat: SQL[] = [eq(doctors.isActive, true)];
  if (filter.specialty) syarat.push(eq(specialties.slug, filter.specialty));

  const rows = await db
    .select(DOCTOR_SELECT)
    .from(doctors)
    .leftJoin(specialties, eq(doctors.specialtyId, specialties.id))
    .where(and(...syarat))
    // Spesialis dulu, baru nama. Kalau hanya nama, daftar dokter berbalik
    // urutan setiap kali spesialis baru ditambah, dan itu terasa seperti isi
    // halaman yang acak.
    .orderBy(asc(specialties.name), asc(doctors.fullName));

  return rows.map(intoDoctor);
}

export type ScheduleRow = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  polyclinic: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  quota: number;
  /** Catatan dari panel admin, misalnya "khusus BPJS". */
  note: string | null;
  /**
   * Sisa kuota untuk tanggal yang diminta.
   *
   * Hanya terisi di `schedulesOnDate`. Daftar jadwal umum tidak punya tanggal
   * acuan, jadi tidak ada angka yang bisa ditampilkan, dan field ini
   * dibuang dari sana.
   */
  remaining?: number;
};

const SCHEDULE_SELECT = {
  id: doctorSchedules.id,
  doctor_id: doctorSchedules.doctorId,
  doctor_name: doctors.fullName,
  polyclinic: polyclinics.name,
  day_of_week: doctorSchedules.dayOfWeek,
  start_time: doctorSchedules.startTime,
  end_time: doctorSchedules.endTime,
  room: doctorSchedules.room,
  quota: doctorSchedules.quota,
  note: doctorSchedules.note,
};

/**
 * Jadwal dokter, opsional dibatasi satu dokter.
 *
 * `limit` di dalam query, bukan sesudahnya: jadwal aktif satu dokter bisa
 * melebihi sepuluh baris, jadi memotong setelahnya sama sekali tidak hemat.
 */
export async function listSchedules(
  db: Db,
  filter: { doctorId?: string | null } = {},
  limit = 500,
): Promise<ScheduleRow[]> {
  return db
    .select(SCHEDULE_SELECT)
    .from(doctorSchedules)
    .innerJoin(doctors, eq(doctorSchedules.doctorId, doctors.id))
    .innerJoin(polyclinics, eq(doctorSchedules.polyclinicId, polyclinics.id))
    .where(
      and(
        eq(doctorSchedules.isActive, true),
        eq(doctors.isActive, true),
        filter.doctorId ? eq(doctorSchedules.doctorId, filter.doctorId) : undefined,
      ),
    )
    .orderBy(asc(doctorSchedules.dayOfWeek), asc(doctorSchedules.startTime))
    .limit(limit);
}

/**
 * Jadwal aktif satu dokter pada satu tanggal, lengkap dengan sisa kuota.
 *
 * `visitDate` dipakai untuk mengambil `taken` dari `doctor_visit_quotas`,
 * sehingga sisa kuota yang ditampilkan di halaman persis sama dengan angka
 * yang dipakai saat menghitung nomor antrean. Kalau keduanya dihitung dari
 * tabel yang berbeda, halaman bisa menampilkan "tersisa 5" lalu pendaftaran
 * ditolak dengan pesan kuota penuh.
 *
 * Tanggal tanpa jadwal menghasilkan daftar kosong, bukan galat: pemanggil
 * menentukan sendiri tampilannya untuk kasus itu.
 */
export async function jadwalOnDate(
  db: Db,
  doctorId: string,
  visitDate: string,
): Promise<ScheduleRow[]> {
  const hari = isoWeekday(parseIsoDate(visitDate) ?? new Date(`${visitDate}T00:00:00Z`));

  return db
    .select({
      ...SCHEDULE_SELECT,
      remaining: sql<number>`greatest(${doctorSchedules.quota} - coalesce(${doctorVisitQuotas.taken}, 0), 0)`,
    })
    .from(doctorSchedules)
    .innerJoin(doctors, eq(doctorSchedules.doctorId, doctors.id))
    .innerJoin(polyclinics, eq(doctorSchedules.polyclinicId, polyclinics.id))
    .leftJoin(
      doctorVisitQuotas,
      and(
        eq(doctorVisitQuotas.doctorId, doctorSchedules.doctorId),
        eq(doctorVisitQuotas.visitDate, visitDate),
      ),
    )
    .where(
      and(
        eq(doctorSchedules.isActive, true),
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, hari),
      ),
    )
    .orderBy(asc(doctorSchedules.startTime));
}

// ---------------------------------------------------------------------------
// Layanan
// ---------------------------------------------------------------------------

export type ServiceRow = {
  id: string;
  type: string;
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  body_html: string;
  image_url: string | null;
};

const SERVICE_SELECT = {
  id: services.id,
  type: services.type,
  slug: services.slug,
  title: services.title,
  tagline: services.tagline,
  summary: services.summary,
  body: services.body,
  image_url: services.imageUrl,
};

type ServiceRaw = {
  id: string;
  type: string;
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  body: string | null;
  image_url: string | null;
};

function intoService(raw: ServiceRaw): ServiceRow {
  return {
    id: raw.id,
    type: raw.type,
    slug: raw.slug,
    title: raw.title,
    tagline: raw.tagline,
    summary: raw.summary,
    body_html: render(raw.body ?? ""),
    image_url: raw.image_url,
  };
}

/**
 * Daftar layanan, opsional dibatasi jenis dan section beranda.
 *
 * `section` memakai kolom `section_key`, bukan slug, supaya section beranda bisa
 * mengambil enam dan delapan item dengan satu query tanpa perlu tahu asal-usul
 * tiap route.
 */
export async function listServices(
  db: Db,
  filter: { type?: string | null; section?: string | null } = {},
): Promise<ServiceRow[]> {
  const rows = await db
    .select(SERVICE_SELECT)
    .from(services)
    .where(
      and(
        eq(services.isActive, true),
        filter.type ? eqTeks(services.type, filter.type) : undefined,
        filter.section ? eq(services.sectionKey, filter.section) : undefined,
      ),
    )
    .orderBy(asc(services.sortOrder), asc(services.title));

  return rows.map(intoService);
}

export async function findService(db: Db, slug: string): Promise<ServiceRow | null> {
  const rows = await db
    .select(SERVICE_SELECT)
    .from(services)
    .where(and(eq(services.isActive, true), eq(services.slug, slug)))
    .limit(1);

  return rows[0] ? intoService(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Paket MCU
// ---------------------------------------------------------------------------

export type McuPackageRow = {
  slug: string;
  name: string;
  category: string;
  summary: string | null;
  description_html: string;
  image_url: string | null;
  price: number;
};

export type McuItemRow = { group_name: string; item_name: string };

const MCU_SELECT = {
  slug: mcuPackages.slug,
  name: mcuPackages.name,
  category: mcuPackages.category,
  summary: mcuPackages.summary,
  description: mcuPackages.description,
  image_url: mcuPackages.imageUrl,
  price: mcuPackages.price,
};

/**
 * Bentuk sebelum `description_html` dirender.
 *
 * Kolom `description` menyimpan Markdown mentah, dan `id` tidak pernah dikirim
 * ke klien. Karena itu keduanya dikeluarkan secara eksplisit, bukan dengan
 * menyalin sisa objek: dua kebocoran itulah yang pernah membuat respons
 * memuat Markdown mentah di samping HTML yang sudah aman.
 */
type McuPackageRaw = {
  id?: string;
  slug: string;
  name: string;
  category: string;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
};

function intoMcuPackage(raw: McuPackageRaw): McuPackageRow {
  return {
    slug: raw.slug,
    name: raw.name,
    category: raw.category,
    summary: raw.summary,
    image_url: raw.image_url,
    price: raw.price,
    description_html: render(raw.description ?? ""),
  };
}

export async function listMcuPackages(
  db: Db,
  category: string | null = null,
): Promise<McuPackageRow[]> {
  const rows = await db
    .select(MCU_SELECT)
    .from(mcuPackages)
    .where(
      and(
        eq(mcuPackages.isActive, true),
        category ? eqTeks(mcuPackages.category, category) : undefined,
      ),
    )
    .orderBy(asc(mcuPackages.sortOrder), asc(mcuPackages.name));

  return rows.map(intoMcuPackage);
}

export type McuPackageDetail = McuPackageRow & { items: McuItemRow[] };

/**
 * ID paket MCU dari slug-nya, untuk pendaftaran.
 *
 * Hanya paket aktif yang bisa dipilih. Kalau paketnya sudah dinonaktifkan admin
 * sementara formulir masih terbuka di browser, pendaftaran harus ditolak, bukan
 * diterima lalu hilang dari daftar.
 */
export async function packageIdBySlug(db: Db, slug: string): Promise<string | null> {
  const rows = await db
    .select({ id: mcuPackages.id })
    .from(mcuPackages)
    .where(and(eq(mcuPackages.slug, slug), eq(mcuPackages.isActive, true)))
    .limit(1);

  return rows[0]?.id ?? null;
}


export async function findMcuPackage(db: Db, slug: string): Promise<McuPackageDetail | null> {
  const rows = await db
    // `id` tidak ada di `MCU_SELECT` karena tidak dikirim ke klien, tapi
    // dibutuhkan di sini untuk mengambil item pakunya.
    .select({ id: mcuPackages.id, ...MCU_SELECT })
    .from(mcuPackages)
    .where(and(eq(mcuPackages.isActive, true), eq(mcuPackages.slug, slug)))
    .limit(1);

  const found = rows[0];
  if (!found) return null;

  const items = await db
    .select({
      group_name: mcuPackageItems.groupName,
      item_name: mcuPackageItems.itemName,
    })
    .from(mcuPackageItems)
    .where(eq(mcuPackageItems.packageId, found.id))
    .orderBy(asc(mcuPackageItems.sortOrder), asc(mcuPackageItems.groupName));

  return { ...intoMcuPackage(found), items };
}

// ---------------------------------------------------------------------------
// Berita
// ---------------------------------------------------------------------------

export type ArticleSummary = {
  slug: string;
  title: string;
  category: string | null;
  excerpt: string;
  cover_url: string | null;
  author: string | null;
  published_at: string;
};

export type ArticleDetail = ArticleSummary & {
  body_html: string;
  meta_description: string;
  related: ArticleSummary[];
};

const ARTICLE_SUMMARY_SELECT = {
  slug: articles.slug,
  title: articles.title,
  category: articles.category,
  excerpt: articles.excerpt,
  cover_url: articles.coverUrl,
  author: articles.author,
  publishedAt: articles.publishedAt,
};

/** Bentuk hasil query sebelum jadi respons. */
type DoctorRaw = {
  id: string;
  full_name: string;
  title: string | null;
  photo_url: string | null;
  specialty: string | null;
  specialty_slug: string | null;
};

function intoDoctor(raw: DoctorRaw): DoctorRow {
  return {
    id: raw.id,
    full_name: raw.full_name,
    title: raw.title,
    photo_url: raw.photo_url,
    ...(raw.specialty ? { specialty: raw.specialty } : {}),
    ...(raw.specialty_slug ? { specialty_slug: raw.specialty_slug } : {}),
  };
}

type ArticleSummaryRaw = {
  slug: string;
  title: string;
  category: string | null;
  excerpt: string | null;
  cover_url: string | null;
  author: string | null;
  publishedAt: Date | string;
};

function intoSummary(raw: ArticleSummaryRaw): ArticleSummary {
  return {
    slug: raw.slug,
    title: raw.title,
    category: raw.category,
    excerpt: truncateWords(raw.excerpt ?? "", ARTICLE_EXCERPT_LIMIT),
    cover_url: raw.cover_url,
    author: raw.author,
    published_at: iso(raw.publishedAt),
  };
}

/**
 * Daftar berita dan jumlah totalnya.
 *
 * Total dihitung di query yang sama dengan fungsi window `count(*) OVER ()`,
 * jadi tidak ada bolak-balik kedua hanya untuk mengetahui jumlah halaman.
 * Fungsi window tidak mengembalikan baris sama sekali ketika hasil kosong,
 * jadi total harus punya nilai bawaan.
 */
export async function listArticles(
  db: Db,
  options: { limit: number; offset: number; category?: string | null },
): Promise<{ items: ArticleSummary[]; total: number }> {
  const rows = await db
    .select({ ...ARTICLE_SUMMARY_SELECT, total: sql<number>`count(*) over ()` })
    .from(articles)
    .where(
      and(
        eq(articles.isPublished, true),
        options.category ? eq(articles.category, options.category) : undefined,
      ),
    )
    .orderBy(desc(articles.publishedAt), asc(articles.slug))
    .limit(options.limit)
    .offset(options.offset);

  return {
    items: rows.map(intoSummary),
    total: rows[0]?.total ?? 0,
  };
}

export async function findArticle(
  db: Db,
  slug: string,
): Promise<ArticleDetail | null> {
  const rows = await db
    .select({ ...ARTICLE_SUMMARY_SELECT, body: articles.body })
    .from(articles)
    .where(and(eq(articles.isPublished, true), eq(articles.slug, slug)))
    .limit(1);

  const found = rows[0];
  if (!found) return null;

  // Ringkasan ikut memotong excerpt, jadi untuk respons detail diambil ulang
  // dari baris yang sama. Tanpa itu, ringkasan berita yang dipotong 200
  // karakter akan ikut terpotong dua kali.
  const summary = intoSummary(found);

  // Berita terkait hanya diambil kalau kategorinya ada, karena tanpa kategori
  // tidak ada kriteria yang masuk akal selain "berita lain yang terbit juga
  // baru", dan itu menghasilkan daftar yang isinya tidak relevan.
  const related =
    found.category === null
      ? []
      : (
          await db
            .select(ARTICLE_SUMMARY_SELECT)
            .from(articles)
            .where(
              and(
                eq(articles.isPublished, true),
                eq(articles.category, found.category),
                sql`${articles.slug} <> ${found.slug}`,
              ),
            )
            .orderBy(desc(articles.publishedAt))
            .limit(3)
        ).map(intoSummary);

  // Tabel `articles` sengaja tidak punya kolom meta_description. Nilainya
  // diturunkan dari excerpt atau judul, supaya tidak ada dua sumber kebenaran
  // untuk satu hal dan tidak ada meta description yang basi karena tidak
  // ikut diperbarui saat ringkasan ditulis ulang.
  const dasar = found.excerpt?.trim() || found.title;

  return {
    ...summary,
    excerpt: found.excerpt ?? "",
    body_html: render(found.body ?? ""),
    meta_description: truncateWords(dasar, META_DESCRIPTION_LIMIT),
    related,
  };
}

/** Slug halaman yang terbit. Dipakai exporter snapshot. */
export async function listPublishedPageSlugs(db: Db): Promise<string[]> {
  const rows = await db
    .select({ slug: pages.slug })
    .from(pages)
    .where(eq(pages.isPublished, true))
    .orderBy(asc(pages.sortOrder));

  return rows.map((row) => row.slug);
}

// ---------------------------------------------------------------------------
// Halaman statis
// ---------------------------------------------------------------------------

export type PageRow = {
  slug: string;
  title: string;
  eyebrow: string | null;
  summary: string | null;
  body_html: string;
  hero_image_url: string | null;
  meta_description: string;
  meta_keywords: string | null;
};

export async function findPage(db: Db, slug: string): Promise<PageRow | null> {
  const rows = await db
    .select({
      slug: pages.slug,
      title: pages.title,
      eyebrow: pages.eyebrow,
      summary: pages.summary,
      bodyMarkdown: pages.bodyMarkdown,
      heroImageUrl: pages.heroImageUrl,
      metaDescription: pages.metaDescription,
      metaKeywords: pages.metaKeywords,
    })
    .from(pages)
    .where(and(eq(pages.isPublished, true), eq(pages.slug, slug)))
    .limit(1);

  const found = rows[0];
  if (!found) return null;

  // Fallback dihitung lebih dulu supaya `summary` masih bisa dipakai di bawah
  // tanpa perlu menyalinnya ke variabel lain.
  const dasar = found.metaDescription?.trim() || found.summary || found.title;

  return {
    slug: found.slug,
    title: found.title,
    eyebrow: found.eyebrow,
    summary: found.summary,
    body_html: render(found.bodyMarkdown ?? ""),
    hero_image_url: found.heroImageUrl,
    meta_description: truncateWords(dasar, META_DESCRIPTION_LIMIT),
    meta_keywords: found.metaKeywords,
  };
}

// ---------------------------------------------------------------------------
// Dokumen dan lowongan
// ---------------------------------------------------------------------------

export type DocumentRow = {
  slug: string;
  title: string;
  category: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  year: number | null;
};

export async function listDocuments(db: Db, category: string | null = null): Promise<DocumentRow[]> {
  return db
    .select({
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      description: documents.description,
      file_url: documents.fileUrl,
      file_size: documents.fileSize,
      year: documents.year,
    })
    .from(documents)
    .where(
      and(
        eq(documents.isPublished, true),
        category ? eqTeks(documents.category, category) : undefined,
      ),
    )
    .orderBy(asc(documents.sortOrder), asc(documents.title));
}

/**
 * Satu dokumen, dicari lewat slug.
 *
 * Daftar kolomnya disalin ulang dari `listDocuments`, bukan diambil dari sana,
 * karena Drizzle tidak menyediakan cara memakai hasil select lain sebagai
 * select baru. Menjaga keduanya tetap sama adalah tanggung jawab pemanggilnya:
 * kalau ada kolom baru yang ditambahkan ke `DocumentRow`, kedua daftar di atas
 * harus ikut menambahkannya.
 *
 * Dokumen yang belum terbit tidak pernah dikembalikan, sama seperti di
 * `listDocuments`, jadi rute detail tidak bisa jadi jalan pintas untuk membaca
 * dokumen yang sengaja disembunyikan.
 */
export async function findDocument(db: Db, slug: string): Promise<DocumentRow | null> {
  const rows = await db
    .select({
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      description: documents.description,
      file_url: documents.fileUrl,
      file_size: documents.fileSize,
      year: documents.year,
    })
    .from(documents)
    .where(and(eq(documents.isPublished, true), eq(documents.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

export type JobRow = {
  slug: string;
  title: string;
  department: string;
  employment_type: string | null;
  quota: number;
  deadline: string | null;
};

export type JobDetail = JobRow & {
  requirements: string | null;
  responsibilities: string | null;
};

const JOB_SELECT = {
  slug: jobVacancies.slug,
  title: jobVacancies.title,
  department: jobVacancies.department,
  employment_type: jobVacancies.employmentType,
  quota: jobVacancies.quota,
  deadline: jobVacancies.deadline,
};

export async function listJobs(db: Db): Promise<JobRow[]> {
  return db
    .select(JOB_SELECT)
    .from(jobVacancies)
    .where(eq(jobVacancies.isOpen, true))
    .orderBy(desc(jobVacancies.deadline), asc(jobVacancies.title));
}

export async function findJob(db: Db, slug: string): Promise<JobDetail | null> {
  const rows = await db
    .select({
      ...JOB_SELECT,
      requirements: jobVacancies.requirements,
      responsibilities: jobVacancies.responsibilities,
    })
    .from(jobVacancies)
    .where(and(eq(jobVacancies.isOpen, true), eq(jobVacancies.slug, slug)))
    .limit(1);

  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Bagian beranda
// ---------------------------------------------------------------------------

export type HeroSlide = {
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  alt_text: string | null;
};

export type AwardRow = {
  title: string;
  issuer: string | null;
  year: number | null;
  image_url: string | null;
};

export type GalleryRow = {
  title: string;
  caption: string | null;
  image_url: string;
  category: string | null;
};

export type TestimonialRow = {
  display_name: string;
  role_label: string | null;
  quote: string;
  photo_url: string | null;
};

export type InsuranceRow = {
  name: string;
  logo_url: string | null;
  website_url: string | null;
};

export type FaqRow = { question: string; answer: string };

export type SocialLink = { network: string; url: string; label: string };

export type SettingBundle = {
  hospital_name: string;
  tagline: string;
  hospital_type: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  outpatient_hours: string;
  emergency_note: string;
  map_embed_url: string | null;
  social_links: SocialLink[];
  footer_note: string;
};

/** Nilai bawaan setiap pengaturan, dipakai kalau barisnya belum ada. */
export const SETTING_DEFAULTS = {
  hospital_name: "RSUD Contoh Sehat",
  tagline: "Rumah Sehat Untuk Semua",
  hospital_type: "Rumah Sakit Umum Daerah Tipe B",
  address: "Jalan Contoh Sehat Nomor 1, Jakarta Selatan",
  phone: "(021) 5000 0000",
  whatsapp: "+6280000000000",
  email: "info@contoh-sehat.test",
  outpatient_hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  emergency_note: "Instalasi gawat darurat 24 jam",
  map_embed_url: null as string | null,
  social_links: [] as SocialLink[],
  footer_note:
    "Situs demo untuk keperluan portofolio. Nama, kontak, dan seluruh isi bersifat fiktif.",
} as const;

/** Key yang boleh ditulis lewat `PUT /admin/settings`. */
export const WRITABLE_SETTING_KEYS = Object.keys(SETTING_DEFAULTS);

/**
 * Baca pengaturan situs, memakai nilai bawaan untuk key yang belum diisi.
 *
 * Bawaan ada supaya frontend yang berjalan tanpa seed tetap menampilkan nama
 * rumah sakit, bukan kosong.
 */
export async function loadSettings(db: Db): Promise<SettingBundle> {
  const rows = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings);

  const peta = new Map(rows.map((row) => [row.key, row.value]));

  const text = (key: string, fallback: string): string => {
    const value = peta.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
  };

  const rawLinks = peta.get("social_links");
  const social_links: SocialLink[] = Array.isArray(rawLinks)
    ? rawLinks.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const url = (item as Record<string, unknown>).url;
        if (typeof url !== "string" || url.trim() === "") return [];

        const network =
          typeof (item as Record<string, unknown>).network === "string"
            ? ((item as Record<string, unknown>).network as string)
            : "web";
        const label =
          typeof (item as Record<string, unknown>).label === "string"
            ? ((item as Record<string, unknown>).label as string)
            : network;

        return [{ network, url, label }];
      })
    : [];

  const mapUrl = peta.get("map_embed_url");

  return {
    hospital_name: text("hospital_name", SETTING_DEFAULTS.hospital_name),
    tagline: text("tagline", SETTING_DEFAULTS.tagline),
    hospital_type: text("hospital_type", SETTING_DEFAULTS.hospital_type),
    address: text("address", SETTING_DEFAULTS.address),
    phone: text("phone", SETTING_DEFAULTS.phone),
    whatsapp: text("whatsapp", SETTING_DEFAULTS.whatsapp),
    email: text("email", SETTING_DEFAULTS.email),
    outpatient_hours: text("outpatient_hours", SETTING_DEFAULTS.outpatient_hours),
    emergency_note: text("emergency_note", SETTING_DEFAULTS.emergency_note),
    map_embed_url: typeof mapUrl === "string" && mapUrl.trim() !== "" ? mapUrl : null,
    social_links,
    footer_note: text("footer_note", SETTING_DEFAULTS.footer_note),
  };
}

/**
 * Seluruh isi section beranda dalam satu respons.
 *
 * Alasannya satu: halaman beranda punya sebelas section.
 * Kalau tiap section diambil lewat endpoint sendiri, satu kunjungan halaman jadi
 * sebelas bolak-balik, dan itu langsung terasa di VPS dua vCPU.
 */
export type HomeBundle = {
  hero_slides: HeroSlide[];
  priority_services: ServiceRow[];
  facilities: ServiceRow[];
  mcu_packages: McuPackageRow[];
  articles: ArticleSummary[];
  awards: AwardRow[];
  gallery: GalleryRow[];
  testimonials: TestimonialRow[];
  insurance_partners: InsuranceRow[];
  faqs: FaqRow[];
  specialties: SpecialtyRow[];
  settings: SettingBundle;
};

export async function loadHome(db: Db): Promise<HomeBundle> {
  const slid = await db
    .select({
      title: heroSlides.title,
      subtitle: heroSlides.subtitle,
      image_url: heroSlides.imageUrl,
      link_url: heroSlides.linkUrl,
      alt_text: heroSlides.altText,
    })
    .from(heroSlides)
    .where(eq(heroSlides.isActive, true))
    .orderBy(asc(heroSlides.sortOrder));

  const penghargaan = await db
    .select({
      title: awards.title,
      issuer: awards.issuer,
      year: awards.year,
      image_url: awards.imageUrl,
    })
    .from(awards)
    .where(eq(awards.isActive, true))
    .orderBy(asc(awards.sortOrder));

  const galeri = await db
    .select({
      title: galleryItems.title,
      caption: galleryItems.caption,
      image_url: galleryItems.imageUrl,
      category: galleryItems.category,
    })
    .from(galleryItems)
    .where(eq(galleryItems.isActive, true))
    .orderBy(asc(galleryItems.sortOrder));

  const testimoni = await db
    .select({
      display_name: testimonials.displayName,
      role_label: testimonials.roleLabel,
      quote: testimonials.quote,
      photo_url: testimonials.photoUrl,
    })
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.sortOrder));

  const mitra = await db
    .select({
      name: insurancePartners.name,
      logo_url: insurancePartners.logoUrl,
      website_url: insurancePartners.websiteUrl,
    })
    .from(insurancePartners)
    .where(eq(insurancePartners.isActive, true))
    .orderBy(asc(insurancePartners.sortOrder));

  const pertanyaan = await db
    .select({ question: faqs.question, answer: faqs.answer })
    .from(faqs)
    .where(eq(faqs.isActive, true))
    .orderBy(asc(faqs.sortOrder));

  const { items: artikel } = await listArticles(db, {
    limit: HOME_ARTICLE_LIMIT,
    offset: 0,
  });

  return {
    hero_slides: slid,
    priority_services: await listServices(db, { type: "priority", section: "prioritas" }),
    facilities: await listServices(db, { type: "facility", section: "fasilitas" }),
    mcu_packages: await listMcuPackages(db, "reguler"),
    articles: artikel,
    awards: penghargaan,
    gallery: galeri,
    testimonials: testimoni,
    insurance_partners: mitra,
    // Jawaban FAQ dikirim polos, bukan HTML. Yang ini tampil sebagai teks di
    // dalam accordion yang sempit, dan frontend sudah meng-escape-nya sendiri
    // lewat React, jadi merender di server hanya menambah satu langkah yang
    // bisa kelewat.
    faqs: pertanyaan,
    specialties: await listSpecialties(db),
    settings: await loadSettings(db),
  };
}

// ---------------------------------------------------------------------------
// Simpan pengaturan
// ---------------------------------------------------------------------------

export type SettingsInput = Record<string, unknown>;

/**
 * Simpan pengaturan situs dan kembalikan bundel yang sudah diperbarui.
 *
 * Semua key ditulis dalam satu transaksi supaya tidak pernah ada keadaan
 * setengah terperbarui, misalnya nama sudah diganti tapi alamat masih yang lama.
 */
export async function saveSettings(db: Db, input: SettingsInput): Promise<SettingBundle> {
  const prepared: Record<string, unknown> = {};

  for (const key of WRITABLE_SETTING_KEYS) {
    if (!(key in input)) continue;
    prepared[key] = input[key];
  }

  if (Object.keys(prepared).length === 0) {
    throw new Error("Tidak ada pengaturan yang dikirim.");
  }

  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(prepared)) {
      await tx
        .insert(siteSettings)
        .values({ key, value: value as never })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: value as never, updatedAt: new Date() },
        });
    }
  });

  return loadSettings(db);
}

/** Dipakai modul lain agar tidak perlu mengimpor `drizzle-orm` sendiri. */
export { and, asc, desc, eq, isNull, or };