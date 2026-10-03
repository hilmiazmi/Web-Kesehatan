//! Login, logout, dan pemeriksaan sesi admin.
//!
//! Sesi memakai token bertanda tangan yang tersimpan di cookie `HttpOnly`,
//! bukan token yang disimpan di `localStorage`. Alasannya, token di
//! `localStorage` bisa dibaca skrip mana pun yang berjalan di situs ini,
//! termasuk skrip pihak ketiga yang ikut dimuat karena kesalahan konfigurasi
//! Content Security Policy.

use axum::extract::State;
use axum::http::{header, HeaderMap};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::auth::session::{sign_session, SessionClaims};
use crate::error::{ApiError, ApiResult};
use crate::routes::{
    clear_session_cookie, cookies_are_secure, session as read_session, session_cookie,
};
use crate::state::AppState;
use crate::validation::{self, Errors};

#[derive(Debug, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub website: Option<String>,
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<LoginBody>>,
) -> ApiResult<Response> {
    let Json(body) =
        body.ok_or_else(|| ApiError::BadRequest("Body permintaan wajib diisi.".into()))?;

    if body
        .website
        .as_deref()
        .map(validation::is_honeypot_trap)
        .unwrap_or(false)
    {
        // Balrespons tetap berhasil supaya bot tidak belajar bahwa ada
        // honeypot, tapi tetap tanpa token sesi.
        return Ok((Json(json!({ "data": { "status": "received" } })),).into_response());
    }

    // Rate limit per alamat tetap dipasang di sini. Tanpa itu, daftar email dan
    // kata sandi bisa dicoba ribuan kali per menit dari satu mesin.
    crate::routes::guard(&state, &headers)?;

    let mut errors = Errors::new();
    let email = validation::email(&mut errors, "email", &body.email, true);

    let password_len = body.password.chars().count();
    if !(8..=200).contains(&password_len) {
        errors.add("password", "Panjang kata sandi tidak wajar.");
    }

    validation::finish(errors)?;

    let email = email.expect("validasi memastikan email ada");

    let credentials = crate::admin::accounts::credentials_by_email(&state.db, &email)
        .await?
        .ok_or(ApiError::Unauthorized)?;

    let matches = crate::auth::verify_password(&body.password, &credentials.password_hash)
        .map_err(|err| ApiError::Internal(format!("gagal memeriksa password: {err}")))?;

    if !matches {
        // Pesan yang sama untuk surel yang tidak ada dan password yang salah.
        // Kalau bedanya dibedakan, endpoint ini bisa dipakai untuk mencari
        // surel mana yang punya akun di sini.
        return Err(ApiError::Unauthorized);
    }

    crate::admin::accounts::touch_login(&state.db, credentials.id).await?;

    let max_age = state.config.session_max_age.as_secs();

    let claims = SessionClaims {
        sub: credentials.id.to_string(),
        email: credentials.email,
        name: credentials.name,
        role: credentials.role,
        exp: chrono::Utc::now().timestamp() + max_age as i64,
        iat: chrono::Utc::now().timestamp(),
        v: 1,
    };

    let token = sign_session(&claims, &state.config.auth_secret);

    let mut response = Json(json!({
        "data": {
            "user": {
                "id": claims.sub,
                "email": claims.email,
                "name": claims.name,
                "role": claims.role,
            },
            "expires_at": claims.exp,
        }
    }))
    .into_response();

    let secure = cookies_are_secure(&state);
    response
        .headers_mut()
        .insert(header::SET_COOKIE, session_cookie(&token, max_age, secure));

    Ok(response)
}

pub async fn logout(State(state): State<AppState>) -> ApiResult<Response> {
    let secure = cookies_are_secure(&state);

    let mut response = Json(json!({ "data": { "status": "signed_out" } })).into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, clear_session_cookie(secure));

    Ok(response)
}

/// Periksa sesi yang sedang berjalan.
///
/// Mengembalikan 401 kalau cookie tidak ada, kedaluwarsa, atau tandatangannya
/// tidak cocok. Frontend memakai ini untuk menentukan apakah masih perlu
/// menampilkan tombol "Masuk".
pub async fn current(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    let claims = read_session(&state, &headers)?;

    Ok(crate::error::ok_json(json!({
        "id": claims.sub,
        "email": claims.email,
        "name": claims.name,
        "role": claims.role,
        "expires_at": claims.exp,
    })))
}
