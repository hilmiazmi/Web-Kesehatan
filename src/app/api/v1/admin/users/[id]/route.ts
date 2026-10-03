import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { canManageUsers, requireSession, isRole } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { deleteAccount, updateAccount } from "@/server/admin/accounts";
import { readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canManageUsers);

    const { id } = await context.params;
    const db = dbOrNull();
    if (db === null) throw ApiError.internal("akun butuh database");

    const body = await readJsonBody(request);

    // `role` hanya diterima kalau benar-benar peran yang dikenal. Nilai lain
    // diabaikan, bukan di-cast: Panel yang mengirim peran tidak dikenal akan
    // melihat perubahan lain tetap tersimpan tanpa jejanya, dan itu lebih sulit
    // ditemukan daripada 422 yang menyebutkan kolomnya.
    const peranDiminta = body.role;
    const peran =
      typeof peranDiminta === "string" && isRole(peranDiminta) ? peranDiminta : null;

    return ok(
      await updateAccount(db, uuid(id, "id"), {
        email: typeof body.email === "string" ? body.email : null,
        name: typeof body.name === "string" ? body.name : null,
        role: peran,
        is_active: typeof body.is_active === "boolean" ? body.is_active : null,
      }),
    );
  });
}

export async function DELETE(_request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    const aktor = await requireSession(canManageUsers);

    const { id } = await context.params;
    const db = dbOrNull();
    if (db === null) throw ApiError.internal("akun butuh database");

    await deleteAccount(db, uuid(id, "id"), aktor.sub);

    return ok({ deleted: true });
  });
}
