import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { canManageUsers, requireSession, type Role } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { countsByRole, createAccount, listAccounts } from "@/server/admin/accounts";
import { Errors, choice, email as validateEmail, readJsonBody, textRequired } from "@/server/validation";
import { periksaKataSandi } from "@/server/auth/password";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canManageUsers);

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("akun butuh database");

    return ok({
      items: await listAccounts(db),
      counts_by_role: await countsByRole(db),
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canManageUsers);

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("akun butuh database");

    const body = await readJsonBody(request);
    const errors = new Errors();

    const surel = validateEmail(errors, "email", String(body.email ?? ""), true);
    const nama = textRequired(errors, "name", String(body.name ?? ""), 3, 160);
    const peran = choice(errors, "role", String(body.role ?? ""), [
      "super_admin",
      "editor",
      "front_office",
    ]);
    periksaKataSandi(errors, String(body.password ?? ""));

    if (!errors.isEmpty) throw errors.toApiError();

    return created(
      await createAccount(db, {
        email: surel!,
        name: nama!,
        role: peran as Role,
        password: String(body.password ?? ""),
      }),
    );
  });
}
