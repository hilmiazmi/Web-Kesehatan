import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { API_VERSION, ROUTE_PREFIX } from "@/server/api/meta";
import { checkDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { dbOrNull } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * Liveness plus pemeriksaan koneksi database.
 *
 * Pemeriksa dari luar memakai `GET /health`. Kalau hanya memeriksa proses saja,
 * database yang mati tidak akan terdeteksi: service masih hidup, pemeriksa
 * tetap bilang benar, dan permintaan pengguna justru gagal satu per satu.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const db = dbOrNull();
    const database = await checkDb();

    if (!database.ok) {
      // Sengaja tanpa melepas detail galat. Isinya bisa memuat nama host,
      // nama pengguna, dan potongan kredensial, dan health check memang dibaca
      // oleh siapa pun yang bisa menjangkau port-nya.
      throw new Error("database tidak menjawab");
    }

    const baris = await db!.execute(sql`SELECT version() AS v`);
    const penuh = String((baris[0] as { v: string }).v);

    return ok({
      status: "ok",
      version: API_VERSION,
      api_prefix: ROUTE_PREFIX,
      database: penuh.split(",")[0]?.trim() ?? "PostgreSQL",
      time: new Date().toISOString(),
    });
  });
}