import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { handle, ok, created } from "@/server/api/respond";
import { ApiError, dbCause, dbErrorCode, kolomUnique, mapDbError, toApiError } from "@/server/api/error";

/**
 * Bentuk respons galat dan pemetaan kode PostgreSQL.
 *
 * `error.ts` menyatakan satu aturan yang tidak boleh dilanggar: detail internal
 * tidak pernah keluar ke klien. Detail itu berisi pesan galat PostgreSQL, nama
 * kolom, nama constraint, dan sesekali nama host. Semuanya ditulis ke log
 * server, tidak pernah ke body respons.
 *
 * Aturan itu diuji di sini karena tidak ada uji lain yang menyentuhnya, dan
 * karena ia mudah dilanggar tanpa terlihat: menambah satu properti pada objek
 * `error` di `handle()` sudah cukup untuk membocorkan isi `ApiError.detail`.
 */

/** Detail internal yang meniru kebocoran nyata. */
const RAHASIA = "postgres://rsud:rahasia@10.0.0.5:5432/rsud users_email_key rsud_dev_password";

async function body(r: NextResponse): Promise<Record<string, unknown>> {
  return (await r.json()) as Record<string, unknown>;
}

describe("handle", () => {
  it("membungkus galat tak dikenal menjadi 500 dengan pesan generik", async () => {
    const res = await handle(async () => {
      throw new Error(`gagal konek ke ${RAHASIA}`);
    });

    expect(res.status).toBe(500);
    expect(await body(res)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan di server." },
    });
  });

  it("tidak pernah mengirim detail internal dalam bentuk apa pun", async () => {
    // Semua ApiError yang punya `detail` harus tetap menutupnya, apa pun
    // pesannya dan apa pun statusnya.
    const denganDetail = [
      ApiError.internal(`host 10.0.0.5, user rsud, sandi rsud_dev_password`),
      new ApiError("DATABASE_ERROR", 500, "Layanan sedang bermasalah.", { detail: RAHASIA }),
      // Pesannya terdengar seperti pesan yang aman, tapi tetap tidak boleh
      // keluar selama statusnya 5xx.
      new ApiError("INTERNAL_ERROR", 503, "Layanan sedang bermasalah.", { detail: RAHASIA }),
    ];

    for (const err of denganDetail) {
      const res = await handle(async () => {
        throw err;
      });
      const mentah = JSON.stringify(await res.json());

      expect(mentah).not.toContain("rsud_dev_password");
      expect(mentah).not.toContain("10.0.0.5");
      expect(mentah).not.toContain("users_email_key");
      // `detail` sendiri tidak boleh muncul sebagai properti di body.
      expect(mentah).not.toContain("detail");
    }
  });

  it("mempertahankan pesan aman pada galat 4xx", async () => {
    // Beda dengan 5xx: pesan 4xx memang ditulis untuk dibaca pengguna, jadi
    // tidak boleh disamarkan jadi generik.
    const res = await handle(async () => {
      throw ApiError.badRequest("Surel itu sudah dipakai akun lain.");
    });

    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({
      error: { code: "BAD_REQUEST", message: "Surel itu sudah dipakai akun lain." },
    });
  });

  it("menaruh pesan per field hanya pada galat validasi", async () => {
    const res = await handle(async () => {
      throw ApiError.validation({ nik: "NIK harus 16 digit angka." });
    });

    expect(res.status).toBe(422);
    expect(await body(res)).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Periksa kembali isian formulir.",
        fields: { nik: "NIK harus 16 digit angka." },
      },
    });
  });

  it("menyerahkan respons sukses apa adanya", async () => {
    const res = await handle(async () => ok({ nama: "Budi" }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ data: { nama: "Budi" } });
  });

  it("membuat respons created berstatus 201", async () => {
    const res = created({ id: "abc" });
    expect(res.status).toBe(201);
    expect(await body(res)).toEqual({ data: { id: "abc" } });
  });

  it("menaruh retry-after pada galat rate limit", async () => {
    const res = await handle(async () => {
      throw ApiError.rateLimited(30);
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
  });

  it("tidak menambah header CORS pada respons mana pun", async () => {
    // Panel disajikan dari origin yang sama, jadi CORS tidak diperlukan.
    // Menambahkannya hanya memperlebar jalan bagi origin lain untuk membaca
    // API ini sebagai pengguna yang sedang login.
    const sukses = await handle(async () => ok({ a: 1 }));
    const gagal = await handle(async () => {
      throw ApiError.unauthorized();
    });

    for (const res of [sukses, gagal]) {
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    }
  });
});

