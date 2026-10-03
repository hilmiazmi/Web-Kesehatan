//! CRUD generik untuk seluruh tabel konten.
//!
//! Nama tabel dan kolom selalu datang dari `admin::registry`, tidak pernah dari
//! request. Karena itu modul ini juga dipakai handler akun admin.

use serde_json::{Map, Value};
use sqlx::postgres::{PgArguments, PgPool, Postgres};
use sqlx::query::Query;
use sqlx::Row;

use crate::admin::registry::{self, FieldKind, FieldSpec, TableSpec};
use crate::error::{ApiError, ApiResult};
use crate::validation::{self, Errors};

/// Batas baris per halaman di panel admin.
const MAX_PAGE_SIZE: i64 = 100;
const DEFAULT_PAGE_SIZE: i64 = 25;

pub fn default_page_size() -> i64 {
    DEFAULT_PAGE_SIZE
}

/// Daftar baris dengan pagination, pencarian, dan pengurutan.
pub async fn list_records(
    pool: &PgPool,
    spec: &'static TableSpec,
    page: i64,
    page_size: i64,
    search: Option<&str>,
    sort: Option<&str>,
    descending: bool,
) -> ApiResult<Value> {
    let size = page_size.clamp(1, MAX_PAGE_SIZE);
    let offset = page.max(1).saturating_sub(1) * size;

    // `sort` hanya diterima kalau persis sama dengan nama kolom yang dikenal.
    // Nilai ini masuk ke SQL tanpa tanda kutip, jadi daftar putih di sini
    // satu-satunya penghalang antara request dan injeksi SQL.
    let allowed = registry::sortable_columns(spec);
    let order_column = sort
        .filter(|c| allowed.contains(c))
        .unwrap_or(spec.default_order);
    let direction = if descending { "DESC" } else { "ASC" };

    let needle = search.map(validation::squash).filter(|s| !s.is_empty());

    let conditions: Vec<String> = spec
        .search_columns
        .iter()
        .map(|column| format!("{column}::text ILIKE $FILTER"))
        .collect();
    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" OR "))
    };

    let list_sql = format!(
        "SELECT to_jsonb(t) FROM {table} t {where_clause} \
         ORDER BY {order_column} {direction}, id {direction} \
         LIMIT {size} OFFSET {offset}",
        table = spec.table,
    );

    let count_sql = format!(
        "SELECT count(*) FROM {table} {where_clause}",
        table = spec.table
    );

    let rows = sqlx::query(&list_sql)
        .bind(needle.as_deref())
        .fetch_all(pool)
        .await?;

    let total: i64 = sqlx::query_scalar(&count_sql)
        .bind(needle.as_deref())
        .fetch_one(pool)
        .await?;

    let items: Vec<Value> = rows
        .iter()
        .map(|row| row.try_get::<Value, _>(0).unwrap_or(Value::Null))
        .collect();

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": page.max(1),
        "page_size": size,
        "pages": if size > 0 { (total + size - 1) / size } else { 1 },
        "sort": order_column,
        "direction": direction.to_lowercase(),
        "search": needle,
    }))
}

/// Ambil satu baris berdasarkan ID.
pub async fn get_record(
    pool: &PgPool,
    spec: &TableSpec,
    id: uuid::Uuid,
) -> ApiResult<Option<Value>> {
    let sql = format!("SELECT to_jsonb(t) FROM {} t WHERE id = $1", spec.table);

    let row = sqlx::query(&sql).bind(id).fetch_optional(pool).await?;

    Ok(row.and_then(|r| r.try_get::<Value, _>(0).ok()))
}

