import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { bilangan, bilanganTerbatas, teks } from "@/server/api/params";
import { canManageUsers, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { listAudit, tabelAuditValid } from "@/server/admin/audit";

export const dynamic = "force-dynamic";

/** Ukuran halaman bawaan untuk daftar riwayat. */
const UKURAN_BAWAAN = 25;

/**
 * Daftar riwayat tindakan admin.
 *
 * Hanya `super_admin` yang boleh membacanya. Alasannya bukan kerahasiaan
 * teknis, melainkan fungsi datanya: riwayat ini dipakai untuk menelusuri siapa
 * mengubah apa, dan peran yang tidak mengubah konten sama sekali tidak punya
 * pertanyaan yang perlu dijawabnya.
 *
 * Penyaring per tabel divalidasi terhadap daftar putih karena nama tabel masuk
 * ke SQL sebagai literal.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canManageUsers);

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const params = request.nextUrl.searchParams;
    const tabel = teks(params, "table");
    if (tabel !== null && !tabelAuditValid(tabel)) {
      throw ApiError.validation({ table: "Nama tabel tidak dikenal." });
    }

    const { items, total } = await listAudit(db, {
      page: Math.max(1, bilangan(params, "page", 1)),
      size: bilanganTerbatas(params, "page_size", UKURAN_BAWAAN, 1, 100),
      tableName: tabel,
    });

    return ok({ items, total, page: Math.max(1, bilangan(params, "page", 1)) });
  });
}
