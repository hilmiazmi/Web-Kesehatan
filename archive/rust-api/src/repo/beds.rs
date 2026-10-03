//! Query ketersediaan tempat tidur.

use chrono::{DateTime, Utc};
use sqlx::postgres::PgPool;
use sqlx::FromRow;

use crate::error::ApiResult;

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct BedRow {
    pub ward_name: String,
    pub class_name: String,
    pub room_code: Option<String>,
    pub total_beds: i32,
    pub occupied_beds: i32,
    pub reserved_beds: i32,
    /// Dihitung di database supaya frontend tidak harus menghitung ulang dan
    /// tidak bisa salah karena hanya `occupied_beds` yang terkirim.
    pub available_beds: i32,
    pub gender_policy: Option<String>,
    pub note: Option<String>,
    pub observed_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct BedSummary {
    pub total_beds: i32,
    pub occupied_beds: i32,
    pub reserved_beds: i32,
    pub available_beds: i32,
    /// Persentase beds terisi, satu angka di desimal.
    ///
    /// `f64`, bukan `f32`, karena 68.8 tidak bisa diwakili persis sebagai
    /// `f32`, jadi serde akan menulis `68.80000305175781`. Pembulatan manual
    /// akan menutupi itu, tapi `f64` menulis `68.8` apa adanya.
    pub occupancy_percent: f64,
    pub observed_at: String,
    pub room_count: i32,
}

/// Ubah waktu peninjauan dari `timestamptz` PostgreSQL menjadi teks yang enak
/// dibaca orang.
///
/// Yang tampil di halaman adalah `2026-10-02 08:30`, jadi detik dan zona waktu
/// dibuang. Nilai yang tidak bisa diurai dikembalikan apa adanya supaya satu
/// baris rusak tidak membuat seluruh halaman error.
fn format_observed_at(raw: &str) -> String {
    let Ok(timestamp) = DateTime::parse_from_rfc3339(raw) else {
        return raw.trim().to_string();
    };

    timestamp
        .with_timezone(&Utc)
        .format("%Y-%m-%d %H:%M")
        .to_string()
}

/// Bentuk ekspresi waktu peninjauan agar bisa diurai sebagai RFC 3339.
///
/// Dua hal diperbaiki di sini. PostgreSQL menulis `timestamptz` dengan pemisah
/// spasi (`2026-10-02 08:30:00+00`), sedangkan RFC 3339 mewajibkan huruf `T`.
/// PostgreSQL juga menulis zona waktu sebagai `+00`, sedangkan RFC 3339
/// mewajibkan `+00:00`. Tanpa keduanya, `parse_from_rfc3339` selalu gagal dan
/// nilai mentah tampil apa adanya di halaman.
///
/// `expr` dipakai apa adanya, jadi queryset ringkasan perlu menulis
/// `max(observed_at)` sementara queryset daftar cukup `observed_at`. Tanpa
/// agregat, ringkasan akan ditolak dengan pesan kolom harus masuk GROUP BY.
fn observed_at_sql(expr: &str) -> String {
    format!(r#"to_char({expr} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '+00:00'"#)
}

/// Daftar baris kapasitas bed, urut menurut ruang dan kelas.
pub async fn list_beds(pool: &PgPool) -> ApiResult<Vec<BedRow>> {
    let rows = sqlx::query_as::<_, BedRow>(&format!(
        r#"
        SELECT ward_name,
               class_name,
               room_code,
               total_beds,
               occupied_beds,
               reserved_beds,
               total_beds - occupied_beds - reserved_beds AS available_beds,
               gender_policy,
               note,
               {observed} AS observed_at
          FROM bed_capacity
         ORDER BY ward_name, class_name
        "#,
        observed = observed_at_sql("observed_at"),
    ))
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| BedRow {
            observed_at: format_observed_at(&row.observed_at),
            ..row
        })
        .collect())
}

