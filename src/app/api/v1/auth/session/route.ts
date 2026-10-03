import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { readSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * Periksa sesi yang sedang berjalan.
 *
 * Selalu membalas 200 dengan isi sesi, atau 200 dengan semua kolom bernilai
 * `null` kalau tidak ada sesi yang berlaku. Sengaja tidak 401: panel admin
 * memakai endpoint ini untuk memutuskan masih perlu tidaknya menampilkan
 * tombol "Masuk", jadi "tidak masuk" adalah jawaban yang wajar, bukan galat.
 * Endpoint yang benar-benar butuh otorisasi, seperti `/admin/stats`, yang
 * menjawab 401.
 *
 * Sesi dianggap tidak berlaku dalam empat hal: cookie tidak ada, tanda
 * tangannya tidak cocok, sudah kedaluwarsa, atau sudah dicabut karena akunnya
 * berubah. Yang terakhir hanya ketahuan lewat pemeriksaan di `readSession()`.
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
