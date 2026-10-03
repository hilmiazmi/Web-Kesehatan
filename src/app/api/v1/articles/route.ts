import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { denganSnapshot } from "@/server/api/snapshot";
import { bilangan, bilanganTerbatas, teks } from "@/server/api/params";
import { satuHalaman } from "@/server/api/snapshot-query";
import { listArticles } from "@/server/db/repo/content";

export const dynamic = "force-dynamic";

/**
 * Batas atas ukuran halaman berita.
 *
 * Tanpa batas, satu permintaan `?limit=100000` membuat server mengirim seluruh
 * tabel dalam satu respons dan memakai RAM yang tidak tersedia di VPS kecil ini.
 */
const UKURAN_MAKS = 24;

export function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const halaman = Math.max(1, bilangan(params, "page", 1));
    const ukuran = bilanganTerbatas(params, "limit", 9, 1, UKURAN_MAKS);
    const kategori = teks(params, "category");

    const posisi = { limit: ukuran, offset: (halaman - 1) * ukuran };

    const hasil = await denganSnapshot(
      (db) => listArticles(db, { ...posisi, category: kategori }),
      "/articles",
      // Snapshot menyimpan seluruh artikel, jadi penyaringan dan pemotongan
      // halaman harus diulang di sini. Tanpa ini `?page=2` mencytak ulang isi
      // `?page=1`, dan `?category=` diabaikan sama sekali.
      (muatan) => satuHalaman(muatan, { category: kategori }, posisi),
    );

    const total = hasil.total;
    return ok({
      items: hasil.items,
      total,
      page: halaman,
      page_size: ukuran,
      pages: ukuran > 0 ? Math.ceil(total / ukuran) : 0,
    });
  });
}
