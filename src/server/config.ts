/**
 * Konfigurasi runtime, dibaca dari environment satu kali lalu dipakai
 * bersama. Tidak ada nilai environment yang ditulis langsung di kode
 * (PRD bagian 6.3 baris "Konfigurasi").
 *
 * Sengaja tidak dijalankan saat modul diimpor. `next build` mengevaluasi
 * modul route handler tanpa database di surroundings, jadi pembacaan di level
 * modul akan membuat build gagal padahal konfigurasi sudah benar di produksi.
 * Semua akses lewat `config()`.
 */

export type Config = {
  /** Wajib. Kosong berarti mode snapshot: tidak ada koneksi database. */
  databaseUrl: string;
  /** Jumlah koneksi PostgreSQL maksimum. */
  dbMaxConnections: number;
  /** Berapa lama menunggu koneksi tersedia, dalam detik. */
  dbAcquireTimeoutSeconds: number;
  /** Penandatangan cookie sesi (HMAC-SHA256). Wajib 32 karakter atau lebih. */
  authSecret: string;
  /** Umur maksimum sesi dalam detik. Bawaan delapan jam, satu shift kerja. */
  sessionMaxAgeSeconds: number;
  /** Origin yang boleh memanggil endpoint admin. Dipakai CORS. */
  adminOrigin: string;
  /** Jendela rate limit dalam detik. */
  rateLimitWindowSeconds: number;
  /** Jumlah permintaan per jendela, per alamat IP, untuk endpoint tulis. */
  rateLimitMax: number;
  /** Batas ukuran body JSON dalam byte. */
  bodyLimitBytes: number;
  /** Rentang hari untuk kunjungan yang boleh dipilih. */
  minLeadDays: number;
  maxLeadDays: number;
  /**
   * `live` membaca dan menulis ke database. `snapshot` hanya membaca berkas
   * JSON dan menolak semua permintaan yang mengubah data; dipakai untuk
   * pratinjau di Vercel yang tidak boleh menyentuh database produksi.
   */
  apiMode: "live" | "snapshot";
};

/** Panjang minimum `AUTH_SECRET`. */
export const AUTH_SECRET_MIN = 32;

class ConfigError extends Error {}

let cache: Config | null = null;

/**
 * Baca konfigurasi dari environment.
 *
 * Berhenti cepat kalau ada yang tidak lengkap. Ini disengaja: aplikasi yang
 * start dengan `AUTH_SECRET` kosong lebih berbahaya daripada yang tidak start,
 * karena ia akan menerima sesi apa pun tanpa bisa diverifikasi.
 */
export function config(): Config {
  if (cache) return cache;

  const apiMode = env("API_MODE", "live") === "snapshot" ? "snapshot" : "live";
  const databaseUrl = env("DATABASE_URL", "");

  if (apiMode === "live" && !databaseUrl) {
    throw new ConfigError(
      "DATABASE_URL wajib diisi, atau set API_MODE=snapshot kalau memang hanya ingin membaca snapshot.",
    );
  }

  const authSecret = env("AUTH_SECRET", "");
  if (apiMode === "live" && authSecret.length < AUTH_SECRET_MIN) {
    throw new ConfigError(
      `AUTH_SECRET wajib diisi dan minimal ${AUTH_SECRET_MIN} karakter (nilai sekarang ${authSecret.length}).`,
    );
  }

  cache = {
    databaseUrl,
    dbMaxConnections: number("DB_MAX_CONNECTIONS", 10),
    dbAcquireTimeoutSeconds: number("DB_ACQUIRE_TIMEOUT_SECONDS", 8),
    authSecret,
    sessionMaxAgeSeconds: number("SESSION_MAX_AGE_SECONDS", 8 * 3600),
    adminOrigin: env("ADMIN_ORIGIN", "http://localhost:3000"),
    rateLimitWindowSeconds: number("RATE_LIMIT_WINDOW_SECONDS", 60),
    rateLimitMax: number("RATE_LIMIT_MAX_REQUESTS", 5),
    bodyLimitBytes: number("BODY_LIMIT_BYTES", 256 * 1024),
    minLeadDays: number("MIN_LEAD_DAYS", 0),
    maxLeadDays: number("MAX_LEAD_DAYS", 90),
    apiMode,
  };

  return cache;
}

/** Hanya untuk test: paksa konfigurasi berikutnya dibaca dari environment. */
export function resetConfigCache(): void {
  cache = null;
}

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;

  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed)) {
    throw new ConfigError(`${name} harus angka, bukan "${raw}".`);
  }
  return parsed;
}