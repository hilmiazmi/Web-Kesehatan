//! Registri tabel untuk CRUD admin generik.
//!
//! Panel admin harus mengelola sekitar 20 tabel konten. Menulis satu handler
//! CRUD untuk tiap tabel berarti sekitar 3000 baris kode yang isinya nyaris
//! sama, dan setiap perbedaan kecil di antara keduanya adalah tempat bug
//! tersembunyi. Jadi tabel didaftarkan di sini sebagai data, lalu satu handler
//! generik melayani semuanya.
//!
//! Registri ini juga menjadi **daftar putih**. Nama tabel dan kolom untuk
//! INSERT dan UPDATE diambil dari sini, tidak pernah dari request. Tanpa itu,
//! `POST /admin/records/users` dengan `{"password_hash": "..."}` bisa menulis ke
//! kolom yang tidak seharusnya bisa ditulis lewat panel.

use std::collections::HashSet;
use std::sync::OnceLock;

/// Jenis nilai yang bisa diisi admin.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldKind {
    /// Teks satu baris.
    Short,
    /// Teks banyak baris, disimpan sebagai-is di kolom teks.
    Long,
    /// Teks yang dirender jadi HTML di halaman publik.
    Markdown,
    /// URL gambar atau berkas. Hanya http dan https yang diterima.
    Url,
    /// Alamat surel.
    Email,
    /// Nomor telepon Indonesia.
    Phone,
    /// Slug URL: huruf kecil, angka, tanda hubung.
    Slug,
    /// Pilihan dari daftar tetap.
    Choice(&'static [&'static str]),
    /// Bilangan bulat.
    Integer,
    /// Angka desimal, mis. harga MCU.
    Money,
    /// Tanggal `YYYY-MM-DD`. Boleh kosong kalau `required` false.
    Date,
    /// Ya atau tidak.
    Boolean,
}

#[derive(Debug, Clone, Copy)]
pub struct FieldSpec {
    /// Nama kolom di database.
    pub column: &'static str,
    /// Nama yang ditampilkan di panel admin.
    pub label: &'static str,
    pub kind: FieldKind,
    pub required: bool,
    /// Batas panjang untuk jenis teks. Diabaikan untuk jenis lain.
    pub max_len: usize,
    /// Nilai bawaan saat membuat baris baru.
    pub default: Option<&'static str>,
    /// Field ini tidak boleh diubah lewat panel.
    pub readonly: bool,
}

impl FieldSpec {
    const fn new(column: &'static str, label: &'static str, kind: FieldKind) -> Self {
        Self {
            column,
            label,
            kind,
            required: false,
            max_len: 500,
            default: None,
            readonly: false,
        }
    }

    const fn required(mut self) -> Self {
        self.required = true;
        self
    }

    const fn max(mut self, len: usize) -> Self {
        self.max_len = len;
        self
    }

    const fn with_default(mut self, value: &'static str) -> Self {
        self.default = Some(value);
        self
    }

    /// Kolom ini hanya diisi sekali saat data awal dibuat, bukan lewat form
    /// daftar di panel admin.
    const fn readonly(mut self) -> Self {
        self.readonly = true;
        self
    }
}

#[derive(Debug, Clone, Copy)]
pub struct TableSpec {
    /// Nama tabel, sekaligus nama rute: `/admin/records/articles`.
    pub table: &'static str,
    /// Nama untuk judul halaman.
    pub label: &'static str,
    /// Nama kolom untuk pencarian teks bebas.
    pub search_columns: &'static [&'static str],
    /// Kolom untuk pengurutan bawaan.
    pub default_order: &'static str,
    pub fields: &'static [FieldSpec],
    /// Tabel ini boleh dihapus barisnya. Tabel pengaturan dan akun tidak.
    pub deletable: bool,
}

impl TableSpec {
    pub fn field(&self, column: &str) -> Option<&FieldSpec> {
        self.fields.iter().find(|f| f.column == column)
    }

