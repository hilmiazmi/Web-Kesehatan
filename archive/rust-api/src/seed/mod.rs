//! Data awal untuk lingkungan lokal dan demo.
//!
//! Seluruh isi di sini fiktif. Nama dokter, nama orang, nomor telepon,
//! alamat, dan nama perusahaan dibuat khusus untuk situs demo ini, tidak diambil
//! dari rumah sakit mana pun. Foto memakai URL Unsplash dan picsum yang sudah
//! ada di `remotePatterns` pada `next.config.ts`, jadi `next/image` menerimanya.

pub mod content_seed;
pub mod doctors;

use sqlx::postgres::PgPool;

use crate::error::{ApiError, ApiResult};

/// Jalankan seluruh seed dalam satu transaksi.
///
/// Semua tabel diisi dalam satu transaksi, jadi database tidak pernah berada di
/// keadaan setengah terisi. Kalau satu INSERT gagal, tidak ada satu baris pun
/// yang tersimpan dan perintah bisa dijalankan ulang dengan aman.
pub async fn run(pool: &PgPool) -> ApiResult<()> {
    let mut tx = pool.begin().await?;

    kosongkan_konten(&mut tx).await?;
    site_settings(&mut tx).await?;
    content_seed::services(&mut tx).await?;
    content_seed::mcu(&mut tx).await?;
    content_seed::articles(&mut tx).await?;
    content_seed::pages(&mut tx).await?;
    content_seed::home_sections(&mut tx).await?;
    content_seed::documents_and_jobs(&mut tx).await?;
    content_seed::beds(&mut tx).await?;
    doctors::polyclinics(&mut tx).await?;
    doctors::specialties(&mut tx).await?;
    doctors::doctors(&mut tx).await?;
    admin_account(&mut tx).await?;

    tx.commit().await?;

    Ok(())
}

/// Tabel yang diisi `seed`.
///
/// Urutannya penting: tabel yang dirujuk foreign key harus dihapus lebih dulu,
/// kalau tidak PostgreSQL menolak dengan pelanggaran `23503`.
const TABEL_KONTEN: &[&str] = &[
    "doctor_schedules",
    "doctor_visit_quotas",
    "doctors",
    "polyclinics",
    "specialties",
    "mcu_package_items",
    "mcu_packages",
    "services",
    "articles",
    "pages",
    "documents",
    "job_vacancies",
    "management_members",
    "hero_slides",
    "awards",
    "gallery_items",
    "testimonials",
    "insurance_partners",
    "faqs",
    "bed_capacity",
    "site_settings",
];

/// Tabel yang bukan milik seed dan hanya ikut terhapus oleh `reset`.
const TABEL_PENGGUNJANG: &[&str] = &[
    "survey_responses",
    "wbs_reports",
    "feedbacks",
    "mcu_registrations",
    "appointments",
    "users",
];

/// Kosongkan tabel konten supaya `seed` boleh dijalankan berkali-kali.
///
/// Tanpa langkah ini, menjalankan seed dua kali akan menambah baris kembar pada
/// tabel yang tidak punya batasan unik, dan tabel yang punya batasan unik akan
/// menolak dengan galat yang tidak menjelaskan apa pun. Akun dan kiriman
/// pengunjung sengaja tidak disentuh: `seed` tidak boleh menghapus data yang
/// bukan miliknya.
async fn kosongkan_konten(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> ApiResult<()> {
    for table in TABEL_KONTEN {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut **tx)
            .await?;
    }

    Ok(())
}

/// Hapus seluruh isi tabel, termasuk kiriman pengunjung dan akun, lalu seed
/// ulang.
///
/// Perintah ini menghapus data. Ia hanya dipakai pada database lokal dan
/// database demo; tidak ada jalur di aplikasi yang memanggilnya.
pub async fn reset(pool: &PgPool) -> ApiResult<()> {
    let mut tx = pool.begin().await?;

    // `doctor_visit_quotas` sudah ada di TABEL_KONTEN, jadi di sini cukup
    // tabel pendukung yang belum ikut terhapus.
    for table in TABEL_PENGGUNJANG {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx)
            .await?;
    }

    kosongkan_konten(&mut tx).await?;

    tx.commit().await?;

    run(pool).await
}

