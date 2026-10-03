use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};
use sqlx::Error as SqlxError;
use std::collections::BTreeMap;

/// Semua kegagalan yang bisa muncul di lapisan HTTP.
///
/// Satu enum, bukan `Box<dyn Error>`, supaya tanda tangan handler tetap
/// terbaca dan supaya tidak ada jalur yang diam-diam mengembalikan 500 tanpa
/// kode error yang bisa dicari di log.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("validasi gagal")]
    Validation { errors: BTreeMap<String, String> },

    #[error("{0} tidak ditemukan")]
    NotFound(&'static str),

    #[error("{0}")]
    BadRequest(String),

    #[error("kredensial tidak valid")]
    Unauthorized,

    #[error("wajib masuk sebagai admin")]
    Forbidden,

    #[error("terlalu banyak permintaan, coba lagi nanti")]
    RateLimited { retry_after_secs: u64 },

    #[error("permitted payload terlalu besar")]
    PayloadTooLarge,

    #[error("database gagal: {0}")]
    /// Bungkus error `sqlx` mentah. `From<sqlx::Error>` di bawah yang
    /// memetakan kode constraint ke status yang lebih berguna.
    Database(SqlxError),

    #[error("konfigurasi server salah: {0}")]
    Config(#[from] crate::config::ConfigError),

    // String di dalamnya tetap ikut tampil. Sebelumnya atribut `#[error]`
    // tidak pernah memuat isinya, jadi teksnya sebenarnya sudah dibentuk
    // tetapi tidak pernah tampil. Akibatnya setiap kegagalan di varian ini
    // terlihat sama persis dari baris perintah.
    #[error("kegagalan internal: {0}")]
    Internal(String),
}

impl ApiError {
    /// Kode stabil untuk sisi klien. Field `code` tidak pernah berubah dan
    /// tidak pernah ditulis dalam bahasa manusia, jadi frontend boleh
    /// mencabangkannya.
    pub fn code(&self) -> &'static str {
        match self {
            Self::Validation { .. } => "VALIDATION_FAILED",
            Self::NotFound(_) => "NOT_FOUND",
            Self::BadRequest(_) => "BAD_REQUEST",
            Self::Unauthorized => "UNAUTHORIZED",
            Self::Forbidden => "FORBIDDEN",
            Self::RateLimited { .. } => "RATE_LIMITED",
            Self::PayloadTooLarge => "PAYLOAD_TOO_LARGE",
            Self::Database(_) => "DATABASE_ERROR",
            Self::Config(_) => "CONFIG_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    fn status(&self) -> StatusCode {
        match self {
            Self::Validation { .. } => StatusCode::UNPROCESSABLE_ENTITY,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::RateLimited { .. } => StatusCode::TOO_MANY_REQUESTS,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::Database(_) | Self::Config(_) | Self::Internal(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }

    /// Pesan yang dikirim ke klien.
    ///
    /// Detail internal (pesan error PostgreSQL, nama kolom) TIDAK pernah
    /// ikut dikirim. Untuk `Database` dan `Internal` yang dikirim hanya teks
    /// generik; detail aslinya sudah dicatat lewat `tracing` di
    /// tempat error dibuat.
    fn public_message(&self) -> String {
        match self {
            Self::Validation { .. } => "Periksa kembali isian formulir.".into(),
            Self::NotFound(what) => format!("{what} tidak ditemukan."),
            Self::BadRequest(msg) => msg.clone(),
            Self::Unauthorized => "Sesi tidak valid atau sudah berakhir.".into(),
            Self::Forbidden => "Akun ini tidak punya akses ke tindakan ini.".into(),
            Self::RateLimited { retry_after_secs } => {
                format!("Terlalu banyak permintaan. Coba lagi dalam {retry_after_secs} detik.")
            }
            Self::PayloadTooLarge => "Data yang dikirim terlalu besar.".into(),
            Self::Database(_) => "Layanan sedang bermasalah. Coba lagi sebentar.".into(),
            Self::Config(_) | Self::Internal(_) => "Terjadi kesalahan di server.".into(),
        }
    }
}

/// Bentuk error yang selalu sama di seluruh endpoint.
#[derive(Debug, serde::Serialize)]
pub struct ErrorBody {
    pub error: ErrorDetail,
}

#[derive(Debug, serde::Serialize)]
pub struct ErrorDetail {
    /// Kode stabil, lihat `ApiError::code`.
    pub code: &'static str,
    /// Pesan siap tampil dalam bahasa Indonesia.
    pub message: String,
    /// Pesan per field. Hanya ada untuk `VALIDATION_FAILED`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<BTreeMap<String, String>>,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = self.status();
        let fields = match &self {
            ApiError::Validation { errors } => Some(errors.clone()),
            _ => None,
        };

        // Catat di server sebelum response dikirim. Untuk error 5xx, detail
        // aslinya hanya ada di sini; klien tidak pernah boleh mengetahuinya.
        if status.is_server_error() {
            tracing::error!(error = ?self, "permintaan gagal dengan status {}", status.as_u16());
        } else {
            tracing::debug!(error = ?self, "permintaan ditolak");
        }

        let body = ErrorBody {
            error: ErrorDetail {
                code: self.code(),
                message: self.public_message(),
                fields,
            },
        };

        let mut response = (status, Json(json!(body))).into_response();

        if let ApiError::RateLimited { retry_after_secs } = &self {
            if let Ok(value) = retry_after_secs.to_string().parse() {
                response.headers_mut().insert("retry-after", value);
            }
        }

        response
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: SqlxError) -> Self {
        // Pelanggaran constraint dipetakan ke status yang lebih berguna.
        // Detail lengkapnya tetap ditulis ke log lewat Display di bawah.
        tracing::debug!(?err, "kegagalan database");

        match &err {
            SqlxError::RowNotFound => Self::NotFound("data"),
            SqlxError::Database(db) => match db.code().as_deref() {
                // Pelanggaran unique pada kode tiket berarti ada tabrakan pada
                // generator, bukan kesalahan pengguna. Dicoba ulang di lapisan
                // pemanggil; kalau tetap gagal, ini bug.
                Some("23505") => Self::Internal(format!(
                    "tabrakan unique: {}",
                    db.constraint().unwrap_or("?")
                )),
                Some("23503") => Self::BadRequest("Data yang dirujuk tidak ditemukan.".into()),
                Some("23514") => {
                    Self::BadRequest("Nilai di luar rentang yang diperbolehkan.".into())
                }
                Some("22P02") => Self::BadRequest("Format data tidak dikenali.".into()),
                _ => Self::Database(err),
            },
            _ => Self::Database(err),
        }
    }
}

/// Bungkus `Result` agar handler bisa menulis `?` tanpa menempel
/// `ApiError` di setiap tanda tangan.
pub type ApiResult<T> = Result<T, ApiError>;

/// Balrespons sukses yang berbentuk JSON.
pub fn ok_json<T: serde::Serialize>(value: T) -> Response {
    Json(json!({ "data": value })).into_response()
}

/// Balrespons untuk sumber daya yang baru dibuat.
///
/// Status 201 dipakai supaya klien bisa membedakan "baru tersimpan" dari
/// "hanya dibaca ulang", dan supaya penghitung di panel admin tidak menghitung
/// satu permintaan dua kali saat respons diulang.
pub fn created_json<T: serde::Serialize>(value: T) -> Response {
    (StatusCode::CREATED, Json(json!({ "data": value }))).into_response()
}

/// Hitungan baris untuk endpoint admin, sengaja serde_json::Value supaya
/// tidak perlu struct baru setiap kali satu angka bertambah.
pub fn count_value(count: i64) -> Value {
    json!({ "count": count })
}
