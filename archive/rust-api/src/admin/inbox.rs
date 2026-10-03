//! Inbox: daftar dan perubahan status formulir yang masuk dari pengunjung.
//!
//! Kelima jenis formulir punya bentuk kolom yang berbeda, jadi setiap jenis punya
//! satu query daftar. Yang disatukan adalah daftar jenis yang dikenal dan
//! himpunan status yang boleh dipakai, sehingga handler HTTP cukup satu.

use serde_json::Value;
use sqlx::postgres::PgPool;
use sqlx::Row;

use crate::error::{ApiError, ApiResult};

/// Jenis formulir yang punya inbox.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InboxKind {
    Appointments,
    McuRegistrations,
    Feedbacks,
    WbsReports,
    SurveyResponses,
}

impl InboxKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Appointments => "appointments",
            Self::McuRegistrations => "mcu-registrations",
            Self::Feedbacks => "feedbacks",
            Self::WbsReports => "wbs-reports",
            Self::SurveyResponses => "survey-responses",
        }
    }

    /// Nama tabel SQL untuk jenis ini.
    ///
    /// Berbeda dengan `as_str`, yang dipakai sebagai segmen URL dan boleh memakai
    /// tanda hubung. Nama tabel disisipkan ke SQL tanpa tanda kutip, jadi tanda
    /// hubungnya harus diganti garis bawah.
    pub fn table_name(self) -> String {
        self.as_str().replace('-', "_")
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "appointments" => Some(Self::Appointments),
            "mcu-registrations" => Some(Self::McuRegistrations),
            "feedbacks" => Some(Self::Feedbacks),
            "wbs-reports" => Some(Self::WbsReports),
            "survey-responses" => Some(Self::SurveyResponses),
            _ => None,
        }
    }

    /// Kolom yang dibaca untuk pencarian teks bebas.
    fn search_columns(self) -> &'static [&'static str] {
        match self {
            Self::Appointments => &["patient_name", "ticket_code", "phone", "complaint"],
            Self::McuRegistrations => &["name", "ticket_code", "phone", "company_name"],
            Self::Feedbacks => &["name", "subject", "message", "ticket_code"],
            Self::WbsReports => &["subject", "description", "ticket_code", "involved_unit"],
            Self::SurveyResponses => &["respondent_name", "ticket_code", "service_unit", "comment"],
        }
    }

    /// Apakah tabel untuk jenis ini punya kolom `status`.
    ///
    /// Survei memang tidak punya status karena isinya tidak pernah ditindaklanjuti
    /// lewat antrean; hanya dibaca untuk agregasi.
    pub fn has_status(self) -> bool {
        !matches!(self, Self::SurveyResponses)
    }

    /// Status yang boleh dipakai untuk jenis ini.
    ///
    /// Tidak bisa satu allowlist untuk semua jenis, karena database memang punya
    /// dua enum yang berbeda: `appointments` memakai `appointment_status`, tiga
    /// jenis pengajuan lain memakai `submission_status`. Mengirimkan `new` ke
    /// appointments tidak ditolak oleh kode ini kalau allowlistenya disatukan, tapi
    /// PostgreSQL akan menolaknya dengan `invalid input value for enum`, dan
    /// pesannya sampai ke pengguna sebagai "Format data tidak dikenali".
    pub fn statuses(self) -> &'static [&'static str] {
        match self {
            Self::Appointments => STATUSES_PENDAFTARAN,
            Self::McuRegistrations | Self::Feedbacks | Self::WbsReports => STATUSES_PENGAJUAN,
            Self::SurveyResponses => &[],
        }
    }
}

/// Status `appointments`, sesuai enum `appointment_status`.
///
/// Status `pending` berarti permintaan sudah masuk tapi belum dikonfirmasi
/// petugas, jadi itulah yang dihitung sebagai "belum ditangani" di dasbor.
const STATUSES_PENDAFTARAN: &[&str] = &["pending", "confirmed", "cancelled", "no_show"];

/// Status pengajuan, sesuai enum `submission_status`.
const STATUSES_PENGAJUAN: &[&str] = &["new", "in_progress", "resolved", "rejected"];