/// Buat satu baris baru.
pub async fn create_record(pool: &PgPool, spec: &TableSpec, body: &Value) -> ApiResult<Value> {
    let object = body
        .as_object()
        .ok_or_else(|| ApiError::BadRequest("Body harus berupa objek JSON.".into()))?;

    let mut errors = Errors::new();
    let mut columns: Vec<String> = Vec::new();
    let mut binds: Vec<Value> = Vec::new();

    for field in spec.writable() {
        match object.get(field.column) {
            // Field yang tidak dikirim dan punya nilai bawaan diisi default.
            // Field tanpa default dibiarkan, dan database menarisi DEFAULT-nya.
            None => {
                if let Some(default) = field.default {
                    columns.push(format!("\"{}\"", field.column));
                    binds.push(default_value(field, default));
                }
            }
            Some(raw) => {
                if let Some(value) = coerce(&mut errors, field, raw) {
                    columns.push(format!("\"{}\"", field.column));
                    binds.push(value);
                }
            }
        }
    }

    validation::finish(errors)?;

    if columns.is_empty() {
        return Err(ApiError::BadRequest(
            "Tidak ada kolom yang bisa diisi.".into(),
        ));
    }

    let placeholders: Vec<String> = (1..=binds.len()).map(|i| format!("${i}")).collect();

    let sql = format!(
        "INSERT INTO {table} ({cols}) VALUES ({ph}) RETURNING to_jsonb({table})",
        table = spec.table,
        cols = columns.join(", "),
        ph = placeholders.join(", "),
    );

    let mut query = sqlx::query(&sql);
    for value in &binds {
        query = bind_value(query, value);
    }

    let row = query.fetch_one(pool).await?;

    Ok(row.try_get::<Value, _>(0).unwrap_or(Value::Null))
}

/// Ubah satu baris. Kolom yang tidak ada di body tidak disentuh.
pub async fn update_record(
    pool: &PgPool,
    spec: &TableSpec,
    id: uuid::Uuid,
    body: &Value,
) -> ApiResult<Value> {
    let object = body
        .as_object()
        .ok_or_else(|| ApiError::BadRequest("Body harus berupa objek JSON.".into()))?;

    let mut errors = Errors::new();
    let mut assignments: Vec<String> = Vec::new();
    let mut binds: Vec<Value> = Vec::new();

    for (key, raw) in object {
        // Kunci yang bukan kolom tabel diabaikan. Menolaknya akan lebih ketat,
        // tapi form admin yang masih punya field usang akan gagal menyimpan,
        // dan itu lebih sulit didiagnosis daripada field yang diabaikan.
        let Some(field) = spec.field(key).filter(|f| !f.readonly) else {
            continue;
        };

        if let Some(value) = coerce(&mut errors, field, raw) {
            assignments.push(format!("\"{}\" = ${}", field.column, binds.len() + 1));
            binds.push(value);
        }
    }

    validation::finish(errors)?;

    if assignments.is_empty() {
        return Err(ApiError::BadRequest(
            "Tidak ada kolom yang bisa diubah.".into(),
        ));
    }

    let sql = format!(
        "UPDATE {table} SET {sets} WHERE id = ${last} RETURNING to_jsonb({table})",
        table = spec.table,
        sets = assignments.join(", "),
        last = binds.len() + 1,
    );

    let mut query = sqlx::query(&sql);
    for value in &binds {
        query = bind_value(query, value);
    }

    let row = query.bind(id).fetch_optional(pool).await?;

    row.map(|r| r.try_get::<Value, _>(0).unwrap_or(Value::Null))
        .ok_or(ApiError::NotFound("baris"))
}

/// Hapus satu baris.
pub async fn delete_record(pool: &PgPool, spec: &TableSpec, id: uuid::Uuid) -> ApiResult<()> {
    let sql = format!("DELETE FROM {} WHERE id = $1", spec.table);

    let result = sqlx::query(&sql).bind(id).execute(pool).await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound("baris"));
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Konversi nilai
// ---------------------------------------------------------------------------

fn default_value(field: &FieldSpec, default: &str) -> Value {
    match field.kind {
        FieldKind::Boolean => Value::Bool(default == "true"),
        _ => Value::String(default.to_string()),
    }
}

