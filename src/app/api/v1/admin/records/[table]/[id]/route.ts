import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { canEditContent, canManageUsers, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { find } from "@/server/admin/registry";
import { deleteRecord, getRecord, updateRecord } from "@/server/admin/records";
import { readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ table: string; id: string }> };

/** Baris dan daftar putih tabel untuk satu segmen path. */
async function siapkan(context: Konteks) {
  const { table, id } = await context.params;
  const spesifikasi = find(table);
  if (spesifikasi === undefined) throw ApiError.notFound("tabel");

  const db = dbOrNull();
  if (db === null) throw ApiError.internal("panel butuh database");

  return { db, spesifikasi, barisId: uuid({ id }, "id") };
}

export async function GET(_request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);
    const { db, spesifikasi, barisId } = await siapkan(context);

    const baris = await getRecord(db, spesifikasi, barisId);
    if (baris === null) throw ApiError.notFound("baris");

    return ok(baris);
  });
}

export async function PATCH(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);
    const { db, spesifikasi, barisId } = await siapkan(context);

    return ok(await updateRecord(db, spesifikasi, barisId, await readJsonBody(request)));
  });
}

export async function DELETE(_request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    // Menghapus konten jauh lebih merusak daripada mengeditnya, jadi hak ini
    // dibatasi pada peran yang lebih tinggi: `front_office` tidak punya.
    await requireSession(canManageUsers);
    const { db, spesifikasi, barisId } = await siapkan(context);

    if (!spesifikasi.deletable) {
      throw ApiError.badRequest("Tabel ini tidak boleh dihapus lewat panel.");
    }

    await deleteRecord(db, spesifikasi, barisId);
    return ok({ deleted: true });
  });
}
