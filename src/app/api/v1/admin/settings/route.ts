import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { canEditContent, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { loadSettings, saveSettings } from "@/server/db/repo/content";
import { catatAudit } from "@/server/admin/audit";
import { readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    return ok(await loadSettings(db));
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const sesi = await requireSession(canEditContent);

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);

    // Kunci yang dikirim dicatat, bukan isinya. Isi pengaturan memuat nama
    // rumah sakit, alamat, dan sesekali nomor telepon: itu bukan rahasia, tapi
    // juga tidak ada gunanya disalin ke tabel riwayat yang hanya perlu
    // menjawab "apa yang diubah".
    const kunci = Object.keys(body).sort();

    await saveSettings(db, body);

    await catatAudit(db, {
      actorId: sesi.sub,
      actorEmail: sesi.email,
      action: "update",
      tableName: "site_settings",
      rowId: null,
      summary: kunci.length > 0 ? `pengaturan: ${kunci.join(", ")}` : "pengaturan situs",
    });

    return ok(await loadSettings(db));
  });
}
