import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { requireSession, canEditContent } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { loadSettings, saveSettings } from "@/server/db/repo/content";
import { readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("pengaturan butuh database");

    return ok(await loadSettings(db));
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("pengaturan butuh database");

    return ok(await saveSettings(db, await readJsonBody(request)));
  });
}
