//! Endpoint tulis dari pengunjung: pendaftaran, kritik dan saran, laporan WBS,
//! dan survei.
//!
//! Semua endpoint di sini punya tiga sifat yang sama:
//!
//! 1. Dibatasi rate limit per alamat, supaya satu orang tidak bisa mengisi
//!    database dengan ribuan baris.
//! 2. Memeriksa honeypot, kolom yang tersembunyi dan tidak pernah diisi manusia.
//! 3. Mengembalikan kode tiket supaya pengunjung bisa menyimpan bukti dan
//!    mengecek statusnya sendiri.

use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::response::Response;
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::admin::inbox::InboxKind;
use crate::error::{created_json, ok_json, ApiError, ApiResult};
use crate::repo;
use crate::repo::appointments::NewAppointment;
use crate::routes::{guard, public::parse_uuid};
use crate::state::AppState;
use crate::ticket;
use crate::validation::{self, Errors};

/// Metode pembayaran yang diterima, sesuai enum `payment_type`.
const PAYMENT_TYPES: &[&str] = &["general", "bpjs", "insurance"];

/// Jenis pesan yang diterima, sesuai enum `feedback_type`.
const FEEDBACK_TYPES: &[&str] = &["suggestion", "complaint", "praise", "question"];

/// Tingkat keparahanan laporan, sesuai enum `wbs_severity`.
const SEVERITIES: &[&str] = &["low", "medium", "high"];

/// Nilai `website` pada payload yang terisi berarti permintaan bot.
///
/// Kolom ini tidak pernah ada di formulir asli, jadi isinya yang terisi adalah
/// tanda Request otomatis. Balresponsnya dibuat Successful supaya bot tidak
/// belajar bahwa honeypot bekerja; tanpa itu, bot bisa memeriksa kolom ini sebelum mengirim, dan hanya mengisinya saat form aslinya sedang tidak aktif.
fn honeypot_triggered(website: Option<&str>) -> bool {
    website.is_some_and(validation::is_honeypot_trap)
}

fn fake_ticket(prefix: &str) -> serde_json::Value {
    json!({
        "ticket_code": ticket::generate(prefix),
        "status": "received",
    })
}

// ---------------------------------------------------------------------------
// E-Pasien
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct AppointmentBody {
    /// ID jadwal yang dipilih. Wajib, karena satu dokter bisa punya beberapa
    /// blok praktik di hari yang sama dengan kuota berbeda.
    pub schedule_id: String,
    pub patient_name: String,
    pub nik: String,
    pub birth_date: Option<String>,
    pub phone: String,
    pub email: Option<String>,
    pub address: Option<String>,
    pub complaint: Option<String>,
    pub visit_date: String,
    #[serde(default)]
    pub payment_type: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn create_appointment(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<AppointmentBody>>,
) -> ApiResult<Response> {
    guard(&state, &headers)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if honeypot_triggered(body.website.as_deref()) {
        return Ok(created_json(fake_ticket(ticket::PREFIX_APPOINTMENT)));
    }

    let schedule_id = parse_uuid(&body.schedule_id, "schedule_id")?;

    let mut errors = Errors::new();

    let patient_name =
        validation::text_required(&mut errors, "patient_name", &body.patient_name, 3, 160);
    // NIK divalidasi formatnya supaya pengunjung mendapat umpan balik, tapi
    // nilainya tidak diteruskan ke query. `repo::appointments::NIK_SIMULASI`
    // menggantinya dengan angka nol sebelum INSERT.
    validation::digits_exact(&mut errors, "nik", &body.nik, 16);
    let phone = validation::phone_id(&mut errors, "phone", &body.phone, true);
    let email = validation::email(
        &mut errors,
        "email",
        body.email.as_deref().unwrap_or(""),
        false,
    );
    let address = validation::text_optional(
        &mut errors,
        "address",
        body.address.as_deref().unwrap_or(""),
        500,
    );
    let complaint = validation::text_optional(
        &mut errors,
        "complaint",
        body.complaint.as_deref().unwrap_or(""),
        1000,
    );
    let payment_type = validation::choice(
        &mut errors,
        "payment_type",
        body.payment_type.as_deref().unwrap_or("general"),
        PAYMENT_TYPES,
    );

    let visit_date = validation::date_iso(&mut errors, "visit_date", &body.visit_date, true)
        .and_then(|date| {
            validation::date_within_days(
                &mut errors,
                "visit_date",
                date,
                state.config.min_lead_days,
                state.config.max_lead_days,
            )
        });

    let birth_date = match body
        .birth_date
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(value) => validation::date_iso(&mut errors, "birth_date", value, false),
        None => None,
    };

    validation::finish(errors)?;

    // Semua field di atas sudah lolos `finish` sebelum baris ini,
    // jadi `else` hanya jaring pengaman dan tidak pernah terpakai.
    let (Some(patient_name), Some(phone), Some(payment_type), Some(visit_date)) =
        (patient_name, phone, payment_type, visit_date)
    else {
        return Err(ApiError::Internal("validasi lolos tapi data kosong".into()));
    };

    let schedule = crate::repo::catalog::schedule_for_booking(&state.db, schedule_id)
        .await?
        .ok_or(ApiError::NotFound("jadwal"))?;

    let confirmation = repo::appointments::create_appointment(
        &state.db,
        NewAppointment {
            ticket_code: ticket::generate(ticket::PREFIX_APPOINTMENT),
            doctor_id: schedule.doctor_id,
            polyclinic_id: schedule.polyclinic_id,
            patient_name,
            birth_date,
            phone,
            email,
            address,
            complaint,
            visit_date,
            schedule_id: Some(schedule_id),
            payment_type,
        },
    )
    .await?;

    Ok(created_json(confirmation))
}

