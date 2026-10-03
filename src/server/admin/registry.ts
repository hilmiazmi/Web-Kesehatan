/**
 * Registri tabel untuk CRUD admin generik.
 *
 * Panel admin harus mengelola sekitar dua puluh tabel konten. Menulis satu
 * handler CRUD untuk tiap tabel berarti ribuan baris kode yang isinya nyaris
 * sama, dan setiap perbedaan kecil di antara keduanya adalah tempat bug
 * tersembunyi. Jadi tabel didaftarkan di sini sebagai data, lalu satu handler
 * generik melayani semuanya.
 *
 * Registri ini juga menjadi **daftar putih**. Nama tabel dan kolom untuk INSERT
 * dan UPDATE diambil dari sini, tidak pernah dari request. Tanpa itu,
 * `POST /admin/records/users` dengan `{"password_hash": "..."}` bisa menulis ke
 * kolom yang tidak seharusnya bisa ditulis lewat panel.
 */

/** Jenis nilai yang bisa diisi admin. */
export type FieldKind =
  /** Teks satu baris. */
  | { type: "short" }
  /** Teks banyak baris, disimpan apa adanya di kolom teks. */
  | { type: "long" }
  /** Teks yang dirender jadi HTML di halaman publik. */
  | { type: "markdown" }
  /** URL gambar atau berkas. Hanya http dan https yang diterima. */
  | { type: "url" }
  /** Alamat surel. */
  | { type: "email" }
  /** Nomor telepon Indonesia. */
  | { type: "phone" }
  /** Slug URL: huruf kecil, angka, tanda hubung. */
  | { type: "slug" }
  /** Pilihan dari daftar tetap. */
  | { type: "choice"; allowed: readonly string[] }
  /** Bilangan bulat. */
  | { type: "integer" }
  /** Angka desimal, misalnya harga MCU. */
  | { type: "money" }
  /** Tanggal `YYYY-MM-DD`. Boleh kosong kalau `required` salah. */
  | { type: "date" }
  /** Ya atau tidak. */
  | { type: "boolean" };

/**
 * Satu kolom yang dikelola panel admin.
 *
 * Bentuknya kelas, bukan objek biasa, supaya definisi tabel bisa dirantai:
 * `text("title", "Judul").wajib().panjang(180)`. Method-nya dinamai dalam
 * bahasa Indonesia karena nama dalam bahasa Inggris akan bentrok dengan
 * propertinya: `required` sudah dipakai untuk menyimpan nilai, bukan untuk
 * pemanggil.
 */
export class Field {
  /** Nama kolom di database. */
  readonly column: string;
  /** Nama yang ditampilkan di panel admin. */
  readonly label: string;
  readonly kind: FieldKind;
  required = false;
  /** Batas panjang untuk jenis teks. Diabaikan untuk jenis lain. */
  maxLen = 500;
  /** Nilai bawaan saat membuat baris baru. */
  default?: string;
  /** Field ini tidak boleh diubah lewat panel. */
  locked = false;

  constructor(column: string, label: string, kind: FieldKind) {
    this.column = column;
    this.label = label;
    this.kind = kind;
  }

  /** Wajib diisi. */
  wajib(): this {
    this.required = true;
    return this;
  }

  /** Batas panjang. Diabaikan untuk jenis selain teks. */
  panjang(maxLen: number): this {
    this.maxLen = maxLen;
    return this;
  }

  /** Nilai bawaan saat baris baru dibuat. */
  bawaan(value: string): this {
    this.default = value;
    return this;
  }

  /** Hanya diisi sekali lewat data awal, bukan lewat form panel. */
  terkunci(): this {
    this.locked = true;
    return this;
  }
}

/** Bentuk yang dipakai modul lain. Sama dengan instance `Field`. */
export type FieldSpec = Field;

export type TableSpec = {
  /** Nama tabel, sekaligus nama rute: `/admin/records/articles`. */
  table: string;
  /** Nama untuk judul halaman. */
  label: string;
  /** Nama kolom untuk pencarian teks bebas. */
  searchColumns: readonly string[];
  /** Kolom untuk pengurutan bawaan. */
  defaultOrder: string;
  fields: readonly Field[];
  /** Tabel ini boleh dihapus barisnya. */
  deletable: boolean;
};

