import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Skema database, diturunkan dari `api/migrations/*.sql`.
 *
 * Dua hal di sini tidak bisa ditulis dengan kolom biasa dan harus dijaga
 * pengulangan testnya:
 *
 * * `CHECK` dengan pola regex. Drizzle hanya bisa menulis CHECK sederhana, jadi
 *   yang memakai operator regex PostgreSQL (polanya ~ dan ~*) ditulis sebagai SQL
 *   mentah di `src/server/db/migration-kustom.sql`. Daftar constraint-nya ada di
 *   `tests/schema.test.ts` supaya tidak ada yang hilang diam-diam.
 * * Indeks unik parsial `WHERE is_active`. Drizzle punya `where`, jadi ini bisa
 *   ditulis di sini, tapi hanya sebagian indeks unik. Sisanya ada di migrasi
 *   kustom.
 */

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

/**
 * Uang dalam rupiah dengan dua desimal.
 *
 * Dipakai sebagai `numeric`, bukan `float`. `double precision` menyimpan
 * 1450000.10 sebagai 1450000.0999999999, dan kesalahan seperti itu baru
 * terlihat saat menjumlahkan tagihan.
 */
const numeric12_2 = (name: string) =>
  numeric(name, { precision: 12, scale: 2, mode: "number" });

/** Regex email yang sama persis dengan di constraint PostgreSQL. */
const EMAIL_PATTERN = "'^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'";

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", [
  "super_admin",
  "editor",
  "front_office",
]);

export const serviceType = pgEnum("service_type", [
  "priority",
  "facility",
  "diagnostic",
]);

export const mcuCategory = pgEnum("mcu_category", ["reguler", "health_meets_holiday"]);

/**
 * Status pendaftaran E-Pasien.
 *
 * Enum ini sengaja terpisah dari `submissionStatus`. Pendaftaran punya alur
 * sendiri (masih menunggu, sudah dikonfirmasi, batal, tidak hadir) sementara
 * pengajuan dan pengaduan punya alur penanganan sendiri. Menyamakan keduanya
 * hanya karena sama-sama punya kolom `status` membuat dasbor menghitung
 * `status = 'new'` pada tabel yang tidak punya nilai itu.
 */
export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "no_show",
]);

export const paymentType = pgEnum("payment_type", ["general", "bpjs", "insurance"]);

/** Status pengajuan, kritik dan saran, laporan WBS. */
export const submissionStatus = pgEnum("submission_status", [
  "new",
  "in_progress",
  "resolved",
  "rejected",
]);

export const feedbackType = pgEnum("feedback_type", [
  "suggestion",
  "complaint",
  "praise",
  "question",
]);

export const wbsSeverity = pgEnum("wbs_severity", ["low", "medium", "high"]);

export const documentCategory = pgEnum("document_category", [
  "standar_pelayanan",
  "kompensasi_pelayanan",
  "pengaduan_masyarakat",
  "regulasi_zona_integritas",
  "ppid",
  "brosur",
  "lainnya",
]);

// ---------------------------------------------------------------------------
// Katalog medis
// ---------------------------------------------------------------------------

export const polyclinics = pgTable(
  "polyclinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("polyclinics_slug_unique").on(t.slug),
    index("polyclinics_sort_idx").on(t.isActive, t.sortOrder),
  ],
);

