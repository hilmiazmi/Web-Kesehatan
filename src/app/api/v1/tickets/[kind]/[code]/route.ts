import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { dbOrNull } from "@/server/db/client";
import { findByTicket, looksLikeTicketCode, parseKind } from "@/server/admin/inbox";

export const dynamic = "force-dynamic";

/**
 * Cek status satu tiket milik sendiri.
 *
 * Endpoint ini sengaja mengembalikan sedikit informasi: kode tiket, status, dan
 * waktu. Nama, nomor telepon, dan isi laporan tidak dikembalikan, karena kode
 * tiket bisa ditebak atau dibagikan lewat orang lain, sedangkan form pengaduan
 * berisi data pribadi pasien.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string; code: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    const { kind, code } = await context.params;

    const jenis = parseKind(kind);
    if (jenis === undefined) throw ApiError.notFound("jenis tiket");

    if (!looksLikeTicketCode(code)) {
      throw ApiError.validation({ code: "Format kode tiket tidak dikenali." });
    }

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("cek tiket butuh database");

    const baris = await findByTicket(db, jenis, code);
    if (baris === null) throw ApiError.notFound("tiket");

    return ok(baris);
  });
}
