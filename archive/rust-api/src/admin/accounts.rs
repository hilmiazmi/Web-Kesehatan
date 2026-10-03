//! Manajemen akun admin.
//!
//! Tidak memakai `admin::records` karena tiga hal khusus: password di-hash,
//! `password_hash` tidak pernah keluar sebagai kolom yang bisa ditulis, dan
//! peran hanya boleh diubah oleh `super_admin`.

use serde_json::Value;
use sqlx::postgres::PgPool;
use sqlx::FromRow;

use crate::auth::password::{hash_password, verify_password};
use crate::auth::session::Role;
use crate::error::{ApiError, ApiResult};
use crate::validation::{self, Errors};

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct Account {
    pub id: uuid::Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub last_login_at: Option<String>,
    pub created_at: String,
}

/// Daftar akun, tanpa kolom `password_hash`.
pub async fn list(pool: &PgPool) -> ApiResult<Vec<Account>> {
    let rows = sqlx::query_as::<_, Account>(
        r#"
        SELECT id, email, name, role::text AS role, is_active,
               last_login_at::text AS last_login_at,
               created_at::text AS created_at
          FROM users
         ORDER BY created_at
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Satu akun berdasarkan ID.
pub async fn find(pool: &PgPool, id: uuid::Uuid) -> ApiResult<Option<Account>> {
    let row = sqlx::query_as::<_, Account>(
        r#"
        SELECT id, email, name, role::text AS role, is_active,
               last_login_at::text AS last_login_at,
               created_at::text AS created_at
          FROM users
         WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Data login yang sudah dipastikan ada di database dan aktif.
pub struct Credentials {
    pub id: uuid::Uuid,
    pub password_hash: String,
    pub name: String,
    pub email: String,
    pub role: Role,
}

/// Ambil kredensial berdasarkan surel.
///
/// Surel dinormalisasi ke huruf kecil supaya `Admin@X.test` dan `admin@x.test`
/// tidak bisa menjadi dua akun berbeda. Unik index di database sudah
/// case-insensitive, jadi dua akun dengan beda huruf besar tidak bisa ada.
pub async fn credentials_by_email(pool: &PgPool, email: &str) -> ApiResult<Option<Credentials>> {
    #[derive(FromRow)]
    struct Row {
        id: uuid::Uuid,
        email: String,
        password_hash: String,
        name: String,
        role: String,
    }

    let row = sqlx::query_as::<_, Row>(
        r#"
        SELECT id, email, password_hash, name, role::text AS role
          FROM users
         WHERE lower(email) = lower($1)
           AND is_active
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(|r| {
        Role::parse(&r.role).map(|role| Credentials {
            id: r.id,
            password_hash: r.password_hash,
            name: r.name,
            email: r.email,
            role,
        })
    }))
}

/// Catat waktu login terakhir.
pub async fn touch_login(pool: &PgPool, id: uuid::Uuid) -> ApiResult<()> {
    sqlx::query("UPDATE users SET last_login_at = now() WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Buat akun baru.
///
/// `password_hash` tidak ada di `NewAccount`. Tidak ada jalur kode yang bisa
/// menulis kolom itu langsung; satu-satunya cara mengisinya adalah lewat
/// `hash_password` di fungsi ini.
#[derive(Debug, Clone)]
pub struct NewAccount {
    pub email: String,
    pub name: String,
    pub role: Role,
    pub password: String,
}

pub async fn create(pool: &PgPool, input: &NewAccount) -> ApiResult<Account> {
    let hash = hash_password(&input.password)
        .map_err(|err| ApiError::Internal(format!("gagal membuat hash password: {err}")))?;

    #[derive(FromRow)]
    struct Created {
        id: uuid::Uuid,
    }

    let created = sqlx::query_as::<_, Created>(
        r#"
        INSERT INTO users (email, name, role, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(&input.email)
    .bind(&input.name)
    .bind(input.role.as_str())
    .bind(hash)
    .fetch_one(pool)
    .await
    .map_err(|err| match &err {
        sqlx::Error::Database(db) if db.code().as_deref() == Some("23505") => {
            ApiError::BadRequest("Surel itu sudah dipakai akun lain.".into())
        }
        _ => ApiError::from(err),
    })?;

    find(pool, created.id)
        .await?
        .ok_or(ApiError::Internal("akun baru langsung hilang".into()))
}

/// Perubahan profil. Password tidak termasuk di sini, lihat `change_password`.
#[derive(Debug, Clone)]
pub struct AccountPatch {
    pub email: Option<String>,
    pub name: Option<String>,
    pub role: Option<Role>,
    pub is_active: Option<bool>,
}

pub async fn update(pool: &PgPool, id: uuid::Uuid, patch: &AccountPatch) -> ApiResult<Account> {
    let mut errors = Errors::new();

    let email = patch
        .email
        .as_deref()
        .and_then(|v| validation::email(&mut errors, "email", v, true));
    let name = patch
        .name
        .as_deref()
        .and_then(|v| validation::text_required(&mut errors, "name", v, 3, 160));
    let is_active = patch.is_active;

    validation::finish(errors)?;

    let sql = r#"
        UPDATE users
           SET email    = coalesce($2, email),
               name     = coalesce($3, name),
               role     = coalesce($4, role),
               is_active = coalesce($5, is_active)
         WHERE id = $1
        RETURNING id
    "#;

    let result: Result<Option<(uuid::Uuid,)>, sqlx::Error> = sqlx::query_as(sql)
        .bind(id)
        .bind(email)
        .bind(name)
        .bind(patch.role.map(|r| r.as_str()))
        .bind(is_active)
        .fetch_optional(pool)
        .await;

    let updated = match result {
        Ok(Some(row)) => row.0,
        Ok(None) => return Err(ApiError::NotFound("akun")),
        Err(sqlx::Error::Database(db)) if db.code().as_deref() == Some("23505") => {
            return Err(ApiError::BadRequest(
                "Surel itu sudah dipakai akun lain.".into(),
            ))
        }
        Err(err) => return Err(err.into()),
    };

    find(pool, updated)
        .await?
        .ok_or(ApiError::Internal("akun hilang setelah pembaruan".into()))
}

/// Ubah password. Butuh password lama sebagai verifikasi.
pub async fn change_password(
    pool: &PgPool,
    id: uuid::Uuid,
    current_password: &str,
    new_password: &str,
) -> ApiResult<()> {
    let stored: Option<String> =
        sqlx::query_scalar("SELECT password_hash FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await?;

    let Some(stored) = stored else {
        return Err(ApiError::NotFound("akun"));
    };

    let matches = verify_password(current_password, &stored)
        .map_err(|err| ApiError::Internal(format!("gagal memeriksa password: {err}")))?;

    if !matches {
        // Password lama salah memakai kode 401, bukan 422. 422 berarti "isi
        // form salah", yang membuat frontend menampilkan pesan validasi.
        return Err(ApiError::Unauthorized);
    }

    let hash = hash_password(new_password)
        .map_err(|err| ApiError::Internal(format!("gagal membuat hash password: {err}")))?;

    sqlx::query("UPDATE users SET password_hash = $2 WHERE id = $1")
        .bind(id)
        .bind(hash)
        .execute(pool)
        .await?;

    Ok(())
}

/// Setel password tanpa meminta password lama. Hanya untuk `super_admin`.
pub async fn reset_password(pool: &PgPool, id: uuid::Uuid, new_password: &str) -> ApiResult<()> {
    let hash = hash_password(new_password)
        .map_err(|err| ApiError::Internal(format!("gagal membuat hash password: {err}")))?;

    let result = sqlx::query("UPDATE users SET password_hash = $2 WHERE id = $1")
        .bind(id)
        .bind(hash)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound("akun"));
    }

    Ok(())
}

/// Hapus akun.
///
/// Akun yang sedang dipakai untuk login tidak boleh dihapus, supaya sesi yang
/// sedang aktif tidak menggantung. Jumlah `super_admin` juga dijaga: kalau tinggal
/// satu, penghapusan akan membuat tidak ada yang bisa mengelola akun lagi.
pub async fn delete(pool: &PgPool, id: uuid::Uuid, acting_user: uuid::Uuid) -> ApiResult<()> {
    if id == acting_user {
        return Err(ApiError::BadRequest(
            "Akun yang sedang dipakai tidak bisa dihapus.".into(),
        ));
    }

    let role: Option<String> = sqlx::query_scalar("SELECT role::text FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await?;

    let Some(role) = role else {
        return Err(ApiError::NotFound("akun"));
    };

    if role == Role::SuperAdmin.as_str() {
        let remaining: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM users WHERE role = 'super_admin' AND is_active",
        )
        .fetch_one(pool)
        .await?;

        if remaining <= 1 {
            return Err(ApiError::BadRequest(
                "Ini satu-satunya akun super admin aktif. Buat akun lain dulu sebelum menghapusnya.".into(),
            ));
        }
    }

    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound("akun"));
    }

    Ok(())
}

/// Jumlah akun aktif per peran, untuk halaman pengaturan.
pub async fn counts_by_role(pool: &PgPool) -> ApiResult<Value> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT role::text, count(*)::int FROM users WHERE is_active GROUP BY 1 ORDER BY 1",
    )
    .fetch_all(pool)
    .await?;

    let mut map = serde_json::Map::new();
    for (role, count) in rows {
        map.insert(role, Value::from(count));
    }

    Ok(Value::Object(map))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_codes_are_specific() {
        // Password lama salah harus 401, bukan 422. 422 berarti validasi form
        // yang gagal, dan frontend akan menampilkan pesan input.
        assert_eq!(ApiError::Unauthorized.code(), "UNAUTHORIZED");
        assert_eq!(ApiError::BadRequest("x".into()).code(), "BAD_REQUEST");
    }
}