/** Helper supaya definisi tabel di bawah tidak repetitif. */
function spec(column: string, label: string, kind: FieldKind): Field {
  return new Field(column, label, kind);
}

function text(column: string, label: string): Field {
  return spec(column, label, { type: "short" });
}
function long(column: string, label: string): Field {
  return spec(column, label, { type: "long" }).panjang(5000);
}
function markdown(column: string, label: string): Field {
  return spec(column, label, { type: "markdown" }).panjang(50_000);
}
function url(column: string, label: string): Field {
  return spec(column, label, { type: "url" }).panjang(1000);
}
function emailField(column: string, label: string): Field {
  return spec(column, label, { type: "email" }).panjang(255);
}
function phoneField(column: string, label: string): Field {
  return spec(column, label, { type: "phone" }).panjang(30);
}
function slugField(column: string, label: string): Field {
  return spec(column, label, { type: "slug" }).panjang(200);
}
function choice(column: string, label: string, allowed: readonly string[]): Field {
  return spec(column, label, { type: "choice", allowed }).panjang(80);
}
function integer(column: string, label: string): Field {
  return spec(column, label, { type: "integer" }).panjang(20);
}
function money(column: string, label: string): Field {
  return spec(column, label, { type: "money" }).panjang(20);
}
function dateField(column: string, label: string): Field {
  return spec(column, label, { type: "date" }).panjang(10);
}
function booleanField(column: string, label: string): Field {
  return spec(column, label, { type: "boolean" }).panjang(5);
}

function sortOrder(): Field {
  return integer("sort_order", "Urutan").wajib().bawaan("0");
}

function activeFlag(): Field {
  return booleanField("is_active", "Aktif").wajib().bawaan("true");
}

function publishedFlag(): Field {
  return booleanField("is_published", "Terbit").wajib().bawaan("true");
}

// ---------------------------------------------------------------------------
// Daftar tabel
// ---------------------------------------------------------------------------

const SERVICES: readonly Field[] = [
  choice("type", "Jenis", ["priority", "facility", "diagnostic"]).wajib(),
  slugField("slug", "Slug").wajib(),
  text("title", "Judul").wajib().panjang(180),
  text("tagline", "Tagline").panjang(255),
  long("summary", "Ringkasan"),
  markdown("body", "Isi (Markdown)"),
  url("image_url", "URL gambar"),
  text("section_key", "Kunci section"),
  sortOrder(),
  activeFlag(),
];

const ARTICLES: readonly Field[] = [
  slugField("slug", "Slug").wajib(),
  text("title", "Judul").wajib().panjang(220),
  text("category", "Kategori").panjang(80),
  long("excerpt", "Ringkasan"),
  markdown("body", "Isi (Markdown)"),
  url("cover_url", "URL sampul"),
  text("author", "Penulis").panjang(160),
  dateField("published_at", "Tanggal terbit").wajib(),
  publishedFlag(),
];

const PAGES: readonly Field[] = [
  slugField("slug", "Slug").wajib(),
  text("title", "Judul").wajib().panjang(220),
  text("eyebrow", "Label kecil").panjang(120),
  long("summary", "Ringkasan"),
  markdown("body_markdown", "Isi (Markdown)"),
  url("hero_image_url", "URL gambar"),
  text("meta_description", "Meta description").panjang(320),
  text("meta_keywords", "Kata kunci").panjang(320),
  sortOrder(),
  publishedFlag(),
];

const MCU_PACKAGES: readonly Field[] = [
  slugField("slug", "Slug").wajib(),
  text("name", "Nama paket").wajib().panjang(180),
  choice("category", "Kategori", ["reguler", "health_meets_holiday"]).wajib(),
  long("summary", "Ringkasan"),
  markdown("description", "Deskripsi (Markdown)"),
  money("price", "Harga").wajib(),
  url("image_url", "URL gambar"),
  markdown("preparation", "Persiapan"),
  sortOrder(),
  activeFlag(),
];

