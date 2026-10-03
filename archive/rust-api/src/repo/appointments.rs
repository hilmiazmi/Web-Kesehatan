//! Pendaftaran E-Pasien: pembuatan record dan penghitungan nomor antrean.

use chrono::NaiveDate;
use sqlx::postgres::PgPool;
use sqlx::FromRow;

use crate::error::{ApiError, ApiResult};
use crate::repo::catalog::iso_weekday;

/// Nilai yang mengisi kolom `nik`.
///
/// NIK adalah data pribadi dan database ini adalah bagian dari situs demo, jadi
/// NIK asli tidak boleh ikut tersimpan. Nilainya divalidasi formatnya di handler
/// supaya pengunjung tetap mendapat umpan balik, lalu diganti dengan angka nol
/// sebelum query dijalankan. CHECK `appointments_nik_simulasi` di database
/// menegakkan hal yang sama: kalau ada jalur kode lain yang mencoba menyimpan
/// NIK asli, INSERT ditolak dan bukan diam-diam berhasil.
const NIK_SIMULASI: &str = "0000000000000000";

/// Data pendaftaran yang sudah lolos validasi.
#[derive(Debug, Clone)]
pub struct NewAppointment {
    pub ticket_code: String,
    pub doctor_id: uuid::Uuid,
    pub polyclinic_id: uuid::Uuid,
    pub patient_name: String,
    pub birth_date: Option<NaiveDate>,
    pub phone: String,
    pub email: Option<String>,
    pub address: Option<String>,
    pub complaint: Option<String>,
    pub visit_date: NaiveDate,
    pub schedule_id: Option<uuid::Uuid>,
    pub payment_type: String,
}

/// Hasil yang dikembalikan ke pasien.
#[derive(Debug, Clone, serde::Serialize)]
pub struct AppointmentConfirmation {
    pub ticket_code: String,
    pub queue_number: i32,
    pub patient_name: String,
    pub doctor_name: String,
    pub specialty: Option<String>,
    pub polyclinic: String,
    pub visit_date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub room: Option<String>,
    pub status: String,
    /// Sisa kuota setelah pendaftaran ini.
    pub remaining_quota: Option<i32>,
}

#[derive(Debug, FromRow)]
struct ScheduleInfo {
    quota: i32,
    day_of_week: i32,
    start_time: String,
    end_time: String,
    room: Option<String>,
    polyclinic: String,
    doctor_name: String,
    specialty: Option<String>,
}