/// Ubah nilai dari JSON menjadi bentuk yang bisa di-bind ke PostgreSQL.
///
/// `None` berarti nilai tidak valid; pesan errornya sudah masuk ke `errors`,
/// jadi pemanggil cukup memanggil `validation::finish` di akhir.
fn coerce(errors: &mut Errors, field: &FieldSpec, raw: &Value) -> Option<Value> {
    // `null` berarti kosongkan kolom, dan hanya boleh kalau field tidak wajib.
    if raw.is_null() {
        if field.required {
            errors.add(field.column, format!("{} wajib diisi.", field.label));
            return None;
        }
        return Some(Value::Null);
    }

    match field.kind {
        FieldKind::Boolean => match parse_bool(raw) {
            Some(value) => Some(Value::Bool(value)),
            None => {
                errors.add(
                    field.column,
                    format!("{} harus ya atau tidak.", field.label),
                );
                None
            }
        },
        FieldKind::Integer => match as_i64(raw) {
            Some(value) => Some(Value::String(value.to_string())),
            None => {
                errors.add(
                    field.column,
                    format!("{} harus bilangan bulat.", field.label),
                );
                None
            }
        },
        FieldKind::Money => match as_f64(raw) {
            Some(value) if value >= 0.0 => Some(Value::String(format!("{value:.2}"))),
            _ => {
                errors.add(
                    field.column,
                    format!("{} harus angka positif.", field.label),
                );
                None
            }
        },
        FieldKind::Choice(allowed) => {
            let text = raw.as_str().unwrap_or_default().trim().to_string();
            if allowed.contains(&text.as_str()) {
                Some(Value::String(text))
            } else {
                errors.add(field.column, "Pilihan tidak dikenali.");
                None
            }
        }
        FieldKind::Email => validation::email(
            errors,
            field.column,
            raw.as_str().unwrap_or_default(),
            field.required,
        )
        .map(Value::String),
        FieldKind::Phone => validation::phone_id(
            errors,
            field.column,
            raw.as_str().unwrap_or_default(),
            field.required,
        )
        .map(Value::String),
        FieldKind::Slug => {
            let text = raw.as_str().unwrap_or_default().trim().to_lowercase();
            match validation::text_required(errors, field.column, &text, 2, field.max_len) {
                Some(value) if is_slug(&value) => Some(Value::String(value)),
                Some(_) => {
                    errors.add(
                        field.column,
                        "Slug hanya boleh huruf, angka, dan tanda hubung.",
                    );
                    None
                }
                None => None,
            }
        }
        FieldKind::Url => {
            let text = raw.as_str().unwrap_or_default();
            if text.trim().is_empty() && !field.required {
                return Some(Value::Null);
            }
            match validation::text_required(errors, field.column, text, 1, field.max_len) {
                Some(value) if is_safe_url(&value) => Some(Value::String(value)),
                Some(_) => {
                    errors.add(field.column, "URL harus diawali http:// atau https://");
                    None
                }
                None => None,
            }
        }
        FieldKind::Long | FieldKind::Markdown => {
            let text = raw.as_str().unwrap_or_default();
            if field.required {
                validation::text_required(errors, field.column, text, 1, field.max_len)
                    .map(Value::String)
            } else {
                match validation::text_optional(errors, field.column, text, field.max_len) {
                    Some(value) => Some(Value::String(value)),
                    None => Some(Value::Null),
                }
            }
        }
        FieldKind::Short | FieldKind::Date => {
            let text = raw.as_str().unwrap_or_default();
            let checked = if field.required {
                validation::text_required(errors, field.column, text, 1, field.max_len)
            } else {
                validation::text_optional(errors, field.column, text, field.max_len)
                    .or(Some(String::new()))
            }?;

            if field.kind == FieldKind::Date
                && !checked.is_empty()
                && chrono::NaiveDate::parse_from_str(&checked, "%Y-%m-%d").is_err()
            {
                errors.add(field.column, "Tanggal harus format YYYY-MM-DD.");
                return None;
            }

            if checked.is_empty() {
                Some(Value::Null)
            } else {
                Some(Value::String(checked))
            }
        }
    }
}

