use crate::config::Config;
use sqlx::migrate::MigrateError;
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

/// Buka connection pool ke PostgreSQL.
///
/// Parameter yang ditetapkan di sini penting untuk VPS kecil:
///
/// * `max_connections` sengaja kecil. Setiap koneksi PostgreSQL di sisi server
///   punya alokasi memori sendiri, jadi 10 koneksi adalah titik seimbang
///   antara paralelisme dan jejak memori.
/// * `min_connections` 0 supaya proses yang hanya melayani halaman statis
///   tidak menahan koneksi idle.
/// * `idle_timeout` 10 menit agar koneksi yang menganggur dilepas. Kalau RAM
///   sering mepet, koneksi idle yang menumpuk adalah penyebab paling umum
///   kehabisan memori pada aplikasi web kecil.
/// * `acquire_timeout` pendek supaya permintaan gagal cepat dengan pesan yang
///   jelas saat pool habis, bukan menggantung sampai proxy timeout.
pub async fn connect(config: &Config) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(config.db_max_connections)
        .min_connections(0)
        .idle_timeout(Some(Duration::from_secs(600)))
        .max_lifetime(Some(Duration::from_secs(1800)))
        .acquire_timeout(config.db_acquire_timeout)
        .test_before_acquire(true)
        .connect(&config.database_url)
        .await
}

/// Pool minimal yang hanya dipakai sekali untuk menjalankan migrasi.
///
/// Jangan dipakai untuk melayani permintaan: pool ini tidak memakai
/// `max_connections` dari konfigurasi, jadi batas RAM yang sengaja rendah
/// tidak berlaku.
async fn pool_for_migration(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(30))
        .connect(database_url)
        .await
}

/// Terapkan semua migrasi yang belum pernah dijalankan, lalu tutup pool-nya.
///
/// Migrasi di-embed ke binary saat compile lewat `sqlx::migrate!`, jadi image
/// produksi tidak perlu membawa folder `migrations/`. Folder di repo tetap
/// jadi sumber kebenaran saat build.
///
/// `sqlx::migrate!` membaca berkas dari disk saat compile dan tidak membaca
/// `DATABASE_URL`, jadi `cargo check` tetap jalan tanpa database hidup.
pub async fn migrate(database_url: &str) -> Result<(), MigrateError> {
    let pool = pool_for_migration(database_url).await?;
    let hasil = sqlx::migrate!("./migrations").run(&pool).await;
    pool.close().await;
    hasil
}

/// Tampilkan versi migrasi yang sudah diterapkan, terbaru di atas.
pub async fn applied_versions(pool: &PgPool) -> Result<(), sqlx::Error> {
    let rows: Vec<(i64, String, bool)> = sqlx::query_as(
        r#"
        SELECT version, description, success
          FROM _sqlx_migrations
         ORDER BY version DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    for (version, description, success) in rows {
        println!(
            "  {version}  {description}  {}",
            if success { "ok" } else { "gagal" }
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn migration_needs_a_reachable_database() {
        // Koneksi ke host yang tidak ada harus gagal, bukan dianggap berhasil
        // lalu server mulai melayani permintaan tanpa skema.
        let hasil = migrate("postgres://localhost:1/tidak-ada").await;

        assert!(hasil.is_err());
    }
}
