//! Lapisan HTTP: perutean, middleware, dan handler.
//!
//! Handler di sini hanya melakukan tiga hal: membaca parameter, memanggil satu
//! fungsi di `repo` atau `admin`, lalu mengembalikan JSON. Tidak ada SQL di
//! modul ini.

pub mod admin;
pub mod auth;
pub mod forms;
pub mod public;

use axum::http::{header, HeaderMap, HeaderValue, Method};
use axum::routing::{get, patch, post};
use axum::Router;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;

use crate::auth::session::{Role, SessionClaims, COOKIE_NAME};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// Susun router lengkap dengan seluruh middleware.
pub fn router(state: AppState) -> Router {
    let body_limit = state.config.body_limit_bytes;
    let admin_origin = state.config.admin_origin.clone();

    // CORS dibatasi ke satu origin saja. Endpoint admin memakai cookie sesi,
    // jadi membiarkan semua origin diterima akan membuat situs mana pun bisa
    // mengirim permintaan atas nama admin yang sedang login.
    let cors_origin: HeaderValue = admin_origin
        .parse()
        .unwrap_or_else(|_| HeaderValue::from_static("http://localhost:3000"));

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(cors_origin))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
        .max_age(std::time::Duration::from_secs(600));

    // Seluruh rute diletakkan di bawah satu awalan supaya proxy cukup meneruskan
    // path tanpa menulis aturan rewrite di tiap lokasi. Mengganti awalan berarti
    // satu konstanta, bukan mencari ulang semua baris rute.
    let api = Router::new()
        // --- Publik, baca ---
        .route("/health", get(public::health))
        .route("/home", get(public::home))
        .route("/specialties", get(public::specialties))
        .route("/polyclinics", get(public::polyclinics))
        .route("/doctors", get(public::doctors))
        .route("/doctors/{id}/schedules", get(public::doctor_schedules))
        .route("/schedules", get(public::schedules))
        .route("/beds", get(public::beds))
        .route("/articles", get(public::articles))
        .route("/articles/{slug}", get(public::article))
        .route("/services", get(public::services))
        .route("/services/{slug}", get(public::service))
        .route("/mcu/packages", get(public::mcu_packages))
        .route("/mcu/packages/{slug}", get(public::mcu_package))
        .route("/pages/{slug}", get(public::page))
        .route("/documents", get(public::documents))
        .route("/jobs", get(public::jobs))
        .route("/jobs/{slug}", get(public::job))
        .route("/settings/public", get(public::settings))
        // --- Publik, tulis ---
        .route("/appointments", post(forms::create_appointment))
        .route("/mcu-registrations", post(forms::create_mcu_registration))
        .route("/feedbacks", post(forms::create_feedback))
        .route("/wbs-reports", post(forms::create_wbs_report))
        .route("/survey-responses", post(forms::create_survey_response))
        .route("/tickets/{kind}/{code}", get(forms::ticket_status))
        // --- Sesi admin ---
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/session", get(auth::current))
        // --- Panel admin ---
        .route("/admin/stats", get(admin::stats))
        .route("/admin/survey-by-unit", get(admin::survey_by_unit))
        .route(
            "/admin/appointments-per-day",
            get(admin::appointments_per_day),
        )
        .route("/admin/tables", get(admin::tables))
        .route(
            "/admin/records/{table}",
            get(admin::list).post(admin::create),
        )
        // Satu path, satu method-router. Mendaftarkan path yang sama dua kali
        // membuat axum panic saat router dibangun, bukan saat handler dipanggil.
        .route(
            "/admin/records/{table}/{id}",
            get(admin::show).patch(admin::update).delete(admin::destroy),
        )
        .route("/admin/beds", patch(admin::update_beds))
        .route("/admin/inbox/{kind}", get(admin::inbox_list))
        .route("/admin/inbox/{kind}/{id}", patch(admin::inbox_update))
        .route(
            "/admin/users",
            get(admin::users_list).post(admin::users_create),
        )
        .route(
            "/admin/users/{id}",
            patch(admin::users_update).delete(admin::users_destroy),
        )
        .route(
            "/admin/users/{id}/password",
            post(admin::users_change_password),
        )
        .route(
            "/admin/users/{id}/reset-password",
            post(admin::users_reset_password),
        )
        .route(
            "/admin/settings",
            get(admin::settings_get).put(admin::settings_put),
        );

    Router::new()
        .route("/", get(public::index))
        .nest(crate::ROUTE_PREFIX, api)
        .fallback(public::not_found)
        .layer(SetRequestIdLayer::new(
            header::HeaderName::from_static("x-request-id"),
            MakeRequestUuid,
        ))
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(body_limit))
        .with_state(state)
}

