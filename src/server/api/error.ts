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
  | "READ_ONLY_MODE"
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

  /**
   * Server sedang berjalan dalam mode baca-saja.
   *
   * Dipakai di `API_MODE=snapshot`, yaitu mode pratinjau yang tidak boleh
   * menyentuh database produksi. Menolak dengan 403 akan terlihat seperti
   * hak akses yang kurang, padahal hak aksesnya cukup; 503 lebih jujur karena
   * yang tidak tersedia adalah kemampuan menulis, bukan izinnya.
   */
  static readOnly(): ApiError {
    return new ApiError(
      "READ_ONLY_MODE",
      503,
      "Server ini sedang berjalan dalam mode baca-saja, jadi formulir belum bisa dikirim.",
    );
  }

  static internal(detail: string): ApiError {
    return new ApiError("INTERNAL_ERROR", 500, "Terjadi kesalahan di server.", { detail });
  }
}

/**
 * Bentuk galat PostgreSQL yang dipakai di sini.
 *
 * Nama constraint dibaca dari dua kunci karena nama itu berbeda antar driver:
 * `node-postgres` memakai `constraint`, sedangkan `postgres.js` yang dipakai
 * di sini memakai `constraint_name`. Hanya satu yang salah baca akan membuat
 * `kolomUnique` selalu mengembalikan `null`, dan pelanggaran unique kembali bocor
 * sebagai 500 tanpa penjelasan.
 */
type SqlError = {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  message?: string;
};

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
  // `throw undefined` dan `throw null` adalah kegagalan yang nyata terjadi,
  // dan kalau diteruskan apa adanya, pembaca `.code` di bawah ikut melempar.
  // Galat itu dibungkus supaya bentuknya sama dengan galat lain.
  if (err === null || typeof err !== "object") {
    return { message: String(err) };
  }

  let current = err as { cause?: unknown } | undefined;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    const sqlErr = current as SqlError;
    if (typeof sqlErr.code === "string") return normalkan(sqlErr);
    current = current.cause as { cause?: unknown } | undefined;
  }

  // Galat yang tidak punya kode sama sekali: mungkin `ApiError` kita sendiri,
  // atau galat yang belum pernah menyentuh database. Kembalikan apa adanya
  // supaya pemanggil bisa membedakan "kode tidak dikenal" dari "bukan galat
  // database".
  return err as SqlError;
}

/**
 * Samakan nama constraint ke satu kunci.
 *
 * Tanpa ini, setiap pembacaan `constraint` hanya benar untuk satu driver, dan
 * penggantian driver akan diam-diam mematikan semua pesan galat yang menyebut
 * kolom mana yang bentrok.
 */
function normalkan(err: SqlError): SqlError {
  if (err.constraint !== undefined) return err;

  const dariDriver = err.constraint_name;
  if (dariDriver === undefined) return err;

  return { ...err, constraint: dariDriver };
}

/** Kode SQL dari sebuah galat, atau `undefined` kalau ini bukan galat database. */
export function dbErrorCode(err: unknown): string | undefined {
  const kode = dbCause(err).code;
  return typeof kode === "string" ? kode : undefined;
}

/**
 * Nama kolom yang bentrok dari pelanggaran unique, atau `null`.
 *
 * PostgreSQL menamai constraint unik dengan pola `<tabel>_<kolom>_key`,
 * `_unique`, atau `_pkey`, jadi nama kolomnya bisa diambil dari sana.
 *
 * Nilai balik `null` berarti galatnya bukan pelanggaran unique, atau nama
 * constraint-nya tidak mengikuti pola yang dikenal.
 *
 * Ini dipakai lapisan admin. Pelanggaran unique di formulir publik punya
 * arti lain: di sana yang bentrok adalah kode tiket, dan itu tabrakan pada
 * generator yang harus dicoba ulang, bukan kesalahan yang harus dilaporkan.
 * Satu pemetaan global untuk keduanya akan salah untuk yang satu atau yang
 * lain, jadi keduanya dibedakan di sini.
 */
export function kolomUnique(err: unknown): string | null {
  const sqlErr = dbCause(err);
  if (sqlErr.code !== "23505" || typeof sqlErr.constraint !== "string") return null;

  // Nama constraint seperti `appointments_phone_schedule_unique` memuat nama
  // kolom multi-kata (`phone_schedule`). Pola lama `([^_]+)` hanya menangkap
  // satu segmen (`schedule`), yaitu field yang tidak ada di formulir, sehingga
  // pesan validasi menunjuk field hantu. `(.+)` menangkap seluruh nama kolom.
  const cocok = /_(.+)_(?:key|pkey|uniq|unique|idx)$/.exec(sqlErr.constraint);
  return cocok?.[1] ?? sqlErr.constraint;
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