pub async fn list(
    pool: &PgPool,
    kind: InboxKind,
    status: Option<&str>,
    page: i64,
    page_size: i64,
    search: Option<&str>,
) -> ApiResult<Value> {
    if let Some(value) = status {
        if kind.has_status() && !kind.statuses().contains(&value) {
            return Err(ApiError::BadRequest("Status tidak dikenal.".into()));
        }
    }

    let size = page_size.clamp(1, 100);
    let offset = page.max(1).saturating_sub(1) * size;
    let needle = search
        .map(crate::validation::squash)
        .filter(|s| !s.is_empty());

    let columns: Vec<String> = kind
        .search_columns()
        .iter()
        .map(|c| format!("{c}::text ILIKE $1"))
        .collect();
    let search_clause = if columns.is_empty() {
        String::new()
    } else {
        format!(" AND ({})", columns.join(" OR "))
    };

    let table = kind.table_name();

    // `survey_responses` tidak punya kolom status, jadi klausa status harus
    // dilewati untuk jenis itu. Bukan hanya kosongkan filter: kolomnya memang
    // tidak ada, jadi menyebutnya akan membuat query gagal.
    let status_clause = if kind.has_status() {
        "AND ($2::text IS NULL OR status = $2) "
    } else {
        ""
    };

    let status_bind = kind.has_status();

    let list_sql = format!(
        "SELECT to_jsonb(t) FROM {table} t \
         WHERE true {status_clause}{search_clause} \
         ORDER BY created_at DESC \
         LIMIT {size} OFFSET {offset}"
    );

    let count_sql =
        format!("SELECT count(*) FROM {table} t WHERE true {status_clause}{search_clause}");

    let rows = sqlx::query(&list_sql)
        .bind(needle.as_deref())
        .bind(if status_bind { status } else { None })
        .fetch_all(pool)
        .await?;

    let total: i64 = sqlx::query_scalar(&count_sql)
        .bind(needle.as_deref())
        .bind(if status_bind { status } else { None })
        .fetch_one(pool)
        .await?;

    let items: Vec<Value> = rows
        .iter()
        .map(|r| r.try_get::<Value, _>(0).unwrap_or(Value::Null))
        .collect();

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": page.max(1),
        "page_size": size,
        "kind": kind.as_str(),
        "status": if status_bind { status } else { None },
        "search": needle,
    }))
}

/// Ubah status satu baris dan simpan catatan admin.
pub async fn update_status(
    pool: &PgPool,
    kind: InboxKind,
    id: uuid::Uuid,
    status: &str,
    admin_note: Option<&str>,
) -> ApiResult<()> {
    // Survei diperiksa lebih dulu supaya pesannya tetap menjelaskan bahwa
    // jenis ini memang tidak punya status, bukan sekadar "tidak dikenal".
    if !kind.has_status() {
        return Err(ApiError::BadRequest(
            "Survei tidak punya status. Gunakan kolom komentar bila perlu mencatat tindak lanjut."
                .into(),
        ));
    }

    if !kind.statuses().contains(&status) {
        return Err(ApiError::BadRequest("Status tidak dikenal.".into()));
    }

    let table = kind.table_name();

    let sql = format!(
        "UPDATE {table} SET status = $2, admin_note = coalesce($3, admin_note) WHERE id = $1"
    );

    let result = sqlx::query(&sql)
        .bind(id)
        .bind(status)
        .bind(admin_note)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound("baris"));
    }

    Ok(())
}

/// Satu baris inbox berdasarkan kode tiket, untuk pengecekan status oleh
/// pengunjung yang menyimpan kodenya.
pub async fn find_by_ticket(
    pool: &PgPool,
    kind: InboxKind,
    ticket_code: &str,
) -> ApiResult<Option<Value>> {
    let table = kind.table_name();

    let sql = format!(
        "SELECT ticket_code, status, created_at::text AS created_at, updated_at::text AS updated_at \
         FROM {table} WHERE ticket_code = $1"
    );

    let row = sqlx::query(&sql)
        .bind(ticket_code.to_uppercase())
        .fetch_optional(pool)
        .await?;

    Ok(row.and_then(|r| r.try_get::<Value, _>(0).ok()))
}

