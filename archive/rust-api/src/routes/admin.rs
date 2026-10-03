//! Endpoint panel admin.
//!
//! Semua handler di sini melewati pemeriksaan sesi, dan sebagian besar juga
//! memeriksa peran. Peran menentukan batas yang jelas:
//!
//! * `super_admin` mengelola semuanya, termasuk akun dan penghapusan baris.
//! * `editor` mengelola konten publik.
//! * `front_office` membaca dan mengubah status pesan yang masuk.
//!
//! Pemeriksaan peran dilakukan per handler, bukan lewat middleware, supaya
//! setiap rute benar-benar terlihat di kode. Rute yang lupa memasang
//! pemeriksaan akan terlihat langsung di diff, bukan jadi perilaku diam-diam.

use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::admin::{accounts, inbox::InboxKind, records, registry, stats};
use crate::auth::session::Role;
use crate::error::{ok_json, ApiError, ApiResult};
use crate::repo;
use crate::routes::{session, session_with_role};
use crate::state::AppState;

// ---------------------------------------------------------------------------
// Dasbor
// ---------------------------------------------------------------------------

pub async fn stats(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    session(&state, &headers)?;

    let summary = stats::load_stats(&state.db).await?;
    let per_day = stats::appointments_per_day(&state.db).await?;

    Ok(ok_json(json!({
        "summary": summary,
        "appointments_per_day": per_day,
    })))
}

pub async fn survey_by_unit(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Response> {
    session(&state, &headers)?;
    Ok(ok_json(stats::survey_by_unit(&state.db).await?))
}

pub async fn appointments_per_day(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Response> {
    session(&state, &headers)?;
    Ok(ok_json(stats::appointments_per_day(&state.db).await?))
}

/// Daftar tabel yang bisa dikelola beserta kolomnya.
///
/// Panel admin memakai endpoint ini untuk membangun formulirnya, sehingga
/// daftar kolom di server dan daftar kolom di layar tidak bisa berbeda.
pub async fn tables(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    session(&state, &headers)?;

    let items: Vec<Value> = registry::all()
        .iter()
        .map(|spec| {
            json!({
                "table": spec.table,
                "label": spec.label,
                "default_order": spec.default_order,
                "deletable": spec.deletable,
                "search_columns": spec.search_columns,
                "fields": spec.fields.iter().map(|field| json!({
                    "column": field.column,
                    "label": field.label,
                    "kind": kind_name(field.kind),
                    "required": field.required,
                    "max_len": field.max_len,
                    "readonly": field.readonly,
                    "default": field.default,
                    "choices": match field.kind {
                        crate::admin::registry::FieldKind::Choice(options) => Some(options),
                        _ => None,
                    },
                })).collect::<Vec<_>>(),
            })
        })
        .collect();

    Ok(ok_json(json!({ "items": items })))
}

fn kind_name(kind: registry::FieldKind) -> &'static str {
    use registry::FieldKind;
    match kind {
        FieldKind::Short => "short",
        FieldKind::Long => "long",
        FieldKind::Markdown => "markdown",
        FieldKind::Url => "url",
        FieldKind::Email => "email",
        FieldKind::Phone => "phone",
        FieldKind::Slug => "slug",
        FieldKind::Choice(_) => "choice",
        FieldKind::Integer => "integer",
        FieldKind::Money => "money",
        FieldKind::Date => "date",
        FieldKind::Boolean => "boolean",
    }
}

/// Ambil spesifikasi tabel dari path, atau 404 kalau nama tabel tidak dikenal.
fn table_spec(name: &str) -> ApiResult<&'static registry::TableSpec> {
    registry::find(name.trim()).ok_or(ApiError::NotFound("tabel"))
}

// ---------------------------------------------------------------------------
// CRUD konten
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub q: Option<String>,
    pub sort: Option<String>,
    pub desc: Option<bool>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(table): Path<String>,
    Query(query): Query<ListQuery>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;
    let spec = table_spec(&table)?;

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(records::default_page_size());

    let payload = records::list_records(
        &state.db,
        spec,
        page,
        page_size,
        query.q.as_deref(),
        query.sort.as_deref(),
        query.desc.unwrap_or(false),
    )
    .await?;

    Ok(ok_json(payload))
}

