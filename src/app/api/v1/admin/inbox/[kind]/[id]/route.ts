import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { parseKind, updateStatus } from "@/server/admin/inbox";
import { Errors, readJsonBody, textOptional, textRequired } from "@/server/validation";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    // Semua peran boleh mengubah status pesan yang masuk, karena itu pekerjaan
    // front office. Mengubah isi pesan tidak ada di endpoint mana pun.
    await requireSession();

    const { kind, id } = await context.params;
    const jenis = parseKind(kind);
    if (jenis === undefined) throw ApiError.notFound("jenis inbox");

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);
    const errors = new Errors();

    const status = textRequired(errors, "status", String(body.status ?? ""), 2, 20);
    const catatan = textOptional(errors, "admin_note", String(body.admin_note ?? ""), 2000);

    if (!errors.isEmpty) throw errors.toApiError();

    await updateStatus(db, jenis, uuid(id, "id"), status!, catatan);

    return ok({ status, updated: true });
  });
}