/// Total keseluruhan untuk kartu ringkasan di atas tabel.
///
/// `round()` di PostgreSQL menghasilkan `numeric`, yang sqlx bawa sebagai
/// teks. Karena itu persentase diambil sebagai teks lalu diurai di sini.
pub async fn load_summary(pool: &PgPool) -> ApiResult<BedSummary> {
    #[derive(FromRow)]
    struct Raw {
        total_beds: i32,
        occupied_beds: i32,
        reserved_beds: i32,
        available_beds: i32,
        occupancy_percent: String,
        observed_at: Option<String>,
        room_count: i32,
    }

    let raw = sqlx::query_as::<_, Raw>(&format!(
        r#"
        SELECT coalesce(sum(total_beds), 0)::int    AS total_beds,
               coalesce(sum(occupied_beds), 0)::int AS occupied_beds,
               coalesce(sum(reserved_beds), 0)::int AS reserved_beds,
               coalesce(sum(total_beds - occupied_beds - reserved_beds), 0)::int
                   AS available_beds,
               CASE WHEN coalesce(sum(total_beds), 0) = 0 THEN '0'
                    ELSE round(coalesce(sum(occupied_beds), 0)::numeric
                                * 100 / sum(total_beds), 1)::text
               END AS occupancy_percent,
               {observed} AS observed_at,
               count(*)::int AS room_count
          FROM bed_capacity
        "#,
        observed = observed_at_sql("max(observed_at)"),
    ))
    .fetch_optional(pool)
    .await?;

    let Some(raw) = raw else {
        return Ok(BedSummary {
            total_beds: 0,
            occupied_beds: 0,
            reserved_beds: 0,
            available_beds: 0,
            occupancy_percent: 0.0,
            observed_at: Utc::now().format("%Y-%m-%d %H:%M").to_string(),
            room_count: 0,
        });
    };

    Ok(BedSummary {
        total_beds: raw.total_beds,
        occupied_beds: raw.occupied_beds,
        reserved_beds: raw.reserved_beds,
        available_beds: raw.available_beds,
        occupancy_percent: raw.occupancy_percent.parse().unwrap_or(0.0),
        observed_at: raw.observed_at.as_deref().map_or_else(
            || Utc::now().format("%Y-%m-%d %H:%M").to_string(),
            format_observed_at,
        ),
        room_count: raw.room_count,
    })
}

/// Satu baris yang ingin diperbarui oleh admin.
#[derive(Debug, Clone)]
pub struct BedUpdate {
    pub ward_name: String,
    pub class_name: String,
    pub total_beds: i32,
    pub occupied_beds: i32,
    pub reserved_beds: i32,
}

/// Perbarui jumlah tempat tidur dan waktu peninjauan sekaligus.
///
/// Semua baris diperbarui dalam satu transaksi: adminCENT_SATU kirim satu
/// daftar, dan kalau ada satu baris yang melanggar CHECK, tidak ada baris lain
/// yang ikut berubah. Tanpa transaksi, admin bisa mendapat keadaan setengah
/// terperbarui saat menekan tombol simpan.
///
/// `CHECK (occupied_beds + reserved_beds <= total_beds)` di database yang
/// menolak request yang tidak masuk akal, sehingga pesan yang sampai ke pengguna
/// bisa dihasilkan oleh constraint itu sendiri.
pub async fn update_beds(pool: &PgPool, updates: &[BedUpdate]) -> ApiResult<u64> {
    let mut tx = pool.begin().await?;

    let mut changed = 0u64;
    for item in updates {
        let result = sqlx::query(
            r#"
            UPDATE bed_capacity
               SET total_beds    = $3,
                   occupied_beds = $4,
                   reserved_beds = $5,
                   observed_at   = now()
             WHERE ward_name = $1
               AND class_name = $2
            "#,
        )
        .bind(&item.ward_name)
        .bind(&item.class_name)
        .bind(item.total_beds)
        .bind(item.occupied_beds)
        .bind(item.reserved_beds)
        .execute(&mut *tx)
        .await?;

        changed += result.rows_affected();
    }

    tx.commit().await?;

    Ok(changed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn observed_at_is_formatted_for_humans() {
        let raw = "2026-10-02T08:30:00+00:00";
        assert_eq!(format_observed_at(raw), "2026-10-02 08:30");
    }

    #[test]
    fn observed_at_sql_uses_the_given_expression() {
        // Ringkasan menjumlahkan semua ruang, jadi ekspresinya harus dibungkus
        // agregat. Kalau tidak, PostgreSQL menolak dengan "kolom harus muncul di
        // GROUP BY".
        assert_eq!(
            observed_at_sql("max(observed_at)"),
            r#"to_char(max(observed_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '+00:00'"#
        );
    }

    #[test]
    fn observed_at_falls_back_to_raw_value() {
        // Nilai yang tidak bisa diurai tidak boleh membuat halaman error.
        assert_eq!(format_observed_at("tidak valid"), "tidak valid");
        assert_eq!(format_observed_at(""), "");
    }
}