pub async fn show(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((table, id)): Path<(String, String)>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;
    let spec = table_spec(&table)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let row = records::get_record(&state.db, spec, id)
        .await?
        .ok_or(ApiError::NotFound("baris"))?;

    Ok(ok_json(row))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(table): Path<String>,
    body: Option<Json<Value>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;
    let spec = table_spec(&table)?;

    let value = body.map(|Json(value)| value).unwrap_or(Value::Null);
    let row = records::create_record(&state.db, spec, &value).await?;

    Ok(crate::error::created_json(row))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((table, id)): Path<(String, String)>,
    body: Option<Json<Value>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;
    let spec = table_spec(&table)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let value = body.map(|Json(value)| value).unwrap_or(Value::Null);
    let row = records::update_record(&state.db, spec, id, &value).await?;

    Ok(ok_json(row))
}

pub async fn destroy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((table, id)): Path<(String, String)>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;
    let spec = table_spec(&table)?;

    if !spec.deletable {
        return Err(ApiError::BadRequest(
            "Tabel ini tidak boleh dihapus lewat panel.".into(),
        ));
    }

    let id = crate::routes::public::parse_uuid(&id, "id")?;
    records::delete_record(&state.db, spec, id).await?;

    Ok(ok_json(json!({ "deleted": true })))
}

// ---------------------------------------------------------------------------
// Kapasitas tempat tidur
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct BedUpdateBody {
    pub items: Vec<BedItem>,
}

#[derive(Debug, Deserialize)]
pub struct BedItem {
    pub ward_name: String,
    pub class_name: String,
    pub total_beds: i64,
    pub occupied_beds: i64,
    pub reserved_beds: i64,
}

pub async fn update_beds(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<BedUpdateBody>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if body.items.is_empty() || body.items.len() > 200 {
        return Err(ApiError::BadRequest("Kirim antara 1 dan 200 baris.".into()));
    }

    let mut errors = crate::validation::Errors::new();
    let mut items = Vec::with_capacity(body.items.len());

    for (index, item) in body.items.iter().enumerate() {
        let field = format!("items[{index}]");

        let ward = crate::validation::text_required(&mut errors, &field, &item.ward_name, 2, 160);
        let class = crate::validation::text_required(&mut errors, &field, &item.class_name, 2, 80);

        let total = crate::validation::integer_range(&mut errors, &field, item.total_beds, 0, 5000);
        let occupied =
            crate::validation::integer_range(&mut errors, &field, item.occupied_beds, 0, 5000);
        let reserved =
            crate::validation::integer_range(&mut errors, &field, item.reserved_beds, 0, 5000);

        if let (Some(ward), Some(class), Some(total), Some(occupied), Some(reserved)) =
            (ward, class, total, occupied, reserved)
        {
            items.push(repo::beds::BedUpdate {
                ward_name: ward,
                class_name: class,
                total_beds: total as i32,
                occupied_beds: occupied as i32,
                reserved_beds: reserved as i32,
            });
        }
    }

    crate::validation::finish(errors)?;

    let changed = repo::beds::update_beds(&state.db, &items).await?;

    Ok(ok_json(json!({
        "requested": items.len(),
        "updated": changed,
    })))
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct InboxQuery {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub q: Option<String>,
}

pub async fn inbox_list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(kind): Path<String>,
    Query(query): Query<InboxQuery>,
) -> ApiResult<Response> {
    session(&state, &headers)?;

    let kind = InboxKind::parse(&kind).ok_or(ApiError::NotFound("jenis inbox"))?;

    let payload = crate::admin::inbox::list(
        &state.db,
        kind,
        query.status.as_deref(),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
        query.q.as_deref(),
    )
    .await?;

    Ok(ok_json(payload))
}

#[derive(Debug, Deserialize)]
pub struct InboxPatch {
    pub status: String,
    #[serde(default)]
    pub admin_note: Option<String>,
}

