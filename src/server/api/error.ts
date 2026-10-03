/**
 * Bentuk error yang selalu sama di seluruh endpoint, dan pemetaan kode
 * PostgreSQL ke status yang lebih berguna.
 *
 * Aturan yang tidak boleh dilanggar: detail internal (pesan error PostgreSQL,
 * nama kolom, nama constraint) tidak pernah keluar ke klien. Untuk galat 5xx
 * yang dikirim hanya teks generik; aslinya ditulis ke log server.
 */

/** Kode stabil untuk sisi klien. Tidak pernah berubah, boleh dicabangkan. */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "DATABASE_ERROR"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Pesan per field. Hanya ada untuk `VALIDATION_FAILED`. */
  readonly fields?: Record<string, string>;
  /** Dipakai untuk header `retry-after`. */
  readonly retryAfterSeconds?: number;
  /** Asli yang lebih verbose. Hanya ditulis ke log server, tidak pernah dikirim. */
  readonly detail?: string;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    options: {
      fields?: Record<string, string>;
      retryAfterSeconds?: number;
      detail?: string;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.detail = options.detail;
  }

  static validation(errors: Record<string, string>): ApiError {
    return new ApiError("VALIDATION_FAILED", 422, "Periksa kembali isian formulir.", {
      fields: errors,
    });
  }

  static notFound(what: string): ApiError {
    return new ApiError("NOT_FOUND", 404, `${what} tidak ditemukan.`);
  }

  static badRequest(message: string): ApiError {
    return new ApiError("BAD_REQUEST", 400, message);
  }

  static unauthorized(): ApiError {
    return new ApiError("UNAUTHORIZED", 401, "Sesi tidak valid atau sudah berakhir.");
  }

  static forbidden(): ApiError {
    return new ApiError("FORBIDDEN", 403, "Akun ini tidak punya akses ke tindakan ini.");
  }

  static rateLimited(retryAfterSeconds: number): ApiError {
    return new ApiError(
      "RATE_LIMITED",
      429,
      `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`,
      { retryAfterSeconds },
    );
  }

  static payloadTooLarge(): ApiError {
    return new ApiError("PAYLOAD_TOO_LARGE", 413, "Data yang dikirim terlalu besar.");
  }

  static internal(detail: string): ApiError {
    return new ApiError("INTERNAL_ERROR", 500, "Terjadi kesalahan di server.", { detail });
  }
}

/** Bentuk galat PostgreSQL yang dipakai di sini. */
type SqlError = { code?: string; constraint?: string; message?: string };

/**
 * Buka bungkus galat sampai ke galat PostgreSQL aslinya.
 *
 * Drizzle tidak melempar galat driver apa adanya. `execute` dan query builder
 * sama-sama membungkusnya jadi `DrizzleQueryError`, yang menaruh galat asli di
 * `cause`. Jadi `err.code` selalu `undefined`, dan kode SQL yang sebenarnya
 * hanya ada satu tingkat lebih bawah.
 *
 * Ini bukan detail sepele: tanpa membuka bungkusnya, `mapDbError` tidak pernah
 * melihat kode `23505` maupun `23503`, jadi setiap pelanggaran constraint
 * bocor sebagai 500 "Layanan sedang bermasalah" padahal penyebabnya sudah
 * jelas dan bisa ditulis dalam bahasa manusia.
 *
 * Dua tingkat diperiksa karena `DrizzleQueryError` juga bisa membungkus
 * `TransactionRollbackError`, yang `cause`-nya lagi `ApiError`.
 */
export function dbCause(err: unknown): SqlError {
  let current = err as { cause?: unknown } | undefined;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    const sqlErr = current as SqlError;
    if (typeof sqlErr.code === "string") return sqlErr;
    current = current.cause as { cause?: unknown } | undefined;
  }

  // Galat yang tidak punya kode sama sekali: mungkin `ApiError` kita sendiri,
  // atau galat yang belum pernah menyentuh database. Kembalikan apa adanya
  // supaya pemanggil bisa membedakan "kode tidak dikenal" dari "bukan galat
  // database".
  return err as SqlError;
}

/** Kode SQL dari sebuah galat, atau `undefined` kalau ini bukan galat database. */
export function dbErrorCode(err: unknown): string | undefined {
  const kode = dbCause(err).code;
  return typeof kode === "string" ? kode : undefined;
}

/**
 * Petakan galat driver PostgreSQL ke `ApiError`.
 *
 * Dipanggil dari lapisan database, bukan dari setiap query: satu tempat
 * sehingga tidak ada handler yang lupa memetakan `23503` dan membiarkan
 * pengguna melihat pesan constraint mentah.
 */
export function mapDbError(err: unknown): ApiError {
  const sqlErr = dbCause(err);
  const kode = sqlErr.code;

  switch (kode) {
    // Pelanggaran unique pada kode tiket berarti ada tabrakan pada generator,
    // bukan kesalahan pengguna. Lapisan pemanggil mengulang; kalau tetap gagal
    // setelah beberapa kali, itu bug dan perlu ada stack trace.
    case "23505":
      return ApiError.internal(`tabrakan unique: ${sqlErr.constraint ?? "?"}`);
    case "23503":
      return ApiError.badRequest("Data yang dirujuk tidak ditemukan.");
    case "23514":
      return ApiError.badRequest("Nilai di luar rentang yang diperbolehkan.");
    case "22P02":
      return ApiError.badRequest("Format data tidak dikenali.");
    default:
      return new ApiError(
        "DATABASE_ERROR",
        500,
        "Layanan sedang bermasalah. Coba lagi sebentar.",
        { detail: sqlErr?.message ?? String(err) },
      );
  }
}

/**
 * Ubah galat apa pun menjadi `ApiError`.
 *
 * `ApiError` sudah benar dilewati apa adanya. Galat database diterjemahkan
 * lewat `mapDbError`, sehingga pelanggaran constraint yang belum sempat
 * dipetakan di lapisan pemanggil tetap sampai ke klien sebagai pesan yang
 * bisa dibaca, bukan sebagai 500 generik. Galat lain dibungkus jadi 500 generik,
 * karena tidak ada galat lain yang boleh bocor ke klien.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (dbErrorCode(err) !== undefined) return mapDbError(err);
  return ApiError.internal(err instanceof Error ? err.message : String(err));
}