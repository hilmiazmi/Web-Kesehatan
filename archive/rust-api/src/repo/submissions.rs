//! Penyimpanan formulir dari pengunjung: kritik dan saran, WBS, survei, dan
//! registrasi MCU.
//!
//! Semua fungsi di sini hanya INSERT. Tidak ada UPDATE dari sisi publik,
//! karena pengunjung tidak boleh mengubah apa pun setelah mengirim. Perubahan
//! status hanya lewat panel admin.

use std::future::Future;

use sqlx::postgres::PgPool;

use crate::error::{ApiError, ApiResult};
use crate::ticket;

/// Berapa kali percobaan membuat kode tiket sebelum menyerah.
///
/// Tabrakan kode tiket astronomis kecil: alphabet 32 karakter dengan 8 posisi
/// memberi 2^40 kombinasi. Kalau empat kali berturut-turut tetap bertabrakan,
// generator-nya bukan penyebabnya, melainkan ada yang salah dengan kode di backend.
const TICKET_ATTEMPTS: usize = 4;

/// Sisipkan satu baris sambil membuat kode tiket yang dijamin unik.
///
/// Kode tiket dibuat di sini, bukan di handler, supaya handler tidak perlu mengulangi percobaan sendiri, dan tidak ada jalur kode yang bisa mengirim tiket kosong.
async fn with_unique_ticket<S>(
    prefix: &str,
    mut insert: impl FnMut(String) -> S,
) -> ApiResult<String>
where
    S: Future<Output = ApiResult<String>> + Send,
{
    let mut last_error = None;

    for _ in 0..TICKET_ATTEMPTS {
        let code = ticket::generate(prefix);

        match insert(code).await {
            Ok(code) => return Ok(code),
            Err(err) if is_unique_violation(&err) => last_error = Some(err),
            Err(err) => return Err(err),
        }
    }

    Err(last_error.unwrap_or_else(|| ApiError::Internal("gagal membuat kode tiket unik".into())))
}

/// Deteksi pelanggaran unique index pada kode tiket.
///
/// `ApiError::From<sqlx::Error>` memetakan `23505` menjadi `Internal`, jadi di
/// sini polanya dibaca dari pesan. Kalau pemetaannya berubah, retry ini diam-diam
/// berhenti bekerja dan hanya menghasilkan satu percobaan.
fn is_unique_violation(err: &ApiError) -> bool {
    matches!(err, ApiError::Internal(message) if message.contains("tabrakan unique"))
}

// ---------------------------------------------------------------------------
// Registrasi MCU
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NewMcuRegistration {
    pub package_id: uuid::Uuid,
    pub name: String,
    pub phone: String,
    pub email: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<chrono::NaiveDate>,
    pub company_name: Option<String>,
    pub participant_count: i32,
    pub preferred_date: Option<chrono::NaiveDate>,
    pub notes: Option<String>,
}