pub async fn inbox_update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((kind, id)): Path<(String, String)>,
    body: Option<Json<InboxPatch>>,
) -> ApiResult<Response> {
    // Semua peran boleh mengubah status pesan yang masuk, karena itu pekerjaan
    // front office. Mengubah isi pesan tidak ada di endpoint mana pun.
    session(&state, &headers)?;

    let kind = InboxKind::parse(&kind).ok_or(ApiError::NotFound("jenis inbox"))?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let mut errors = crate::validation::Errors::new();
    let status = crate::validation::text_required(&mut errors, "status", &body.status, 2, 20);
    let note = crate::validation::text_optional(
        &mut errors,
        "admin_note",
        body.admin_note.as_deref().unwrap_or(""),
        2000,
    );
    crate::validation::finish(errors)?;

    let status = status.expect("validasi memastikan status ada");

    crate::admin::inbox::update_status(&state.db, kind, id, &status, note.as_deref()).await?;

    Ok(ok_json(json!({ "status": status, "updated": true })))
}

// ---------------------------------------------------------------------------
// Akun
// ---------------------------------------------------------------------------

pub async fn users_list(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;

    let rows = accounts::list(&state.db).await?;
    let counts = accounts::counts_by_role(&state.db).await?;

    Ok(ok_json(json!({ "items": rows, "counts_by_role": counts })))
}

#[derive(Debug, Deserialize)]
pub struct NewAccountBody {
    pub email: String,
    pub name: String,
    pub role: String,
    pub password: String,
}

pub async fn users_create(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<NewAccountBody>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let mut errors = crate::validation::Errors::new();
    let email = crate::validation::email(&mut errors, "email", &body.email, true);
    let name = crate::validation::text_required(&mut errors, "name", &body.name, 3, 160);
    let role = crate::validation::choice(&mut errors, "role", &body.role, ROLE_VALUES);
    check_password(&mut errors, &body.password);
    crate::validation::finish(errors)?;

    let account = accounts::create(
        &state.db,
        &accounts::NewAccount {
            email: email.expect("validasi"),
            name: name.expect("validasi"),
            role: Role::parse(&role.expect("validasi")).expect("daftar peran sudah divalidasi"),
            password: body.password.clone(),
        },
    )
    .await?;

    Ok(crate::error::created_json(account))
}

#[derive(Debug, Deserialize)]
pub struct AccountPatchBody {
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub is_active: Option<bool>,
}

pub async fn users_update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    body: Option<Json<AccountPatchBody>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let mut errors = crate::validation::Errors::new();

    let email = body
        .email
        .as_deref()
        .and_then(|value| crate::validation::email(&mut errors, "email", value, true));
    let name = body
        .name
        .as_deref()
        .and_then(|value| crate::validation::text_required(&mut errors, "name", value, 3, 160));
    let role = body.role.as_deref().and_then(|value| {
        crate::validation::choice(&mut errors, "role", value, ROLE_VALUES);
        Role::parse(value.trim())
    });

    crate::validation::finish(errors)?;

    let account = accounts::update(
        &state.db,
        id,
        &accounts::AccountPatch {
            email,
            name,
            role,
            is_active: body.is_active,
        },
    )
    .await?;

    Ok(ok_json(account))
}

#[derive(Debug, Deserialize)]
pub struct PasswordBody {
    pub current_password: String,
    pub new_password: String,
}

pub async fn users_change_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    body: Option<Json<PasswordBody>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let mut errors = crate::validation::Errors::new();
    check_password(&mut errors, &body.new_password);

    if body.current_password.is_empty() {
        errors.add("current_password", "Wajib diisi.");
    }

    crate::validation::finish(errors)?;

    // Password lama selalu diminta, termasuk saat admin mengubah akunnya
    // sendiri. Sesi yang masih hidup membuktikan dia sudah masuk, bukan bahwa
    // dia sedang memegang keyboard itu; tanpa password lama, siapa pun yang
    // sempat menemukan cookie sesi bisa mengunci akun orang lain.
    accounts::change_password(&state.db, id, &body.current_password, &body.new_password).await?;

    Ok(ok_json(json!({ "password_updated": true })))
}

