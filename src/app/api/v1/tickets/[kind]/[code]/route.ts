import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { limitRequest } from "@/server/api/rate-limit";
import { dbOrNull } from "@/server/db/client";
import { findByTicket, looksLikeTicketCode, parseKind } from "@/server/admin/inbox";

export const dynamic = "force-dynamic";

/**
 * Cek status satu tiket milik sendiri.
 *
 * Endpoint ini sengaja mengembalikan sedikit informasi: kode tiket, status, dan
 * waktu. Nama, nomor telepon, dan isi laporan tidak dikembalikan, karena kode
 * tiket bisa ditebak atau dibagikan lewat orang lain, sedangkan form pengaduan
 * berisi data pribadi pasien.
 *
 * Pembatas jumlah permintaan dipasang di sini, bukan karena kode tiket mudah
 * ditebak. Kode itu delapan karakter dari alfabet 32 huruf dengan
 * `randomInt` dari `node:crypto`, jadi ruang tebakannya lebih dari 10^12 dan
 * menebaknya tidak realistis. Yang dikendalikan adalah jumlah kueri: tanpa
 * pembatas, satu alamat bisa mengirim ribuan permintaan dengan kode acak apa
 * saja dan setiap permintaan tetap membaca satu baris dari database. Ini satu
 *-satunya endpoint baca yang menyentuh satu baris per permintaan, jadi di titik
 * inilah memasang satu penghitung yang paling banyak gunanya.
 *
 * Batasnya sama dengan endpoint formulir, jadi orang yang sedang memeriksa
 * status tiket-tiket yang berbeda tidak akan ikut terkunci oleh satu penyerang
 * lain di alamat yang sama: satu alamat bisa lima permintaan per menit untuk
 * endpoint ini.
 *
 * `resetLimit` sengaja tidak dipanggil, berbeda dari endpoint tulis. Permintaan
 * baca tidak mengubah apa pun, jadi tidak ada alasan untuk menghapus jejaknya
 * hanya karena jawabannya 404.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string; code: string }> },
): Promise<NextResponse> {
  return handle(async () => {
    limitRequest(request.headers, "tickets");

    const { kind, code } = await context.params;

    const jenis = parseKind(kind);
    if (jenis === undefined) throw ApiError.notFound("jenis tiket");

    if (!looksLikeTicketCode(code)) {
      throw ApiError.validation({ code: "Format kode tiket tidak dikenali." });
    }

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const baris = await findByTicket(db, jenis, code);
    if (baris === null) throw ApiError.notFound("tiket");

    return ok(baris);
  });
}
