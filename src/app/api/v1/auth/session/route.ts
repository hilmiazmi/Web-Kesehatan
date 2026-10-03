import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { readSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * Periksa sesi yang sedang berjalan.
 *
 * Mengembalikan 401 kalau cookie tidak ada, sudah kedaluwarsa, atau
 * tandatangannya tidak cocok. Panel admin memakai ini untuk menentukan apakah
 * masih perlu menampilkan tombol "Masuk".
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const claims = await readSession();

    return ok({
      id: claims?.sub ?? null,
      email: claims?.email ?? null,
      name: claims?.name ?? null,
      role: claims?.role ?? null,
      expires_at: claims?.exp ?? null,
    });
  });
}
