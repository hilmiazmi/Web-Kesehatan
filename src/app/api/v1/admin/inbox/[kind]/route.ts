import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { bilangan, bilanganTerbatas, teks } from "@/server/api/params";
import { requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { listInbox, parseKind } from "@/server/admin/inbox";

export const dynamic = "force-dynamic";

/** Ukuran halaman bawaan inbox. Lebih kecil dari daftar konten. */
const UKURAN_BAWAAN = 25;

type Konteks = { params: Promise<{ kind: string }> };

export async function GET(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession();

    const { kind } = await context.params;
    const jenis = parseKind(kind);
    if (jenis === undefined) throw ApiError.notFound("jenis inbox");

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const params = request.nextUrl.searchParams;

    return ok(
      await listInbox(db, jenis, {
        status: teks(params, "status"),
        page: Math.max(1, bilangan(params, "page", 1)),
        pageSize: bilanganTerbatas(params, "page_size", UKURAN_BAWAAN, 1, 100),
        search: teks(params, "q"),
      }),
    );
  });
}
