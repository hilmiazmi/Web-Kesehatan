import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { teks } from "@/server/api/params";
import { listDocuments } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const kategori = teks(request.nextUrl.searchParams, "category");

    return ok(
      await denganSnapshot((db) => listDocuments(db, kategori), "/documents"),
    );  });
}