const SPECIALTIES: readonly Field[] = [
  text("name", "Nama spesialis").wajib().panjang(160),
  slugField("slug", "Slug").wajib(),
  sortOrder(),
  activeFlag(),
];

const POLYCLINICS: readonly Field[] = [
  text("name", "Nama poliklinik").wajib().panjang(160),
  slugField("slug", "Slug").wajib(),
  long("description", "Deskripsi"),
  text("location", "Lokasi").panjang(255),
  sortOrder(),
  activeFlag(),
];

const DOCTORS: readonly Field[] = [
  text("full_name", "Nama lengkap").wajib().panjang(200),
  text("title", "Gelar").panjang(120),
  url("photo_url", "URL foto"),
  // Nomor praktik adalah identitas profesi tenaga kesehatan. Di situs fiktif ini
  // tidak boleh diisi dari form admin, jadi hanya diisi sekali lewat data awal.
  text("practice_number", "Nomor praktik").panjang(60).terkunci(),
  activeFlag(),
];

const DOCTOR_SCHEDULES: readonly Field[] = [
  integer("day_of_week", "Hari (1-7)").wajib().bawaan("1"),
  text("start_time", "Jam mulai").wajib().panjang(8),
  text("end_time", "Jam selesai").wajib().panjang(8),
  text("room", "Ruang").panjang(80),
  integer("quota", "Kuota").wajib().bawaan("50"),
  text("note", "Catatan").panjang(200),
  activeFlag(),
];

const HERO_SLIDES: readonly Field[] = [
  text("title", "Judul").wajib().panjang(200),
  text("subtitle", "Subjudul").panjang(255),
  url("image_url", "URL gambar"),
  text("link_url", "Tautan").panjang(300),
  text("alt_text", "Teks alternatif").panjang(255),
  sortOrder(),
  activeFlag(),
];

const AWARDS: readonly Field[] = [
  text("title", "Judul").wajib().panjang(220),
  text("issuer", "Pemberi").panjang(180),
  integer("year", "Tahun"),
  url("image_url", "URL gambar"),
  text("link_url", "Tautan").panjang(300),
  sortOrder(),
  activeFlag(),
];

const GALLERY: readonly Field[] = [
  text("title", "Judul").wajib().panjang(200),
  long("caption", "Keterangan"),
  url("image_url", "URL gambar").wajib(),
  text("category", "Kategori").panjang(80),
  dateField("taken_at", "Tanggal ambil"),
  sortOrder(),
  activeFlag(),
];

const TESTIMONIALS: readonly Field[] = [
  text("display_name", "Nama").wajib().panjang(160),
  text("role_label", "Peran").panjang(160),
  long("quote", "Kutipan").wajib(),
  url("photo_url", "URL foto"),
  integer("rating", "Rating (1-5)"),
  sortOrder(),
  activeFlag(),
];

const INSURANCES: readonly Field[] = [
  text("name", "Nama mitra").wajib().panjang(160),
  url("logo_url", "URL logo"),
  text("website_url", "Situs").panjang(300),
  sortOrder(),
  activeFlag(),
];

const FAQS: readonly Field[] = [
  text("question", "Pertanyaan").wajib().panjang(300),
  long("answer", "Jawaban").wajib(),
  text("category", "Kategori").panjang(80),
  sortOrder(),
  activeFlag(),
];

const DOCUMENTS: readonly Field[] = [
  slugField("slug", "Slug").wajib(),
  text("title", "Judul").wajib().panjang(220),
  choice("category", "Kategori", [
    "standar_pelayanan",
    "kompensasi_pelayanan",
    "pengaduan_masyarakat",
    "regulasi_zona_integritas",
    "ppid",
    "brosur",
    "lainnya",
  ]).wajib(),
  long("description", "Deskripsi"),
  url("file_url", "URL berkas").wajib(),
  text("file_name", "Nama berkas").panjang(255),
  integer("file_size", "Ukuran (byte)"),
  integer("year", "Tahun"),
  sortOrder(),
  publishedFlag(),
];