    /// Kolom yang boleh ditulis dari panel admin.
    pub fn writable(&self) -> impl Iterator<Item = &FieldSpec> {
        self.fields.iter().filter(|f| !f.readonly)
    }
}

// Helper supaya definisi tabel di bawah tidak repetitif.
const fn text(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Short)
}
const fn long(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Long).max(5000)
}
const fn markdown(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Markdown).max(50_000)
}
const fn url(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Url).max(1000)
}
const fn email(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Email).max(255)
}
const fn phone(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Phone).max(30)
}
const fn slug(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Slug).max(200)
}
const fn choice(
    column: &'static str,
    label: &'static str,
    allowed: &'static [&'static str],
) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Choice(allowed)).max(80)
}
const fn integer(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Integer).max(20)
}
const fn money(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Money).max(20)
}
const fn date(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Date).max(10)
}
const fn boolean(column: &'static str, label: &'static str) -> FieldSpec {
    FieldSpec::new(column, label, FieldKind::Boolean).max(5)
}
const fn sort_order() -> FieldSpec {
    integer("sort_order", "Urutan").required().with_default("0")
}
const fn active_flag() -> FieldSpec {
    boolean("is_active", "Aktif")
        .required()
        .with_default("true")
}
const fn published_flag() -> FieldSpec {
    boolean("is_published", "Terbit")
        .required()
        .with_default("true")
}

// ---------------------------------------------------------------------------
// Daftar tabel
// ---------------------------------------------------------------------------

const SERVICES: &[FieldSpec] = &[
    choice("type", "Jenis", &["priority", "facility", "diagnostic"]).required(),
    slug("slug", "Slug").required(),
    text("title", "Judul").required().max(180),
    text("tagline", "Tagline").max(255),
    long("summary", "Ringkasan"),
    markdown("body", "Isi (Markdown)"),
    url("image_url", "URL gambar"),
    text("section_key", "Kunci section"),
    sort_order(),
    active_flag(),
];

const ARTICLES: &[FieldSpec] = &[
    slug("slug", "Slug").required(),
    text("title", "Judul").required().max(220),
    text("category", "Kategori").max(80),
    long("excerpt", "Ringkasan"),
    markdown("body", "Isi (Markdown)"),
    url("cover_url", "URL sampul"),
    text("author", "Penulis").max(160),
    date("published_at", "Tanggal terbit").required(),
    published_flag(),
];

const PAGES: &[FieldSpec] = &[
    slug("slug", "Slug").required(),
    text("title", "Judul").required().max(220),
    text("eyebrow", "Label kecil").max(120),
    long("summary", "Ringkasan"),
    markdown("body_markdown", "Isi (Markdown)"),
    url("hero_image_url", "URL gambar"),
    text("meta_description", "Meta description").max(320),
    text("meta_keywords", "Kata kunci").max(320),
    sort_order(),
    published_flag(),
];

const MCU_PACKAGES: &[FieldSpec] = &[
    slug("slug", "Slug").required(),
    text("name", "Nama paket").required().max(180),
    choice("category", "Kategori", &["reguler", "health_meets_holiday"]).required(),
    long("summary", "Ringkasan"),
    markdown("description", "Deskripsi (Markdown)"),
    money("price", "Harga").required(),
    url("image_url", "URL gambar"),
    markdown("preparation", "Persiapan"),
    sort_order(),
    active_flag(),
];

const SPECIALTIES: &[FieldSpec] = &[
    text("name", "Nama spesialis").required().max(160),
    slug("slug", "Slug").required(),
    sort_order(),
    active_flag(),
];

const POLYCLINICS: &[FieldSpec] = &[
    text("name", "Nama poliklinik").required().max(160),
    slug("slug", "Slug").required(),
    long("description", "Deskripsi"),
    text("location", "Lokasi").max(255),
    sort_order(),
    active_flag(),
];

