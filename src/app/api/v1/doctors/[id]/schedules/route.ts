import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { uuid } from "@/server/api/params";
import { denganSnapshot } from "@/server/api/snapshot";
import { listSchedules } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    const { id } = await context.params;
    const dokter = uuid(id, "doctor");

    // Dokter yang tidak ada dan dokter tanpa jadwal sama-sama menghasilkan
    // daftar kosong di sini. Keduanya dibedakan di `GET /doctors`, yang
    // menjawab 404 kalau dokter-nya memang tidak ada.
    return ok(
      await denganSnapshot(
        (db) => listSchedules(db, { doctorId: dokter }),
        `/doctors/${dokter}/schedules`,
      ),
    );
  });
}
