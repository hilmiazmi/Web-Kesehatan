//! Server HTTP.
//!
//! Binary ini hanya menjalankan server. Semua yang bisa diuji tanpa soket ada
//! di `lib.rs` dan diuji lewat `cargo test`.

use std::net::SocketAddr;
use std::process::ExitCode;

use tracing_subscriber::filter::EnvFilter;

use rsud_api::config::Config;
use rsud_api::db;
use rsud_api::routes;
use rsud_api::state::AppState;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> ExitCode {
    // Mode health check dijalankan sebelum logger dipasang: logger
    // menulis ke stderr, sementara health check hanya butuh kode keluar.
    if std::env::args().any(|a| a == "--health-check") {
        return ExitCode::from(health_check().await);
    }

    pasang_logger();

    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("gagal menjalankan server: {message}");
            ExitCode::FAILURE
        }
    }
}

/// Pasang penerima log.
///
/// Tanpa penerima, tidak ada satu pun baris yang keluar ke stderr, dan galat
/// 500 terlihat sama persis dengan permintaan yang memang tidak bermasalah.
fn pasang_logger() {
    let filter = EnvFilter::try_from_env("RUST_LOG")
        .unwrap_or_else(|_| EnvFilter::new("rsud_api=info,tower_http=info,warn"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .init();
}

async fn run() -> Result<(), String> {
    let config = Config::from_env().map_err(|err| err.to_string())?;

    // Migrasi dijalankan sebelum server menerima permintaan. Tanpa ini, deploy
    // baru akan melayani 500 di setiap endpoint selama beberapa detik pertama
    // sampai ada yang menjalankan `db:migrate` secara manual.
    db::migrate(&config.database_url)
        .await
        .map_err(|err| format!("migrasi gagal: {err}"))?;

    let pool = db::connect(&config)
        .await
        .map_err(|err| format!("koneksi database gagal: {err}"))?;

    let addr: SocketAddr = config
        .socket_addr()
        .parse()
        .map_err(|_| "BIND_ADDR dan PORT tidak membentuk alamat yang sah".to_string())?;

    let state = AppState::new(pool, std::sync::Arc::new(config));

    let listener = TcpListener::bind(addr)
        .await
        .map_err(|err| format!("tidak bisa bind ke {addr}: {err}"))?;

    println!("rsud-api {} siap di http://{addr}", rsud_api::API_VERSION);
    println!("awalan rute: {}", rsud_api::ROUTE_PREFIX);

    axum::serve(listener, routes::router(state))
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|err| format!("server berhenti: {err}"))
}

/// Periksa server sendiri lewat endpoint kesehatan.
///
/// Dipakai oleh `HEALTHCHECK` di Dockerfile dan oleh Coolify. Endpoint yang
/// dipanggil adalah `/api/v1/health`, yang juga memeriksa koneksi database:
/// kalau hanya memeriksa proses, database yang mati tidak akan terdeteksi dan
/// service tetap ditandai sehat.
///
/// Permintaan ditulis langsung ke soket tanpa pustaka klien HTTP, karena
/// menambah satu dependensi hanya untuk satu permintaan sekali jalan tidak
/// sebanding dengan selisih ukuran binary-nya.
async fn health_check() -> u8 {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".to_string());
    let alamat = format!("127.0.0.1:{port}");

    let mut stream = match tokio::net::TcpStream::connect(&alamat).await {
        Ok(stream) => stream,
        Err(err) => {
            eprintln!("health check: tidak bisa ke {alamat}: {err}");
            return 1;
        }
    };

    let permintaan = format!(
        "GET {}/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
        rsud_api::ROUTE_PREFIX
    );

    if let Err(err) = stream.write_all(permintaan.as_bytes()).await {
        eprintln!("health check: gagal menulis: {err}");
        return 1;
    }

    let mut balasan = Vec::new();
    if let Err(err) = stream.read_to_end(&mut balasan).await {
        eprintln!("health check: gagal membaca: {err}");
        return 1;
    }

    let teks = String::from_utf8_lossy(&balasan);
    if teks.starts_with("HTTP/1.1 200") {
        0
    } else {
        eprintln!(
            "health check: {}",
            teks.lines().next().unwrap_or("balasan kosong")
        );
        1
    }
}

/// Tutup koneksi dengan rapi saat container dihentikan.
///
/// Tanpa ini, setiap deploy memotong koneksi yang sedang berjalan dan Klien
/// melihat galat, bukan halaman yang sedang dimuat.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("tidak bisa memasang penangkap ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(err) => eprintln!("tidak bisa memasang penangkap SIGTERM: {err}"),
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    println!("sinyal berhenti diterima, menutup koneksi");
}
