//! Hashing dan verifikasi password admin.

use argon2::password_hash::{
    rand_core::OsRng, Error as HashError, PasswordHash, PasswordHasher, PasswordVerifier,
    SaltString,
};
use argon2::{Algorithm, Argon2, Params, Version};

/// Biaya memori 19 MiB per hash. Cukup untuk jumlah admin di proyek ini dan
/// cukup berat untuk skrip penebak password.
const M_COST_KIB: u32 = 19_456;
const T_COST: u32 = 2;
const P_COST: u32 = 1;

/// Semua kegagalan di file ini sudah dikonversi ke `password_hash::Error`,
/// jadi pemanggil hanya perlu satu tipe error.
fn hasher() -> Result<Argon2<'static>, HashError> {
    let params = Params::new(M_COST_KIB, T_COST, P_COST, None).map_err(HashError::from)?;
    Ok(Argon2::new(Algorithm::Argon2id, Version::V0x13, params))
}

/// Hash password. Hasilnya disimpan apa adanya di kolom `users.password_hash`.
pub fn hash_password(plain: &str) -> Result<String, HashError> {
    let salt = SaltString::generate(&mut OsRng);
    hasher()?
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
}

/// Password salah adalah hal yang diharapkan, jadi hasilnya `Ok(false)` bukan
/// error. Hash yang rusak juga dianggap tidak cocok, bukan 500.
pub fn verify_password(plain: &str, stored: &str) -> Result<bool, HashError> {
    let Ok(parsed) = PasswordHash::new(stored) else {
        tracing::warn!("hash password tidak terbaca, dianggap tidak cocok");
        return Ok(false);
    };
    Ok(hasher()?.verify_password(plain.as_bytes(), &parsed).is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn correct_password_is_accepted() {
        let hash = hash_password("rahasia-admin-2026").expect("hash harus berhasil");
        assert!(verify_password("rahasia-admin-2026", &hash).expect("verifikasi gagal"));
    }

    #[test]
    fn wrong_password_is_rejected() {
        let hash = hash_password("rahasia-admin-2026").expect("hash harus berhasil");
        assert!(!verify_password("rahasia-admin-2027", &hash).expect("verifikasi gagal"));
    }

    #[test]
    fn same_password_produces_different_hashes() {
        // Garam acak harus membuat hash berbeda, kalau tidak dua admin dengan
        // password sama saling terlihat lewat database.
        let a = hash_password("sama").unwrap();
        let b = hash_password("sama").unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn corrupted_hash_is_reported_as_mismatch() {
        assert!(!verify_password("apa saja", "bukan-hash-yang-sah").unwrap());
        assert!(!verify_password("apa saja", "").unwrap());
    }

    #[test]
    fn hash_fits_a_varchar_255_column() {
        let hash = hash_password("x").unwrap();
        assert!(hash.len() < 255, "terlalu panjang: {}", hash.len());
    }
}
