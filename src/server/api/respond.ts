import { NextResponse } from "next/server";
import { toApiError } from "./error";

/**
 * Bentuk respons yang selalu sama: `{ "data": ... }` untuk sukses dan
 * `{ "error": { code, message, fields? } }` untuk gagal.
 *
 * Amplop `data` tidak bisa dihapus tanpa mengubah setiap konsumen, dan
 * menyisipkannya sekarang jauh lebih murah daripada memindahkannya nanti.
 */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/**
 * Status 201 supaya klien bisa membedakan "baru tersimpan" dari "hanya dibaca
 * ulang". Tanpa itu, penghitung di panel admin bisa menghitung satu permintaan
 * dua kali saat respons diulang.
 */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Bungkus handler route sehingga tidak ada satu pun yang bisa gagal diam-diam.
 *
 * Galat yang bukan `ApiError` tetap menghasilkan 500 dengan kode
 * `INTERNAL_ERROR`, dan aslinya ditulis ke log server. Tanpa pembungkus ini,
 * satu `throw` lupa ditangani akan memunculkan halaman galat bawaan Next.js
 * yang bentuknya berbeda dari semua endpoint lain.
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const apiError = toApiError(err);

    if (apiError.status >= 500) {
      console.error(`[api] ${apiError.code}:`, err);
    } else {
      console.debug(`[api] ditolak ${apiError.code}: ${apiError.message}`);
    }

    const headers: Record<string, string> = {};
    if (apiError.retryAfterSeconds !== undefined) {
      headers["retry-after"] = String(apiError.retryAfterSeconds);
    }

    return NextResponse.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message,
          ...(apiError.fields ? { fields: apiError.fields } : {}),
        },
      },
      { status: apiError.status, headers },
    );
  }
}

/*
 * Sengaja tidak ada header CORS di berkas ini.
 *
 * Panel admin disajikan dari origin yang sama dengan API, jadi peramban tidak
 * pernah mengirim permintaan lintas origin dan CORS tidak diperlukan. Menambah
 * `access-control-allow-origin` hanya memperlebar jalan bagi origin lain untuk
 * membaca API ini sebagai pengguna yang sedang login, tanpa memberi manfaat
 * apa pun pada deployment sekarang.
 *
 * Kalau panel nanti benar-benar pindah ke origin terpisah, CORS harus
 * ditambahkan saat itu juga, dengan pengujian yang menolak origin yang tidak
 * cocok. `ADMIN_ORIGIN` tetap berguna untuk menentukan apakah cookie sesi
 * diberi atribut `Secure`.
 */
