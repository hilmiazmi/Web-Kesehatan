import { NextResponse } from "next/server";
import { ApiError, toApiError } from "./error";

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

/** Hitungan baris untuk endpoint admin. */
export function countValue(count: number): NextResponse {
  return ok({ count });
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

/**
 * Header CORS untuk endpoint yang boleh dipanggil dari origin admin.
 *
 * `Vary: Origin` wajib: tanpa itu, cache CDN bisa menyajikan ulang header CORS
 * milik origin lain, dan browser menolak jawabannya.
 */
export function corsHeaders(origin: string, requestOrigin: string | null): Record<string, string> {
  if (!requestOrigin || requestOrigin !== origin) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,accept,cookie",
    vary: "Origin",
  };
}

/** Balasan untuk preflight `OPTIONS`. */
export function preflight(origin: string): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, "*") });
}

export { ApiError };