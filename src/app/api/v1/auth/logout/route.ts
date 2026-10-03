import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { clearedSessionCookie } from "@/server/auth/session";

/**
 * Akhiri sesi admin.
 *
 * Balasannya selalu berhasil, bahkan kalau tidak ada sesi apa pun. Logout yang
 * gagal karena cookie sudah hilang hanya akan membuat tombol "Keluar" di panel
 * menampilkan pesan galat padahal tidak ada yang perlu dibatalkan.
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const cookie = clearedSessionCookie();
    const respons = ok({ status: "signed_out" });

    respons.cookies.set(cookie.name, cookie.value, cookie.options);
    return respons;
  });
}
