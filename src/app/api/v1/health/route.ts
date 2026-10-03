import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { API_VERSION, ROUTE_PREFIX } from "@/server/api/meta";
import { checkDb, dbOrNull } from "@/server/db/client";
import { config } from "@/server/config";
import { sql } from "drizzle-orm";

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

    const dasar = {
      status: "ok",
      version: API_VERSION,
      api_prefix: ROUTE_PREFIX,
      time: new Date().toISOString(),
    };

    // Di mode snapshot tidak ada koneksi yang bisa ditanyakan versinya, dan
    // endpoint ini tetap harus menjawab. Health check dibaca platform secara
    // otomatis, jadi membalas 500 di build pratinjau akan membuat pratinjau
    // ditandai tidak sehat lalu dibunuh, padahal tidak ada apa pun yang rusak:
    // snapshot memang tidak pernah punya database.
    if (db === null) {
      return ok({ ...dasar, database: "tidak terhubung", mode: config().apiMode });
    }

    const baris = await db.execute(sql`SELECT version() AS v`);
    const penuh = String((baris[0] as { v: string }).v);

    return ok({
      ...dasar,
      database: penuh.split(",")[0]?.trim() ?? "PostgreSQL",
      mode: config().apiMode,
    });
  });
}