export const specialties = pgTable(
  "specialties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("specialties_slug_unique").on(t.slug),
    // Dua spesialis dengan nama sama akan membuat dropdown poliklinik
    // menampilkan label yang tidak bisa dibedakan.
    uniqueIndex("specialties_name_unique").on(t.name),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    /**
     * Format scrypt dari `src/server/auth/password.ts`:
     * `scrypt$N$r$p$salt$hash`.
     *
     * Panjangnya variabel dan bertambah kalau parameternya dinaikkan, jadi
     * `text` bukan `varchar(255)`.
     */
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    role: userRole("role").notNull().default("front_office"),
    isActive: boolean("is_active").notNull().default(true),
    /**
     * Dinaikkan setiap kali kredensial atau hak akses berubah.
     *
     * Nilainya ikut tersalin ke dalam token sesi sebagai klaim `sv`.
     * Mengganti password, mengubah peran, menonaktifkan akun, atau menghapus
     * akun menaikkan angka ini, dan `requireSession()` menolak token yang
     * angkanya sudah tidak cocok dengan baris di database.
     *
     * Tanpa kolom ini, token stateless hanya bisa dicabut lewat masa
     * kedaluwarsa, jadi akun yang baru dinonaktifkan masih bisa memakai sesi
     * lamanya sampai `SESSION_MAX_AGE_SECONDS` habis — delapan jam secara
     * bawaan.
     */
    sessionVersion: integer("session_version").notNull().default(0),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    // Email selalu dinormalisasi ke huruf kecil oleh aplikasi, tapi indeksnya
    // dibuat case-insensitive supaya "Admin@X.test" dan "admin@x.test" tidak
    // bisa terdaftar dua kali.
    uniqueIndex("users_email_unique").on(sql`lower(${t.email})`),
  ],
);

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable supaya dokter yang belum ditugaskan ke spesialis tidak perlu
    // dibuat kategori "(belum ditentukan)".
    specialtyId: uuid("specialty_id").references(() => specialties.id, {
      onDelete: "set null",
    }),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    title: varchar("title", { length: 120 }),
    photoUrl: text("photo_url"),
    practiceNumber: varchar("practice_number", { length: 60 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("doctors_specialty_id_idx").on(t.specialtyId),
    index("doctors_is_active_idx").on(t.isActive, t.fullName),
  ],
);

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    polyclinicId: uuid("polyclinic_id")
      .notNull()
      .references(() => polyclinics.id, { onDelete: "restrict" }),
    // ISO-8601: 1 = Senin sampai 7 = Minggu. Nilai 0 tidak dipakai supaya
    // konversi dari getDay() di JavaScript (0 = Minggu) selalu terlihat.
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    room: varchar("room", { length: 80 }),
    quota: integer("quota").notNull().default(50),
    note: varchar("note", { length: 200 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    // Satu dokter tidak boleh punya dua blok dengan jam sama di hari yang sama.
    // Ini yang menjaga agar nomor antrean tidak pernah menghitung slot ganda.
    uniqueIndex("doctor_schedules_no_overlap")
      .on(t.doctorId, t.dayOfWeek, t.startTime)
      .where(sql`${t.isActive}`),
    index("doctor_schedules_doctor_day_idx").on(t.doctorId, t.dayOfWeek),
    index("doctor_schedules_polyclinic_day_idx").on(t.polyclinicId, t.dayOfWeek),
    index("doctor_schedules_active_idx").on(t.doctorId, t.isActive),
    check("doctor_schedules_day_range", sql`${t.dayOfWeek} BETWEEN 1 AND 7`),
    check("doctor_schedules_time_order", sql`${t.startTime} < ${t.endTime}`),
    check("doctor_schedules_quota_nonneg", sql`${t.quota} >= 0`),
  ],
);

/**
 * Kuota terpakai per dokter per tanggal.
 *
 * Fungsi tabel ini: menyediakan satu baris yang bisa dikunci dengan
 * `SELECT ... FOR UPDATE` saat menghitung nomor antrean. Tanpa tabel ini,
 * penghitungan harus melakukan "SELECT count(*) lalu INSERT", dan dua
 * permintaan yang datang bersamaan bisa mendapat nomor yang sama.
 */