const DOCTORS: &[FieldSpec] = &[
    text("full_name", "Nama lengkap").required().max(200),
    text("title", "Gelar").max(120),
    url("photo_url", "URL foto"),
    // Nomor praktik adalah identitas profesi tenaga kesehatan. Di situs
    // fiktif ini tidak boleh diisi dari form admin, jadi hanya diisi sekali
    // lewat data awal.
    text("practice_number", "Nomor praktik").max(60).readonly(),
    active_flag(),
];

const DOCTOR_SCHEDULES: &[FieldSpec] = &[
    integer("day_of_week", "Hari (1-7)")
        .required()
        .with_default("1"),
    text("start_time", "Jam mulai").required().max(8),
    text("end_time", "Jam selesai").required().max(8),
    text("room", "Ruang").max(80),
    integer("quota", "Kuota").required().with_default("50"),
    text("note", "Catatan").max(200),
    active_flag(),
];

const HERO_SLIDES: &[FieldSpec] = &[
    text("title", "Judul").required().max(200),
    text("subtitle", "Subjudul").max(255),
    url("image_url", "URL gambar"),
    text("link_url", "Tautan").max(300),
    text("alt_text", "Teks alternatif").max(255),
    sort_order(),
    active_flag(),
];

const AWARDS: &[FieldSpec] = &[
    text("title", "Judul").required().max(220),
    text("issuer", "Pemberi").max(180),
    integer("year", "Tahun"),
    url("image_url", "URL gambar"),
    text("link_url", "Tautan").max(300),
    sort_order(),
    active_flag(),
];

const GALLERY: &[FieldSpec] = &[
    text("title", "Judul").required().max(200),
    long("caption", "Keterangan"),
    url("image_url", "URL gambar").required(),
    text("category", "Kategori").max(80),
    date("taken_at", "Tanggal ambil"),
    sort_order(),
    active_flag(),
];

const TESTIMONIALS: &[FieldSpec] = &[
    text("display_name", "Nama").required().max(160),
    text("role_label", "Peran").max(160),
    long("quote", "Kutipan").required(),
    url("photo_url", "URL foto"),
    integer("rating", "Rating (1-5)"),
    sort_order(),
    active_flag(),
];

const INSURANCES: &[FieldSpec] = &[
    text("name", "Nama mitra").required().max(160),
    url("logo_url", "URL logo"),
    text("website_url", "Situs").max(300),
    sort_order(),
    active_flag(),
];

const FAQS: &[FieldSpec] = &[
    text("question", "Pertanyaan").required().max(300),
    long("answer", "Jawaban").required(),
    text("category", "Kategori").max(80),
    sort_order(),
    active_flag(),
];

const DOCUMENTS: &[FieldSpec] = &[
    slug("slug", "Slug").required(),
    text("title", "Judul").required().max(220),
    choice(
        "category",
        "Kategori",
        &[
            "standar_pelayanan",
            "kompensasi_pelayanan",
            "pengaduan_masyarakat",
            "regulasi_zona_integritas",
            "ppid",
            "brosur",
            "lainnya",
        ],
    )
    .required(),
    long("description", "Deskripsi"),
    url("file_url", "URL berkas").required(),
    text("file_name", "Nama berkas").max(255),
    integer("file_size", "Ukuran (byte)"),
    integer("year", "Tahun"),
    sort_order(),
    published_flag(),
];

const MANAGEMENT: &[FieldSpec] = &[
    text("name", "Nama").required().max(160),
    text("position", "Jabatan").required().max(180),
    text("unit", "Unit").max(120),
    url("photo_url", "URL foto"),
    phone("phone", "Telepon"),
    email("email", "Surel"),
    sort_order(),
    active_flag(),
];

const JOB_VACANCIES: &[FieldSpec] = &[
    slug("slug", "Slug").required(),
    text("title", "Judul posisi").required().max(200),
    text("department", "Bagian").required().max(160),
    text("employment_type", "Jenis kontrak").max(80),
    integer("quota", "Kuota").required().with_default("1"),
    markdown("requirements", "Persyaratan"),
    markdown("responsibilities", "Tanggung jawab"),
    date("deadline", "Batas pendaftaran"),
    boolean("is_open", "Dibuka").required().with_default("true"),
];

