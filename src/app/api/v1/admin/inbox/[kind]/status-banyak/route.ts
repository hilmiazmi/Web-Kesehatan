import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { parseKind, updateStatusBanyak } from "@/server/admin/inbox";
import { Errors, readJsonBody, textRequired } from "@/server/validation";
import { uuid } from "@/server/api/params";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ kind: string }> };

/**
 * Ubah status banyak tiket sekaligus.
 *
 * Dipisah dari `PATCH .../[id]` karena bentuk masukannya berbeda: yang ini
 * menerima daftar id, dan mencampurnya dengan endpoint satu baris akan membuat
 * satu route harus melayani dua bentuk body yang validasinya berbeda.
 *
 * Hak aksesnya sama persis dengan ubah status satu baris: semua peran yang
 * boleh masuk panel, karena menangani pesan masuk adalah pekerjaan front office.
 */
export async function POST(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    await requireSession();

    const { kind } = await context.params;
    const jenis = parseKind(kind);
    if (jenis === undefined) throw ApiError.notFound("jenis inbox");

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);
    const errors = new Errors();

    // Bentuk daftar diperiksa di sini, bukan di lapisan admin, supaya galat
    // validasi tetap muncul dengan nama field yang bisa ditampilkan panel.
    const idsMentah = Array.isArray(body.ids) ? body.ids : null;
    if (idsMentah === null) errors.add("ids", "Wajib berupa daftar.");

    const status = textRequired(errors, "status", String(body.status ?? ""), 2, 20);
    if (!errors.isEmpty) throw errors.toApiError();

    // Satu id yang tidak valid menggagalkan seluruh kiriman, bukan dilewati:
    // aksi massal yang separuh jalan lebih berbahaya daripada yang ditolak.
    const ids = (idsMentah as unknown[]).map((nilai, i) => uuid(String(nilai), `ids[${i}]`));

    const { updated } = await updateStatusBanyak(db, jenis, ids, status!);

    return ok({ updated });
  });
}
