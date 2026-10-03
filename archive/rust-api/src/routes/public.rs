//! Endpoint baca publik.
//!
//! Semua handler di sini hanya mengembalikan data yang sudah aktif atau sudah
//! terbit. Tidak ada endpoint publik yang bisa melihat baris `is_active =
//! false`, karena baris seperti itu hanya relevan untuk panel admin.

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

use crate::error::{ok_json, ApiError, ApiResult, ErrorBody, ErrorDetail};
use crate::repo;
use crate::state::AppState;

/// Batas atas `limit` untuk daftar berita.
///
/// Tanpa batas, satu request `?limit=100000` bisa membuat server mengirim
/// seluruh tabel dalam satu respons dan memakai RAM yang tidak tersedia di VPS
/// kecil ini.
const MAX_ARTICLE_PAGE_SIZE: i64 = 24;

// ---------------------------------------------------------------------------
// Keselamatan rute
// ---------------------------------------------------------------------------

/// Petunjuk singkat kalau ada yang memanggil akar tanpa awalan.
///
/// Akar dipanggil paling sering saat proxy salah konfigurasi, jadi balasannya
/// menyebutkan awalan yang benar. Tanpa ini,enol diagnosis hanya melihat 404
/// dan mulai menebak di sisi proxy.
pub async fn index() -> Response {
    ok_json(serde_json::json!({
        "service": "rsud-api",
        "version": crate::API_VERSION,
        "api_prefix": crate::ROUTE_PREFIX,
    }))
}

/// Bentuk 404 yang sama dengan error lain.
///
/// Tanpa ini, axum mengirim 404 kosong tanpa header CORS, dan frontend tidak
/// bisa membedakan rute yang memang tidak ada dari rute yang salah ketik.
pub async fn not_found() -> Response {
    let status = StatusCode::NOT_FOUND;

    (
        status,
        axum::Json(serde_json::json!(ErrorBody {
            error: ErrorDetail {
                code: "NOT_FOUND",
                message: "Endpoint tidak ditemukan.".into(),
                fields: None,
            },
        })),
    )
        .into_response()
}

// ---------------------------------------------------------------------------
// Kesehatan
// ---------------------------------------------------------------------------

/// Liveness plus pemeriksaan koneksi database.
///
// Health check proxy memakai `GET /health`. Kalau hanya memeriksa proses saja, database yang mati tidak akan terdeteksi: service masih hidup, pemeriksa tetap benar, dan permintaan pengguna justru gagal satu per satu.
pub async fn health(State(state): State<AppState>) -> ApiResult<Response> {
    let database_up = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.db)
        .await
        .is_ok();

    if !database_up {
        return Err(ApiError::Internal("database tidak menjawab".into()));
    }

    let version = sqlx::query_scalar::<_, String>("SELECT version()")
        .fetch_one(&state.db)
        .await
        .map(|full: String| {
            full.split(',')
                .next()
                .unwrap_or("PostgreSQL")
                .trim()
                .to_string()
        })
        .unwrap_or_else(|_| "PostgreSQL".to_string());

    Ok(ok_json(serde_json::json!({
        "status": "ok",
        "version": crate::API_VERSION,
        "database": version,
        "time": chrono::Utc::now().to_rfc3339(),
    })))
}

