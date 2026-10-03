//! Binary operasional database: migrasi, seed, dan pemeriksaan status.
//!
//! Dipisah dari server supaya `db:migrate` dan `db:seed` tidak ikut ter-cache di
//! image produksi. Server cukup menjalankan migrasi lalu menerima permintaan;
//! seed hanya dipakai di lokal dan di demo.
//!
//! Pemakaian:
//!
//! ```text
//! rsud-db migrate     menjalankan migrasi yang belum pernah diterapkan
//! rsud-db seed        mengisi data awal
//! rsud-db reset       mengosongkan tabel konten lalu mengisi ulang (menghapus data)
//! rsud-db status      menampilkan versi migrasi dan jumlah baris
//! rsud-db export       menulis salinan konten publik ke berkas JSON
//! ```

use std::process::ExitCode;

use rsud_api::config::Config;
use rsud_api::db;
use rsud_api::seed;
use rsud_api::snapshot;

const PERINTAH: &[&str] = &["migrate", "seed", "reset", "status", "export"];

#[tokio::main]
async fn main() -> ExitCode {
    let Some(perintah) = std::env::args().nth(1) else {
        return gagal(bantuan());
    };

    if !PERINTAH.contains(&perintah.as_str()) {
        return gagal(format!(
            "perintah '{perintah}' tidak dikenal\n\n{}",
            bantuan()
        ));
    }

    match jalankan(&perintah).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => gagal(message),
    }
}

async fn jalankan(perintah: &str) -> Result<(), String> {
    let config = Config::from_env().map_err(|err| format!("{err:?}"))?;

    match perintah {
        "migrate" => {
            // Migrasi dulu supaya seed tidak gagal dengan pesan "relasi tidak
            // ada" yang tidak menjelaskan apa pun.
            db::migrate(&config.database_url)
                .await
                .map_err(|err| format!("migrasi gagal: {err:?}"))?;
            println!("migrasi selesai");
            Ok(())
        }
        _ => {
            db::migrate(&config.database_url)
                .await
                .map_err(|err| format!("migrasi gagal: {err:?}"))?;

            let pool = db::connect(&config)
                .await
                .map_err(|err| format!("koneksi database gagal: {err:?}"))?;

            match perintah {
                "seed" => {
                    seed::run(&pool).await.map_err(|err| format!("{err:?}"))?;
                    println!("seed selesai");
                    tampilkan(&pool).await
                }
                "reset" => {
                    // Menghapus data. Hanya untuk database lokal dan demo.
                    println!("PERINGATAN: seluruh isi tabel konten akan dihapus");
                    seed::reset(&pool).await.map_err(|err| format!("{err:?}"))?;
                    println!("seed ulang selesai");
                    tampilkan(&pool).await
                }
                "status" => {
                    println!("versi migrasi:");
                    db::applied_versions(&pool)
                        .await
                        .map_err(|err| format!("{err:?}"))?;
                    tampilkan(&pool).await
                }
                "export" => {
                    let tujuan = std::env::args()
                        .nth(2)
                        .map(std::path::PathBuf::from)
                        .unwrap_or_else(|| {
                            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../snapshot")
                        });

                    let manifest = snapshot::tulis(&pool, &tujuan)
                        .await
                        .map_err(|err| format!("{err:?}"))?;

                    println!("snapshot ditulis ke {}", tujuan.display());
                    println!("  jumlah rute: {}", manifest.count);
                    tampilkan(&pool).await
                }
                _ => unreachable!("perintah sudah dibatasi PERINTAH"),
            }
        }
    }
}

async fn tampilkan(pool: &sqlx::PgPool) -> Result<(), String> {
    let rows = seed::summary(pool)
        .await
        .map_err(|err| format!("{err:?}"))?;
    let (dokter, jadwal) = seed::doctors::counts(pool)
        .await
        .map_err(|err| format!("{err:?}"))?;

    println!();
    println!("jumlah baris:");
    for (table, jumlah) in &rows {
        println!("  {table:<22} {jumlah}");
    }
    println!("  {:<22} {}", "dokter", dokter);
    println!("  {:<22} {}", "jadwal praktik", jadwal);

    Ok(())
}

fn bantuan() -> String {
    format!(
        "pemakaian: rsud-db <perintah>\n\nperintah:\n{}",
        PERINTAH
            .iter()
            .map(|p| format!("  {p}"))
            .collect::<Vec<_>>()
            .join("\n")
    )
}

fn gagal(pesan: impl AsRef<str>) -> ExitCode {
    eprintln!("{}", pesan.as_ref());
    ExitCode::FAILURE
}
