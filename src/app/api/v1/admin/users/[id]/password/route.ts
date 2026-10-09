import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { canManageUsers, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { changePassword } from "@/server/admin/accounts";
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
    periksaKataSandi(errors, baru, "new_password");

    const lama = String(body.current_password ?? "");
    if (lama.trim() === "") errors.add("current_password", "Wajib diisi.");

    if (!errors.isEmpty) throw errors.toApiError();

    // Password lama selalu diminta, termasuk saat admin mengubah akunnya
    // sendiri. Sesi yang masih hidup membuktikan dia sudah masuk, bukan bahwa
    // dia sedang memegang keyboard itu; tanpa password lama, siapa pun yang
    // sempat menemukan cookie sesi bisa mengunci akun orang lain.
    await changePassword(db, uuid(id, "id"), lama, baru);

    return ok({ password_updated: true });
  });
}