const MANAGEMENT: readonly Field[] = [
  text("name", "Nama").wajib().panjang(160),
  text("position", "Jabatan").wajib().panjang(180),
  text("unit", "Unit").panjang(120),
  url("photo_url", "URL foto"),
  phoneField("phone", "Telepon"),
  emailField("email", "Surel"),
  sortOrder(),
  activeFlag(),
];

const JOB_VACANCIES: readonly Field[] = [
  slugField("slug", "Slug").wajib(),
  text("title", "Judul posisi").wajib().panjang(200),
  text("department", "Bagian").wajib().panjang(160),
  text("employment_type", "Jenis kontrak").panjang(80),
  integer("quota", "Kuota").wajib().bawaan("1"),
  markdown("requirements", "Persyaratan"),
  markdown("responsibilities", "Tanggung jawab"),
  dateField("deadline", "Batas pendaftaran"),
  booleanField("is_open", "Dibuka").wajib().bawaan("true"),
];

const TABLES: readonly TableSpec[] = [
  {
    table: "services",
    label: "Layanan",
    searchColumns: ["title", "slug", "summary"],
    defaultOrder: "sort_order",
    fields: SERVICES,
    deletable: true,
  },
  {
    table: "articles",
    label: "Berita",
    searchColumns: ["title", "slug", "excerpt"],
    defaultOrder: "published_at",
    fields: ARTICLES,
    deletable: true,
  },
  {
    table: "pages",
    label: "Halaman",
    searchColumns: ["title", "slug"],
    defaultOrder: "sort_order",
    fields: PAGES,
    deletable: true,
  },
  {
    table: "mcu_packages",
    label: "Paket MCU",
    searchColumns: ["name", "slug", "summary"],
    defaultOrder: "sort_order",
    fields: MCU_PACKAGES,
    deletable: true,
  },
  {
    table: "specialties",
    label: "Spesialis",
    searchColumns: ["name", "slug"],
    defaultOrder: "sort_order",
    fields: SPECIALTIES,
    deletable: true,
  },
  {
    table: "polyclinics",
    label: "Poliklinik",
    searchColumns: ["name", "slug"],
    defaultOrder: "sort_order",
    fields: POLYCLINICS,
    deletable: true,
  },
  {
    table: "doctors",
    label: "Dokter",
    searchColumns: ["full_name", "title"],
    defaultOrder: "full_name",
    fields: DOCTORS,
    deletable: true,
  },
  {
    table: "doctor_schedules",
    label: "Jadwal Praktik",
    searchColumns: ["room", "note"],
    defaultOrder: "day_of_week",
    fields: DOCTOR_SCHEDULES,
    deletable: true,
  },
  {
    table: "hero_slides",
    label: "Slide Hero",
    searchColumns: ["title", "subtitle"],
    defaultOrder: "sort_order",
    fields: HERO_SLIDES,
    deletable: true,
  },
  {
    table: "awards",
    label: "Penghargaan",
    searchColumns: ["title", "issuer"],
    defaultOrder: "sort_order",
    fields: AWARDS,
    deletable: true,
  },
  {
    table: "gallery_items",
    label: "Galeri",
    searchColumns: ["title", "caption", "category"],
    defaultOrder: "sort_order",
    fields: GALLERY,
    deletable: true,
  },
  {
    table: "testimonials",
    label: "Testimoni",
    searchColumns: ["display_name", "role_label", "quote"],
    defaultOrder: "sort_order",
    fields: TESTIMONIALS,
    deletable: true,
  },
  {
    table: "insurance_partners",
    label: "Mitra Asuransi",
    searchColumns: ["name"],
    defaultOrder: "sort_order",
    fields: INSURANCES,
    deletable: true,
  },
  {
    table: "faqs",
    label: "FAQ",
    searchColumns: ["question", "answer"],
    defaultOrder: "sort_order",
    fields: FAQS,
    deletable: true,
  },
  {
    table: "documents",
    label: "Dokumen",
    searchColumns: ["title", "slug"],
    defaultOrder: "sort_order",
    fields: DOCUMENTS,
    deletable: true,
  },
  {
    table: "management_members",
    label: "Manajemen",
    searchColumns: ["name", "position", "unit"],
    defaultOrder: "sort_order",
    fields: MANAGEMENT,
    deletable: true,
  },
  {
    table: "job_vacancies",
    label: "Lowongan Kerja",
    searchColumns: ["title", "department", "slug"],
    defaultOrder: "deadline",
    fields: JOB_VACANCIES,
    deletable: true,
  },
];

