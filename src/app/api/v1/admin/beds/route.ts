import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { canEditContent, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { perbaruiTempatTidur } from "@/server/db/repo/beds";
import {
  Errors,
  integerRange,
  readJsonBody,
  textRequired,
} from "@/server/validation";

export const dynamic = "force-dynamic";

/**
 * Batas jumlah baris per permintaan.
 *
 * Panel mengirim seluruh tabel dalam satu permintaan supaya tidak ada baris
 * yang tertinggal di state panel ketika ada orang yang mengisi tempat tidur di
 * luar panel. Dua ratus baris sudah jauh di atas kapasitas tempat tidur mana pun
 * yang masuk akal.
 */
const BARIS_MAKS = 200;

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    await requireSession(canEditContent);

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);
    const mentah = body.items;

    if (!Array.isArray(mentah)) {
      throw ApiError.validation({ items: "Kirim daftar baris dalam field items." });
    }

    if (mentah.length === 0 || mentah.length > BARIS_MAKS) {
      throw ApiError.badRequest(`Kirim antara 1 dan ${BARIS_MAKS} baris.`);
    }

    const errors = new Errors();
    const baris = [];

    for (const [indeks, item] of mentah.entries()) {
      const barisMentah = (item ?? {}) as Record<string, unknown>;
      const field = `items[${indeks}]`;

      const ruang = textRequired(
        errors,
        field,
        String(barisMentah.ward_name ?? ""),
        2,
        160,
      );
      const kelas = textRequired(
        errors,
        field,
        String(barisMentah.class_name ?? ""),
        2,
        80,
      );

      const total = integerRange(errors, field, Number(barisMentah.total_beds), 0, 5000);
      const terisi = integerRange(errors, field, Number(barisMentah.occupied_beds), 0, 5000);
      const dipesan = integerRange(errors, field, Number(barisMentah.reserved_beds), 0, 5000);

      if (
        ruang !== null &&
        kelas !== null &&
        total !== null &&
        terisi !== null &&
        dipesan !== null
      ) {
        baris.push({
          ward_name: ruang,
          class_name: kelas,
          total_beds: total,
          occupied_beds: terisi,
          reserved_beds: dipesan,
        });
      }
    }

    if (!errors.isEmpty) throw errors.toApiError();

    return ok({
      requested: baris.length,
      updated: await perbaruiTempatTidur(db, baris),
    });
  });
}