// ---------------------------------------------------------------------------
// Query bersama
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct SpecialtyQuery {
    pub specialty: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceQuery {
    #[serde(rename = "type")]
    pub service_type: Option<String>,
    pub section: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct McuQuery {
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DocumentQuery {
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ArticleQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ScheduleQuery {
    pub doctor: Option<String>,
    pub date: Option<String>,
}

/// Ubah teks UUID dari path menjadi error 400, bukan 500.
///
// `Path<Uuid>` bawaan axum mengembalikan teks "invalid UUID" apa adanya.
/// Pesan itu tidak berguna untuk pengunjung, jadi parsing dipindah ke sini.
pub fn parse_uuid(value: &str, field: &'static str) -> ApiResult<uuid::Uuid> {
    uuid::Uuid::parse_str(value.trim()).map_err(|_| ApiError::Validation {
        errors: [(field.to_string(), "Format ID tidak valid.".to_string())]
            .into_iter()
            .collect(),
    })
}

fn trimmed(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

pub async fn home(State(state): State<AppState>) -> ApiResult<Response> {
    Ok(ok_json(repo::content::load_home(&state.db).await?))
}

pub async fn specialties(State(state): State<AppState>) -> ApiResult<Response> {
    Ok(ok_json(repo::catalog::list_specialties(&state.db).await?))
}

pub async fn polyclinics(State(state): State<AppState>) -> ApiResult<Response> {
    Ok(ok_json(repo::catalog::list_polyclinics(&state.db).await?))
}

pub async fn doctors(
    State(state): State<AppState>,
    Query(query): Query<SpecialtyQuery>,
) -> ApiResult<Response> {
    let rows = repo::catalog::list_doctors(&state.db, trimmed(query.specialty).as_deref()).await?;
    Ok(ok_json(rows))
}

pub async fn doctor_schedules(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<Response> {
    let doctor_id = parse_uuid(&id, "doctor")?;
    let rows = repo::catalog::list_doctor_schedules(&state.db, doctor_id).await?;

    // Dokter yang tidak ada dan dokter tanpa jadwal sama-sama menghasilkan
    // daftar kosong di sini. Bedakan keduanya di `repo::catalog::find_doctor`
    // supaya 404 diberikan hanya kalau dokter-nya memang tidak ada.
    Ok(ok_json(rows))
}

pub async fn schedules(
    State(state): State<AppState>,
    Query(query): Query<ScheduleQuery>,
) -> ApiResult<Response> {
    let doctor_id = match trimmed(query.doctor) {
        Some(value) => parse_uuid(&value, "doctor")?,
        None => {
            return Err(ApiError::Validation {
                errors: [(
                    "doctor".to_string(),
                    "Parameter doctor wajib diisi.".to_string(),
                )]
                .into_iter()
                .collect(),
            })
        }
    };

    let visit_date = match trimmed(query.date) {
        Some(value) => chrono::NaiveDate::parse_from_str(&value, "%Y-%m-%d").map_err(|_| {
            ApiError::Validation {
                errors: [(
                    "date".to_string(),
                    "Tanggal harus format YYYY-MM-DD.".to_string(),
                )]
                .into_iter()
                .collect(),
            }
        })?,
        // Tanpa tanggal, jadwal hari ini yang ditampilkan. Ini yang dipakai
        // widget "jadwal dokter hari ini" di beranda.
        None => repo::content::today(),
    };

    let rows = repo::catalog::schedules_on_date(&state.db, doctor_id, visit_date).await?;
    Ok(ok_json(serde_json::json!({
        "doctor_id": doctor_id,
        "date": visit_date.to_string(),
        "weekday": repo::catalog::weekday_name(repo::catalog::iso_weekday(visit_date)),
        "items": rows,
    })))
}

pub async fn beds(State(state): State<AppState>) -> ApiResult<Response> {
    let rows = repo::beds::list_beds(&state.db).await?;
    let summary = repo::beds::load_summary(&state.db).await?;

    Ok(ok_json(serde_json::json!({
        "summary": summary,
        "items": rows,
    })))
}

// ---------------------------------------------------------------------------
// Konten
// ---------------------------------------------------------------------------

pub async fn services(
    State(state): State<AppState>,
    Query(query): Query<ServiceQuery>,
) -> ApiResult<Response> {
    let rows = repo::content::list_services(
        &state.db,
        trimmed(query.service_type).as_deref(),
        trimmed(query.section).as_deref(),
    )
    .await?;
    Ok(ok_json(rows))
}

pub async fn service(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> ApiResult<Response> {
    let row = repo::content::find_service_by_slug(&state.db, &slug)
        .await?
        .ok_or(ApiError::NotFound("layanan"))?;

    Ok(ok_json(row))
}

pub async fn articles(
    State(state): State<AppState>,
    Query(query): Query<ArticleQuery>,
) -> ApiResult<Response> {
    let page = query.page.unwrap_or(1).max(1);
    let size = query.limit.unwrap_or(9).clamp(1, MAX_ARTICLE_PAGE_SIZE);

    let (items, total) = repo::content::list_articles(
        &state.db,
        size,
        (page - 1) * size,
        trimmed(query.category).as_deref(),
    )
    .await?;

    Ok(ok_json(serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "page_size": size,
        "pages": if size > 0 { (total + size - 1) / size } else { 0 },
    })))
}

pub async fn article(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> ApiResult<Response> {
    let row = repo::content::find_article_by_slug(&state.db, &slug)
        .await?
        .ok_or(ApiError::NotFound("berita"))?;

    Ok(ok_json(row))
}

pub async fn mcu_packages(
    State(state): State<AppState>,
    Query(query): Query<McuQuery>,
) -> ApiResult<Response> {
    let rows =
        repo::content::list_mcu_packages(&state.db, trimmed(query.category).as_deref()).await?;
    Ok(ok_json(rows))
}

pub async fn mcu_package(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> ApiResult<Response> {
    let row = repo::content::find_mcu_package(&state.db, &slug)
        .await?
        .ok_or(ApiError::NotFound("paket MCU"))?;

    Ok(ok_json(row))
}

pub async fn page(State(state): State<AppState>, Path(slug): Path<String>) -> ApiResult<Response> {
    let row = repo::content::find_page(&state.db, &slug)
        .await?
        .ok_or(ApiError::NotFound("halaman"))?;

    Ok(ok_json(row))
}

pub async fn documents(
    State(state): State<AppState>,
    Query(query): Query<DocumentQuery>,
) -> ApiResult<Response> {
    let rows = repo::content::list_documents(&state.db, trimmed(query.category).as_deref()).await?;
    Ok(ok_json(rows))
}

pub async fn jobs(State(state): State<AppState>) -> ApiResult<Response> {
    Ok(ok_json(repo::content::list_jobs(&state.db).await?))
}

pub async fn job(State(state): State<AppState>, Path(slug): Path<String>) -> ApiResult<Response> {
    let row = repo::content::find_job(&state.db, &slug)
        .await?
        .ok_or(ApiError::NotFound("lowongan"))?;

    Ok(ok_json(row))
}

pub async fn settings(State(state): State<AppState>) -> ApiResult<Response> {
    Ok(ok_json(repo::content::load_settings(&state.db).await?))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_path_segment_reports_the_field_name() {
        let err = parse_uuid("bukan-uuid", "doctor").unwrap_err();

        match err {
            ApiError::Validation { errors } => {
                assert_eq!(
                    errors.get("doctor").map(String::as_str),
                    Some("Format ID tidak valid.")
                );
            }
            other => panic!("harus 422, dapat {other:?}"),
        }
    }

    #[test]
    fn uuid_path_segment_accepts_valid_values() {
        assert!(parse_uuid("2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b", "doctor").is_ok());
        // Spasi di sekitar nilai UUID di tolerated supaya URL yang disalin dari
        // browser tidak langsung gagal.
        assert!(parse_uuid(" 2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b ", "doctor").is_ok());
    }

    #[test]
    fn blank_query_values_become_none() {
        assert_eq!(trimmed(Some("  ".into())), None);
        assert_eq!(trimmed(Some(" jantung ".into())), Some("jantung".into()));
        assert_eq!(trimmed(None), None);
    }
}
