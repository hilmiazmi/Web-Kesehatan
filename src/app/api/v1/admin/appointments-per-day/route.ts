import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { appointmentsPerDay } from "@/server/admin/stats";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession();

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    return ok(await appointmentsPerDay(db));
  });
}
