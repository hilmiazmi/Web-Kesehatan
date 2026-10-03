use std::env;
use std::time::Duration;

/// Konfigurasi runtime, dibaca satu kali saat proses start.
///
/// Semua nilai diambil dari environment variable supaya tidak ada perbedaan
/// antarlingkungan yang tersembunyi di kode (PRD bagian 6.3 baris
/// "Konfigurasi").
#[derive(Debug, Clone)]
pub struct Config {
    /// Alamat yang di-bind server, mis. "0.0.0.0" di produksi atau
    /// "127.0.0.1" saat debug lokal. Di produksi Nginx yang promiscuous
    /// ke service ini lewat jaringan Docker, jadi tidak perlu 0.0.0.0.
    pub bind_addr: String,
    pub port: u16,
    pub database_url: String,
    /// Jumlah koneksi PostgreSQL maksimum.
    ///
    /// Sengaja kecil. VPS ini hanya punya 2 vCPU dan RAM 2 GB, dan service
    /// ini satu-satunya klien database. 10 koneksi sudah jauh melebihi beban
    /// situs dummy; menaikkan angka ini hanya menambah risiko OOM tanpa
    /// menambah throughput.
    pub db_max_connections: u32,
    pub db_acquire_timeout: Duration,
    pub auth_secret: String,
    pub session_max_age: Duration,
    /// Asal Origin yang boleh memanggil endpoint admin.
    pub admin_origin: String,
    pub rate_limit_window: Duration,
    pub rate_limit_max: u32,
    /// Batas ukuran body JSON. 256 KiB cukup untuk form tercepat
    /// (registrasi MCU dengan 50 peserta), dan cukup kecil supaya satu
    /// permintaan tidak bisa menahan memori.
    pub body_limit_bytes: usize,
    /// Jumlah hari ke depan minimal yang boleh dipilih untuk kunjungan.
    pub min_lead_days: i64,
    /// Jumlah hari ke depan maksimal yang boleh dipilih untuk kunjungan.
    pub max_lead_days: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("environment variable {0} wajib diisi")]
    Missing(&'static str),
    #[error("environment variable {name} tidak bisa dibaca sebagai {expected}: {source}")]
    Invalid {
        name: &'static str,
        expected: &'static str,
        #[source]
        source: std::num::ParseIntError,
    },
    #[error("AUTH_SECRET wajib diisi dan minimal {min} karakter (nilai sekarang {len})")]
    WeakAuthSecret { min: usize, len: usize },
}

impl Config {
    /// Baca konfigurasi dari environment, gagal cepat kalau ada yang tidak
    /// lengkap.
    ///
    /// "Gagal cepat" di sini disengaja: server yang start dengan `AUTH_SECRET`
    /// kosong lebih berbahaya daripada server yang tidak start sama sekali,
    /// karena ia akan menerima sesi apa pun tanpa bisa diverifikasi.
    pub fn from_env() -> Result<Self, ConfigError> {
        let bind_addr = env_or("BIND_ADDR", "0.0.0.0");

        let port = parse_or("PORT", 8081u16)?;

        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;

        let db_max_connections = parse_or("DB_MAX_CONNECTIONS", 10u32)?;

        let db_acquire_timeout = Duration::from_secs(parse_or("DB_ACQUIRE_TIMEOUT_SECONDS", 8u64)?);

        let auth_secret =
            env::var("AUTH_SECRET").map_err(|_| ConfigError::Missing("AUTH_SECRET"))?;
        // HMAC-SHA256 dengan kunci pendek masih aman secara kriptografis, tapi
        // kunci acak 16 karakter dari orang yang tidak paham entropy mudah
        // ditebak. 32 karakter hex atau 24 karakter base64 adalah batas bawah
        // yang wajar untuk kunci yang disimpan di environment.
        if auth_secret.chars().count() < 32 {
            return Err(ConfigError::WeakAuthSecret {
                min: 32,
                len: auth_secret.chars().count(),
            });
        }

        let session_max_age =
            Duration::from_secs(parse_or("SESSION_MAX_AGE_SECONDS", 8 * 3600u64)?);

        let admin_origin = env_or("ADMIN_ORIGIN", "http://localhost:3000");

        let rate_limit_window = Duration::from_secs(parse_or("RATE_LIMIT_WINDOW_SECONDS", 60u64)?);
        let rate_limit_max = parse_or("RATE_LIMIT_MAX_REQUESTS", 5u32)?;

        let body_limit_bytes = parse_or("BODY_LIMIT_BYTES", 256 * 1024usize)?;

        let min_lead_days = parse_or("MIN_LEAD_DAYS", 0i64)?;
        let max_lead_days = parse_or("MAX_LEAD_DAYS", 90i64)?;

        Ok(Self {
            bind_addr,
            port,
            database_url,
            db_max_connections,
            db_acquire_timeout,
            auth_secret,
            session_max_age,
            admin_origin,
            rate_limit_window,
            rate_limit_max,
            body_limit_bytes,
            min_lead_days,
            max_lead_days,
        })
    }

    /// Alamat lengkap untuk `TcpListener::bind`.
    pub fn socket_addr(&self) -> String {
        format!("{}:{}", self.bind_addr, self.port)
    }
}

fn env_or(name: &str, fallback: &str) -> String {
    env::var(name).unwrap_or_else(|_| fallback.to_string())
}

fn parse_or<T>(name: &'static str, fallback: T) -> Result<T, ConfigError>
where
    T: std::str::FromStr<Err = std::num::ParseIntError>,
{
    match env::var(name) {
        Ok(raw) => raw
            .trim()
            .parse::<T>()
            .map_err(|source| ConfigError::Invalid {
                name,
                expected: std::any::type_name::<T>(),
                source,
            }),
        Err(_) => Ok(fallback),
    }
}
