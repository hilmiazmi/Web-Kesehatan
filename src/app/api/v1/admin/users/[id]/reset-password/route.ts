import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { canManageUsers, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { resetPassword } from "@/server/admin/accounts";
import { periksaKataSandi } from "@/server/auth/password";
import { Errors, readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canManageUsers);

    const { id } = await context.params;
    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);
    const errors = new Errors();

    const baru = String(body.new_password ?? "");
    periksaKataSandi(errors, baru);

    if (!errors.isEmpty) throw errors.toApiError();

    await resetPassword(db, uuid(id, "id"), baru);

    return ok({ password_reset: true });
  });
}
