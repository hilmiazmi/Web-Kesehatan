//! Data awal untuk konten: layanan, paket MCU, berita, halaman, section
//! beranda, dokumen, lowongan kerja, dan kapasitas tempat tidur.
//!
//! Semua isi di sini fiktif. Nama orang, kutipan, nama perusahaan, dan tautan
//! dibuat khusus untuk situs demo dan tidak diambil dari rumah sakit mana pun.
//! Foto memakai picsum dengan seed tetap, jadi gambarnya stabil antar jalankan
//! dan sudah terdaftar di `remotePatterns` pada `next.config.ts`.

use sqlx::Transaction;

use crate::error::ApiResult;

type Tx<'a> = Transaction<'a, sqlx::Postgres>;

fn picsum(nama: &str) -> String {
    format!("https://picsum.photos/seed/{nama}/960/640")
}

fn wide(nama: &str) -> String {
    format!("https://picsum.photos/seed/{nama}/1600/700")
}

// ---------------------------------------------------------------------------
// Layanan
// ---------------------------------------------------------------------------

struct ServiceSeed {
    service_type: &'static str,
    slug: &'static str,
    title: &'static str,
    tagline: &'static str,
    summary: &'static str,
    body: &'static str,
    image: &'static str,
    section: Option<&'static str>,
}