/// Kunci rate limit untuk satu permintaan.
///
/// `X-Forwarded-For` dianggap benar karena server ini tidak pernah menerima
/// koneksi langsung dari internet: Nginx atau Traefik ada di depannya dan
/// selalu mengisi header ini. Kalau suatu saat backend dibuka langsung ke
/// publik tanpa proxy, key ini bisa dipalsukan dan rate limit jadi tidak
/// berguna.
pub fn client_key(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|value| value.to_str().ok())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .unwrap_or_else(|| "tanpa-ip".to_string())
}

/// Batasi jumlah permintaan dari satu alamat.
pub fn guard(state: &AppState, headers: &HeaderMap) -> ApiResult<()> {
    state
        .limiter
        .check(&client_key(headers))
        .map_err(|retry_after_secs| ApiError::RateLimited { retry_after_secs })
}

// ---------------------------------------------------------------------------
// Sesi
// ---------------------------------------------------------------------------

/// Ambil nilai satu cookie dari header `Cookie`.
///
/// Cookie tidak pernah menjadi header dengan nama sendiri. Yang ada di wire
/// hanya satu header bernama `Cookie` dengan isi `nama=nilai; nama2=nilai2`,
/// jadi `headers.get(COOKIE_NAME)` selalu `None`: `HeaderMap` hanya melihat
/// nama header yang terlihat di luar, sedangkan nama cookie baru muncul
/// sebagai teks sebelum tanda `=` di dalam nilai header tersebut.
///
/// Nilai dikembalikan apa adanya supaya tanda tangan HMAC tetap bisa dihitung
/// atas string yang sama persis dengan yang ditandatangani server.
fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;

    raw.split(';')
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(key, _)| key.trim() == name)
        .map(|(_, value)| value.trim().trim_matches('"'))
        .filter(|value| !value.is_empty())
}

/// Baca dan verifikasi sesi dari cookie.
pub fn session(state: &AppState, headers: &HeaderMap) -> ApiResult<SessionClaims> {
    let token = cookie_value(headers, COOKIE_NAME).ok_or(ApiError::Unauthorized)?;

    crate::auth::verify_session(token, &state.config.auth_secret).ok_or(ApiError::Unauthorized)
}

/// Sesi dengan pembatasan peran tertentu.
pub fn session_with_role(
    state: &AppState,
    headers: &HeaderMap,
    required: fn(Role) -> bool,
) -> ApiResult<SessionClaims> {
    let claims = session(state, headers)?;

    if required(claims.role) {
        Ok(claims)
    } else {
        Err(ApiError::Forbidden)
    }
}

/// Bangun nilai `Set-Cookie` untuk token sesi.
///
/// `HttpOnly` supaya JavaScript di browser tidak bisa membaca tokennya, dan
/// `SameSite=Lax` menahan cookie yang dikirim dari formulir situs lain. Atribut
/// `Secure` hanya ditambahkan saat situsnya HTTPS, supaya login tetap bisa
/// diuji lewat http://localhost.
pub fn session_cookie(token: &str, max_age_secs: u64, secure: bool) -> HeaderValue {
    let mut value =
        format!("{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age_secs}");

    if secure {
        value.push_str("; Secure");
    }

    HeaderValue::from_str(&value).unwrap_or_else(|_| HeaderValue::from_static(""))
}

/// Header untuk menghapus cookie sesi.
pub fn clear_session_cookie(secure: bool) -> HeaderValue {
    let mut value = format!("{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");

    if secure {
        value.push_str("; Secure");
    }

    HeaderValue::from_str(&value).unwrap_or_else(|_| HeaderValue::from_static(""))
}