fn parse_bool(raw: &Value) -> Option<bool> {
    match raw {
        Value::Bool(b) => Some(*b),
        Value::String(s) => match s.trim() {
            "true" | "1" | "yes" | "on" => Some(true),
            "false" | "0" | "no" | "off" => Some(false),
            _ => None,
        },
        Value::Number(n) => n.as_i64().map(|v| v != 0),
        _ => None,
    }
}

fn as_i64(raw: &Value) -> Option<i64> {
    match raw {
        Value::Number(n) => n.as_i64(),
        Value::String(s) => s.trim().parse::<i64>().ok(),
        _ => None,
    }
}

fn as_f64(raw: &Value) -> Option<f64> {
    match raw {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => s
            .trim()
            .replace([' ', '.'], "")
            .replace(',', ".")
            .parse::<f64>()
            .ok()
            .or_else(|| s.trim().parse::<f64>().ok()),
        _ => None,
    }
}

fn is_slug(value: &str) -> bool {
    !value.is_empty()
        && value
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// Terima hanya `http` dan `https`.
///
/// Admin tidak boleh menyimpan `javascript:` ke kolom gambar atau tautan, karena
/// nilai itu akan ikut masuk ke `src` dan `href` di halaman publik.
fn is_safe_url(value: &str) -> bool {
    let lowered = value.trim().to_ascii_lowercase();
    lowered.starts_with("http://") || lowered.starts_with("https://") || lowered.starts_with("/")
}

/// Ikat satu `serde_json::Value` ke query.
fn bind_value<'q>(
    query: Query<'q, Postgres, PgArguments>,
    value: &Value,
) -> Query<'q, Postgres, PgArguments> {
    match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(b) => query.bind(*b),
        Value::String(s) => query.bind(s.clone()),
        Value::Number(n) => match n.as_i64() {
            Some(v) => query.bind(v),
            None => query.bind(n.as_f64().unwrap_or(0.0)),
        },
        other => query.bind(other.to_string()),
    }
}

