//! Query untuk dokter, spesialis, poliklinik, dan jadwal praktik.

use chrono::{Datelike, NaiveDate};
use sqlx::postgres::PgPool;
use sqlx::FromRow;

use crate::error::ApiResult;

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct SpecialtyRow {
    pub id: uuid::Uuid,
    pub name: String,
    pub slug: String,
    #[serde(skip_serializing)]
    pub sort_order: i32,
    #[serde(skip_serializing)]
    pub is_active: bool,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct PolyclinicRow {
    pub id: uuid::Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub location: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct DoctorRow {
    pub id: uuid::Uuid,
    pub full_name: String,
    pub title: Option<String>,
    pub photo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specialty: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specialty_slug: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct ScheduleRow {
    pub id: uuid::Uuid,
    pub doctor_id: uuid::Uuid,
    pub polyclinic: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub room: Option<String>,
    /// ISO-8601: 1 = Senin ... 7 = Minggu.
    pub day_of_week: i32,
    pub start_time: String,
    pub end_time: String,
    pub quota: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doctor_name: Option<String>,
    /// Sisa kuota untuk tanggal yang diminta, kalau ada.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining: Option<i32>,
}

/// Daftar spesialis aktif, urut sesuai urutan tampil di panel admin.
pub async fn list_specialties(pool: &PgPool) -> ApiResult<Vec<SpecialtyRow>> {
    let rows = sqlx::query_as::<_, SpecialtyRow>(
        r#"
        SELECT id, name, slug, sort_order, is_active
          FROM specialties
         WHERE is_active
         ORDER BY sort_order, name
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Daftar poliklinik aktif.
pub async fn list_polyclinics(pool: &PgPool) -> ApiResult<Vec<PolyclinicRow>> {
    let rows = sqlx::query_as::<_, PolyclinicRow>(
        r#"
        SELECT id, name, slug, description, location
          FROM polyclinics
         WHERE is_active
         ORDER BY sort_order, name
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Daftar dokter aktif, opsional disaring satu spesialis.
///
/// Nama spesialis ikut diambil supaya frontend tidak perlu permintaan kedua
/// hanya untuk menampilkan label di dalam opsi dropdown.
pub async fn list_doctors(
    pool: &PgPool,
    specialty_slug: Option<&str>,
) -> ApiResult<Vec<DoctorRow>> {
    let rows = sqlx::query_as::<_, DoctorRow>(
        r#"
        SELECT d.id,
               d.full_name,
               d.title,
               d.photo_url,
               s.name  AS specialty,
               s.slug  AS specialty_slug
          FROM doctors d
          LEFT JOIN specialties s ON s.id = d.specialty_id
         WHERE d.is_active
           AND ($1::text IS NULL OR s.slug = $1)
         ORDER BY s.name NULLS LAST, d.full_name
        "#,
    )
    .bind(specialty_slug)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Satu dokter berdasarkan ID, atau `None` kalau tidak ada atau tidak aktif.
pub async fn find_doctor(pool: &PgPool, id: uuid::Uuid) -> ApiResult<Option<DoctorRow>> {
    let row = sqlx::query_as::<_, DoctorRow>(
        r#"
        SELECT d.id,
               d.full_name,
               d.title,
               d.photo_url,
               s.name  AS specialty,
               s.slug  AS specialty_slug
          FROM doctors d
          LEFT JOIN specialties s ON s.id = d.specialty_id
         WHERE d.id = $1
           AND d.is_active
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Jadwal mingguan seorang dokter.
///
/// Tous les `day_of_week` dipetakan ke nama hari dalam bahasa Indonesia di sini,
/// bukan di frontend, supaya tidak ada dua tempat yang bebas memilih format nama
/// hari yang berbeda.
pub async fn list_doctor_schedules(
    pool: &PgPool,
    doctor_id: uuid::Uuid,
) -> ApiResult<Vec<ScheduleRow>> {
    let rows = sqlx::query_as::<_, ScheduleRow>(
        r#"
        SELECT sc.id,
               sc.doctor_id,
               pc.name AS polyclinic,
               sc.room,
               sc.day_of_week,
               sc.start_time::text AS start_time,
               sc.end_time::text AS end_time,
               sc.quota,
               sc.note,
               d.full_name AS doctor_name,
               NULL::integer AS remaining
          FROM doctor_schedules sc
          JOIN polyclinics pc ON pc.id = sc.polyclinic_id
          JOIN doctors d      ON d.id  = sc.doctor_id
         WHERE sc.doctor_id = $1
           AND sc.is_active
         ORDER BY sc.day_of_week, sc.start_time
        "#,
    )
    .bind(doctor_id)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Jadwal aktif pada satu tanggal, lengkap dengan sisa kuota.
///
/// `visit_date` dipakai untuk mengambil `taken` dari `doctor_visit_quotas`
/// sehingga sisa kuota yang ditampilkan di halaman publik sama persis dengan
/// yang dipakai saat menghitung nomor antrean.
///
/// Tanggal tanpa jadwal menghasilkan daftar kosong, bukan error: pemanggil
/// menentukan sendiri tampilan untuk kasus itu.
pub async fn schedules_on_date(
    pool: &PgPool,
    doctor_id: uuid::Uuid,
    visit_date: NaiveDate,
) -> ApiResult<Vec<ScheduleRow>> {
    let day = iso_weekday(visit_date);

    let rows = sqlx::query_as::<_, ScheduleRow>(
        r#"
        SELECT sc.id,
               sc.doctor_id,
               pc.name AS polyclinic,
               sc.room,
               sc.day_of_week,
               sc.start_time::text AS start_time,
               sc.end_time::text AS end_time,
               sc.quota,
               sc.note,
               d.full_name AS doctor_name,
               greatest(sc.quota - coalesce(q.taken, 0), 0) AS remaining
          FROM doctor_schedules sc
          JOIN polyclinics pc ON pc.id = sc.polyclinic_id
          JOIN doctors d      ON d.id  = sc.doctor_id
          LEFT JOIN doctor_visit_quotas q
                 ON q.doctor_id = sc.doctor_id
                AND q.visit_date = $2
         WHERE sc.is_active
           AND sc.doctor_id = $1
           AND sc.day_of_week = $3
         ORDER BY sc.start_time
        "#,
    )
    .bind(doctor_id)
    .bind(visit_date)
    .bind(day)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Identitas jadwal yang dibutuhkan saat pendaftaran.
///
/// Dipisah dari `ScheduleRow` karena yang dikembalikan di sini hanya
/// `doctor_id` dan `polyclinic_id`, yaitu dua kolom yang tidak muncul di
/// respons publik.
#[derive(Debug, FromRow)]
pub struct BookableSchedule {
    pub doctor_id: uuid::Uuid,
    pub polyclinic_id: uuid::Uuid,
}

/// Satu jadwal aktif beserta identitas dokter dan polikliniknya.
///
/// Hanya jadwal aktif yang bisa dipilih. Kalau jadwalnya sudah dinonaktifkan
/// admin sementara form masih terbuka di browser pasien, pendaftaran akan
/// ditolak dengan "jadwal tidak tersedia" alih-alih tersimpan ke jadwal yang
/// sudah tidak dipakai.
pub async fn schedule_for_booking(
    pool: &PgPool,
    schedule_id: uuid::Uuid,
) -> ApiResult<Option<BookableSchedule>> {
    let row = sqlx::query_as::<_, BookableSchedule>(
        r#"
        SELECT doctor_id, polyclinic_id
          FROM doctor_schedules
         WHERE id = $1
           AND is_active
        "#,
    )
    .bind(schedule_id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Ubah tanggal menjadi hari dalam minggu versi ISO-8601: 1 = Senin ... 7 = Minggu.
///
/// `chrono::Datelike::weekday().number_from_monday()` sudah memakai angka yang
/// sama, yaitu 1 = Senin sampai 7 = Minggu. Fungsi ini dibungkus supaya maksudnya jelas di tempat dipanggil dan
/// supaya mudah diaudit kalau suatu saat tipenya berubah.
pub fn iso_weekday(date: NaiveDate) -> i32 {
    date.weekday().number_from_monday() as i32
}

/// KONVERSI BALIK dari ISO weekday ke nama hari berbahasa Indonesia.
pub fn weekday_name(day: i32) -> &'static str {
    match day {
        1 => "Senin",
        2 => "Selasa",
        3 => "Rabu",
        4 => "Kamis",
        5 => "Jumat",
        6 => "Sabtu",
        7 => "Minggu",
        _ => "-",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn weekday_names_cover_every_value() {
        // Nilai di luar 1-7 ditolak oleh CHECK di database, tapi pemetaan di
        // sini harus tetap total supaya tidak ada panic kalau data rusak.
        assert_eq!(weekday_name(1), "Senin");
        assert_eq!(weekday_name(5), "Jumat");
        assert_eq!(weekday_name(7), "Minggu");
        assert_eq!(weekday_name(0), "-");
        assert_eq!(weekday_name(99), "-");
    }

    #[test]
    fn iso_weekday_matches_iso_8601() {
        // 2026-10-05 adalah Senin; 2026-10-11 adalah Minggu.
        assert_eq!(
            iso_weekday(NaiveDate::from_ymd_opt(2026, 10, 5).unwrap()),
            1
        );
        assert_eq!(
            iso_weekday(NaiveDate::from_ymd_opt(2026, 10, 6).unwrap()),
            2
        );
        assert_eq!(
            iso_weekday(NaiveDate::from_ymd_opt(2026, 10, 11).unwrap()),
            7
        );
    }

    #[test]
    fn iso_weekday_never_returns_zero() {
        // Nilai 0 berarti Minggu pada versi getDay() di JavaScript. Kalau salah
        // dipakai, jadwal Minggu akan hilang karena tidak cocok dengan CHECK.
        for offset in 0..14 {
            let date = NaiveDate::from_ymd_opt(2026, 10, 5)
                .unwrap()
                .checked_add_signed(chrono::Duration::days(offset))
                .unwrap();
            let day = iso_weekday(date);
            assert!((1..=7).contains(&day), "tanggal {date} menghasilkan {day}");
        }
    }
}