async fn insert_mcu_row(
    pool: &PgPool,
    input: &NewMcuRegistration,
    code: String,
) -> ApiResult<String> {
    let saved: String = sqlx::query_scalar(
        r#"
        INSERT INTO mcu_registrations (
            ticket_code, package_id, name, phone, email, gender, birth_date,
            company_name, participant_count, preferred_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING ticket_code
        "#,
    )
    .bind(&code)
    .bind(input.package_id)
    .bind(&input.name)
    .bind(&input.phone)
    .bind(&input.email)
    .bind(&input.gender)
    .bind(input.birth_date)
    .bind(&input.company_name)
    .bind(input.participant_count)
    .bind(input.preferred_date)
    .bind(&input.notes)
    .fetch_one(pool)
    .await?;

    Ok(saved)
}

pub async fn insert_mcu_registration(
    pool: &PgPool,
    input: &NewMcuRegistration,
) -> ApiResult<String> {
    with_unique_ticket(ticket::PREFIX_MCU, |code| insert_mcu_row(pool, input, code)).await
}

// ---------------------------------------------------------------------------
// Kritik dan saran
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NewFeedback {
    pub feedback_type: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub subject: Option<String>,
    pub message: String,
    pub service_unit: Option<String>,
}

async fn insert_feedback_row(
    pool: &PgPool,
    input: &NewFeedback,
    code: String,
) -> ApiResult<String> {
    let saved: String = sqlx::query_scalar(
        r#"
        INSERT INTO feedbacks (
            ticket_code, type, name, email, phone, subject, message, service_unit
        )
        VALUES ($1, $2::feedback_type, $3, $4, $5, $6, $7, $8)
        RETURNING ticket_code
        "#,
    )
    .bind(&code)
    .bind(&input.feedback_type)
    .bind(&input.name)
    .bind(&input.email)
    .bind(&input.phone)
    .bind(&input.subject)
    .bind(&input.message)
    .bind(&input.service_unit)
    .fetch_one(pool)
    .await?;

    Ok(saved)
}

pub async fn insert_feedback(pool: &PgPool, input: &NewFeedback) -> ApiResult<String> {
    with_unique_ticket(ticket::PREFIX_FEEDBACK, |code| {
        insert_feedback_row(pool, input, code)
    })
    .await
}

// ---------------------------------------------------------------------------
// Whistleblowing system
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NewWbsReport {
    pub subject: String,
    pub description: String,
    pub incident_date: Option<chrono::NaiveDate>,
    pub location: Option<String>,
    pub involved_unit: Option<String>,
    pub is_anonymous: bool,
    pub reporter_name: Option<String>,
    pub reporter_email: Option<String>,
    pub reporter_phone: Option<String>,
    pub severity: String,
}

/// Simpan laporan WBS.
///
/// Kalau `is_anonymous` true, kolom identitas dikirim sebagai `None` sejak
/// awal. Ini bukan sekadar menyalin kata "anonim": CHECK di database juga
/// menolak baris yang menandai dirinya anonim sambil tetap menyimpan identitas,
/// jadi tidak ada jalur kode yang bisa menyimpan keduanya.
/// Kolom identitas pada laporan WBS.
///
/// Laporan anonim mengirim `None` untuk ketiga kolom, bukan sekadar menyembunyikan
/// tampilannya. CHECK di database menolak baris yang menandai dirinya anonim
/// sambil tetap menyimpan identitas, jadi tidak ada jalur kode yang bisa
/// menyimpan keduanya.
fn identitas(anonim: bool, nilai: &Option<String>) -> Option<&String> {
    if anonim {
        None
    } else {
        nilai.as_ref()
    }
}

async fn insert_wbs_row(pool: &PgPool, input: &NewWbsReport, code: String) -> ApiResult<String> {
    let saved: String = sqlx::query_scalar(
        r#"
        INSERT INTO wbs_reports (
            ticket_code, subject, description, incident_date, location,
            involved_unit, is_anonymous, reporter_name, reporter_email,
            reporter_phone, severity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::wbs_severity)
        RETURNING ticket_code
        "#,
    )
    .bind(&code)
    .bind(&input.subject)
    .bind(&input.description)
    .bind(input.incident_date)
    .bind(&input.location)
    .bind(&input.involved_unit)
    .bind(input.is_anonymous)
    .bind(identitas(input.is_anonymous, &input.reporter_name))
    .bind(identitas(input.is_anonymous, &input.reporter_email))
    .bind(identitas(input.is_anonymous, &input.reporter_phone))
    .bind(&input.severity)
    .fetch_one(pool)
    .await?;

    Ok(saved)
}

pub async fn insert_wbs_report(pool: &PgPool, input: &NewWbsReport) -> ApiResult<String> {
    with_unique_ticket(ticket::PREFIX_WBS, |code| insert_wbs_row(pool, input, code)).await
}

// ---------------------------------------------------------------------------
// Survei kepuasan masyarakat
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NewSurveyResponse {
    pub service_unit: Option<String>,
    pub respondent_name: Option<String>,
    pub respondent_email: Option<String>,
    pub answers: serde_json::Value,
    pub overall_score: i32,
    pub comment: Option<String>,
}

async fn insert_survey_row(
    pool: &PgPool,
    input: &NewSurveyResponse,
    code: String,
) -> ApiResult<String> {
    let saved: String = sqlx::query_scalar(
        r#"
        INSERT INTO survey_responses (
            ticket_code, service_unit, respondent_name, respondent_email,
            answers, overall_score, comment
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ticket_code
        "#,
    )
    .bind(&code)
    .bind(&input.service_unit)
    .bind(&input.respondent_name)
    .bind(&input.respondent_email)
    .bind(&input.answers)
    .bind(input.overall_score)
    .bind(&input.comment)
    .fetch_one(pool)
    .await?;

    Ok(saved)
}

pub async fn insert_survey_response(pool: &PgPool, input: &NewSurveyResponse) -> ApiResult<String> {
    with_unique_ticket(ticket::PREFIX_SURVEY, |code| {
        insert_survey_row(pool, input, code)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unique_violation_is_recognised_for_retry() {
        // Kalau ini tidak dikenali, retry kode tiket diam-diam mati dan satu
        // tabrakan langka akan langsung menjadi error 500 untuk pengguna.
        let collision = ApiError::Internal("tabrakan unique: feedbacks_ticket_code_unique".into());
        assert!(is_unique_violation(&collision));

        let other = ApiError::Internal("kegagalan lain".into());
        assert!(!is_unique_violation(&other));
        assert!(!is_unique_violation(&ApiError::Unauthorized));
        assert!(!is_unique_violation(&ApiError::BadRequest("x".into())));
    }

    #[tokio::test]
    async fn retry_stops_after_the_configured_attempts() {
        let mut calls = 0;

        let result: ApiResult<String> = with_unique_ticket(ticket::PREFIX_SURVEY, |code| {
            calls += 1;
            async move {
                Err(ApiError::Internal(format!(
                    "tabrakan unique: survey_responses_ticket_code_unique ({code})"
                )))
            }
        })
        .await;

        assert!(result.is_err());
        assert_eq!(calls, TICKET_ATTEMPTS);
    }

    #[tokio::test]
    async fn retry_returns_the_first_success() {
        use std::cell::{Cell, RefCell};

        let attempt = Cell::new(0usize);
        let tried: RefCell<Vec<String>> = RefCell::new(Vec::new());

        let result = with_unique_ticket(ticket::PREFIX_SURVEY, |code| {
            attempt.set(attempt.get() + 1);
            let nth = attempt.get();
            tried.borrow_mut().push(code.clone());

            // Yang dipindahkan ke dalam future hanya nilai salinan, bukan
            // penghitungnya, supaya `attempt` masih bisa dibaca setelahnya.
            async move {
                if nth < 2 {
                    Err(ApiError::Internal("tabrakan unique: x".into()))
                } else {
                    Ok(code)
                }
            }
        })
        .await;

        // Kode yang dikembalikan harus kode yang berhasil disimpan, bukan kode
        // dari percobaan pertama yang gagal.
        assert_eq!(result.unwrap(), tried.borrow()[1]);
        assert_eq!(attempt.get(), 2);
    }

    #[tokio::test]
    async fn non_collision_errors_are_not_retried() {
        let mut calls = 0;

        let result: ApiResult<String> = with_unique_ticket(ticket::PREFIX_SURVEY, |_code| {
            calls += 1;
            async { Err(ApiError::Unauthorized) }
        })
        .await;

        assert!(result.is_err());
        assert_eq!(calls, 1);
    }
}