export const doctorVisitQuotas = pgTable(
  "doctor_visit_quotas",
  {
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    visitDate: date("visit_date").notNull(),
    taken: integer("taken").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [
    primaryKey({ columns: [t.doctorId, t.visitDate] }),
    check("doctor_visit_quotas_taken_nonneg", sql`${t.taken} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Konten
// ---------------------------------------------------------------------------

/**
 * Satu tabel untuk tiga jenis layanan supaya tidak ada duplikasi kolom.
 * URL tetap dibedakan oleh route: `/pelayanan/prioritas/[slug]`,
 * `/pelayanan/fasilitas/[slug]`, `/pelayanan/diagnostik/[slug]`.
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: serviceType("type").notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    tagline: varchar("tagline", { length: 255 }),
    summary: text("summary"),
    // Isi Markdown. API mengembalikan HTML yang sudah disanitasi, bukan
    // Markdown mentah, supaya frontend tidak perlu parser kedua.
    body: text("body"),
    imageUrl: text("image_url"),
    // Nama section Home yang memakai layanan ini, mis. "prioritas". Ada supaya
    // section Home bisa mengambil beberapa item dengan satu query tanpa perlu
    // tahu asal-usul tiap route.
    sectionKey: varchar("section_key", { length: 60 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("services_slug_unique").on(t.slug),
    index("services_type_sort_idx").on(t.type, t.isActive, t.sortOrder),
    index("services_section_idx").on(t.sectionKey, t.isActive, t.sortOrder),
  ],
);

export const mcuPackages = pgTable(
  "mcu_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 180 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    category: mcuCategory("category").notNull().default("reguler"),
    summary: text("summary"),
    description: text("description"),
    // Rupiah tanpa pemisah, mis. 1450000.00. numeric(12,2) supaya pembulatan
    // uang tidak ikut aturan floating point.
    price: numeric12_2("price").notNull(),
    imageUrl: text("image_url"),
    preparation: text("preparation"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("mcu_packages_slug_unique").on(t.slug),
    index("mcu_packages_category_sort_idx").on(t.category, t.isActive, t.sortOrder),
    check("mcu_packages_price_nonneg", sql`${t.price} >= 0`),
  ],
);

export const mcuPackageItems = pgTable(
  "mcu_package_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => mcuPackages.id, { onDelete: "cascade" }),
    groupName: varchar("group_name", { length: 120 }).notNull(),
    itemName: varchar("item_name", { length: 200 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("mcu_package_items_package_idx").on(t.packageId, t.sortOrder)],
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    category: varchar("category", { length: 80 }),
    excerpt: text("excerpt"),
    body: text("body"),
    coverUrl: text("cover_url"),
    author: varchar("author", { length: 160 }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("articles_slug_unique").on(t.slug),
    index("articles_list_idx").on(t.isPublished, t.publishedAt.desc().nullsFirst()),
    index("articles_published_at_idx").on(t.publishedAt.desc().nullsFirst()),
    index("articles_category_idx").on(t.category, t.publishedAt.desc().nullsFirst()),
  ],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Tanpa garis miring depan supaya sama persis dengan segmen catch-all di
    // `src/app/[...slug]/page.tsx`.
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    metaDescription: varchar("meta_description", { length: 320 }),
    metaKeywords: varchar("meta_keywords", { length: 320 }),
    eyebrow: varchar("eyebrow", { length: 120 }),
    summary: text("summary"),
    bodyMarkdown: text("body_markdown"),
    heroImageUrl: text("hero_image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("pages_slug_unique").on(t.slug),
    index("pages_published_idx").on(t.isPublished, t.sortOrder),
  ],
);

export const managementMembers = pgTable(
  "management_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    position: varchar("position", { length: 180 }).notNull(),
    unit: varchar("unit", { length: 120 }),
    photoUrl: text("photo_url"),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("management_members_sort_idx").on(t.isActive, t.sortOrder)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    category: documentCategory("category").notNull().default("lainnya"),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }),
    // Ukuran dalam byte untuk ditampilkan sebagai "1,2 MB".
    fileSize: integer("file_size"),
    year: integer("year"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("documents_slug_unique").on(t.slug),
    index("documents_category_idx").on(t.category, t.isPublished, t.sortOrder),
    check("documents_file_size_nonneg", sql`${t.fileSize} IS NULL OR ${t.fileSize} >= 0`),
  ],
);

export const heroSlides = pgTable(
  "hero_slides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    imageUrl: text("image_url"),
    // URL internal untuk tombol CTA slide, mis.
    // `/pelayanan/prioritas/jantung-terpadu`.
    linkUrl: varchar("link_url", { length: 300 }),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("hero_slides_sort_idx").on(t.isActive, t.sortOrder),
    // Mencegah tautan keluar dari situs pada tombol CTA resmi.
    check(
      "hero_slides_link_internal",
      sql`${t.linkUrl} IS NULL OR ${t.linkUrl} ~ '^/[a-z0-9/_-]*$'`,
    ),
  ],
);

export const awards = pgTable(
  "awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 220 }).notNull(),
    issuer: varchar("issuer", { length: 180 }),
    year: integer("year"),
    imageUrl: text("image_url"),
    linkUrl: varchar("link_url", { length: 300 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("awards_sort_idx").on(t.isActive, t.sortOrder)],
);

export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    caption: text("caption"),
    imageUrl: text("image_url").notNull(),
    category: varchar("category", { length: 80 }),
    takenAt: date("taken_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("gallery_items_sort_idx").on(t.isActive, t.sortOrder),
    index("gallery_items_category_idx").on(t.category, t.sortOrder),
  ],
);

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    roleLabel: varchar("role_label", { length: 160 }),
    quote: text("quote").notNull(),
    photoUrl: text("photo_url"),
    rating: integer("rating"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("testimonials_sort_idx").on(t.isActive, t.sortOrder),
    check(
      "testimonials_rating_range",
      sql`${t.rating} IS NULL OR ${t.rating} BETWEEN 1 AND 5`,
    ),
  ],
);

export const insurancePartners = pgTable(
  "insurance_partners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    logoUrl: text("logo_url"),
    websiteUrl: varchar("website_url", { length: 300 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("insurance_partners_sort_idx").on(t.isActive, t.sortOrder)],
);

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question: varchar("question", { length: 300 }).notNull(),
    answer: text("answer").notNull(),
    category: varchar("category", { length: 80 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [index("faqs_sort_idx").on(t.isActive, t.sortOrder)],
);

// ---------------------------------------------------------------------------
// Data pengunjung
// ---------------------------------------------------------------------------

/**
 * Tidak ada `ON DELETE CASCADE` dari konten ke data pengunjung di seluruh
 * bagian ini. Kalau admin menghapus satu berita atau satu paket MCU, riwayat
 * pendaftaran dan laporan pengaduan harus tetap utuh karena itu arsip, bukan
 * data turunan.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Berbeda dari nomor antrean: kode tiket tetap unik seumur record, sedangkan
    // nomor antrean direset tiap hari.
    ticketCode: varchar("ticket_code", { length: 24 }).notNull(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    polyclinicId: uuid("polyclinic_id")
      .notNull()
      .references(() => polyclinics.id, { onDelete: "restrict" }),
    patientName: varchar("patient_name", { length: 160 }).notNull(),
    /**
     * 16 digit. Formulir memintanya, tapi nilainya tidak pernah disimpan:
     * constraint di bawah hanya menerima 16 angka nol. `NIK_SIMULASI` di
     * `src/server/repo/appointments.ts` yang mengisinya, setelah validasi
     * 16 digit di server.
     */
    nik: varchar("nik", { length: 16 }).notNull(),
    birthDate: date("birth_date"),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    complaint: text("complaint"),
    visitDate: date("visit_date").notNull(),
    // Disimpan denormalisasi supaya riwayat tidak berubah saat admin mengedit
    // jadwal di kemudian hari.
    scheduleId: uuid("schedule_id").references(() => doctorSchedules.id, {
      onDelete: "set null",
    }),
    paymentType: paymentType("payment_type").notNull(),
    queueNumber: integer("queue_number").notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("appointments_ticket_code_unique").on(t.ticketCode),
    // Lapisan kedua pengaman nomor antrean: nomor ganda jadi kegagalan database,
    // bukan record yang tersimpan diam-diam.
    uniqueIndex("appointments_queue_unique").on(t.doctorId, t.visitDate, t.queueNumber),
    /**
     * Anti pendaftaran ganda untuk satu slot.
     *
     * Yang ditegakkan: satu nomor telepon tidak boleh punya dua pendaftaran
     * untuk jadwal yang sama. Itu persis kerusakannya, yaitu satu orang
     * menekan kirim dua kali atau menyimpan halaman lalu mengirim ulang, lalu
     * mendapat dua nomor antrean untuk slot yang sama.
     *
     * Yang SENGAJA tidak ditegakkan: satu nomor telepon boleh mendaftar di dua
     * slot berbeda pada hari yang sama, dan boleh mendaftar ke dokter berbeda
     * pada hari yang sama. Mengunci keduanya akan menolak kegiatan yang sah,
     * misalnya satu orang mengambil antrean di dua poliklinik pada hari yang
     * sama. Bentuk lain yang lebih luas sudah dipetakan di
     * `docs/roadmap.md` bagian 3.13.
     *
     * `schedule_id` boleh `NULL` kalau admin sudah menghapus jadwalnya. Di
     * PostgreSQL, `NULL` pada unique index tidak pernah dianggap sama dengan
     * `NULL` lain, jadi pendaftaran yang jadwalnya sudah hilang tidak ikut
     * saling memblokir. Itu benar: tanpa jadwal, tidak ada slot yang sama.
     */
    uniqueIndex("appointments_phone_schedule_unique").on(t.phone, t.scheduleId),
    index("appointments_doctor_visit_idx").on(t.doctorId, t.visitDate),
    index("appointments_inbox_idx").on(t.status, t.createdAt.desc().nullsFirst()),
    index("appointments_visit_date_idx").on(t.visitDate.desc().nullsFirst()),
    check("appointments_nik_simulasi", sql`${t.nik} ~ '^[0]{16}$'`),
    // Email kosong diterima, tapi kalau diisi harus berbentuk email. Dampar
    // dibatasi di database supaya satu jalur tulis yang lupa validasi tidak
    // bisa memasukkan "bukan email" ke arsip.
    check(
      "appointments_email_format",
      sql`${t.email} IS NULL OR ${t.email} ~* ${sql.raw(EMAIL_PATTERN)}`,
    ),
    check("appointments_queue_positive", sql`${t.queueNumber} > 0`),
  ],
);

export const mcuRegistrations = pgTable(
  "mcu_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketCode: varchar("ticket_code", { length: 24 }).notNull(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => mcuPackages.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    gender: varchar("gender", { length: 20 }),
    birthDate: date("birth_date"),
    companyName: varchar("company_name", { length: 180 }),
    participantCount: integer("participant_count").notNull().default(1),
    preferredDate: date("preferred_date"),
    notes: text("notes"),
    status: submissionStatus("status").notNull().default("new"),
    adminNote: text("admin_note"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("mcu_registrations_ticket_code_unique").on(t.ticketCode),
    index("mcu_registrations_inbox_idx").on(t.status, t.createdAt.desc().nullsFirst()),
    check(
      "mcu_registrations_participants_positive",
      sql`${t.participantCount} > 0 AND ${t.participantCount} <= 50`,
    ),
    // Email kosong diterima, tapi kalau diisi harus berbentuk email. Dampar
    // dibatasi di database supaya satu jalur tulis yang lupa validasi tidak
    // bisa memasukkan "bukan email" ke arsip.
    check(
      "mcu_registrations_email_format",
      sql`${t.email} IS NULL OR ${t.email} ~* ${sql.raw(EMAIL_PATTERN)}`,
    ),
  ],
);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketCode: varchar("ticket_code", { length: 24 }).notNull(),
    type: feedbackType("type").notNull().default("suggestion"),
    // Boleh kosong: pengaduan anonim tetap diterima, tapi kolom yang terisi
    // tetap bisa dipakai front office untuk menghubungi.
    name: varchar("name", { length: 160 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    subject: varchar("subject", { length: 220 }),
    message: text("message").notNull(),
    serviceUnit: varchar("service_unit", { length: 160 }),
    status: submissionStatus("status").notNull().default("new"),
    adminNote: text("admin_note"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("feedbacks_ticket_code_unique").on(t.ticketCode),
    index("feedbacks_inbox_idx").on(t.status, t.createdAt.desc().nullsFirst()),
    index("feedbacks_type_idx").on(t.type, t.createdAt.desc().nullsFirst()),
    // Email kosong diterima, tapi kalau diisi harus berbentuk email. Dampar
    // dibatasi di database supaya satu jalur tulis yang lupa validasi tidak
    // bisa memasukkan "bukan email" ke arsip.
    check(
      "feedbacks_email_format",
      sql`${t.email} IS NULL OR ${t.email} ~* ${sql.raw(EMAIL_PATTERN)}`,
    ),
    check("feedbacks_message_len", sql`length(${t.message}) BETWEEN 10 AND 5000`),
  ],
);

export const wbsReports = pgTable(
  "wbs_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketCode: varchar("ticket_code", { length: 24 }).notNull(),
    subject: varchar("subject", { length: 220 }).notNull(),
    description: text("description").notNull(),
    incidentDate: date("incident_date"),
    location: varchar("location", { length: 180 }),
    involvedUnit: varchar("involved_unit", { length: 160 }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    reporterName: varchar("reporter_name", { length: 160 }),
    reporterEmail: varchar("reporter_email", { length: 255 }),
    reporterPhone: varchar("reporter_phone", { length: 30 }),
    severity: wbsSeverity("severity").notNull().default("medium"),
    status: submissionStatus("status").notNull().default("new"),
    adminNote: text("admin_note"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("wbs_reports_ticket_code_unique").on(t.ticketCode),
    index("wbs_reports_inbox_idx").on(t.status, t.severity, t.createdAt.desc().nullsFirst()),
    // Anonimitas ditegakkan di level database: laporan yang ditandai anonim
    // tidak boleh menyimpan identitas pelapor sama sekali.
    check(
      "wbs_reports_anonymous_no_identity",
      sql`${t.isAnonymous} = false OR (${t.reporterName} IS NULL AND ${t.reporterEmail} IS NULL AND ${t.reporterPhone} IS NULL)`,
    ),
    check(
      "wbs_reports_description_len",
      sql`length(${t.description}) BETWEEN 20 AND 10000`,
    ),
    // Email kosong diterima, tapi kalau diisi harus berbentuk email. Dampar
    // dibatasi di database supaya satu jalur tulis yang lupa validasi tidak
    // bisa memasukkan "bukan email" ke arsip.
    check(
      "wbs_reports_email_format",
      sql`${t.reporterEmail} IS NULL OR ${t.reporterEmail} ~* ${sql.raw(EMAIL_PATTERN)}`,
    ),
  ],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketCode: varchar("ticket_code", { length: 24 }).notNull(),
    serviceUnit: varchar("service_unit", { length: 160 }),
    respondentName: varchar("respondent_name", { length: 160 }),
    respondentEmail: varchar("respondent_email", { length: 255 }),
    // Bentuk jawaban berubah mengikuti pertanyaan survei, jadi disimpan sebagai
    // JSONB. Nilainya sudah dinormalisasi ke skala 1-5 oleh lapisan validasi
    // sebelum disimpan, sehingga agregasi tetap bisa dilakukan di SQL.
    answers: jsonb("answers").$type<Record<string, string | number>>().notNull(),
    overallScore: integer("overall_score").notNull(),
    comment: text("comment"),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("survey_responses_ticket_code_unique").on(t.ticketCode),
    index("survey_responses_score_idx").on(t.overallScore),
    // Membantu dasbor: rata-rata per unit layanan dalam satu query.
    index("survey_responses_unit_score_idx").on(t.serviceUnit, t.overallScore),
    check("survey_responses_score_range", sql`${t.overallScore} BETWEEN 1 AND 5`),
    check("survey_responses_answers_object", sql`jsonb_typeof(${t.answers}) = 'object'`),
    // Email kosong diterima, tapi kalau diisi harus berbentuk email. Dampar
    // dibatasi di database supaya satu jalur tulis yang lupa validasi tidak
    // bisa memasukkan "bukan email" ke arsip.
    check(
      "survey_responses_email_format",
      sql`${t.respondentEmail} IS NULL OR ${t.respondentEmail} ~* ${sql.raw(EMAIL_PATTERN)}`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Operasional
// ---------------------------------------------------------------------------

/**
 * Satu baris per kelas tidur, bukan per ruang fisik, supaya tabel publik tetap
 * ringkas: "Anggrek 2, Kelas VIP, 12 tempat, 9 terisi".
 *
 * `occupiedBeds` dan `reservedBeds` dipisah karena sumbernya berbeda. Terisi
 * berasal dari admisi, sedangkan reservasi berasal dari penundaan yang sudah
 * disepakati tapi pasien belum datang.
 */
export const bedCapacity = pgTable(
  "bed_capacity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wardName: varchar("ward_name", { length: 160 }).notNull(),
    className: varchar("class_name", { length: 80 }).notNull(),
    roomCode: varchar("room_code", { length: 40 }),
    totalBeds: integer("total_beds").notNull().default(0),
    occupiedBeds: integer("occupied_beds").notNull().default(0),
    reservedBeds: integer("reserved_beds").notNull().default(0),
    genderPolicy: varchar("gender_policy", { length: 40 }),
    note: varchar("note", { length: 200 }),
    // Waktu peninjauan manual terakhir, ditampilkan supaya pengunjung bisa
    // menilai seberapa baru angkanya.
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("bed_capacity_ward_class_unique").on(t.wardName, t.className),
    index("bed_capacity_ward_idx").on(t.wardName, t.className),
    check("bed_capacity_total_nonneg", sql`${t.totalBeds} >= 0`),
    check("bed_capacity_occupied_nonneg", sql`${t.occupiedBeds} >= 0`),
    check("bed_capacity_reserved_nonneg", sql`${t.reservedBeds} >= 0`),
    // Bagian yang tidak bisa melayani pasien baru harus selalu punya sisa.
    check(
      "bed_capacity_within_total",
      sql`${t.occupiedBeds} + ${t.reservedBeds} <= ${t.totalBeds}`,
    ),
  ],
);

export const jobVacancies = pgTable(
  "job_vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    department: varchar("department", { length: 160 }).notNull(),
    employmentType: varchar("employment_type", { length: 80 }),
    quota: integer("quota").notNull().default(1),
    requirements: text("requirements"),
    responsibilities: text("responsibilities"),
    deadline: date("deadline"),
    isOpen: boolean("is_open").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("job_vacancies_slug_unique").on(t.slug),
    index("job_vacancies_open_idx").on(t.isOpen, t.deadline),
    check("job_vacancies_quota_positive", sql`${t.quota} > 0 AND ${t.quota} <= 500`),
  ],
);

/**
 * Key-value dengan nilai jsonb supaya bentuk tiap pengaturan bebas berbeda:
 * `nama_rs` berupa string, `jam_operasional` berupa object.
 *
 * Daftar key yang dikenal ada di `src/server/repo/content.ts`. Pembacaan
 * memakai daftar itu, jadi key yang salah ketik tidak membuat baris baru
 * diam-diam; key asing hanya diabaikan.
 */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt,
  updatedAt,
});

/**
 * Pola regex email yang sama persis dengan constraint PostgreSQL, lengkap
 * dengan tanda kutip tunggalnya. Tanpa tanda kutip itu SQL yang dihasilkan
 * tidak valid dan seluruh migrasi gagal tanpa pesan yang berguna.
 *
 * Dibungkus `sql.raw` saat dipakai di dalam template `sql`, karena interpolate
 * biasa akan menjadikannya bind parameter. Regex tidak bisa jadi parameter
 * di operator `~*`, jadi harus disisipkan apa adanya.
 */
export { EMAIL_PATTERN };