/// Cookie hanya ditandai `Secure` kalau situsnya memang HTTPS.
pub fn cookies_are_secure(state: &AppState) -> bool {
    state.config.admin_origin.starts_with("https://")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers_with(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for (name, value) in pairs {
            map.insert(
                header::HeaderName::from_bytes(name.as_bytes()).unwrap(),
                HeaderValue::from_str(value).unwrap(),
            );
        }
        map
    }

    #[test]
    fn forwarded_for_takes_the_first_hop() {
        // Proxy pertama yang menambah-ip adalah client sebenarnya, hop
        // berikutnya adalah proxy di-ruasnya.
        let headers = headers_with(&[("x-forwarded-for", "203.0.113.7, 10.0.0.1")]);
        assert_eq!(client_key(&headers), "203.0.113.7");
    }

    #[test]
    fn falls_back_to_real_ip_then_placeholder() {
        assert_eq!(
            client_key(&headers_with(&[("x-real-ip", "203.0.113.9")])),
            "203.0.113.9"
        );
        assert_eq!(client_key(&HeaderMap::new()), "tanpa-ip");
        assert_eq!(
            client_key(&headers_with(&[("x-forwarded-for", "  ")])),
            "tanpa-ip"
        );
    }

    #[test]
    fn session_cookie_carries_security_attributes() {
        let value = session_cookie("token-uji", 3600, true);
        let text = value.to_str().unwrap();

        assert!(text.starts_with("rsud_session=token-uji"));
        assert!(text.contains("HttpOnly"));
        assert!(text.contains("SameSite=Lax"));
        assert!(text.contains("Max-Age=3600"));
        assert!(text.contains("Secure"));
    }

    #[test]
    fn session_cookie_omits_secure_over_http() {
        // Tanpa ini, browser akan menolak cookie saat login lokal dan
        // menguji panel admin sama sekali.
        let text = session_cookie("token-uji", 3600, false)
            .to_str()
            .unwrap()
            .to_string();
        assert!(!text.contains("Secure"));
    }

    #[test]
    fn clearing_cookie_expires_immediately() {
        let text = clear_session_cookie(true).to_str().unwrap().to_string();
        assert!(text.contains("Max-Age=0"));
        assert!(text.contains("Secure"));
    }

    fn klaim() -> SessionClaims {
        SessionClaims {
            sub: "22222222-2222-2222-2222-222222222222".into(),
            email: "admin@contoh.test".into(),
            name: "Admin Uji".into(),
            role: Role::SuperAdmin,
            exp: 4_102_444_800,
            iat: 1_700_000_000,
            v: 1,
        }
    }

    const SECRET_UJI: &str = "kunci-uji-lokal-minimal-32-karakter";

    #[test]
    fn cookie_value_reads_the_named_pair() {
        let headers = headers_with(&[(
            "cookie",
            "pengatur=1; rsud_session=token-uji; themes=terang",
        )]);
        assert_eq!(cookie_value(&headers, COOKIE_NAME), Some("token-uji"));
    }

    #[test]
    fn cookie_value_never_reads_a_header_with_the_cookie_name() {
        // Regression: sebelumnya sesi dibaca lewat `headers.get(COOKIE_NAME)`,
        // yang mencari header bernama "rsud_session". Browser tidak pernah
        // mengirim header seperti itu, jadi setiap permintaan sesi selalu 401
        // walaupun cookie-nya benar.
        let headers = headers_with(&[("rsud_session", "token-uji")]);
        assert_eq!(cookie_value(&headers, COOKIE_NAME), None);
    }

    #[test]
    fn cookie_value_keeps_equals_signs_inside_the_value() {
        // Tanda `=` pertama memecah pasangan, sisanya milik nilai. Token sesi
        // sendiri tidak mengandung `=`, tapi parser tidak boleh diam-diam
        // memotong nilai cookie lain.
        let headers = headers_with(&[("cookie", "tanda=a=b=c")]);
        assert_eq!(cookie_value(&headers, "tanda"), Some("a=b=c"));
    }

    #[test]
    fn cookie_value_accepts_quoted_values() {
        let headers = headers_with(&[("cookie", r#"tanda="dengan spasi""#)]);
        assert_eq!(cookie_value(&headers, "tanda"), Some("dengan spasi"));
    }

    #[test]
    fn cookie_value_is_none_when_missing_or_blank() {
        assert_eq!(
            cookie_value(&headers_with(&[("cookie", "lain=abc")]), COOKIE_NAME),
            None
        );
        assert_eq!(
            cookie_value(&headers_with(&[("cookie", "rsud_session=")]), COOKIE_NAME),
            None
        );
        assert_eq!(
            cookie_value(&headers_with(&[("cookie", "rsud_session")]), COOKIE_NAME),
            None
        );
        assert_eq!(
            cookie_value(&headers_with(&[("cookie", "")]), COOKIE_NAME),
            None
        );
        assert_eq!(cookie_value(&HeaderMap::new(), COOKIE_NAME), None);
    }

    #[test]
    fn token_signed_then_sent_as_cookie_verifies() {
        // Menggabungkan dua sisi yang pernah gagal dipisahkan: penandatangan
        // di `login` dan pembacaan cookie di sini. Test sebelumnya hanya
        // memanggil `verify_session` langsung, sehingga jalur HTTP-nya tidak
        // pernah ikut diuji.
        let token = crate::auth::session::sign_session(&klaim(), SECRET_UJI);
        let headers = headers_with(&[("cookie", &format!("rsud_session={token}"))]);

        let dibaca = cookie_value(&headers, COOKIE_NAME).expect("cookie harus terbaca");

        assert_eq!(
            crate::auth::verify_session(dibaca, SECRET_UJI).map(|c| c.email),
            Some("admin@contoh.test".to_string())
        );
    }
}
