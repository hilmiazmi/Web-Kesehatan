import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { teks } from "@/server/api/params";
import { listServices } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const jenis = teks(params, "type");
    const section = teks(params, "section");

    return ok(
      await denganSnapshot(
        (db) => listServices(db, { type: jenis, section }),
        "/services",
      ),
    );  });
}
