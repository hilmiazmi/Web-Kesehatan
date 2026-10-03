import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { API_VERSION, ROUTE_PREFIX } from "@/server/api/meta";
import { checkDb, dbOrNull } from "@/server/db/client";
import { config } from "@/server/config";

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
      // Sengaja tanpa melepas `database.detail`. Isinya bisa memuat nama host,
      // nama pengguna, dan potongan kredensial, sementara health check dibaca
      // oleh siapa pun yang bisa menjangkau portnya.
      throw new Error("database tidak menjawab");
    }

    const dasar = {
      status: "ok",
      version: API_VERSION,
      api_prefix: ROUTE_PREFIX,
      time: new Date().toISOString(),
    };

    // Di mode snapshot tidak ada koneksi sama sekali, dan endpoint ini tetap
    // harus menjawab. Health check dibaca platform secara otomatis, jadi
    // membalas 500 di build pratinjau akan membuat pratinjau ditandai tidak
    // sehat lalu dibunuh, padahal tidak ada apa pun yang rusak: snapshot memang
    // tidak pernah punya database.
    if (db === null) {
      return ok({ ...dasar, database: "tidak terhubung", mode: config().apiMode });
    }

    // Yang ditulis di sini bukan hasil kueri, melainkan nama konstanta.
    //
    // Sebelumnya respons ini berisi hasil `SELECT version()`, yaitu versi
    // PostgreSQL lengkap beserta kompilasi dan sistem operasi. `/health` terbuka
    // tanpa sesi, dan nomor versi itulah yang dipakai penyerang untuk
    // mencocokkan kerentanan yang sudah diketahui. Pemeriksaan kesehatan tidak
    // butuh presisi sebesar itu.
    //
    // `checkDb()` di atas sudah menjalankan `SELECT 1` pada koneksi yang sama,
    // jadi menjawab "ok" di sini tidak butuh kueri kedua.
    return ok({
      ...dasar,
      database: "PostgreSQL",
      mode: config().apiMode,
    });
  });
}
