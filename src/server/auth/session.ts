import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "../config";
import { ApiError } from "../api/error";

/**
 * Token sesi admin: `payload.signature`, ditandatangani HMAC-SHA256.
 *
 * Token stateless, jadi tidak ada tabel sesi yang harus dibersihkan dan satu
 * query database tidak perlu dijalankan untuk setiap permintaan yang perlu
 * memastikan sesi masih hidup.
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
  /** Versi token. Dinaikkan kalau skema klaim berubah. */
  v: number;
};

const TOKEN_VERSION = 1;

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

  return claims;
}

/** Klaim baru dengan waktu kedaluwarsa dari konfigurasi. */
export function newClaims(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): SessionClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + config().sessionMaxAgeSeconds,
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

/** Sesi dari request yang sedang berjalan, atau `null` kalau tidak ada. */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token, config().authSecret);
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