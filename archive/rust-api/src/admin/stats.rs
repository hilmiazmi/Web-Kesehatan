//! Angka ringkas untuk dasbor admin.

use sqlx::postgres::PgPool;

use crate::error::ApiResult;

/// Status pendaftaran yang dihitung sebagai "belum ditangani".
///
/// Nilainya bukan `new` seperti tiga jenis pengajuan lain: `appointments` memakai
/// enum `appointment_status` sendiri. Constant dipakai ulang di query di bawah
/// dan diuji terhadap allowlist inbox, karena ketidakcocokan seperti ini tidak
/// caught compiler, hanya muncul sebagai 400 "Format data tidak dikenali" saat
/// dasbor dibuka.
const PENDAFTARAN_BELUM_DITANGANI: &str = "pending";

/// Status pengajuan yang dihitung sebagai "belum ditangani".
const PENGAJUAN_BELUM_DITANGANI: &str = "new";

#[derive(Debug, Clone, serde::Serialize)]
pub struct Stats {
    pub articles: i64,
    pub services: i64,
    pub mcu_packages: i64,
    pub doctors: i64,
    pub schedules: i64,
    pub pages: i64,
    pub hero_slides: i64,
    /// Pesan yang belum ditangani di seluruh kemungkinan masuk.
    pub inbox_unread: i64,
    pub inbox_by_kind: InboxCounts,
    pub appointments_today: i64,
    pub appointments_upcoming: i64,
    pub beds_total: i32,
    pub beds_available: i32,
    pub survey_average: Option<f32>,
    pub survey_responses: i64,
}

#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct InboxCounts {
    pub appointments: i64,
    pub mcu_registrations: i64,
    pub feedbacks: i64,
    pub wbs_reports: i64,
    pub survey_responses: i64,
}

/// Hitung semua angka dasbor dalam satu kali bolak-balik.
///
/// Dipakai satu transaction read-only supaya angka-angkanya saling konsisten.
/// Kalau dihitung dengan beberapa request terpisah, dasbor bisa menampilkan
/// "total 12" sementara rinciannya berjumlah 13 karena ada pendaftaran yang
/// masuk di antara dua request.
pub async fn load_stats(pool: &PgPool) -> ApiResult<Stats> {
    let mut tx = pool.begin().await?;

    // Fungsi biasa, bukan closure, karena closure yang menahan `tx` akan
    // memindahkannya pada pemanggilan pertama dan tidak bisa dipakai lagi.
    async fn hitung(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, sql: &str) -> ApiResult<i64> {
        let value: i64 = sqlx::query_scalar(sql).fetch_one(&mut **tx).await?;
        Ok(value)
    }

    let articles = hitung(&mut tx, "SELECT count(*) FROM articles WHERE is_published").await?;
    let services = hitung(&mut tx, "SELECT count(*) FROM services WHERE is_active").await?;
    let mcu_packages = hitung(&mut tx, "SELECT count(*) FROM mcu_packages WHERE is_active").await?;
    let doctors = hitung(&mut tx, "SELECT count(*) FROM doctors WHERE is_active").await?;
    let schedules = hitung(
        &mut tx,
        "SELECT count(*) FROM doctor_schedules WHERE is_active",
    )
    .await?;
    let pages = hitung(&mut tx, "SELECT count(*) FROM pages WHERE is_published").await?;
    let hero_slides = hitung(&mut tx, "SELECT count(*) FROM hero_slides WHERE is_active").await?;

    let pendaftaran_baru = hitung(
        &mut tx,
        &format!(
            "SELECT count(*) FROM appointments WHERE status = '{PENDAFTARAN_BELUM_DITANGANI}'"
        ),
    )
    .await?;
    let mcu_new = hitung(
        &mut tx,
        &format!(
            "SELECT count(*) FROM mcu_registrations WHERE status = '{PENGAJUAN_BELUM_DITANGANI}'"
        ),
    )
    .await?;
    let feedbacks_new = hitung(
        &mut tx,
        &format!("SELECT count(*) FROM feedbacks WHERE status = '{PENGAJUAN_BELUM_DITANGANI}'"),
    )
    .await?;
    let wbs_new = hitung(
        &mut tx,
        &format!("SELECT count(*) FROM wbs_reports WHERE status = '{PENGAJUAN_BELUM_DITANGANI}'"),
    )
    .await?;
    // Survei tidak punya kolom status, jadi tidak bisa dihitung sebagai
    // "belum ditangani". Yang dihitung di sini adalah jumlah seluruh isian,
    // dan angkanya sengaja tidak ikut `inbox_unread`.
    let survey_total = hitung(&mut tx, "SELECT count(*) FROM survey_responses").await?;

    let appointments_today = hitung(
        &mut tx,
        "SELECT count(*) FROM appointments WHERE visit_date = CURRENT_DATE",
    )
    .await?;
    let appointments_upcoming = hitung(
        &mut tx,
        "SELECT count(*) FROM appointments WHERE visit_date > CURRENT_DATE",
    )
    .await?;

    let (beds_total, beds_available) = sqlx::query_as::<_, (Option<i32>, Option<i32>)>(
        r#"
        SELECT sum(total_beds), sum(total_beds - occupied_beds - reserved_beds)
          FROM bed_capacity
        "#,
    )
    .fetch_one(&mut *tx)
    .await?;

    let (survey_average, survey_responses) = sqlx::query_as::<_, (Option<f64>, i64)>(
        "SELECT round(avg(overall_score), 2), count(*) FROM survey_responses",
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    let inbox_by_kind = InboxCounts {
        appointments: pendaftaran_baru,
        mcu_registrations: mcu_new,
        feedbacks: feedbacks_new,
        wbs_reports: wbs_new,
        survey_responses: survey_total,
    };

    let inbox_unread = inbox_by_kind.appointments
        + inbox_by_kind.mcu_registrations
        + inbox_by_kind.feedbacks
        + inbox_by_kind.wbs_reports;

    Ok(Stats {
        articles,
        services,
        mcu_packages,
        doctors,
        schedules,
        pages,
        hero_slides,
        inbox_unread,
        inbox_by_kind,
        appointments_today,
        appointments_upcoming,
        beds_total: beds_total.unwrap_or(0),
        beds_available: beds_available.unwrap_or(0),
        survey_average: survey_average.map(|v| v as f32),
        survey_responses,
    })
}

/// Rata-rata kepuasan per unit layanan, untuk tabel ringkasan survei.
///
/// Unit tanpa respons tetap dikembalikan, supaya panel bisa membedakan antara
/// "belum ada yang mengisi" dan "nilainya jelek".
pub async fn survey_by_unit(pool: &PgPool) -> ApiResult<Vec<(String, f32, i64)>> {
    let rows = sqlx::query_as::<_, (Option<String>, Option<f64>, i64)>(
        r#"
        SELECT coalesce(service_unit, 'Tidak diisi') AS unit,
               round(avg(overall_score), 2)          AS rata,
               count(*)                              AS jumlah
          FROM survey_responses
         GROUP BY 1
         ORDER BY 1
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(unit, rata, jumlah)| {
            (
                unit.unwrap_or_else(|| "Tidak diisi".to_string()),
                rata.unwrap_or(0.0) as f32,
                jumlah,
            )
        })
        .collect())
}

