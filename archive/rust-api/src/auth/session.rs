//! Token sesi admin: `payload.signature`, ditandatangani HMAC-SHA256.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine as _;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use subtle::ConstantTimeEq;

/// Peran admin, sesuai nilai enum `user_role` di database.
///
/// String-nya sama persis dengan nilai enum agar tidak perlu tabel pemetaan
/// saat perubahan peran di kemudian hari.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    SuperAdmin,
    Editor,
    FrontOffice,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::SuperAdmin => "super_admin",
            Self::Editor => "editor",
            Self::FrontOffice => "front_office",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "super_admin" => Some(Self::SuperAdmin),
            "editor" => Some(Self::Editor),
            "front_office" => Some(Self::FrontOffice),
            _ => None,
        }
    }

    /// Boleh mengubah konten publik (berita, layanan, halaman).
    ///
    /// `front_office` sengaja tidak diberi hak ini: perannya menangani
    /// pasien, bukan menjaga isi situs.
    pub fn can_edit_content(self) -> bool {
        matches!(self, Self::SuperAdmin | Self::Editor)
    }

    /// Boleh mengelola akun admin. Hanya `super_admin`.
    pub fn can_manage_users(self) -> bool {
        matches!(self, Self::SuperAdmin)
    }
}

/// Isi token sesi.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionClaims {
    /// ID admin dari tabel `users`.
    pub sub: String,
    pub email: String,
    pub name: String,
    pub role: Role,
    /// Waktu kedaluwarsa, detik sejak Epoch.
    pub exp: i64,
    /// Waktu token dibuat, detik sejak Epoch.
    pub iat: i64,
    /// Token versi. incremented kalau skema klaim berubah supaya token lama
    /// otomatis tidak berlaku.
    pub v: u8,
}

const TOKEN_VERSION: u8 = 1;

/// Nama cookie sesi. Tidak memakai `__Host-` prefix karena site ini bisa
/// diakses lewat HTTP lokal saat pengembangan.
pub const COOKIE_NAME: &str = "rsud_session";

/// Tanda tangan `data` dengan kunci rahasia.
///
/// `subtle` dipakai supaya perbandingan signature-nya waktu tetap. Operator
/// `==` biasa bisa keluar lebih awal saat byte pertama berbeda, dan itu adalah
/// side channel yang tidak perlu ada di sini.
fn sign(data: &[u8], secret: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret).expect("HMAC menerima kunci apa pun");
    mac.update(data);
    URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
}

/// Bandingkan dua signature dalam waktu tetap.
fn signature_matches(expected: &str, received: &str) -> bool {
    // `verify_slice` menolak panjang berbeda, jadi dua panjang yang tidak sama
    // otomatis tidak cocok tanpa perlu dihitung ulang.
    expected.as_bytes().ct_eq(received.as_bytes()).into()
}

/// Buat token sesi yang sudah ditandatangani.
pub fn sign_session(claims: &SessionClaims, secret: &str) -> String {
    let payload = URL_SAFE_NO_PAD
        .encode(serde_json::to_vec(claims).expect("klaim selalu bisa diserialisasi"));
    let signature = sign(payload.as_bytes(), secret.as_bytes());
    format!("{payload}.{signature}")
}

/// Periksa tanda tangan lalu deserialize klaimnya.
///
/// Signature dicek lebih dulu sebelum payload di-parse. Kalau dibalik, penyerang
/// bisa membuat payload dengan bentuk apa pun dan membuat server melakukan
/// parsing pada data yang belum diautentikasi.
pub fn verify_session(token: &str, secret: &str) -> Option<SessionClaims> {
    let (payload, signature) = token.split_once('.')?;
    let expected = sign(payload.as_bytes(), secret.as_bytes());

    if !signature_matches(&expected, signature) {
        return None;
    }

    let claims: SessionClaims =
        serde_json::from_slice(&URL_SAFE_NO_PAD.decode(payload).ok()?).ok()?;

    if claims.v != TOKEN_VERSION {
        return None;
    }

    Some(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims() -> SessionClaims {
        SessionClaims {
            sub: "11111111-1111-1111-1111-111111111111".into(),
            email: "admin@contoh-sehat.test".into(),
            name: "Administrator Demo".into(),
            role: Role::SuperAdmin,
            exp: 4_102_444_800,
            iat: 1_700_000_000,
            v: TOKEN_VERSION,
        }
    }

    const SECRET: &str = "secret-uji-otomatis-yang-panjang-sekitar-32-karakter";

    #[test]
    fn round_trips() {
        let token = sign_session(&claims(), SECRET);
        let parsed = verify_session(&token, SECRET).expect("token harus valid");
        assert_eq!(parsed.email, "admin@contoh-sehat.test");
        assert_eq!(parsed.role, Role::SuperAdmin);
    }

    #[test]
    fn rejects_wrong_secret() {
        let token = sign_session(&claims(), SECRET);
        let lain = "secret-yang-berbeda-sama-sekali-panjang-sekitar-32";
        assert!(verify_session(&token, lain).is_none());
    }

    #[test]
    fn rejects_tampered_payload() {
        let token = sign_session(&claims(), SECRET);
        let (payload, signature) = token.split_once('.').unwrap();
        let forged = URL_SAFE_NO_PAD.encode(br#"{"sub":"x","role":"super_admin","v":1}"#);
        assert!(verify_session(&format!("{forged}.{signature}"), SECRET).is_none());
        assert!(!payload.is_empty());
    }

    #[test]
    fn rejects_malformed_tokens() {
        assert!(verify_session("", SECRET).is_none());
        assert!(verify_session("tanpa titik", SECRET).is_none());
        assert!(verify_session("a.b.c", SECRET).is_none());
    }

    #[test]
    fn roles_gate_the_right_actions() {
        assert!(Role::SuperAdmin.can_edit_content());
        assert!(Role::Editor.can_edit_content());
        assert!(!Role::FrontOffice.can_edit_content());

        assert!(Role::SuperAdmin.can_manage_users());
        assert!(!Role::Editor.can_manage_users());
        assert!(!Role::FrontOffice.can_manage_users());
    }

    #[test]
    fn role_strings_match_database_enum() {
        for role in [Role::SuperAdmin, Role::Editor, Role::FrontOffice] {
            assert_eq!(Role::parse(role.as_str()), Some(role));
        }
        assert_eq!(Role::parse("admin"), None);
    }
}
