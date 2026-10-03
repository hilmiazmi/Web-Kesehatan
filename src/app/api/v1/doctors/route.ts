import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { teks } from "@/server/api/params";
import { listDoctors } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const spesialis = teks(request.nextUrl.searchParams, "specialty");

    return ok(
      await denganSnapshot(
        (db) => listDoctors(db, { specialty: spesialis }),
        "doctors",
      ),
    );  });
}