const TABLES: &[TableSpec] = &[
    TableSpec {
        table: "services",
        label: "Layanan",
        search_columns: &["title", "slug", "summary"],
        default_order: "sort_order",
        fields: SERVICES,
        deletable: true,
    },
    TableSpec {
        table: "articles",
        label: "Berita",
        search_columns: &["title", "slug", "excerpt"],
        default_order: "published_at",
        fields: ARTICLES,
        deletable: true,
    },
    TableSpec {
        table: "pages",
        label: "Halaman",
        search_columns: &["title", "slug"],
        default_order: "sort_order",
        fields: PAGES,
        deletable: true,
    },
    TableSpec {
        table: "mcu_packages",
        label: "Paket MCU",
        search_columns: &["name", "slug", "summary"],
        default_order: "sort_order",
        fields: MCU_PACKAGES,
        deletable: true,
    },
    TableSpec {
        table: "specialties",
        label: "Spesialis",
        search_columns: &["name", "slug"],
        default_order: "sort_order",
        fields: SPECIALTIES,
        deletable: true,
    },
    TableSpec {
        table: "polyclinics",
        label: "Poliklinik",
        search_columns: &["name", "slug"],
        default_order: "sort_order",
        fields: POLYCLINICS,
        deletable: true,
    },
    TableSpec {
        table: "doctors",
        label: "Dokter",
        search_columns: &["full_name", "title"],
        default_order: "full_name",
        fields: DOCTORS,
        deletable: true,
    },
    TableSpec {
        table: "doctor_schedules",
        label: "Jadwal Praktik",
        search_columns: &["room", "note"],
        default_order: "day_of_week",
        fields: DOCTOR_SCHEDULES,
        deletable: true,
    },
    TableSpec {
        table: "hero_slides",
        label: "Slide Hero",
        search_columns: &["title", "subtitle"],
        default_order: "sort_order",
        fields: HERO_SLIDES,
        deletable: true,
    },
    TableSpec {
        table: "awards",
        label: "Penghargaan",
        search_columns: &["title", "issuer"],
        default_order: "sort_order",
        fields: AWARDS,
        deletable: true,
    },
    TableSpec {
        table: "gallery_items",
        label: "Galeri",
        search_columns: &["title", "caption", "category"],
        default_order: "sort_order",
        fields: GALLERY,
        deletable: true,
    },
    TableSpec {
        table: "testimonials",
        label: "Testimoni",
        search_columns: &["display_name", "role_label", "quote"],
        default_order: "sort_order",
        fields: TESTIMONIALS,
        deletable: true,
    },
    TableSpec {
        table: "insurance_partners",
        label: "Mitra Asuransi",
        search_columns: &["name"],
        default_order: "sort_order",
        fields: INSURANCES,
        deletable: true,
    },
    TableSpec {
        table: "faqs",
        label: "FAQ",
        search_columns: &["question", "answer"],
        default_order: "sort_order",
        fields: FAQS,
        deletable: true,
    },
    TableSpec {
        table: "documents",
        label: "Dokumen",
        search_columns: &["title", "slug"],
        default_order: "sort_order",
        fields: DOCUMENTS,
        deletable: true,
    },
    TableSpec {
        table: "management_members",
        label: "Manajemen",
        search_columns: &["name", "position", "unit"],
        default_order: "sort_order",
        fields: MANAGEMENT,
        deletable: true,
    },
    TableSpec {
        table: "job_vacancies",
        label: "Lowongan Kerja",
        search_columns: &["title", "department", "slug"],
        default_order: "deadline",
        fields: JOB_VACANCIES,
        deletable: true,
    },
];