// ---------------------------------------------------------------------------
// Registrasi MCU
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct McuBody {
    pub package: String,
    pub name: String,
    pub phone: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub gender: Option<String>,
    #[serde(default)]
    pub birth_date: Option<String>,
    #[serde(default)]
    pub company_name: Option<String>,
    #[serde(default)]
    pub participant_count: Option<i64>,
    #[serde(default)]
    pub preferred_date: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn create_mcu_registration(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<McuBody>>,
) -> ApiResult<Response> {
    guard(&state, &headers)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if honeypot_triggered(body.website.as_deref()) {
        return Ok(created_json(fake_ticket(ticket::PREFIX_MCU)));
    }

    let mut errors = Errors::new();

    let package_slug = validation::text_required(&mut errors, "package", &body.package, 2, 180);
    let name = validation::text_required(&mut errors, "name", &body.name, 3, 160);
    let phone = validation::phone_id(&mut errors, "phone", &body.phone, true);
    let email = validation::email(
        &mut errors,
        "email",
        body.email.as_deref().unwrap_or(""),
        false,
    );
    let company_name = validation::text_optional(
        &mut errors,
        "company_name",
        body.company_name.as_deref().unwrap_or(""),
        180,
    );
    let notes = validation::text_optional(
        &mut errors,
        "notes",
        body.notes.as_deref().unwrap_or(""),
        1000,
    );

    let gender = match body
        .gender
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(value) => validation::choice(&mut errors, "gender", value, &["male", "female"]),
        None => None,
    };

    let birth_date = match body
        .birth_date
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(value) => validation::date_iso(&mut errors, "birth_date", value, false),
        None => None,
    };

    let preferred_date = match body
        .preferred_date
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(value) => validation::date_iso(&mut errors, "preferred_date", value, false),
        None => None,
    };

    // Batas 50 peserta mengikuti CHECK di database. Divalidasi di sini juga
    // supaya pesan yang sampai ke pengguna menyebut batasnya, bukan menyebut
    // nama constraint.
    let participant_count = match body.participant_count {
        Some(value) => validation::integer_range(&mut errors, "participant_count", value, 1, 50),
        None => Some(1),
    };

    validation::finish(errors)?;

    let (Some(package_slug), Some(name), Some(phone), Some(participant_count)) =
        (package_slug, name, phone, participant_count)
    else {
        return Err(ApiError::Internal("validasi lolos tapi data kosong".into()));
    };

    let package = crate::repo::content::package_id_by_slug(&state.db, &package_slug)
        .await?
        .ok_or(ApiError::NotFound("paket MCU"))?;

    let code = repo::submissions::insert_mcu_registration(
        &state.db,
        &repo::submissions::NewMcuRegistration {
            package_id: package,
            name,
            phone,
            email,
            gender,
            birth_date,
            company_name,
            participant_count: participant_count as i32,
            preferred_date,
            notes,
        },
    )
    .await?;

    Ok(created_json(json!({
        "ticket_code": code,
        "package": package_slug,
        "participant_count": participant_count,
        "status": "received",
    })))
}

