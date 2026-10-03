import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { ApiError, dbErrorCode } from "../api/error";
import { hashPassword, verifyPassword } from "../auth/password";
import { isRole, type Role } from "../auth/session";
import { Errors, email as validateEmail, textRequired } from "../validation";

/**
 * Manajemen akun admin.
 *
 * Tidak memakai `./records` karena tiga hal khusus: password di-hash,
 * `password_hash` tidak pernah keluar sebagai kolom yang bisa ditulis, dan
 * peran hanya boleh diubah oleh `super_admin`.
 */

/** Bentuk akun yang dikirim ke panel. `password_hash` tidak pernah ikut. */
export type Account = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

/**
 * Kolom yang boleh dibaca dari tabel `users`.
 *
 * Dipakai bersama oleh semua query modul ini, jadi `password_hash` mustahil
 * ikut terbawa hanya karena ada satu query yang lupa menyebut daftar kolom.
 */
const KOLOM_AKUN = sql`
  id, email, name, role::text AS role, is_active,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
  to_char(last_login_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_login_at
`;

/** Daftar akun, tanpa kolom `password_hash`. */
export async function listAccounts(db: Db): Promise<Account[]> {
  const rows = await db.execute(sql`SELECT ${KOLOM_AKUN} FROM users ORDER BY created_at`);
  return rows as unknown as Account[];
}

/** Satu akun berdasarkan ID. */
export async function findAccount(db: Db, id: string): Promise<Account | null> {
  const rows = await db.execute(sql`SELECT ${KOLOM_AKUN} FROM users WHERE id = ${id}::uuid`);
  return rows[0] ? (rows[0] as unknown as Account) : null;
}

/** Data login yang sudah dipastikan ada di database dan aktif. */
export type Credentials = {
  id: string;
  password_hash: string;
  name: string;
  email: string;
  role: Role;
  /** Disalin ke klaim `sv` supaya token bisa dicabut saat akun berubah. */
  session_version: number;
};

/**
 * Ambil kredensial berdasarkan surel.
 *
 * Surel dinormalisasi ke huruf kecil supaya `Admin@X.test` dan `admin@x.test`
 * tidak bisa menjadi dua akun berbeda. Unik index di database sudah
 * case-insensitive, jadi dua akun dengan beda huruf besar tidak bisa ada.
 */
export async function credentialsByEmail(
  db: Db,
  email: string,
): Promise<Credentials | null> {
  const rows = await db.execute(sql`
    SELECT id, email, password_hash, name, role::text AS role, session_version
      FROM users
     WHERE lower(email) = lower(${email})
       AND is_active
  `);

  const row = rows[0] as
    | { id: string; email: string; password_hash: string; name: string; role: string; session_version: number }
    | undefined;
  if (!row || !isRole(row.role)) return null;

  return {
    id: row.id,
    password_hash: row.password_hash,
    name: row.name,
    email: row.email,
    role: row.role,
    session_version: row.session_version,
  };
}

/** Catat waktu login terakhir. */
export async function touchLogin(db: Db, id: string): Promise<void> {
  await db.execute(sql`UPDATE users SET last_login_at = now() WHERE id = ${id}::uuid`);
}

/**
 * Jumlah akun aktif per peran, untuk ringkasan di panel.
 *
 * Hanya akun aktif yang dihitung: peran yang seluruh anggotanya sudah
 * dinonaktifkan tidak muncul di sini, dan panel tidak akan menampilkan
 * "0 akun editor" yang membuat orang mengira perlu membuat akun baru.
 */
export async function countsByRole(db: Db): Promise<Record<string, number>> {
  const rows = await db.execute(sql`
    SELECT role::text AS role, count(*)::int AS total
      FROM users
     WHERE is_active
     GROUP BY 1
     ORDER BY 1
  `);

  const hasil: Record<string, number> = {};
  for (const baris of rows as unknown as { role: string; total: number }[]) {
    hasil[baris.role] = Number(baris.total);
  }
  return hasil;
}

/** Data akun baru. */
export type NewAccount = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

/**
 * Buat akun baru.
 *
 * `password_hash` tidak ada di `NewAccount`. Tidak ada jalur kode yang bisa
 * menulis kolom itu langsung; satu-satunya cara mengisinya adalah lewat
 * `hashPassword` di fungsi ini.
 */
export async function createAccount(db: Db, input: NewAccount): Promise<Account> {
  const errors = new Errors();
  const surel = validateEmail(errors, "email", input.email, true);
  const nama = textRequired(errors, "name", input.name, 3, 160);
  if (!errors.isEmpty) throw errors.toApiError();

  const hash = await hashPassword(input.password);

  let created: string;
  try {
    const rows = await db.execute(sql`
      INSERT INTO users (email, name, role, password_hash)
      VALUES (${surel}, ${nama}, ${input.role}, ${hash})
      RETURNING id
    `);
    created = (rows[0] as { id: string }).id;
  } catch (err) {
    throw mapUniqueEmail(err);
  }

  const akun = await findAccount(db, created);
  if (!akun) throw ApiError.internal("akun baru langsung hilang");
  return akun;
}

/** Perubahan profil. Password tidak termasuk di sini, lihat `changePassword`. */
export type AccountPatch = {
  email?: string | null;
  name?: string | null;
  role?: Role | null;
  is_active?: boolean | null;
};