/// Buat pendaftaran sekaligus menghitung nomor antrean, dalam satu transaksi.
///
/// Urutan di dalam transaksi penting dan tidak boleh diubah:
///
/// 1. `INSERT ... ON CONFLICT DO UPDATE` pada `doctor_visit_quotas` membuat
///    baris penghitung kalau belum ada, lalu `RETURNING taken` mengembalikan
///    angka setelah bertambah satu. Klausa ini mengunci baris sampai transaksi
///    selesai, jadi dua permintaan yang datang bersamaan tidak bisa membaca
///    angka yang sama.
/// 2. Nomor antrean adalah nilai `taken` yang baru dikembalikan.
/// 3. Kuota dicek. Kalau lewat, transaksi dibatalkan, sehingga baris penghitung
///    juga kembali seperti semula.
/// 4. Baris pendaftaran disimpan, dengan unique index
///    `(doctor_id, visit_date, queue_number)` sebagai pengaman kedua.
///
/// Kalau langkah 1 diganti jadi "SELECT count lalu INSERT", langkah 2 dan 3
/// akan membaca angka yang sama pada dua permintaan bersamaan, dan keduanya
/// mendapat nomor antrean yang sama.
pub async fn create_appointment(
    pool: &PgPool,
    input: NewAppointment,
) -> ApiResult<AppointmentConfirmation> {
    let mut tx = pool.begin().await?;

    let taken_after: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO doctor_visit_quotas (doctor_id, visit_date, taken)
        VALUES ($1, $2, 1)
        ON CONFLICT (doctor_id, visit_date)
        DO UPDATE SET taken = doctor_visit_quotas.taken + 1
        RETURNING taken
        "#,
    )
    .bind(input.doctor_id)
    .bind(input.visit_date)
    .fetch_one(&mut *tx)
    .await?;

    let queue_number = taken_after;

    let schedule = sqlx::query_as::<_, ScheduleInfo>(
        r#"
        SELECT sc.id,
               sc.quota,
               sc.day_of_week,
               sc.start_time::text AS start_time,
               sc.end_time::text AS end_time,
               sc.room,
               pc.name AS polyclinic,
               d.full_name AS doctor_name,
               s.name AS specialty
          FROM doctor_schedules sc
          JOIN polyclinics pc ON pc.id = sc.polyclinic_id
          JOIN doctors d      ON d.id  = sc.doctor_id
          LEFT JOIN specialties s ON s.id = d.specialty_id
         WHERE sc.id = $1
           AND sc.doctor_id = $2
           AND sc.is_active
        "#,
    )
    .bind(input.schedule_id)
    .bind(input.doctor_id)
    .fetch_optional(&mut *tx)
    .await?;

    // Keluar dari sini membatalkan transaksi, jadi `taken` tidak bertambah.
    let Some(schedule) = schedule else {
        return Err(ApiError::BadRequest(
            "Slot jadwal yang dipilih tidak tersedia.".into(),
        ));
    };

    if iso_weekday(input.visit_date) != schedule.day_of_week {
        return Err(ApiError::BadRequest(
            "Tanggal kunjungan tidak sesuai hari praktik dokter.".into(),
        ));
    }

    let taken_before = taken_after - 1;
    let remaining_before = schedule.quota - taken_before;

    if remaining_before <= 0 {
        let message = format!(
            "Kuota tanggal itu sudah penuh, daya tampung {} orang.",
            schedule.quota
        );
        return Err(ApiError::BadRequest(message));
    }

    sqlx::query(
        r#"
        INSERT INTO appointments (
            ticket_code, doctor_id, polyclinic_id, patient_name, nik,
            birth_date, phone, email, address, complaint, visit_date,
            schedule_id, payment_type, queue_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::payment_type, $14)
        "#,
    )
    .bind(&input.ticket_code)
    .bind(input.doctor_id)
    .bind(input.polyclinic_id)
    .bind(&input.patient_name)
    // NIK tidak pernah ikut ke query. Formulir tetap memvalidasinya sebagai 16
    // digit supaya pengunjung mendapat umpan balik yang benar, tapi nilainya
    // dibuang di sini. Kolom `nik` hanya menerima enam belas nol, dijamin CHECK
    // `appointments_nik_simulasi`, jadi tidak ada jalur kode yang bisa menyimpan
    // nomor kependudukan orang sungguhan di database demo ini.
    .bind(NIK_SIMULASI)
    .bind(input.birth_date)
    .bind(&input.phone)
    .bind(&input.email)
    .bind(&input.address)
    .bind(&input.complaint)
    .bind(input.visit_date)
    .bind(input.schedule_id)
    .bind(&input.payment_type)
    .bind(queue_number)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(AppointmentConfirmation {
        ticket_code: input.ticket_code,
        queue_number,
        patient_name: input.patient_name,
        doctor_name: schedule.doctor_name,
        specialty: schedule.specialty,
        polyclinic: schedule.polyclinic,
        visit_date: input.visit_date.to_string(),
        start_time: Some(schedule.start_time),
        end_time: Some(schedule.end_time),
        room: schedule.room,
        status: "pending".into(),
        remaining_quota: Some(remaining_before - 1),
    })
}

/// Berapa pasien yang sudah terdaftar untuk satu dokter pada satu tanggal.
pub async fn count_taken(
    pool: &PgPool,
    doctor_id: uuid::Uuid,
    visit_date: NaiveDate,
) -> ApiResult<i32> {
    let taken: i32 = sqlx::query_scalar(
        "SELECT taken FROM doctor_visit_quotas WHERE doctor_id = $1 AND visit_date = $2",
    )
    .bind(doctor_id)
    .bind(visit_date)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    Ok(taken)
}
