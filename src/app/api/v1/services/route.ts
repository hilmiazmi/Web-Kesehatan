import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { teks } from "@/server/api/params";
import { saring } from "@/server/api/snapshot-query";
import type { ServiceRow } from "@/server/db/repo/content";
import { listServices } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const jenis = teks(params, "type");
    const section = teks(params, "section");

    // `section` sengaja tidak ikut disaring di sini. SQL mencocokkan
    // `services.sectionKey`, sedangkan `ServiceRow` tidak pernah memilih kolom
    // itu, jadi snapshot tidak punya nilainya untuk dibandingkan. Menebak
    // nilainya dari slug akan_filter di mode pratinjau tapi salah di produksi.
    return ok(
      await denganSnapshot(
        (db) => listServices(db, { type: jenis, section }),
        "/services",
        (muatan) => saring<ServiceRow>(muatan, { type: jenis }),
      ),
    );
  });
}