// ---------------------------------------------------------------------------
// Kritik dan saran
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct FeedbackBody {
    #[serde(default)]
    pub feedback_type: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
    pub message: String,
    #[serde(default)]
    pub service_unit: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn create_feedback(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<FeedbackBody>>,
) -> ApiResult<Response> {
    guard(&state, &headers)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if honeypot_triggered(body.website.as_deref()) {
        return Ok(created_json(fake_ticket(ticket::PREFIX_FEEDBACK)));
    }

    let mut errors = Errors::new();

    let message = validation::text_required(&mut errors, "message", &body.message, 10, 5000);
    let name =
        validation::text_optional(&mut errors, "name", body.name.as_deref().unwrap_or(""), 160);
    let email = validation::email(
        &mut errors,
        "email",
        body.email.as_deref().unwrap_or(""),
        false,
    );
    let phone = validation::phone_id(
        &mut errors,
        "phone",
        body.phone.as_deref().unwrap_or(""),
        false,
    );
    let subject = validation::text_optional(
        &mut errors,
        "subject",
        body.subject.as_deref().unwrap_or(""),
        220,
    );
    let service_unit = validation::text_optional(
        &mut errors,
        "service_unit",
        body.service_unit.as_deref().unwrap_or(""),
        160,
    );

    let feedback_type = validation::choice(
        &mut errors,
        "feedback_type",
        body.feedback_type.as_deref().unwrap_or("suggestion"),
        FEEDBACK_TYPES,
    );

    validation::finish(errors)?;

    let (Some(message), Some(feedback_type)) = (message, feedback_type) else {
        return Err(ApiError::Internal("validasi lolos tapi data kosong".into()));
    };

    let code = repo::submissions::insert_feedback(
        &state.db,
        &repo::submissions::NewFeedback {
            feedback_type,
            name,
            email,
            phone,
            subject,
            message,
            service_unit,
        },
    )
    .await?;

    Ok(created_json(
        json!({ "ticket_code": code, "status": "received" }),
    ))
}

// ---------------------------------------------------------------------------
// Whistleblowing system
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct WbsBody {
    pub subject: String,
    pub description: String,
    #[serde(default)]
    pub incident_date: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub involved_unit: Option<String>,
    #[serde(default)]
    pub is_anonymous: Option<bool>,
    #[serde(default)]
    pub reporter_name: Option<String>,
    #[serde(default)]
    pub reporter_email: Option<String>,
    #[serde(default)]
    pub reporter_phone: Option<String>,
    #[serde(default)]
    pub severity: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn create_wbs_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<WbsBody>>,
) -> ApiResult<Response> {
    guard(&state, &headers)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if honeypot_triggered(body.website.as_deref()) {
        return Ok(created_json(fake_ticket(ticket::PREFIX_WBS)));
    }

    let mut errors = Errors::new();

    let subject = validation::text_required(&mut errors, "subject", &body.subject, 5, 220);
    let description =
        validation::text_required(&mut errors, "description", &body.description, 20, 10000);
    let location = validation::text_optional(
        &mut errors,
        "location",
        body.location.as_deref().unwrap_or(""),
        180,
    );
    let involved_unit = validation::text_optional(
        &mut errors,
        "involved_unit",
        body.involved_unit.as_deref().unwrap_or(""),
        160,
    );

    let severity = validation::choice(
        &mut errors,
        "severity",
        body.severity.as_deref().unwrap_or("medium"),
        SEVERITIES,
    );

    let incident_date = match body
        .incident_date
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
    {
        Some(value) => validation::date_iso(&mut errors, "incident_date", value, false),
        None => None,
    };

    let is_anonymous = body.is_anonymous.unwrap_or(false);

    // Identitas hanya divalidasi kalau laporan tidak anonim. Laporan anonim tetap diterima tanpa isian apa pun, jadi kolom identitas tidak boleh menjadi syarat.
    let (reporter_name, reporter_email, reporter_phone) = if is_anonymous {
        (None, None, None)
    } else {
        (
            validation::text_optional(
                &mut errors,
                "reporter_name",
                body.reporter_name.as_deref().unwrap_or(""),
                160,
            ),
            validation::email(
                &mut errors,
                "reporter_email",
                body.reporter_email.as_deref().unwrap_or(""),
                false,
            ),
            validation::phone_id(
                &mut errors,
                "reporter_phone",
                body.reporter_phone.as_deref().unwrap_or(""),
                false,
            ),
        )
    };

    validation::finish(errors)?;

    let (Some(subject), Some(description), Some(severity)) = (subject, description, severity)
    else {
        return Err(ApiError::Internal("validasi lolos tapi data kosong".into()));
    };

    let code = repo::submissions::insert_wbs_report(
        &state.db,
        &repo::submissions::NewWbsReport {
            subject,
            description,
            incident_date,
            location,
            involved_unit,
            is_anonymous,
            reporter_name,
            reporter_email,
            reporter_phone,
            severity,
        },
    )
    .await?;

    Ok(created_json(json!({
        "ticket_code": code,
        "status": "received",
        "anonymous": is_anonymous,
    })))
}

// ---------------------------------------------------------------------------
// Survei kepuasan masyarakat
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct SurveyBody {
    #[serde(default)]
    pub service_unit: Option<String>,
    #[serde(default)]
    pub respondent_name: Option<String>,
    #[serde(default)]
    pub respondent_email: Option<String>,
    pub answers: serde_json::Value,
    #[serde(default)]
    pub overall_score: Option<i64>,
    #[serde(default)]
    pub comment: Option<String>,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn create_survey_response(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<SurveyBody>>,
) -> ApiResult<Response> {
    guard(&state, &headers)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if honeypot_triggered(body.website.as_deref()) {
        return Ok(created_json(fake_ticket(ticket::PREFIX_SURVEY)));
    }

    let mut errors = Errors::new();

    let service_unit = validation::text_optional(
        &mut errors,
        "service_unit",
        body.service_unit.as_deref().unwrap_or(""),
        160,
    );
    let respondent_name = validation::text_optional(
        &mut errors,
        "respondent_name",
        body.respondent_name.as_deref().unwrap_or(""),
        160,
    );
    let respondent_email = validation::email(
        &mut errors,
        "respondent_email",
        body.respondent_email.as_deref().unwrap_or(""),
        false,
    );
    let comment = validation::text_optional(
        &mut errors,
        "comment",
        body.comment.as_deref().unwrap_or(""),
        2000,
    );

    let answers = match clean_answers(&mut errors, &body.answers) {
        Some(value) => value,
        None => serde_json::Value::Null,
    };

    let score = match body.overall_score {
        Some(value) => validation::integer_range(&mut errors, "overall_score", value, 1, 5),
        // Nilai tidak dikirim, jadi dihitung ulang dari jawaban. Bukan fitur:
        // tanpa ini, satu klien yang mengirim skor berbeda dari isiannya akan
        // membuat rata-rata-unit di panel admin menyesatkan.
        None => overall_from_answers(&answers),
    };

    validation::finish(errors)?;

    let Some(score) = score else {
        return Err(ApiError::Validation {
            errors: [(
                "answers".to_string(),
                "Isi setidaknya satu penilaian angka 1 sampai 5.".to_string(),
            )]
            .into_iter()
            .collect(),
        });
    };

    let code = repo::submissions::insert_survey_response(
        &state.db,
        &repo::submissions::NewSurveyResponse {
            service_unit,
            respondent_name,
            respondent_email,
            answers,
            overall_score: score as i32,
            comment,
        },
    )
    .await?;

    Ok(created_json(
        json!({ "ticket_code": code, "status": "received" }),
    ))
}

/// Terima hanya objek dengan nilai angka 1 sampai 5.
///
/// Bentuk lain ditolak karena kolomnya `jsonb` dengan CHECK
/// `jsonb_typeof = 'object'`, dan karena agregasi di panel admin menghitung
/// rata-rata dari isinya. Larik atau teks tidak bisa dihitung.
fn clean_answers(errors: &mut Errors, raw: &serde_json::Value) -> Option<serde_json::Value> {
    let object = raw.as_object()?;

    if object.is_empty() || object.len() > 30 {
        errors.add("answers", "Jumlah jawaban harus antara 1 dan 30.");
        return None;
    }

    let mut cleaned = serde_json::Map::new();

    for (key, value) in object {
        let Some(number) = value.as_f64() else {
            errors.add(
                "answers",
                format!("Jawaban '{key}' harus berupa angka 1 sampai 5."),
            );
            return None;
        };

        if !(1.0..=5.0).contains(&number) {
            errors.add("answers", format!("Jawaban '{key}' harus antara 1 dan 5."));
            return None;
        }

        cleaned.insert(key.clone(), json!(number.round() as i64));
    }

    Some(serde_json::Value::Object(cleaned))
}

/// Rata-rata semua jawaban, dibulatkan ke satu angka desimal.
///
/// Pembulatan dilakukan dengan satu angka desimal supaya 4,3 dan 4,4 sama-sama
/// menjadi 4,4 lalu 4 saat disimpan sebagai integer.
fn overall_from_answers(answers: &serde_json::Value) -> Option<i64> {
    let object = answers.as_object()?;
    let values: Vec<f64> = object.values().filter_map(|value| value.as_f64()).collect();

    if values.is_empty() {
        return None;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    Some(mean.round() as i64)
}

// ---------------------------------------------------------------------------
// Cek status tiket
// ---------------------------------------------------------------------------

/// Cek status satu tiket milik sendiri.
///
/// Endpoint ini sengaja mengembalikan sedikit informasi: kode tiket, status, dan
/// waktu. Nama, nomor telepon, dan isi laporan tidak dikembalikan, karena kode
/// tiket bisa ditebak atau dibagikan lewat orang lain, dan form pengaduan
/// berisi data pribadi pasien.
pub async fn ticket_status(
    State(state): State<AppState>,
    Path((kind, code)): Path<(String, String)>,
) -> ApiResult<Response> {
    let kind = InboxKind::parse(&kind).ok_or(ApiError::NotFound("jenis tiket"))?;

    if !crate::admin::inbox::looks_like_ticket_code(&code) {
        return Err(ApiError::Validation {
            errors: [(
                "code".to_string(),
                "Format kode tiket tidak dikenali.".to_string(),
            )]
            .into_iter()
            .collect(),
        });
    }

    let row = crate::admin::inbox::find_by_ticket(&state.db, kind, &code)
        .await?
        .ok_or(ApiError::NotFound("tiket"))?;

    Ok(ok_json(row))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn errors() -> Errors {
        Errors::new()
    }

    #[test]
    fn answers_accept_only_numbers_between_one_and_five() {
        let mut e = errors();
        let cleaned = clean_answers(&mut e, &json!({ "pelayanan": 4, "kebersihan": 5 }));
        assert!(cleaned.is_some());
        assert!(e.is_empty());
        assert_eq!(cleaned.unwrap()["pelayanan"], json!(4));
    }

    #[test]
    fn answers_reject_out_of_range_and_wrong_types() {
        let mut e = errors();
        assert!(clean_answers(&mut e, &json!({ "nilai": 9 })).is_none());
        assert!(!e.is_empty());

        let mut e = errors();
        assert!(clean_answers(&mut e, &json!({ "nilai": "bagus" })).is_none());
        assert!(!e.is_empty());

        let mut e = errors();
        assert!(clean_answers(&mut e, &json!([1, 2, 3])).is_none());

        let mut e = errors();
        assert!(clean_answers(&mut e, &json!({})).is_none());
    }

    #[test]
    fn answers_round_fractional_values() {
        // Skala 1-5 dipakai untuk semua pertanyaan, jadi angka pecahan dari
        // kontrol slider harus dibulatkan, bukan disimpan apa adanya.
        let mut e = errors();
        let cleaned = clean_answers(&mut e, &json!({ "a": 4.4 })).unwrap();
        assert_eq!(cleaned["a"], json!(4));
    }

    #[test]
    fn overall_score_is_derived_when_missing() {
        let answers = json!({ "a": 5, "b": 4, "c": 4 });
        assert_eq!(overall_from_answers(&answers), Some(4));
        assert_eq!(overall_from_answers(&json!({})), None);
    }

    #[test]
    fn honeypot_detects_only_filled_values() {
        assert!(honeypot_triggered(Some("https://spam.test")));
        assert!(!honeypot_triggered(Some("")));
        assert!(!honeypot_triggered(Some("   ")));
        assert!(!honeypot_triggered(None));
        assert!(!honeypot_triggered(None));
    }

    #[test]
    fn fake_ticket_looks_like_a_real_response() {
        // Bentuknya harus sama dengan respons sukses, supaya bot yang mengirim
        // ulang dengan kolom kosong tidak bisa membedakan.
        let value = fake_ticket(ticket::PREFIX_WBS);
        assert!(value["ticket_code"].as_str().unwrap().starts_with("WBS-"));
        assert_eq!(value["status"], json!("received"));
    }
}