/**
 * Cari spesifikasi tabel, atau `undefined` kalau nama tidak dikenal.
 *
 * `undefined` berarti request ditolak. Ini yang mencegah
 * `POST /admin/records/users` atau nama tabel acak lain ikut dilayani.
 */
/**
 * Nama jenis field untuk dikirim ke panel.
 *
 * Panel membangun kontrol formulir dari nilai ini, jadi menambah varian baru
 * ke `FieldKind` tanpa menambahkan di sini membuat kolomnya terkirim sebagai
 * `undefined` dan tampil sebagai kotak teks kosong. Dipakai test
 * `registry.test.ts` yang memeriksa semua varian punya nama.
 */
export function kindName(kind: FieldKind): string {
  return kind.type;
}

/** Daftar pilihan untuk field bertipe `choice`, atau `null`. */
export function choicesOf(kind: FieldKind): readonly string[] | null {
  return kind.type === "choice" ? kind.allowed : null;
}

/**
 * Daftar tabel dan kolomnya dalam bentuk yang dikirim ke panel.
 *
 * Panel membangun formulirnya dari respons endpoint ini, jadi daftar kolom di
 * server dan daftar kolom di layar tidak bisa berbeda. Field `locked` ikut
 * dikirim supaya panel bisa menampilkannya sebagai baca-saja, bukan
 * menyembunyikannya: menyembunyikan membuat admin mencari kolom yang tidak ada
 * dan menyimpulkan datanya hilang.
 */
export function describeTables(): { items: unknown[] } {
  return {
    items: all().map((spesifikasi) => ({
      table: spesifikasi.table,
      label: spesifikasi.label,
      default_order: spesifikasi.defaultOrder,
      deletable: spesifikasi.deletable,
      search_columns: spesifikasi.searchColumns,
      fields: spesifikasi.fields.map((kolom) => ({
        column: kolom.column,
        label: kolom.label,
        kind: kindName(kolom.kind),
        required: kolom.required,
        max_len: kolom.maxLen,
        readonly: kolom.locked,
        default: kolom.default ?? null,
        choices: choicesOf(kolom.kind),
      })),
    })),
  };
}

export function find(table: string): TableSpec | undefined {
  return TABLES.find((t) => t.table === table);
}

/** Seluruh daftar tabel, untuk halaman index panel admin. */
export function all(): readonly TableSpec[] {
  return TABLES;
}

/** Jumlah tabel yang dikelola panel admin. */
export function tableCount(): number {
  return TABLES.length;
}

/** Cari satu field di dalam tabel. */
export function field(spesifikasi: TableSpec, column: string): Field | undefined {
  return spesifikasi.fields.find((f) => f.column === column);
}

/** Kolom yang boleh ditulis dari panel admin. */
export function writable(spesifikasi: TableSpec): readonly Field[] {
  return spesifikasi.fields.filter((f) => !f.locked);
}

/**
 * Nama kolom yang boleh dipesan lewat parameter `sort`.
 *
 * Nilai ini disalin ke `ORDER BY` tanpa tanda kutip, jadi harus dicocokkan
 * persis. Inilah alasan daftar putih ini perlu ada.
 */
export function sortableColumns(spesifikasi: TableSpec): Set<string> {
  const set = new Set(spesifikasi.fields.map((f) => f.column));

  // `id`, `created_at`, dan `updated_at` selalu ada di setiap tabel yang ada
  // di sini, tapi tidak selalu dideklarasikan sebagai field yang bisa diisi.
  // Tanpa tiga ini, `?sort=id` ditolak padahal `id` dipakai sebagai pengikat
  // urutan di semua kueri daftar.
  set.add("id");
  set.add("created_at");
  set.add("updated_at");
  return set;
}