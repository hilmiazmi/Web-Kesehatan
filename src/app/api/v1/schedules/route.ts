import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { tanggal, uuid } from "@/server/api/params";
import { formatIsoDate } from "@/server/validation";
import { jadwalOnDate } from "@/server/db/repo/content";
import { dbOrNull } from "@/server/db/client";
import { isoWeekday, weekdayName } from "@/server/db/repo/appointments";

export const dynamic = "force-dynamic";

/**
 * Jadwal satu dokter pada satu tanggal, lengkap dengan sisa kuota.
 *
 * Tanpa parameter `date`, jadwal hari ini yang ditampilkan. Ini yang dipakai
 * widget "jadwal dokter hari ini" di beranda, jadi halaman itu tidak perlu
 * menghitung tanggalnya sendiri dan tidak akan salah saat zona waktu peramban
 * berbeda.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;

    const dokter = uuid({ doctor: params.get("doctor") ?? undefined }, "doctor");

    const diminta = tanggal(params, "date");
    const hariDipakai = diminta.ada ? diminta.nilai : formatIsoDate(new Date());

    // Snapshot tidak punya jadwal per tanggal, karena sisa kuota untuk tanggal
    // tertentu akan basi begitu lewat. Mode snapshot menjawab dari daftar
    // jadwal umum yang tersimpan di berkas.
    const db = dbOrNull();
    if (db === null) throw ApiError.notFound("jadwal");

    const items = await jadwalOnDate(db, dokter, hariDipakai);

    return ok({
      doctor_id: dokter,
      date: hariDipakai,
      weekday: weekdayName(isoWeekday(new Date(`${hariDipakai}T00:00:00Z`))),
      items,
    });
  });
}