describe("dbCause", () => {
  it("membuka bungkus DrizzleQueryError sampai ke galat driver", () => {
    const asli = { code: "23505", constraint_name: "users_email_key" };
    const bungkus = { cause: asli };

    // Hasilnya salinan, bukan objek yang sama, karena `normalkan` menyamakan
    // kunci constraint sambil mempertahankan kunci aslinya.
    expect(dbCause(bungkus)).toEqual({
      code: "23505",
      constraint: "users_email_key",
      constraint_name: "users_email_key",
    });
    expect(dbErrorCode(bungkus)).toBe("23505");
  });

  it("membuka dua tingkat bungkus", () => {
    // TransactionRollbackError membungkus ApiError, dan DrizzleQueryError
    // membungkus itu juga.
    const dalam = { code: "23503", constraint: "appointments_doctor_fk" };
    const tengah = { cause: dalam };
    const luar = { cause: tengah };

    expect(dbErrorCode(luar)).toBe("23503");
  });

  it("menormalkan constraint_name milik postgres.js menjadi constraint", () => {
    // node-postgres memakai `constraint`, postgres.js memakai
    // `constraint_name`. Hanya satu yang dibaca akan mematikan semua pesan
    // yang menyebut kolom mana yang bentrok.
    expect(kolomUnique({ code: "23505", constraint_name: "users_email_key" })).toBe("email");
  });

  it("mengembalikan apa adanya kalau tidak punya kode", () => {
    const biasa = new Error("bukan galat database");
    expect(dbErrorCode(biasa)).toBeUndefined();
    expect(dbCause(biasa)).toBe(biasa);
  });

  it("tidak tersangkut di rantai cause yang saling menunjuk", () => {
    // Rantai yang membentuk lingkaran akan membuat perulangan tak terbatas
    // kalau batas kedalamannya tidak dibatasi.
    const a: { cause?: unknown } = {};
    const b: { cause?: unknown } = { cause: a };
    a.cause = b;

    expect(() => dbCause(a)).not.toThrow();
  });
});

describe("kolomUnique", () => {
  it("mengambil nama kolom dari berbagai pola constraint", () => {
    expect(kolomUnique({ code: "23505", constraint: "users_email_key" })).toBe("email");
    expect(kolomUnique({ code: "23505", constraint: "users_email_unique" })).toBe("email");
    expect(kolomUnique({ code: "23505", constraint: "articles_slug_pkey" })).toBe("slug");
    expect(kolomUnique({ code: "23505", constraint: "services_nama_idx" })).toBe("nama");
  });

  it("menangkap nama kolom multi-kata secara utuh", () => {
    // Regresi: pola lama `([^_]+)` hanya menangkap satu segmen sehingga
    // `appointments_phone_schedule_unique` dilaporkan sebagai `schedule`,
    // yaitu field yang tidak ada di formulir mana pun.
    expect(
      kolomUnique({ code: "23505", constraint: "appointments_phone_schedule_unique" }),
    ).toBe("phone_schedule");
  });

  it("mengembalikan null untuk galat yang bukan pelanggaran unique", () => {
    expect(kolomUnique({ code: "23503", constraint: "x_y_key" })).toBeNull();
    expect(kolomUnique({ code: "23505" })).toBeNull();
  });

  it("mengembalikan nama constraint apa adanya kalau polanya tidak dikenal", () => {
    // Lebih berguna daripada null untuk diagnostik.
    expect(kolomUnique({ code: "23505", constraint: "kode_tiket_v1" })).toBe("kode_tiket_v1");
  });
});

describe("mapDbError", () => {
  it("menerjemahkan pelanggaran foreign key menjadi pesan terbaca", () => {
    const err = mapDbError({
      code: "23503",
      constraint: "appointments_doctor_fk",
      message: `insert or update violates foreign key constraint ${RAHASIA}`,
    });

    expect(err.status).toBe(400);
    expect(err.message).not.toContain("10.0.0.5");
    expect(err.message).not.toContain("appointments_doctor_fk");
  });

  it("membungkus galat database lain sebagai 500 dengan detail tersembunyi", () => {
    const err = mapDbError({ code: "08006", message: RAHASIA });

    expect(err.status).toBe(500);
    expect(err.message).toBe("Layanan sedang bermasalah. Coba lagi sebentar.");
    // Detailnya ada untuk ditulis ke log, bukan untuk dikirim.
    expect(err.detail).toContain("10.0.0.5");
  });

  it("membaca pelanggaran check constraint dan format sebagai kesalahan masukan", () => {
    expect(mapDbError({ code: "23514" }).status).toBe(400);
    expect(mapDbError({ code: "22P02" }).status).toBe(400);
  });
});

describe("toApiError", () => {
  it("melewatkan ApiError apa adanya", () => {
    const asli = ApiError.forbidden();
    expect(toApiError(asli)).toBe(asli);
  });

  it("menjadi generik untuk galat tak dikenal", () => {
    const err = toApiError(new Error(RAHASIA));

    expect(err.status).toBe(500);
    expect(err.message).toBe("Terjadi kesalahan di server.");
    expect(err.detail).toContain("rsud_dev_password");
  });

  it("menjadi generik untuk nilai yang bukan Error sama sekali", () => {
    // `throw "string"` dan `throw { message }` adalah kegagalan yang nyata
    // terjadi, dan keduanya harus berakhir sebagai 500 yang tidak bocor.
    expect(toApiError("sandi rsud_dev_password").status).toBe(500);
    expect(toApiError({ message: "rsud_dev_password" }).status).toBe(500);
    expect(toApiError(undefined).status).toBe(500);
  });
});