pub async fn users_reset_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    body: Option<Json<NewPasswordOnly>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_manage_users)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let mut errors = crate::validation::Errors::new();
    check_password(&mut errors, &body.new_password);
    crate::validation::finish(errors)?;

    accounts::reset_password(&state.db, id, &body.new_password).await?;

    Ok(ok_json(json!({ "password_reset": true })))
}

#[derive(Debug, Deserialize)]
pub struct NewPasswordOnly {
    pub new_password: String,
}

pub async fn users_destroy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> ApiResult<Response> {
    let actor = session_with_role(&state, &headers, Role::can_manage_users)?;
    let id = crate::routes::public::parse_uuid(&id, "id")?;

    let acting_user = actor.sub.parse::<uuid::Uuid>().unwrap_or(uuid::Uuid::nil());

    accounts::delete(&state.db, id, acting_user).await?;

    Ok(ok_json(json!({ "deleted": true })))
}

// ---------------------------------------------------------------------------
// Pengaturan
// ---------------------------------------------------------------------------

pub async fn settings_get(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;
    Ok(ok_json(repo::content::load_settings(&state.db).await?))
}

pub async fn settings_put(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<Value>>,
) -> ApiResult<Response> {
    session_with_role(&state, &headers, Role::can_edit_content)?;

    let Json(value) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    let object = value
        .as_object()
        .ok_or_else(|| ApiError::BadRequest("Body harus berupa objek JSON.".into()))?;

    let bundle = repo::content::save_settings(&state.db, object).await?;

    Ok(ok_json(bundle))
}

// ---------------------------------------------------------------------------
// Aturan password
// ---------------------------------------------------------------------------

const MIN_PASSWORD: usize = 10;
const MAX_PASSWORD: usize = 200;

const ROLE_VALUES: &[&str] = &["super_admin", "editor", "front_office"];

/// Periksa panjang kata sandi.
///
/// Aturan ini sengaja tidak menuntut kombinasi huruf besar, angka, dan simbol.
/// Yang diwajibkan adalah panjang minimum: bagi pengguna, kata sandi acak
/// panjang jauh lebih berguna daripada "Rahasia123!" yang sama di mana saja.
/// Server juga membatasi percobaan login, sehingga menebak kata sandi pendek
/// tetap lambat.
fn check_password(errors: &mut crate::validation::Errors, password: &str) {
    let len = password.chars().count();

    if len < MIN_PASSWORD {
        errors.add(
            "password",
            format!("Kata sandi minimal {MIN_PASSWORD} karakter."),
        );
    } else if len > MAX_PASSWORD {
        errors.add(
            "password",
            format!("Kata sandi maksimal {MAX_PASSWORD} karakter."),
        );
    } else if password.trim().is_empty() {
        errors.add("password", "Kata sandi tidak boleh hanya spasi.");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_names_cover_every_field_kind() {
        // Kalau ada varian baru di `FieldKind` dan `kind_name` lupa
        // ditambahkan, frontend akan menerima `""` untuk kolom itu.
        for kind in [
            registry::FieldKind::Short,
            registry::FieldKind::Long,
            registry::FieldKind::Markdown,
            registry::FieldKind::Url,
            registry::FieldKind::Email,
            registry::FieldKind::Phone,
            registry::FieldKind::Slug,
            registry::FieldKind::Choice(&["a"]),
            registry::FieldKind::Integer,
            registry::FieldKind::Money,
            registry::FieldKind::Date,
            registry::FieldKind::Boolean,
        ] {
            assert!(!kind_name(kind).is_empty(), "{kind:?} tidak punya nama");
        }
    }

    #[test]
    fn password_length_is_enforced() {
        let mut e = crate::validation::Errors::new();
        check_password(&mut e, "pendek");
        assert!(!e.is_empty());

        let mut e = crate::validation::Errors::new();
        check_password(&mut e, "            ");
        assert!(!e.is_empty());

        let mut e = crate::validation::Errors::new();
        check_password(&mut e, "kata-sandi-yang-cukup-panjang");
        assert!(e.is_empty(), "{:?}", e);
    }

    #[test]
    fn unknown_table_is_not_found() {
        assert!(table_spec("articles").is_ok());
        assert!(table_spec("users").is_err());
        assert!(table_spec("").is_err());
        assert!(table_spec(" articles ").is_ok());
    }
}