/// Akun admin pertama.
///
/// Email dan kata sandi di sini hanya untuk lokal dan demo. Password diambil
/// dari `SEED_ADMIN_PASSWORD` supaya tidak ada kredensial yang tertulis di
/// kode. Kalau variabel itu tidak diisi, seed berhenti dengan pesan jelas
/// alih-alih membuat akun dengan kata sandi yang sudah ada di repository.
async fn admin_account(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> ApiResult<()> {
    let email =
        std::env::var("SEED_ADMIN_EMAIL").unwrap_or_else(|_| "admin@contoh-sehat.test".to_string());

    let password = std::env::var("SEED_ADMIN_PASSWORD").map_err(|_| {
        ApiError::BadRequest(
            "Isi SEED_ADMIN_PASSWORD sebelum menjalankan seed. Kredensial tidak boleh ditulis di kode.".into(),
        )
    })?;

    let hash = crate::auth::hash_password(&password)
        .map_err(|err| ApiError::Internal(format!("gagal membuat hash password: {err}")))?;

    let name =
        std::env::var("SEED_ADMIN_NAME").unwrap_or_else(|_| "Administrator Demo".to_string());

    sqlx::query(
        r#"
        INSERT INTO users (email, name, role, password_hash)
        VALUES ($1, $2, 'super_admin', $3)
        ON CONFLICT (lower(email)) DO NOTHING
        "#,
    )
    .bind(email)
    .bind(name)
    .bind(hash)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Pengaturan situs
// ---------------------------------------------------------------------------

async fn site_settings(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> ApiResult<()> {
    let rows: Vec<(&str, serde_json::Value)> = vec![
        ("hospital_name", serde_json::json!("RSUD Contoh Sehat")),
        ("tagline", serde_json::json!("Layanan Kesehatan Terpadu untuk Semua")),
        (
            "hospital_type",
            serde_json::json!("Rumah Sakit Umum Daerah Tipe B"),
        ),
        (
            "address",
            serde_json::json!("Jalan Contoh Sehat Nomor 1, Jakarta Selatan"),
        ),
        ("phone", serde_json::json!("(021) 5000 0000")),
        ("whatsapp", serde_json::json!("+6280000000000")),
        ("email", serde_json::json!("info@contoh-sehat.test")),
        (
            "outpatient_hours",
            serde_json::json!("Senin sampai Jumat, 07.30 sampai 14.00"),
        ),
        (
            "emergency_note",
            serde_json::json!("Instalasi gawat darurat buka 24 jam"),
        ),
        (
            "map_embed_url",
            serde_json::json!("https://www.openstreetmap.org/export/embed.html?bbox=0%2C0%2C0%2C0"),
        ),
        (
            "social_links",
            serde_json::json!([
                { "network": "instagram", "label": "Instagram", "url": "https://www.instagram.com/contoh-sehat" },
                { "network": "facebook", "label": "Facebook", "url": "https://www.facebook.com/contoh-sehat" },
                { "network": "youtube", "label": "YouTube", "url": "https://www.youtube.com/@contoh-sehat" },
            ]),
        ),
        (
            "footer_note",
            serde_json::json!(
                "Situs demo untuk keperluan portofolio. Nama, kontak, foto, dan seluruh isi bersifat fiktif."
            ),
        ),
    ];

    for (key, value) in rows {
        sqlx::query(
            r#"
            INSERT INTO site_settings (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value
            "#,
        )
        .bind(key)
        .bind(value)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// Jumlah baris di setiap tabel utama, untuk laporan hasil seed.
pub async fn summary(pool: &PgPool) -> ApiResult<Vec<(String, i64)>> {
    let tables = [
        "specialties",
        "polyclinics",
        "doctors",
        "doctor_schedules",
        "services",
        "mcu_packages",
        "articles",
        "pages",
        "hero_slides",
        "awards",
        "gallery_items",
        "testimonials",
        "insurance_partners",
        "faqs",
        "documents",
        "job_vacancies",
        "management_members",
        "bed_capacity",
        "site_settings",
        "users",
    ];

    let mut rows = Vec::with_capacity(tables.len());

    for table in tables {
        let count: i64 = sqlx::query_scalar(&format!("SELECT count(*) FROM {table}"))
            .fetch_one(pool)
            .await?;
        rows.push((table.to_string(), count));
    }

    Ok(rows)
}
