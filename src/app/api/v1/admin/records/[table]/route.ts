import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { bilangan, bilanganTerbatas, boolean, teks } from "@/server/api/params";
import { canEditContent, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { find } from "@/server/admin/registry";
import { createRecord, listRecords } from "@/server/admin/records";
import { readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

/** Ukuran halaman bawaan untuk daftar baris. */
const UKURAN_BAWAAN = 25;

type Konteks = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const { table } = await context.params;
    const spesifikasi = find(table);
    if (spesifikasi === undefined) throw ApiError.notFound("tabel");

    const params = request.nextUrl.searchParams;
    const db = dbOrNull();
    if (db === null) throw ApiError.internal("panel butuh database");

    return ok(
      await listRecords(db, spesifikasi, {
        page: Math.max(1, bilangan(params, "page", 1)),
        pageSize: bilanganTerbatas(params, "page_size", UKURAN_BAWAAN, 1, 100),
        search: teks(params, "q"),
        sort: teks(params, "sort"),
        descending: boolean(params, "desc"),
      }),
    );
  });
}

export async function POST(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const { table } = await context.params;
    const spesifikasi = find(table);
    if (spesifikasi === undefined) throw ApiError.notFound("tabel");

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("panel butuh database");

    return created(await createRecord(db, spesifikasi, await readJsonBody(request)));
  });
}