/// Cari spesifikasi tabel, atau `None` kalau nama tidak dikenal.
///
/// `None` berarti request ditolak. Ini yang mencegah `POST /admin/records/users`
/// atau nama tabel acak lain ikut dilayani.
pub fn find(table: &str) -> Option<&'static TableSpec> {
    TABLES.iter().find(|t| t.table == table)
}

/// Seluruh daftar tabel, untuk halaman index panel admin.
pub fn all() -> &'static [TableSpec] {
    TABLES
}

/// Nama kolom yang boleh dipesan lewat parameter `sort`.
///
/// Nilai ini disalin ke `ORDER BY` tanpa tanda kutip, jadi harus dicocokkan
/// persis. inilah alasan whitelist ini perlu ada.
pub fn sortable_columns(spec: &TableSpec) -> HashSet<&'static str> {
    let mut set: HashSet<&'static str> = spec.fields.iter().map(|f| f.column).collect();
    set.insert("created_at");
    set.insert("updated_at");
    set
}

/// Hindari dependensi `once_cell` hanya untuk satu cache kecil.
pub fn table_count() -> usize {
    static COUNT: OnceLock<usize> = OnceLock::new();
    *COUNT.get_or_init(|| TABLES.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_table_has_a_unique_name() {
        let mut seen = HashSet::new();
        for spec in TABLES {
            assert!(seen.insert(spec.table), "nama tabel ganda: {}", spec.table);
        }
    }

    #[test]
    fn every_field_column_is_unique_within_its_table() {
        for spec in TABLES {
            let mut seen = HashSet::new();
            for field in spec.fields {
                assert!(
                    seen.insert(field.column),
                    "kolom '{}' ganda di tabel {}",
                    field.column,
                    spec.table
                );
            }
        }
    }

    #[test]
    fn search_columns_all_exist_in_the_field_list() {
        // Kolom pencarian yang tidak ada akan membuat query gagal saat runtime,
        // dan hanya ketahuan ketika admin benar-benar mengetik Something.
        for spec in TABLES {
            for column in spec.search_columns {
                assert!(
                    spec.field(column).is_some(),
                    "kolom pencarian '{}' tidak ada di tabel {}",
                    column,
                    spec.table
                );
            }
        }
    }

    #[test]
    fn default_order_is_a_real_column_or_created_at() {
        for spec in TABLES {
            let ok = spec.field(spec.default_order).is_some()
                || spec.default_order == "created_at"
                || spec.default_order == "updated_at";
            assert!(
                ok,
                "urutan '{}' tidak dikenal di tabel {}",
                spec.default_order, spec.table
            );
        }
    }

    #[test]
    fn lookup_rejects_unknown_tables() {
        assert!(find("articles").is_some());
        // Tabel akun dan pengaturan sengaja tidak ada di sini.
        assert!(find("users").is_none());
        assert!(find("site_settings").is_none());
        assert!(find("appointments").is_none());
        assert!(find("feedbacks").is_none());
        assert!(find("").is_none());
        assert!(find("users; DROP TABLE users").is_none());
    }

    #[test]
    fn choice_lists_are_non_empty() {
        for spec in TABLES {
            for field in spec.fields {
                if let FieldKind::Choice(allowed) = field.kind {
                    assert!(
                        !allowed.is_empty(),
                        "pilihan kosong di {}.{}",
                        spec.table,
                        field.column
                    );
                    for option in allowed {
                        assert!(
                            option.len() <= 80,
                            "pilihan terlalu panjang di {}",
                            spec.table
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn slugs_are_required_where_the_table_has_one() {
        // Semua tabel dengan kolom slug mewajibkan slug, karena halaman publik
        // diambil berdasarkan slug.
        for spec in TABLES {
            if let Some(field) = spec.field("slug") {
                assert!(field.required, "slug harus wajib di {}", spec.table);
                assert_eq!(
                    field.kind,
                    FieldKind::Slug,
                    "slug harus jenis slug di {}",
                    spec.table
                );
            }
        }
    }
}