/**
 * Ubah profil akun.
 *
 * Kolom yang tidak disebut di `patch` tidak disentuh, jadi panel bisa mengirim
 * hanya bagian yang berubah.
 */
export async function updateAccount(
  db: Db,
  id: string,
  patch: AccountPatch,
): Promise<Account> {
  const errors = new Errors();

  const surel = patch.email == null ? null : validateEmail(errors, "email", patch.email, true);
  const nama = patch.name == null ? null : textRequired(errors, "name", patch.name, 3, 160);
  if (!errors.isEmpty) throw errors.toApiError();

  // Sesi dicabut kalau peran atau status aktif berubah, karena keduanya
  // menentukan boleh-tidaknya orang itu masuk. Mengubah nama atau surel tidak
  // mengubah hak akses, jadi tidak memutus sesi yang sedang berjalan.
  const hakAksesBerubah = patch.role != null || patch.is_active != null;

  let rows;
  try {
    rows = await db.execute(sql`
      UPDATE users
         SET email     = coalesce(${surel}, email),
             name      = coalesce(${nama}, name),
             role      = coalesce(${patch.role ?? null}, role),
             is_active = coalesce(${patch.is_active ?? null}, is_active),
             session_version = session_version + ${hakAksesBerubah ? 1 : 0}
       WHERE id = ${id}::uuid
      RETURNING id
    `);
  } catch (err) {
    throw mapUniqueEmail(err);
  }

  if (rows.length === 0) throw ApiError.notFound("akun");

  const akun = await findAccount(db, id);
  if (!akun) throw ApiError.internal("akun hilang setelah pembaruan");
  return akun;
}

/**
 * Ubah password. Butuh password lama sebagai verifikasi.
 *
 * Password lama yang salah memakai kode 401, bukan 422. 422 berarti "isi form
 * salah", yang membuat panel menampilkan pesan validasi di samping kolom, padahal
 * masalahnya adalah kredensial.
 */
export async function changePassword(
  db: Db,
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const rows = await db.execute(
    sql`SELECT password_hash FROM users WHERE id = ${id}::uuid`,
  );
  const stored = rows[0] as { password_hash: string } | undefined;
  if (!stored) throw ApiError.notFound("akun");

  if (!(await verifyPassword(currentPassword, stored.password_hash))) {
    throw ApiError.unauthorized();
  }

  // Menaikkan `session_version` memutus sesi di perangkat lain. Sesi di
  // perangkat ini juga ikut putus, jadi pemasuk perlu login ulang — itu yang
  // diharapkan dari penggantian kata sandi.
  await db.execute(
    sql`UPDATE users
           SET password_hash    = ${await hashPassword(newPassword)},
               session_version = session_version + 1
         WHERE id = ${id}::uuid`,
  );
}

/** Setel password tanpa meminta password lama. Hanya untuk `super_admin`. */
export async function resetPassword(db: Db, id: string, newPassword: string): Promise<void> {
  const hash = await hashPassword(newPassword);

  const rows = await db.execute(sql`
    UPDATE users
       SET password_hash    = ${hash},
           session_version = session_version + 1
     WHERE id = ${id}::uuid
    RETURNING id
  `);

  if (rows.length === 0) throw ApiError.notFound("akun");
}

/**
 * Hapus akun.
 *
 * Akun yang sedang dipakai untuk login tidak boleh dihapus, supaya sesi yang
 * sedang aktif tidak menggantung. Jumlah `super_admin` juga dijaga: kalau tinggal
 * satu, penghapusan akan membuat tidak ada yang bisa mengelola akun lagi.
 */
export async function deleteAccount(db: Db, id: string, actingUser: string): Promise<void> {
  if (id === actingUser) {
    throw ApiError.badRequest("Akun yang sedang dipakai tidak bisa dihapus.");
  }

  const rows = await db.execute(sql`SELECT role::text AS role FROM users WHERE id = ${id}::uuid`);
  const role = (rows[0] as { role: string } | undefined)?.role;
  if (role === undefined) throw ApiError.notFound("akun");

  if (role === "super_admin") {
    const sisa = await db.execute(sql`
      SELECT count(*)::int AS total FROM users WHERE role = 'super_admin' AND is_active
    `);

    if (Number((sisa[0] as { total: number }).total) <= 1) {
      throw ApiError.badRequest(
        "Ini satu-satunya akun super admin aktif. Buat akun lain dulu sebelum menghapusnya.",
      );
    }
  }

  const terhapus = await db.execute(sql`DELETE FROM users WHERE id = ${id}::uuid RETURNING id`);
  if (terhapus.length === 0) throw ApiError.notFound("akun");
}

/**
 * Ubah surel tabrakan menjadi pesan yang bisa dibaca.
 *
 * Pelanggaran unik index di sini hampir selalu soal surel, karena satu-satunya
 * unik index pada `users` adalah surelnya. Tanpa penerjemahan ini, pengunjung
 * panel mendapat "Layanan sedang bermasalah" untuk kesalahan yang sebenarnya
 * adalah "surel itu sudah dipakai".
 */
function mapUniqueEmail(err: unknown): unknown {
  return dbErrorCode(err) === "23505"
    ? ApiError.badRequest("Surel itu sudah dipakai akun lain.")
    : err;
}