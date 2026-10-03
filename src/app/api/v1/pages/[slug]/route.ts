import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { denganSnapshot } from "@/server/api/snapshot";
import { findPage } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    const { slug } = await context.params;
    const baris = await denganSnapshot((db) => findPage(db, slug), `/pages/${slug}`);

    if (baris === null) throw ApiError.notFound("halaman");
    return ok(baris);
  });
}