/// Bentuk objek JSON kosong, dipakai saat tidak ada body.
pub fn empty_object() -> Map<String, Value> {
    Map::new()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn field(kind: FieldKind, required: bool, max_len: usize) -> FieldSpec {
        FieldSpec {
            column: "uji",
            label: "Uji",
            kind,
            required,
            max_len,
            default: None,
            readonly: false,
        }
    }

    fn coerce_value(kind: FieldKind, required: bool, raw: Value) -> Result<Option<Value>, String> {
        let mut errors = Errors::new();
        let out = coerce(&mut errors, &field(kind, required, 100), &raw);
        if errors.is_empty() {
            Ok(out)
        } else {
            Err("ada error".into())
        }
    }

    #[test]
    fn boolean_accepts_common_form_encodings() {
        for raw in [
            json!(true),
            json!(1),
            json!("true"),
            json!("on"),
            json!("yes"),
        ] {
            assert_eq!(
                coerce_value(FieldKind::Boolean, false, raw.clone()),
                Ok(Some(Value::Bool(true))),
                "{raw} harus dianggap ya"
            );
        }
        for raw in [json!(false), json!(0), json!("false"), json!("off")] {
            assert_eq!(
                coerce_value(FieldKind::Boolean, false, raw),
                Ok(Some(Value::Bool(false)))
            );
        }
    }

    #[test]
    fn boolean_rejects_nonsense() {
        for raw in [json!("mungkin"), json!({}), json!([1, 2])] {
            assert!(
                coerce_value(FieldKind::Boolean, false, raw.clone()).is_err(),
                "{raw} seharusnya ditolak"
            );
        }
    }

    #[test]
    fn null_clears_optional_but_not_required() {
        assert_eq!(
            coerce_value(FieldKind::Short, false, Value::Null),
            Ok(Some(Value::Null))
        );
        assert!(coerce_value(FieldKind::Short, true, Value::Null).is_err());
    }

    #[test]
    fn choice_only_accepts_the_allowlist() {
        let allowed: &'static [&'static str] = &["a", "b"];
        let mut errors = Errors::new();
        let spec = FieldSpec {
            column: "uji",
            label: "Uji",
            kind: FieldKind::Choice(allowed),
            required: true,
            max_len: 10,
            default: None,
            readonly: false,
        };
        assert_eq!(
            coerce(&mut errors, &spec, &json!("a")),
            Some(Value::String("a".into()))
        );
        assert!(errors.is_empty());
        assert_eq!(coerce(&mut errors, &spec, &json!("c")), None);
        assert!(!errors.is_empty());
    }

    #[test]
    fn slug_rejects_unsafe_characters() {
        assert_eq!(
            coerce_value(FieldKind::Slug, true, json!("  Jantung-Terpadu ")),
            Ok(Some(Value::String("jantung-terpadu".into())))
        );
        // Path traversal dan spasi harus ditolak.
        assert!(coerce_value(FieldKind::Slug, true, json!("../etc/passwd")).is_err());
        assert!(coerce_value(FieldKind::Slug, true, json!("dua kata")).is_err());
        assert!(coerce_value(FieldKind::Slug, true, json!("nama<skrip>")).is_err());
    }

    #[test]
    fn url_rejects_script_schemes() {
        assert!(coerce_value(FieldKind::Url, false, json!("javascript:alert(1)")).is_err());
        assert!(coerce_value(FieldKind::Url, false, json!("data:text/html,<script>")).is_err());
        assert_eq!(
            coerce_value(FieldKind::Url, true, json!("https://images.test/a.jpg")),
            Ok(Some(Value::String("https://images.test/a.jpg".into())))
        );
        // URL internal untuk tombol slide boleh relatif.
        assert_eq!(
            coerce_value(FieldKind::Url, false, json!("/pelayanan/prioritas/jantung")),
            Ok(Some(Value::String("/pelayanan/prioritas/jantung".into())))
        );
    }

    #[test]
    fn money_parses_indonesian_format() {
        // Admin mengetik "1.450.000" di form; database menerima 1450000.00.
        assert_eq!(
            coerce_value(FieldKind::Money, true, json!("1.450.000")),
            Ok(Some(Value::String("1450000.00".into())))
        );
        assert!(coerce_value(FieldKind::Money, true, json!("-5")).is_err());
        assert!(coerce_value(FieldKind::Money, true, json!("bukan angka")).is_err());
    }

    #[test]
    fn date_requires_iso_format() {
        assert_eq!(
            coerce_value(FieldKind::Date, false, json!("2026-10-02")),
            Ok(Some(Value::String("2026-10-02".into())))
        );
        assert!(coerce_value(FieldKind::Date, false, json!("02/10/2026")).is_err());
        assert!(coerce_value(FieldKind::Date, false, json!("2026-13-45")).is_err());
    }

    #[test]
    fn text_length_limit_is_enforced() {
        let long = "a".repeat(150);
        let mut errors = Errors::new();
        let spec = field(FieldKind::Short, true, 100);
        assert_eq!(coerce(&mut errors, &spec, &json!(long)), None);
        assert!(!errors.is_empty());
    }

    #[test]
    fn integer_accepts_numeric_strings() {
        assert_eq!(
            coerce_value(FieldKind::Integer, true, json!(" 12 ")),
            Ok(Some(Value::String("12".into())))
        );
        assert!(coerce_value(FieldKind::Integer, true, json!("1,5")).is_err());
        assert!(coerce_value(FieldKind::Integer, true, json!("")).is_err());
    }
}