/// Enam layanan prioritas dan delapan fasilitas mengikuti urutan tampil di
/// beranda. `load_home` mengambil `section_key` yang tepat lalu mengurutkan
/// berdasarkan `sort_order`.
const SERVICES: &[ServiceSeed] = &[
    ServiceSeed {
        service_type: "priority",
        slug: "jantung-terpadu",
        title: "Layanan Jantung Terpadu",
        tagline: "Diagnosis dan penanganan penyakit jantung dalam satu alur",
        summary: "Pemeriksaan jantung, rekam listrik jantung, dan dokter spesialis jantung yang bekerja sebagai satu tim.",
        body: "## Alur pemeriksaan\n\n1. Pendaftaran di loket rawat jalan.\n2. Rekam listrik jantung.\n3. Konsultasi dengan dokter spesialis jantung.\n\n## Waktu layanan\n\nSenin sampai Jumat, pukul 08.00 sampai 12.00.",
        image: "layanan-jantung",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "priority",
        slug: "stroke-terpadu",
        title: "Layanan Stroke Terpadu",
        tagline: "Penanganan darurat stroke dalam waktu kurang dari satu jam",
        summary: "Tim khusus yang menangani pasien stroke sejak masuk gawat darurat sampai rencana perawatan.",
        body: "Layanan ini menerima pasien suspected stroke tanpa perlu rujukan. Segera datang ke gawat darurat untuk pemeriksaan awal.",
        image: "layanan-stroke",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "priority",
        slug: "maternal-center",
        title: "Maternal Center",
        tagline: "Perawatan kehamilan dan persalinan dengan tim terpadu",
        summary: "Pemeriksaan kehamilan, persalinan, dan perawatan nifas dalam satu gedung.",
        body: "## Layanan\n\n- Pemeriksaan kehamilan rutin\n- Persalinan\n- Perawatan nifas\n\nPendaftaran boleh dilakukan sejak usia kehamilan 12 minggu.",
        image: "layanan-maternal",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "priority",
        slug: "kanker-terpadu",
        title: "Layanan Kanker Terpadu",
        tagline: "Skrining, diagnosis, dan terapi kanker dalam satu alur",
        summary: "Layanan skrining untuk umum dan terapi tumor langsung dari dokter spesialis onkologi.",
        body: "Skrining dilakukan bagi kelompok berisiko tinggi. Jadwal pemeriksaan bisa dilihat di halaman daftar online.",
        image: "layanan-kanker",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "priority",
        slug: "uro-nefrologi",
        title: "Layanan Uro dan Nefrologi",
        tagline: "Penanganan penyakit ginjal dan saluran kemih",
        summary: "Konsultasi dengan dokter spesialis ginjal dan saluran kemih, termasuk layanan hemodialisa.",
        body: "Layanan mencakup pemeriksaan fungsi ginjal, batu saluran kemih, dan terapi hemodialisa.",
        image: "layanan-uro",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "priority",
        slug: "medical-check-up",
        title: "Medical Check Up",
        tagline: "Pemeriksaan kesehatan berkala untuk pekerja",
        summary: "Pemeriksaan kesehatan terencana dengan waktu hasil yang jelas dan bisa diprediksi.",
        body: "Paket medical check up bisa dipilih per kelompok usia dan per kelompok pekerjaan. Daftar paket ada di halaman medical check up.",
        image: "layanan-mcu",
        section: Some("prioritas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "rawat-jalan",
        title: "Rawat Jalan",
        tagline: "Pelayanan poliklinik dan spesialis tanpa perlu rawat inap",
        summary: "Konsultasi dokter umum, dokter spesialis, dan poli khusus dengan sistem antrean daring.",
        body: "Rawat jalan dibuka Senin sampai Jumat. Pendaftaran bisa dilakukan secara daring tanpa datang lebih awal.",
        image: "fasilitas-rawat-jalan",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "rawat-inap",
        title: "Rawat Inap",
        tagline: "Perawatan inap dengan beberapa pilihan kelas",
        summary: "Kamar inap reguler dengan pemantauan harian oleh tim perawat.",
        body: "Ruang inap terdiri dari kelas 1 sampai kelas 3. Kapasitas tersedia dapat dilihat di halaman kapasitas tempat tidur.",
        image: "fasilitas-rawat-inap",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "rawat-inap-khusus",
        title: "Rawat Inap Khusus",
        tagline: "Ruang perawatan intensif untuk pasien yang butuh perhatian khusus",
        summary: "Ruang perawatan intensif dengan rasio perawat lebih tinggi.",
        body: "Ruang diberikan berdasarkan catatan dokter yang memutuskan. Waktu kunjungan dibatasi agar pasien tetap pulih.",
        image: "fasilitas-rawat-inap-khusus",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "instalasi-gawat-darurat",
        title: "Instalasi Gawat Darurat",
        tagline: "Layanan kegawatdaruratan 24 jam setiap hari",
        summary: "Penerimaan pasien gawat darurat 24 jam, termasuk hari libur.",
        body: "Gawat darurat tidak memerlukan rujukan dan menerima pasien semua usia.",
        image: "fasilitas-igd",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "poliklinik",
        title: "Poliklinik",
        tagline: "Konsultasi dokter umum dan dokter spesialis di satu tempat",
        summary: "Poliklinik umum, poliklinik spesialis, serta poliklinik ibu dan anak.",
        body: "Jadwal dokter tersedia di halaman pencarian dokter. Pendaftaran memakai sistem nomor antrean.",
        image: "fasilitas-poliklinik",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "hemodialisa",
        title: "Hemodialisa",
        tagline: "Layanan cuci darah dengan mesin dan tenaga terlatih",
        summary: "Layanan hemodialisa untuk pasien dengan gangguan fungsi ginjal kronis.",
        body: "Sesi dialysis tiga kali seminggu untuk pasien dengan jadwal tetap. Perubahan jadwal dikoordinasikan dengan dokter.",
        image: "fasilitas-hemodialisa",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "facility",
        slug: "rehabilitasi-medis",
        title: "Rehabilitasi Medis",
        tagline: "Pemulihan fungsi gerak setelah cedera atau penyakit",
        summary: "Fisioterapi, terapi okupasi, dan latihan gerak untuk membantu pasien kembali bergerak.",
        body: "Program rehabilitasi ditentukan oleh dokter rehabilitasi setelah pemeriksaan awal.",
        image: "fasilitas-rehabilitasi",
        section: Some("fasilitas"),
    },
    ServiceSeed {
        service_type: "diagnostic",
        slug: "laboratorium",
        title: "Laboratorium",
        tagline: "Pemeriksaan laboratorium dengan hasil pada hari yang sama",
        summary: "Laboratorium klinik untuk pemeriksaan darah, urine, dan pemeriksaan penunjang lain.",
        body: "Pemeriksaan laboratorium umum tidak memerlukan preparation khusus. Sampel darah diambil pagi hari.",
        image: "fasilitas-laboratorium",
        section: None,
    },
    ServiceSeed {
        service_type: "diagnostic",
        slug: "radiologi",
        title: "Radiologi",
        tagline: "Pemeriksaan citra dengan pemeriksaan oleh tim radiografer",
        summary: "Rontgen, tomografi komputer, dan resonansi magnetik.",
        body: "Pemeriksaan radiologi memerlukan rujukan dokter atau dokter spesialis.",
        image: "diagnostik-radiologi",
        section: None,
    },
    ServiceSeed {
        service_type: "diagnostic",
        slug: "elektrokardiogram",
        title: "Elektrokardiogram",
        tagline: "Pemeriksaan aktivitas listrik jantung",
        summary: "Rekam listrik jantung untuk membantu diagnosis gangguan irama.",
        body: "Pemeriksaan memerlukan sekitar lima belas menit dan tidak memerlukan persiapan khusus.",
        image: "diagnostik-ekg",
        section: None,
    },
    ServiceSeed {
        service_type: "diagnostic",
        slug: "spirometri",
        title: "Spirometri",
        tagline: "Pemeriksaan fungsi paru",
        summary: "Pengukuran volume dan aliran udara paru untuk menilai fungsi pernapasan.",
        body: "Pasien diminta menghindari asap rokok dan obat tertentu sebelum pemeriksaan sesuai anjuran dokter.",
        image: "diagnostik-spirometri",
        section: None,
    },
];

pub async fn services(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, seed) in SERVICES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO services (
                type, slug, title, tagline, summary, body, image_url,
                section_key, sort_order
            )
            VALUES ($1::service_type, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (slug) DO UPDATE
               SET type = excluded.type,
                   title = excluded.title,
                   tagline = excluded.tagline,
                   summary = excluded.summary,
                   body = excluded.body,
                   image_url = excluded.image_url,
                   section_key = excluded.section_key,
                   sort_order = excluded.sort_order
            "#,
        )
        .bind(seed.service_type)
        .bind(seed.slug)
        .bind(seed.title)
        .bind(seed.tagline)
        .bind(seed.summary)
        .bind(seed.body)
        .bind(picsum(seed.image))
        .bind(seed.section)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Paket MCU
// ---------------------------------------------------------------------------

struct PackageSeed {
    slug: &'static str,
    name: &'static str,
    category: &'static str,
    summary: &'static str,
    description: &'static str,
    price: i64,
    preparation: &'static str,
    /// `(kelompok, nama pemeriksaan)`
    items: &'static [(&'static str, &'static str)],
}

const PACKAGES: &[PackageSeed] = &[
    PackageSeed {
        slug: "paket-dasar-1",
        name: "MCU Paket Dasar 1",
        category: "reguler",
        summary: "Pemeriksaan darah dasar dan pemeriksaan fisik.",
        description: "Paket paling ringkas untuk pemeriksaan kesehatan dasar.",
        price: 350_000,
        preparation: "Puasa 8 sampai 10 jam sebelum pengambilan darah.",
        items: &[
            ("Pemeriksaan fisik", "Tinggi, berat, lingkar pinggang"),
            ("Darah", "Hemoglobin, leukosit, trombosit"),
            ("Gula darah", "Glukosa Puasa"),
            ("Fungsi ginjal", "Ureum dan kreatinin"),
            ("Fungsi hati", "SGOT dan SGPT"),
            ("Lemak darah", "Kolesterol total, HDL, LDL, trigliserida"),
            ("Air urine", "Urine rutin"),
        ],
    },
    PackageSeed {
        slug: "paket-dasar-2",
        name: "MCU Paket Dasar 2",
        category: "reguler",
        summary: "Pemeriksaan dasar ditambah rekam jantung dan foto toraks.",
        description: "Perluasan dari paket dasar dengan pemeriksaan tambahan jantung.",
        price: 550_000,
        preparation: "Puasa 8 sampai 10 jam sebelum pengambilan darah.",
        items: &[
            ("Pemeriksaan fisik", "Tinggi, berat, lingkar pinggang"),
            ("Darah", "Hemoglobin, leukosit, trombosit"),
            ("Gula darah", "Glukosa Puasa"),
            ("Fungsi ginjal", "Ureum dan kreatinin"),
            ("Fungsi hati", "SGOT dan SGPT"),
            ("Lemak darah", "Kolesterol total, HDL, LDL, trigliserida"),
            ("Air urine", "Urine rutin"),
            ("Jantung", "Rekam listrik jantung"),
            ("Toraks", "Foto rontgen toraks"),
        ],
    },
    PackageSeed {
        slug: "paket-calon-karyawan-pria",
        name: "MCU Paket Calon Karyawan Pria",
        category: "reguler",
        summary: "Pemeriksaan untuk calon pekerja yang akan mulai bekerja.",
        description: "Paket yang umum dipakai perusahaan sebelum mempekerjakan tenaga baru.",
        price: 475_000,
        preparation: "Puasa 8 sampai 10 jam. Bawa surat keterangan dokter dan kartu identitas.",
        items: &[
            ("Pemeriksaan fisik", "Tinggi, berat, lingkar pinggang"),
            ("Darah", "Hemoglobin, leukosit, trombosit"),
            ("Gula darah", "Glukosa Puasa"),
            ("Fungsi ginjal", "Ureum dan kreatinin"),
            ("Fungsi hati", "SGOT dan SGPT"),
            ("Lemak darah", "Kolesterol total, HDL, LDL, trigliserida"),
            ("Air urine", "Urine rutin"),
            ("Jantung", "Rekam listrik jantung"),
            ("Toraks", "Foto rontgen toraks"),
            ("Penglihatan", "Tes ketajaman penglihatan"),
            ("Pendengaran", "Tes pendengaran"),
        ],
    },
    PackageSeed {
        slug: "paket-calon-karyawan-wanita",
        name: "MCU Paket Calon Karyawan Wanita",
        category: "reguler",
        summary: "Pemeriksaan untuk calon pekerja dengan tambahan pemeriksaan khusus.",
        description: "Sama dengan paket calon karyawan pria, ditambah pemeriksaan untuk perempuan.",
        price: 525_000,
        preparation: "Puasa 8 sampai 10 jam. Bawa surat keterangan dokter dan kartu identitas.",
        items: &[
            ("Pemeriksaan fisik", "Tinggi, berat, lingkar pinggang"),
            ("Darah", "Hemoglobin, leukosit, trombosit"),
            ("Gula darah", "Glukosa Puasa"),
            ("Fungsi ginjal", "Ureum dan kreatinin"),
            ("Fungsi hati", "SGOT dan SGPT"),
            ("Lemak darah", "Kolesterol total, HDL, LDL, trigliserida"),
            ("Air urine", "Urine rutin"),
            ("Jantung", "Rekam listrik jantung"),
            ("Toraks", "Foto rontgen toraks"),
            ("Penglihatan", "Tes ketajaman penglihatan"),
            ("Pendengaran", "Tes pendengaran"),
            ("Perempuan", "Pemeriksaan ginekologi"),
        ],
    },
    PackageSeed {
        slug: "paket-eksekutif-pria",
        name: "MCU Paket Eksekutif Pria",
        category: "reguler",
        summary: "Pemeriksaan menyeluruh untuk signifyingessional kedikte.",
        description: "Paket lanjutan dengan lebih banyak parameter penunjang.",
        price: 1_250_000,
        preparation: "Puasa 8 sampai 10 jam. Hindari olahraga berat pada hari sebelumnya.",
        items: &[
            (
                "Pemeriksaan fisik",
                "Tinggi, berat, lingkar pinggang, indeks massa tubuh",
            ),
            ("Darah", "Darah lengkap"),
            ("Gula darah", "Glukosa Puasa dan dua jam setelah makan"),
            ("Lemak darah", "Profil lemak lengkap"),
            ("Fungsi ginjal", "Ureum, kreatinin, asam urat"),
            ("Fungsi hati", "SGOT, SGPT, bilirubin"),
            ("Tiroid", "TSH, FT3, FT4"),
            ("Hepatitis", "HBsAg dan anti HBs"),
            ("Jantung", "Rekam listrik jantung dan echocardiogram"),
            ("Toraks", "Foto rontgen toraks"),
            ("Paru", "Spirometri"),
            ("Penglihatan", "Tes ketajaman penglihatan"),
        ],
    },
    PackageSeed {
        slug: "paket-eksekutif-wanita",
        name: "MCU Paket Eksekutif Wanita",
        category: "reguler",
        summary: "Pemeriksaan menyeluruh dengan pemeriksaan khusus perempuan.",
        description:
            "Sama dengan paket eksekutif pria, ditambah mammografi dan pemeriksaan ginekologi.",
        price: 1_450_000,
        preparation: "Puasa 8 sampai 10 jam. Hindari konsumsi produk susu sebelum pemeriksaan.",
        items: &[
            (
                "Pemeriksaan fisik",
                "Tinggi, berat, lingkar pinggang, indeks massa tubuh",
            ),
            ("Darah", "Darah lengkap"),
            ("Gula darah", "Glukosa Puasa dan dua jam setelah makan"),
            ("Lemak darah", "Profil lemak lengkap"),
            ("Fungsi ginjal", "Ureum, kreatinin, asam urat"),
            ("Fungsi hati", "SGOT, SGPT, bilirubin"),
            ("Tiroid", "TSH, FT3, FT4"),
            ("Hepatitis", "HBsAg dan anti HBs"),
            ("Jantung", "Rekam listrik jantung dan echocardiogram"),
            ("Toraks", "Foto rontgen toraks"),
            ("Paru", "Spirometri"),
            ("Perempuan", "Mammografi, ginekologi, dan pap smear"),
        ],
    },
    PackageSeed {
        slug: "paket-pemeriksaan-bebas-narkotik",
        name: "MCU Pemeriksaan Bebas Narkotik",
        category: "reguler",
        summary: "Pemeriksaan untuk keperluan administratif dan tester kerja.",
        description: "Digunakan untuk keperluan pengajuan kerja dan pemeriksaan tambahan.",
        price: 300_000,
        preparation: "Tidak memerlukan persiapan khusus. Sampel air urine diambil di tempat.",
        items: &[
            ("Wawancara", "Wawancara dengan petugas kesehatan"),
            ("Air urine", "Tes metamfetamin dan marijuana"),
        ],
    },
    PackageSeed {
        slug: "anak-sekolah-basic",
        name: "MCU Anak Sekolah Basic",
        category: "health_meets_holiday",
        summary: "Pemeriksaan kesehatan yang mudah dilakukan pada hari sekolah.",
        description: "Program pemeriksaan anak sekolah dengan metode yang cepat.",
        price: 50_000,
        preparation: "Tidak memerlukan persiapan khusus.",
        items: &[
            ("Tinggi dan berat", "Pengukuran tinggi dan berat badan"),
            ("Penglihatan", "Tes ketajaman penglihatan"),
            ("Gigi", "Pemeriksaan gigi"),
        ],
    },
    PackageSeed {
        slug: "anak-sekolah-medical",
        name: "MCU Anak Sekolah Medical",
        category: "health_meets_holiday",
        summary: "Pemeriksaan kesehatan anak sekolah dengan pemeriksaan darah.",
        description: "Program pemeriksaan anak sekolah yang sudah termasuk pemeriksaan darah.",
        price: 95_000,
        preparation: "Puasa 4 sampai 6 jam sebelum pengambilan darah.",
        items: &[
            ("Tinggi dan berat", "Pengukuran tinggi dan berat badan"),
            ("Penglihatan", "Tes ketajaman penglihatan"),
            ("Pendengaran", "Tes pendengaran"),
            ("Gigi", "Pemeriksaan gigi"),
            ("Darah", "Hemoglobin"),
        ],
    },
    PackageSeed {
        slug: "screening-cancer-male",
        name: "Skrining Kanker Pria",
        category: "health_meets_holiday",
        summary: "Skrining kanker prostat pada pria berusia 40 tahun atau lebih.",
        description: "Program skrining untuk pria dengan usia 40 tahun atau lebih.",
        price: 150_000,
        preparation: "Tidak memerlukan persiapan khusus.",
        items: &[
            ("Wawancara", "Riwayat keluarga dan gaya hidup"),
            ("Prostat", "Pemeriksaan prostat"),
            ("Ultrasound", "Ultrasonografi prostat"),
            ("Laboratorium", "PSA total"),
        ],
    },
];

pub async fn mcu(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, seed) in PACKAGES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO mcu_packages (
                slug, name, category, summary, description, price,
                image_url, preparation, sort_order
            )
            VALUES ($1, $2, $3::mcu_category, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (slug) DO UPDATE
               SET name = excluded.name,
                   category = excluded.category,
                   summary = excluded.summary,
                   description = excluded.description,
                   price = excluded.price,
                   image_url = excluded.image_url,
                   preparation = excluded.preparation,
                   sort_order = excluded.sort_order
            "#,
        )
        .bind(seed.slug)
        .bind(seed.name)
        .bind(seed.category)
        .bind(seed.summary)
        .bind(seed.description)
        .bind(seed.price)
        .bind(picsum(seed.slug))
        .bind(seed.preparation)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;

        for (position, (group, item)) in seed.items.iter().enumerate() {
            sqlx::query(
                r#"
                INSERT INTO mcu_package_items (package_id, group_name, item_name, sort_order)
                SELECT p.id, $2, $3, $4
                  FROM mcu_packages p
                 WHERE p.slug = $1
                   AND NOT EXISTS (
                         SELECT 1 FROM mcu_package_items i
                          WHERE i.package_id = p.id
                            AND i.item_name = $3
                       )
                "#,
            )
            .bind(seed.slug)
            .bind(group)
            .bind(item)
            .bind(position as i32)
            .execute(&mut **tx)
            .await?;
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Berita
// ---------------------------------------------------------------------------

/// `(slug, judul, kategori, ringkasan, isi, seed gambar)`
const ARTICLES: &[(&str, &str, &str, &str, &str, &str)] = &[
    (
        "jam-layanan-dalam-purna",
        "Jam Layanan Dalam Purna Tetap Buka",
        "pelayanan",
        "Gawat darurat dan layanan penunjang tetap buka 24 jam, termasuk hari libur.",
        "## Jam layanan\n\nGawat darurat buka 24 jam setiap hari tanpa hari libur.\n\n## Layanan yang tetap buka\n\n- Instalasi gawat darurat\n- Laboratorium gawat darurat\n- Apotek gawat darurat",
        "berita-jam-layanan",
    ),
    (
        "pendaftaran-online-tersedia",
        "Pendaftaran Online Sudah Tersedia",
        "pelayanan",
        "Pasien bisa memesan nomor antrean tanpa datang lebih awal ke rumah sakit.",
        "Pendaftaran daring mengurangi waktu tunggu di loket. Nomor antrean berlaku pada tanggal dan blok praktik yang dipilih.",
        "berita-pendaftaran",
    ),
    (
        "skrining-kanker-wanita-diperluas",
        "Skrining Kanker Wanita Diperluas",
        "pelayanan",
        "Layanan skrining kini mencakup rentang usia yang lebih luas dengan harga bersubsidi.",
        "Pasien yang ingin mengikuti skrining bisa mendaftar melalui halaman daftar online. Daftar paket ada di halaman medical check up.",
        "berita-skrining",
    ),
    (
        "kelas-pelatihan-tenaga-kesehatan",
        "Kelas Pelatihan Tenaga Kesehatan",
        "kegiatan",
        "Pelatihan tiga hari untuk tenaga kesehatan yang akanutherland bekerja di sini.",
        "Pelatihan ini dilakukan setiap tiga bulan dan dibuka untuk tenaga kesehatan yang terdaftar.",
        "berita-pelatihan",
    ),
    (
        "kerja-sama-layanan-rujukan",
        "Kerja Sama Layanan Rujukan",
        "kegiatan",
        "Fasilitas rujukan kegawatdaruratan kini terhubung dengan tiga puskesmas terdekat.",
        "Kerja sama ini membuat rujukan lebih cepat tercatat dan pasien yang memerlukan rujukan tidak perlu menulis ulang riwayat.",
        "berita-kerja-sama",
    ),
    (
        "program-pencegahan-stunting",
        "Program Pencegahan Stunting",
        "program",
        "Pemantauan tumbuh kembang anak dilakukan sejak awal kehamilan.",
        "Program ini mencakup pemantauan berat badan, tinggi badan, dan pemberian vitamin.",
        "berita-stunting",
    ),
    (
        "peresmian-ruang-perawatan-baru",
        "Peresmian Ruang Perawatan Baru",
        "kegiatan",
        "Dua puluh tempat tidur baru dibuka untuk mengurangi waktu tunggu.",
        "Ruang baru mengurangi waktu tunggu inap dan menambah kapasitas pemantauan.",
        "berita-ruang-baru",
    ),
    (
        "sosialisasi-program-zona-integritas",
        "Sosialisasi Program Zona Integritas",
        "program",
        "Sosialisasi dilakukan bersama seluruh pegawai dan mitra.",
        "Program zona integritas mencakup hal yang mudah diakses warga, termasuk layanan pengaduan.",
        "berita-zona-integritas",
    ),
    (
        "pemeriksaan-kesehatan-gratis",
        "Pemeriksaan Kesehatan Gratis untuk Warga",
        "program",
        "Pemeriksaan kesehatan dasar gratis setiap satu tahun sekali.",
        "Warga bisa mengikuti pemeriksaan dasar tanpa biaya setelah mendaftar lebih dulu.",
        "berita-pemeriksaan-gratis",
    ),
    (
        "pelatihan-manajemen-keselamatan",
        "Pelatihan Manajemen Keselamatan",
        "kegiatan",
        "Petugas diberi pelatihan tanggap darurat dan pencegahan kebakaran.",
        "Pelatihan dilakukan rutin dan wajib diikuti seluruh petugas yang bertugas.",
        "berita-manajemen-keselamatan",
    ),
];

pub async fn articles(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (slug, title, category, excerpt, body, image)) in ARTICLES.iter().enumerate() {
        // Tanggal terbit dimundurkan satu per artikel supaya urutannya sama di
        // setiap menjalankan seed, bukan semuanya bertanggal hari ini.
        sqlx::query(
            r#"
            INSERT INTO articles (
                slug, title, category, excerpt, body, cover_url,
                author, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Humas RSUD Contoh Sehat',
                   now() - make_interval(days => $7))
            ON CONFLICT (slug) DO UPDATE
               SET title = excluded.title,
                   category = excluded.category,
                   excerpt = excluded.excerpt,
                   body = excluded.body,
                   cover_url = excluded.cover_url
            "#,
        )
        .bind(slug)
        .bind(title)
        .bind(category)
        .bind(excerpt)
        .bind(body)
        .bind(format!("https://picsum.photos/seed/{image}/960/540"))
        .bind(index as i32 * 3 + 2)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Halaman statis
// ---------------------------------------------------------------------------

/// `(slug, judul, deskripsi meta, ringkasan, isi)`
///
/// Slug disimpan tanpa garis miring. Endpoint `GET /pages/{slug}` hanya
/// menerima satu segmen, jadi halaman bersarang seperti `/tentang-kami/profile`
/// memakai kata terakhir dari alurnya sebagai slug.
const PAGES: &[(&str, &str, &str, &str, &str)] = &[
    (
        "tentang-kami",
        "Tentang Kami",
        "Profil singkat RSUD Contoh Sehat dan sejarah keberadaannya.",
        "RSUD Contoh Sehat adalah rumah sakit umum daerah fiktif untuk bahan portofolio.",
        "## Tentang kami\n\nRSUD Contoh Sehat adalah rumah sakit fiktif. Seluruh nama, kontak, dan isi situs ini dibuat khusus untuk keperluan portofolio.\n\n## Sejarah singkat\n\nInstitusi ini berdiri pada tahun 1970 dan terus berkembang hingga menjadi rumah sakit dengan layanan rawat jalan dan rawat inap.",
    ),
    (
        "profile",
        "Profil Rumah Sakit",
        "Visi, misi, dan tata kelola rumah sakit.",
        "Visi, misi, dan tata kelola rumah sakit.",
        "## Visi\n\nMenjadi rumah sakit pilihan yang melayani seluruh lapisan masyarakat.\n\n## Misi\n\n1. Menyediakan pelayanan kesehatan yang terjangkau.\n2. Meningkatkan mutu dan keselamatan pasien.\n3. Meningkatkan kompetensi tenaga kesehatan.",
    ),
    (
        "visi-misi",
        "Visi dan Misi",
        "Visi dan misi rumah sakit.",
        "Arah rumah sakit ke depan.",
        "Visi dan misi dirumuskan bersama seluruh pimpinan unit kerja dan ditinjau setiap tahun.",
    ),
    (
        "manajemen",
        "Manajemen",
        "Susunan manajemen rumah sakit.",
        "Nama dan jabatan manajemen rumah sakit.",
        "Susunan manajemen dapat dilihat di halaman ini. Data di bawah ini bersifat fiktif.",
    ),
    (
        "kontak",
        "Kontak",
        "Alamat, nomor telepon, dan jam layanan rumah sakit.",
        "Alamat dan nomor telepon rumah sakit.",
        "## Alamat\n\nJalan Contoh Sehat Nomor 1, Jakarta Selatan.\n\n## Telepon\n\n(021) 5000 0000\n\n## Jam layanan\n\nSenin sampai Jumat untuk rawat jalan, 24 jam untuk gawat darurat.",
    ),
    (
        "kapasitas-bed",
        "Kapasitas Tempat Tidur",
        "Jumlah tempat tidur yang tersedia per kelas perawatan.",
        "Jumlah tempat tidur yang tersedia per kelas perawatan.",
        "Angka pada halaman ini berasal dari peninjauan manual dan waktu peninjauan dicantumkan.",
    ),
    (
        "ppid",
        "Permintaan dan Informasi Publik",
        "Prosedur permintaan informasi publik.",
        "Prosedur permintaan informasi publik.",
        "Permintaan informasi publik diajukan secara tertulis dan dijawab sesuai batas waktu yang berlaku.",
    ),
    (
        "zona-integritas",
        "Zona Integritas",
        "Program zona integritas dan cara menyampaikan pengaduan.",
        "Program zona integritas dan layanan pengaduan.",
        "Zona integritas adalah program untuk mencegah gratifikasi dan manipulasi. Pengaduan dapat disampaikan melalui layanan pengaduan.",
    ),
    (
        "disclaimer",
        "Disclaimer",
        "Batasan isi situs dan penafian informasi medis.",
        "Batasan isi situs dan penafian informasi medis.",
        "Seluruh isi situs ini bersifat informasi umum dan tidak menggantikan pemeriksaan dokter.",
    ),
    (
        "privasi",
        "Kebijakan Privasi",
        "Bagaimana data pengunjung dikumpulkan dan disimpan.",
        "Kebijakan privasi situs.",
        "Data yang dikirim melalui formulir hanya dipakai untuk keperluanpemrosesan pengajuan.",
    ),
    (
        "informasi-publik",
        "Informasi Publik",
        "Daftar informasi publik yang tersedia.",
        "Daftar informasi publik yang tersedia.",
        "Daftar informasi publik dapat diunduh pada halaman dokumen.",
    ),
];

pub async fn pages(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (slug, title, description, summary, body)) in PAGES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO pages (slug, title, meta_description, summary, body_markdown, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (slug) DO UPDATE
               SET title = excluded.title,
                   meta_description = excluded.meta_description,
                   summary = excluded.summary,
                   body_markdown = excluded.body_markdown,
                   sort_order = excluded.sort_order
            "#,
        )
        .bind(slug)
        .bind(title)
        .bind(description)
        .bind(summary)
        .bind(body)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Section beranda
// ---------------------------------------------------------------------------

pub async fn home_sections(tx: &mut Tx<'_>) -> ApiResult<()> {
    slides(tx).await?;
    awards(tx).await?;
    gallery(tx).await?;
    testimonials(tx).await?;
    partners(tx).await?;
    faqs(tx).await?;
    management(tx).await?;
    Ok(())
}

/// `(judul, subjudul, gambar, tautan, teks alt)`
///
/// `link_url` dibatasi tautan internal oleh CHECK di database, jadi semua
/// nilai di sini diawali garis miring.
const SLIDES: &[(&str, &str, &str, &str, &str)] = &[
    (
        "Pelayanan Terpadu",
        "Satu tempat untuk memeriksa kesehatan keluarga",
        "slide-1",
        "/pelayanan",
        "banner layanan terpadu",
    ),
    (
        "Daftar Online",
        "Ambil nomor antrean tanpa datang lebih awal",
        "slide-2",
        "/daftar-online",
        "banner daftar online",
    ),
    (
        "Gawat Darurat 24 Jam",
        "Buka setiap hari, termasuk hari libur",
        "slide-3",
        "/pelayanan/medis/instalasi-gawat-darurat",
        "banner gawat darurat",
    ),
    (
        "Medical Check Up",
        "Pemeriksaan kesehatan berkala untuk pekerja",
        "slide-4",
        "/pelayanan/prioritas/medical-check-up",
        "banner medical check up",
    ),
];

async fn slides(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (title, subtitle, image, link, alt)) in SLIDES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO hero_slides (title, subtitle, image_url, link_url, alt_text, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(title)
        .bind(subtitle)
        .bind(wide(image))
        .bind(link)
        .bind(alt)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(judul, pemberi, tahun, seed gambar)`
const AWARDS: &[(&str, &str, i32, &str)] = &[
    (
        "Penghargaan Pelayanan Kesehatan",
        "Kementerian Kesehatan RI",
        2024,
        "penghargaan-pelayanan",
    ),
    (
        "Penghargaan Inovasi Layanan",
        "Pemerintah Provinsi",
        2023,
        "penghargaan-inovasi",
    ),
    (
        "Sertifikat Akreditasi",
        "Badan Akreditasi Nasional",
        2025,
        "akreditasi",
    ),
    (
        "Penghargaan Kebersihan",
        "Pemerintah Kabupaten",
        2023,
        "penghargaan-kebersihan",
    ),
];

async fn awards(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (title, issuer, year, image)) in AWARDS.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO awards (title, issuer, year, image_url, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(title)
        .bind(issuer)
        .bind(*year)
        .bind(format!("https://picsum.photos/seed/{image}/480/480"))
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(judul, keterangan, kategori, seed gambar)`
const GALLERY: &[(&str, &str, &str, &str)] = &[
    (
        "Gedung Poliklinik",
        "Tampak depan gedung poliklinik.",
        "gedung",
        "gedung-poliklinik",
    ),
    (
        "Ruang Perawatan",
        "Ruang perawatan kelas dua.",
        "perawatan",
        "ruang-perawatan",
    ),
    (
        "Laboratorium",
        "Ruang pemeriksaan laboratorium.",
        "penunjang",
        "lab",
    ),
    (
        "Gawat Darurat",
        "Pintu masuk gawat darurat.",
        "gedung",
        "igd",
    ),
    (
        "Ruang Tunggu",
        "Ruang tunggu rawat jalan.",
        "fasilitas",
        "ruang-tunggu",
    ),
    ("Apotek", "Layanan apotek.", "penunjang", "apotek"),
];

async fn gallery(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (title, caption, category, image)) in GALLERY.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO gallery_items (title, caption, image_url, category, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(title)
        .bind(caption)
        .bind(format!("https://picsum.photos/seed/{image}/960/720"))
        .bind(category)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(nama, jabatan, kutipan, seed foto, nilai)`
const TESTIMONIALS: &[(&str, &str, &str, &str, i32)] = &[
    (
        "Warga Sekitar",
        "Warga sekitar sini",
        "Pelayanan di loket cepat dan petugasnya jelas. Saya tidak bingung harus ke mana.",
        "testimoni-1",
        5,
    ),
    (
        "Pasien Rawat Jalan",
        "Pasien rawat jalan",
        "Pendaftaran daring bekerja dengan baik, waktu tunggu jadi lebih singkat.",
        "testimoni-2",
        4,
    ),
    (
        "Orang Tua Pasien",
        "Orang tua pasien",
        "Penjelasan dokter mudah dipahami dan tidak terburu-buru.",
        "testimoni-3",
        5,
    ),
];

async fn testimonials(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (name, role, quote, image, rating)) in TESTIMONIALS.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO testimonials (
                display_name, role_label, quote, photo_url, rating, sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(name)
        .bind(role)
        .bind(quote)
        .bind(format!("https://picsum.photos/seed/{image}/200/200"))
        .bind(*rating)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(nama, seed logo, tautan)`
///
/// Logo memakai picsum, bukan logo lembaga asli. Nama mitra juga dibuat
/// fiktif kecuali satu yang memang berlaku nasional.
const PARTNERS: &[(&str, &str, &str)] = &[
    ("BPJS Kesehatan", "bpjs", "https://bpjs-kesehatan.go.id"),
    (
        "Asuransi Amanah",
        "asuransi-amanah",
        "https://contoh.test/amanah",
    ),
    (
        "Asuransi Prima",
        "asurans-prima",
        "https://contoh.test/prima",
    ),
    (
        "Asuransi Sejahtera",
        "sejahtera",
        "https://contoh.test/sejahtera",
    ),
];

async fn partners(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (name, image, website)) in PARTNERS.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO insurance_partners (name, logo_url, website_url, sort_order)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(name)
        .bind(format!("https://picsum.photos/seed/{image}/240/120"))
        .bind(website)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(pertanyaan, jawaban, kategori)`
const FAQS: &[(&str, &str, &str)] = &[
    (
        "Bagaimana cara mendaftar secara daring?",
        "Pilih menu daftar online, isi data diri, lalu pilih dokter dan tanggal yang tersedia. Nomor antrean dikirim setelah pendaftaran berhasil.",
        "pendaftaran",
    ),
    (
        "Apakah perlu membawa rujukan dokter?",
        "Untuk layanan rawat jalan tidak perlu rujukan. Beberapa layanan spesialis tertentu memerlukan rujukan sesuai ketentuan yang berlaku.",
        "pendaftaran",
    ),
    (
        "Apakah ada biaya pendaftaran?",
        "Tidak ada biaya pendaftaran. Biaya hanya berlaku untuk layanan yang memang dikenakan tarif.",
        "biaya",
    ),
    (
        "Jam berapa layanan rawat jalan dibuka?",
        "Senin sampai Jumat, pukul 07.30 sampai 14.00. Sabtu dan hari libur dilayani di poli khusus dengan jadwal yang berbeda.",
        "jam-layanan",
    ),
    (
        "Bagaimana cara menyampaikan pengaduan?",
        "Pengaduan bisa disampaikan melalui layanan kritik dan saran atau layanan pengaduan khusus. Semua pengaduan diberi kode tiket.",
        "pengaduan",
    ),
];

async fn faqs(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (question, answer, category)) in FAQS.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO faqs (question, answer, category, sort_order)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(question)
        .bind(answer)
        .bind(category)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(kode jabatan, jabatan, unit, seed foto)`
const MANAGEMENT: &[(&str, &str, &str, &str)] = &[
    ("AKEP-01", "Kepala Rumah Sakit", "Direksi", "kepala"),
    (
        "AKEP-02",
        "Kepala Bidang Pelayanan",
        "Bidang Pelayanan",
        "bidang-pelayanan",
    ),
    (
        "AKEP-03",
        "Kepala Bidang Keuangan",
        "Bidang Keuangan",
        "bidang-keuangan",
    ),
    (
        "AKEP-04",
        "Kepala Bidang Sarana dan Prasarana",
        "Bidang Sarana",
        "bidang-sarana",
    ),
    (
        "AKEP-05",
        "Kepala Bagian Hukum dan Hubungan Masyarakat",
        "Hukum dan Humas",
        "hukum-humas",
    ),
];

async fn management(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (code, position, unit, image)) in MANAGEMENT.iter().enumerate() {
        // Nama ditampilkan sebagai kode jabatan, bukan nama orang. Data
        // manajemen rumah sakit nyata adalah data pribadi, jadi seed ini tidak
        // memuat nama siapa pun.
        sqlx::query(
            r#"
            INSERT INTO management_members (name, position, unit, photo_url, sort_order)
            SELECT $1, $2, $3, $4, $5
             WHERE NOT EXISTS (
                   SELECT 1 FROM management_members
                    WHERE name = $1 AND position = $2
                 )
            "#,
        )
        .bind(*code)
        .bind(position)
        .bind(unit)
        .bind(format!("https://picsum.photos/seed/{image}/320/400"))
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Dokumen dan lowongan kerja
// ---------------------------------------------------------------------------

/// `(slug, judul, kategori, keterangan, nama berkas, ukuran dalam kibibita)`
const DOCUMENTS: &[(&str, &str, &str, &str, &str, i64)] = &[
    (
        "standar-pelayanan",
        "Standar Pelayanan",
        "standar_pelayanan",
        "Standar pelayanan yang berlaku di seluruh unit.",
        "standar-pelayanan.pdf",
        850_000,
    ),
    (
        "kompensasi-pelayanan",
        "Kompensasi Pelayanan",
        "kompensasi_pelayanan",
        "Mekanisme kompensasi bagi pasien yang kurang puas.",
        "kompensasi-pelayanan.pdf",
        320_000,
    ),
    (
        "regulasi-zona-integritas",
        "Regulasi Zona Integritas",
        "regulasi_zona_integritas",
        "Peraturan yang mengatur program zona integritas.",
        "regulasi-zona-integritas.pdf",
        410_000,
    ),
    (
        "ppid",
        "Prosedur Informasi Publik",
        "ppid",
        "Prosedur permintaan informasi publik.",
        "prosedur-ppid.pdf",
        260_000,
    ),
    (
        "brosur-layanan",
        "Brosur Layanan",
        "brosur",
        "Brosur layanan rumah sakit.",
        "brosur-layanan.pdf",
        1_200_000,
    ),
];

pub async fn documents_and_jobs(tx: &mut Tx<'_>) -> ApiResult<()> {
    documents(tx).await?;
    jobs(tx).await?;
    Ok(())
}

async fn documents(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (slug, title, category, description, file_name, size)) in
        DOCUMENTS.iter().enumerate()
    {
        sqlx::query(
            r#"
            INSERT INTO documents (
                slug, title, category, description, file_url, file_name,
                file_size, year, sort_order
            )
            VALUES ($1, $2, $3::document_category, $4, $5, $6, $7, 2025, $8)
            ON CONFLICT (slug) DO UPDATE
               SET title = excluded.title,
                   category = excluded.category,
                   description = excluded.description,
                   file_name = excluded.file_name,
                   file_size = excluded.file_size
            "#,
        )
        .bind(slug)
        .bind(title)
        .bind(category)
        .bind(description)
        .bind(format!("/dokumen/{slug}/{file_name}"))
        .bind(file_name)
        .bind(*size)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// `(slug, jabatan, unit, jenis, kuota, syarat, tanggung jawab)`
const JOBS: &[(&str, &str, &str, &str, i32, &str, &str)] = &[
    (
        "perawat-klinis",
        "Perawat Klinis",
        "Bidang Pelayanan",
        "Penuh waktu",
        3,
        "Sarjana Keperawatan atau D3 Keperawatan dengan izin praktik aktif.",
        "Memberikan perawatan pasien dan mendokumentasikan asuhan keperawatan.",
    ),
    (
        "dokter-umum",
        "Dokter Umum",
        "Bidang Pelayanan",
        "Penuh waktu",
        2,
        "Gelar dokter umum dengan Surat Tanda Registrasi aktif.",
        "Melakukan pemeriksaan pasien di poli umum.",
    ),
    (
        "petugas-rekam-medis",
        "Petugas Rekam Medis",
        "Bidang Pelayanan",
        "Penuh waktu",
        1,
        "Sarjana Rekam Medis atau D3 Rekam Medis.",
        "Mendata dan menyimpan berkas pasien sesuai standar.",
    ),
];

pub async fn jobs(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (slug, title, unit, employment, quota, requirements, responsibilities) in JOBS {
        sqlx::query(
            r#"
            INSERT INTO job_vacancies (
                slug, title, department, employment_type, quota,
                requirements, responsibilities
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (slug) DO UPDATE
               SET title = excluded.title,
                   department = excluded.department,
                   employment_type = excluded.employment_type,
                   quota = excluded.quota,
                   requirements = excluded.requirements,
                   responsibilities = excluded.responsibilities
            "#,
        )
        .bind(slug)
        .bind(title)
        .bind(unit)
        .bind(employment)
        .bind(*quota)
        .bind(requirements)
        .bind(responsibilities)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Kapasitas tempat tidur
// ---------------------------------------------------------------------------

/// `(nama ruang, kelas, kode ruang, total, terisi, reservasi, kebijakan gender)`
const BEDS: &[(&str, &str, &str, i32, i32, i32, &str)] = &[
    ("Anggrek", "Kelas 2", "A-201", 12, 9, 1, "Campuran"),
    ("Cendana", "Kelas 2", "A-202", 12, 7, 2, "Campuran"),
    ("Mawar", "Kelas 3", "A-301", 18, 15, 1, "Campuran"),
    ("Melati", "Kelas 3", "A-302", 18, 11, 3, "Campuran"),
    (
        "Kamar Bougenville",
        "Kelas VIP",
        "VIP-01",
        6,
        4,
        0,
        "Campuran",
    ),
    (
        "Intensive Care Unit",
        "Kelas Khusus",
        "ICU-01",
        8,
        6,
        1,
        "Campuran",
    ),
    (
        "Ruang Neonatal",
        "Kelas Khusus",
        "NICU-01",
        6,
        3,
        1,
        "Campuran",
    ),
    ("Anggrek 2", "Kelas 1", "B-101", 8, 6, 0, "Perempuan"),
    ("Damar", "Kelas 1", "B-102", 8, 5, 1, "Laki-laki"),
];

pub async fn beds(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (ward, class, room, total, occupied, reserved, policy) in BEDS {
        sqlx::query(
            r#"
            INSERT INTO bed_capacity (
                ward_name, class_name, room_code, total_beds,
                occupied_beds, reserved_beds, gender_policy
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(ward)
        .bind(class)
        .bind(room)
        .bind(*total)
        .bind(*occupied)
        .bind(*reserved)
        .bind(policy)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn service_slugs_are_unique() {
        let mut seen = HashSet::new();

        for seed in SERVICES {
            assert!(seen.insert(seed.slug), "slug dobel: {}", seed.slug);
        }
    }

    #[test]
    fn every_priority_service_targets_the_home_section() {
        // `load_home` mencari section_key 'prioritas'. Kalau ada layanan
        // prioritas tanpa section itu, jumlah kartu di beranda akan berkurang
        // tanpa ada yang berubah di kode.
        for seed in SERVICES.iter().filter(|s| s.service_type == "priority") {
            assert_eq!(seed.section, Some("prioritas"), "{}", seed.slug);
        }
    }

    #[test]
    fn hero_slide_links_stay_internal() {
        // CHECK di database menolak link_url yang bukan diawali garis miring.
        // Seed akan gagal seluruhnya kalau ada satu saja yang melanggar.
        for (_, _, _, link, _) in SLIDES {
            assert!(link.starts_with('/'), "tautan luar situs: {link}");
            assert!(
                link.chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "/-_".contains(c)),
                "tautan tidak cocok dengan pola CHECK: {link}"
            );
        }
    }

    #[test]
    fn package_prices_are_positive_and_fit_the_column() {
        for seed in PACKAGES {
            assert!(seed.price >= 0, "harga negatif di {}", seed.slug);
            assert!(
                seed.price <= 100_000_000,
                "harga terlalu besar di {}",
                seed.slug
            );
            assert!(
                !seed.items.is_empty(),
                "{} tidak punya pemeriksaan",
                seed.slug
            );
        }
    }

    #[test]
    fn bed_numbers_never_exceed_total() {
        // CHECK `occupied_beds + reserved_beds <= total_beds` akan menolak
        // seluruh seed kalau ada satu baris yang tidak seimbang.
        for (ward, _, _, total, occupied, reserved, _) in BEDS {
            assert!(
                *occupied + *reserved <= *total,
                "{ward}: {occupied} + {reserved} melebihi {total}"
            );
        }
    }

    #[test]
    fn article_slugs_are_unique() {
        let mut seen = HashSet::new();

        for (slug, _, _, _, _, _) in ARTICLES {
            assert!(seen.insert(*slug), "slug berita dobel: {slug}");
        }
    }
}
