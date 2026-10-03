import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { config } from "../config";
import { ApiError } from "../api/error";
import { dbOrNull } from "../db/client";

/**
 * Token sesi admin: `payload.signature`, ditandatangani HMAC-SHA256.
 *
 * Tidak ada tabel sesi, jadi tidak ada yang perlu dibersihkan. Tokennya sendiri
 * membawa angka pencabutan `sv`, tapi angka itu tidak dipercaya apa adanya:
 * `readSession()` tetap membandingkannya dengan `users.session_version` di
 * database, jadi satu query tetap jalan untuk setiap permintaan admin.
 */

/**
 * Peran admin, sesuai nilai enum `user_role` di database.
 *
 * String-nya sama persis dengan nilai enum supaya tidak perlu tabel pemetaan
 * saat peran berubah di kemudian hari.
 */
export type Role = "super_admin" | "editor" | "front_office";

export const ROLES: readonly Role[] = ["super_admin", "editor", "front_office"];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Boleh mengubah konten publik (berita, layanan, halaman).
 *
 * `front_office` sengaja tidak diberi hak ini: perannya menangani pasien,
 * bukan menjaga isi situs.
 */
export function canEditContent(role: Role): boolean {
  return role === "super_admin" || role === "editor";
}

/** Boleh mengelola akun admin. Hanya `super_admin`. */
export function canManageUsers(role: Role): boolean {
  return role === "super_admin";
}

/** Isi token sesi. */
export type SessionClaims = {
  /** ID admin dari tabel `users`. */
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Waktu kedaluwarsa, detik sejak Epoch. */
  exp: number;
  /** Waktu token dibuat, detik sejak Epoch. */
  iat: number;
  /**
   * Salinan `users.session_version` saat token dibuat.
   *
   * Inilah yang membuat token bisa dicabut tanpa menunggu kedaluwarsa: begitu
   * password, peran, atau status aktif berubah, angka di database naik dan
   * token ini tidak lagi cocok, jadi `readSession()` menolaknya.
   */
  sv: number;
  /** Versi token. Dinaikkan kalau skema klaim berubah. */
  v: number;
};

/**
 * Versi skema klaim.
 *
 * Dinaikkan ke 2 saat klaim `sv` ditambahkan. Token versi 1 tidak punya angka
 * pencabutan sama sekali, jadi seluruhnya ditolak dan setiap pemasuk harus
 * login ulang. Itu disengaja: token yang tidak bisa dicabut tidak boleh tetap
 * berlaku hanya demi menghemat satu kali login.
 */
const TOKEN_VERSION = 2;

/**
 * Nama cookie sesi.
 *
 * Tidak memakai prefix `__Host-` karena situs ini diakses lewat HTTP lokal
 * saat pengembangan, dan `__Host-` menolak cookie tanpa atribut `Secure`.
 */
export const COOKIE_NAME = "rsud_session";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

/** Tanda tangan `data` dengan kunci rahasia. */
function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/**
 * Bandingkan dua signature dalam waktu tetap.
 *
 * Operator `===` bisa keluar lebih awal saat byte pertama berbeda, dan itu
 * adalah side channel yang tidak perlu ada di sini. `timingSafeEqual` menolak
 * panjang berbeda, jadi kedua panjang yang tidak sama otomatis tidak cocok.
 */
function signatureMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Buat token sesi yang sudah ditandatangani. */
export function signSession(claims: SessionClaims, secret: string): string {
  const payload = base64url(JSON.stringify(claims));
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Periksa tanda tangan lalu baca klaimnya.
 *
 * Signature dicek lebih dulu sebelum payload di-parse. Kalau dibalik, penyerang
 * bisa membuat payload dengan bentuk apa pun dan membuat server melakukan
 * parsing atas data yang belum diautentikasi.
 *
 * Mengembalikan `null` untuk semua kegagalan: kedaluwarsa, signature salah,
 * versi tidak cocok, dan JSON rusak. Klaim tidak dibedakan satu per satu,
 * pemanggil tetap mengembalikan 401 yang sama untuk semuanya.
 */
export function verifySession(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SessionClaims | null {
  const titik = token.indexOf(".");
  if (titik < 0) return null;

  const payload = token.slice(0, titik);
  const signature = token.slice(titik + 1);

  if (!signatureMatches(sign(payload, secret), signature)) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(fromBase64url(payload).toString("utf8")) as SessionClaims;
  } catch {
    return null;
  }

  if (claims.v !== TOKEN_VERSION) return null;
  if (!isRole(claims.role)) return null;
  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) return null;
  if (typeof claims.sv !== "number") return null;

  return claims;
}

/** Klaim baru dengan waktu kedaluwarsa dari konfigurasi. */
export function newClaims(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Nilai `users.session_version` untuk akun ini. */
  sessionVersion: number;
}): SessionClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + config().sessionMaxAgeSeconds,
    sv: user.sessionVersion,
    v: TOKEN_VERSION,
  };
}

/** Atribut cookie sesi. */
export function sessionCookie(token: string): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  const secure = config().adminOrigin.startsWith("https://");
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: config().sessionMaxAgeSeconds,
    },
  };
}

/** Cookie kosong untuk mengakhiri sesi di sisi browser. */
export function clearedSessionCookie(): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: config().adminOrigin.startsWith("https://"),
      path: "/",
      maxAge: 0,
    },
  };
}

/**
 * Sesi dari request yang sedang berjalan, atau `null` kalau tidak ada.
 *
 * Selain memeriksa tanda tangan dan masa kedaluwarsa, baris akunnya juga
 * dibandingkan. Token bersifat stateless sehingga tidak bisa dihapus seperti
 * catatan di database; yang bisa dilakukan adalah menolak token yang sudah tidak
 * lagi cocok dengan akunnya. Tanpa itu, mengganti password, menurunkan peran,
 * atau menonaktifkan akun baru benar-benar berlaku setelah
 * `SESSION_MAX_AGE_SECONDS` — delapan jam secara bawaan.
 *
 * Biayanya satu query per permintaan admin. Itu tradeoff yang sepadan dengan
 * akun yang dicabut berlaku seketika, dan volumenya rendah dibanding API publik.
 */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const claims = verifySession(token, config().authSecret);
  if (!claims) return null;

  const db = dbOrNull();
  // Mode snapshot tidak punya database, dan `auth/login` menolak login di mode
  // itu karena verifikasi password selalu butuh database. Jadi tidak ada token
  // sesi yang bisa terbit di mode snapshot dan tidak ada yang perlu dicabut.
  // Melewati pengecekan di sini tidak membuka jalan bagi token palsu.
  if (db === null) return claims;

  const rows = await db.execute(
    sql`SELECT session_version, is_active FROM users WHERE id = ${claims.sub}::uuid`,
  );
  const baris = rows[0] as
    | { session_version: number; is_active: boolean }
    | undefined;

  // Baris yang hilang berarti akunnya sudah dihapus.
  if (!baris) return null;
  // Akun yang dinonaktifkan tidak boleh memakai sesi yang masih berlaku.
  if (!baris.is_active) return null;
  // Angka tidak cocok berarti kredensial atau hak aksesnya berubah sejak token
  // ini diterbitkan.
  if (baris.session_version !== claims.sv) return null;

  return claims;
}

/**
 * Sesi yang wajib ada dan punya izin.
 *
 * Satu tempat untuk seluruh endpoint admin, supaya tidak ada handler yang
 * hanya memeriksa "ada sesi" lalu lupa memeriksa perannya.
 */
export async function requireSession(need?: (role: Role) => boolean): Promise<SessionClaims> {
  const claims = await readSession();
  if (!claims) throw ApiError.unauthorized();

  if (need && !need(claims.role)) throw ApiError.forbidden();

  return claims;
}