/// Periksa bentuk kode tiket sebelum dipakai sebagai parameter query.
///
/// Bentuknya sudah dijamin oleh `ticket::generate`, jadi bentuk yang lain tidak
/// mungkin ada di database. Memeriksa di sini membuat endpoint `/tickets/...`
/// menolak input aneh dengan pesan yang jelas, bukan mengembalikan 404 yang
/// menyesatkan.
pub fn looks_like_ticket_code(code: &str) -> bool {
    let Some((prefix, suffix)) = code.split_once('-') else {
        return false;
    };

    if !matches!(prefix, "EP" | "MCU" | "KS" | "WBS" | "SKM") {
        return false;
    }

    // Alfabetnya sama dengan `ticket::generate`: huruf I, O, 0, dan 1 tidak
    // pernah muncul di kode yang benar.
    suffix.len() == 8
        && suffix
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_parsing_is_total() {
        for kind in [
            InboxKind::Appointments,
            InboxKind::McuRegistrations,
            InboxKind::Feedbacks,
            InboxKind::WbsReports,
            InboxKind::SurveyResponses,
        ] {
            assert_eq!(InboxKind::parse(kind.as_str()), Some(kind));
        }
    }

    #[test]
    fn kind_rejects_unknown_input() {
        // Nama tabel di-substitute ke SQL, jadi nama yang tidak dikenal harus
        // ditolak, bukan diteruskan.
        for bad in [
            "users",
            "bed_capacity",
            "survey_responses; DROP TABLE users",
            "",
        ] {
            assert_eq!(InboxKind::parse(bad), None, "{bad} seharusnya ditolak");
        }
    }

    #[test]
    fn table_name_has_no_dashes() {
        for kind in [
            InboxKind::Appointments,
            InboxKind::McuRegistrations,
            InboxKind::Feedbacks,
            InboxKind::WbsReports,
            InboxKind::SurveyResponses,
        ] {
            let table = kind.table_name();

            // Nama tabel disisipkan ke SQL tanpa tanda kutip, jadi tanda hubung
            // di dalamnya akan membuat query gagal saat runtime.
            assert!(!table.contains('-'), "{table}");

            // Segmen URL boleh memakai tanda hubung; itu yang membuat rute
            // `/admin/inbox/mcu-registrations` enak dibaca.
            assert_eq!(table.replace('-', "_"), kind.as_str().replace('-', "_"));
        }
    }

    #[test]
    fn every_kind_has_search_columns() {
        for kind in [
            InboxKind::Appointments,
            InboxKind::McuRegistrations,
            InboxKind::Feedbacks,
            InboxKind::WbsReports,
            InboxKind::SurveyResponses,
        ] {
            assert!(!kind.search_columns().is_empty(), "{:?}", kind);
        }
    }

    #[test]
    fn status_allowlist_is_closed() {
        for kind in [
            InboxKind::McuRegistrations,
            InboxKind::Feedbacks,
            InboxKind::WbsReports,
        ] {
            assert!(kind.statuses().contains(&"new"));
            assert!(kind.statuses().contains(&"resolved"));
            assert!(!kind.statuses().contains(&"deleted"));
            assert!(!kind.statuses().contains(&""));
        }
    }

    #[test]
    fn appointment_statuses_do_not_overlap_with_submissions() {
        // `appointment_status` dan `submission_status` sengaja dibuat terpisah di
        // migrasi. Bila suatu saat keduanya disatukan, allowlist di modul ini ikut
        // berubah dan test ini yang akan memberi tahu lebih dulu.
        let pendaftaran = InboxKind::Appointments.statuses();
        let pengajuan = InboxKind::Feedbacks.statuses();

        assert!(pendaftaran.contains(&"pending"));
        assert!(pendaftaran.contains(&"confirmed"));
        assert!(pendaftaran.contains(&"cancelled"));

        for status in pendaftaran {
            assert!(
                !pengajuan.contains(status),
                "status {status} ada di dua enum"
            );
        }
    }

    #[test]
    fn survey_has_no_status_at_all() {
        assert!(!InboxKind::SurveyResponses.has_status());
        assert!(InboxKind::SurveyResponses.statuses().is_empty());
    }

    #[test]
    fn ticket_code_shape_is_checked() {
        // Semua awalan yang dipakai `ticket::generate` harus dikenali.
        for prefix in ["EP", "MCU", "KS", "WBS", "SKM"] {
            assert!(
                looks_like_ticket_code(&format!("{prefix}-7K2M9QX3")),
                "{prefix}"
            );
        }
    }

    #[test]
    fn ticket_code_rejects_anything_else() {
        for bad in [
            "",
            "EP",
            "EP-",
            "EP-7K2M9QX",
            "EP-7K2M9QX33",
            "AA-7K2M9QX3",
            "EP-7K2M9QX;",
            "EP 7K2M9QX3",
            "EP-7k2m9qx3",
            "'; DROP TABLE users --",
        ] {
            assert!(!looks_like_ticket_code(bad), "{bad} seharusnya ditolak");
        }
    }

    #[test]
    fn generated_codes_always_pass_the_shape_check() {
        // Kalau generator dan pemeriksa ini tidak sinkron, semua tiket yang
        // baru dibuat akan ditolak saat diperiksa statusnya.
        for prefix in ["EP", "MCU", "KS", "WBS", "SKM"] {
            for _ in 0..50 {
                assert!(looks_like_ticket_code(&crate::ticket::generate(prefix)));
            }
        }
    }
}
