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
 * Selisih WIB terhadap UTC dalam jam.
 *
 * Sama seperti `WIB_OFFSET_JAM` di formulir pendaftaran: dihitung dari UTC
 * ditambah offset eksplisit supaya hasilnya sama di zona waktu mesin mana pun.
 */
const WIB_OFFSET_JAM = 7;

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

    const dokter = uuid(params.get("doctor") ?? undefined, "doctor");

    const diminta = tanggal(params, "date");
    // Tanpa parameter berarti hari ini menurut WIB, bukan UTC: `toISOString`
    // memakai UTC sehingga pukul 00:00-06:59 WIB masih tanggal kemarin dan
    // widget "jadwal hari ini" menampilkan jadwal yang salah.
    const hariDipakai = diminta.ada
      ? diminta.nilai
      : formatIsoDate(new Date(Date.now() + WIB_OFFSET_JAM * 3_600_000));

    // Snapshot tidak punya jadwal per tanggal, karena sisa kuota untuk tanggal
    // tertentu akan basi begitu lewat. Menjawab 503 baca-saja, bukan 404:
    // masalahnya mode yang tidak bisa melayani, bukan tanggal yang tidak ada.
    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const items = await jadwalOnDate(db, dokter, hariDipakai);

    return ok({
      doctor_id: dokter,
      date: hariDipakai,
      weekday: weekdayName(isoWeekday(new Date(`${hariDipakai}T00:00:00Z`))),
      items,
    });
  });
}
