import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { requireSession } from "@/server/auth/session";
import { describeTables } from "@/server/admin/registry";

export const dynamic = "force-dynamic";

/**
 * Daftar tabel yang bisa dikelola beserta kolomnya.
 *
 * Panel membangun formulirnya dari respons endpoint ini, sehingga daftar kolom
 * di server dan daftar kolom di layar tidak bisa berbeda.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession();
    return ok(describeTables());
  });
}