/// Jumlah pendaftaran per hari untuk 14 hari terakhir, untuk grafik dasbor.
///
/// Tanggal tanpa pendaftaran tetap dikembalikan dengan nilai nol, supaya
/// frontend tidak perlu menebak hari mana yang dilewati.
pub async fn appointments_per_day(pool: &PgPool) -> ApiResult<Vec<(String, i64)>> {
    let rows = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT to_char(d.day, 'YYYY-MM-DD') AS tanggal,
               coalesce(count(a.id), 0)::int AS jumlah
          FROM generate_series(
                   CURRENT_DATE - interval '13 days',
                   CURRENT_DATE,
                   interval '1 day'
               ) AS d(day)
          LEFT JOIN appointments a ON a.visit_date = d.day::date
         GROUP BY d.day
         ORDER BY d.day
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::admin::inbox::InboxKind;

    #[test]
    fn unread_statuses_exist_in_the_inbox_allowlists() {
        // Ini pengikat antara SQL di `load_stats` dengan allowlist status inbox.
        // Kedua angka itu harus berasal dari enum yang sama; kalau tidak, dasbor
        // gagal dengan 400 yang tidak menjelaskan penyebabnya.
        assert!(InboxKind::Appointments
            .statuses()
            .contains(&PENDAFTARAN_BELUM_DITANGANI));

        for kind in [
            InboxKind::McuRegistrations,
            InboxKind::Feedbacks,
            InboxKind::WbsReports,
        ] {
            assert!(
                kind.statuses().contains(&PENGAJUAN_BELUM_DITANGANI),
                "{kind:?}"
            );
        }
    }

    #[test]
    fn unread_statuses_differ_between_registrations_and_submissions() {
        // Kalau dua constant ini someday sama, test sebelumnya tetap lulus
        // padahal salah satu query-nya akan ditolak database.
        assert_ne!(PENDAFTARAN_BELUM_DITANGANI, PENGAJUAN_BELUM_DITANGANI);
    }
}
