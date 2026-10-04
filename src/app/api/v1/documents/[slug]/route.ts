import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { denganSnapshot } from "@/server/api/snapshot";
import { findDocument } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

/**
 * Satu dokumen, dicari lewat slug.
 *
 * Bentuknya sama persis dengan `articles/[slug]`: sumber dari database, dengan
 * snapshot sebagai cadangan saat mode pratinjau. Nama berkas snapshot-nya
 * dihitung oleh `snapshotKey()`, jadi `standar-pelayanan` dibaca dari
 * `snapshot/documents__standar-pelayanan.json`.
 *
 * Endpoint ini sebelumnya tidak ada. `documents` punya route daftar sejak awal,
 * padahal lima sumber daya lain yang sama-sama punya slug — `articles`, `jobs`,
 * `mcu/packages`, `pages`, `services` — semuanya punya route detail. Tanpa
 * ini, satu-satunya jalan untuk membaca satu dokumen dari API adalah menarik
 * seluruh daftar lalu menyaringnya sendiri di sisi pemanggil.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    const { slug } = await context.params;
    const baris = await denganSnapshot((db) => findDocument(db, slug), `/documents/${slug}`);

    if (baris === null) throw ApiError.notFound("dokumen");
    return ok(baris);
  });
}
