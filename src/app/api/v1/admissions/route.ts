import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { jalankanForm, isi, isiOpsional, selesaikan } from "@/server/api/form";
import {
  Errors,
  choice,
  dateIso,
  dateWithinDays,
  digitsExact,
  email,
  phoneId,
  textOptional,
  textRequired,
} from "@/server/validation";
import { config } from "@/server/config";
import { createAdmission, BIAYA_KELAS } from "@/server/db/repo/admissions";
import { generateTicket } from "@/server/ticket";
import { formatIsoDate } from "@/server/validation";

/** Metode pembayaran yang diterima, sesuai enum `payment_type`. */
const METODE_BAYAR = ["general", "bpjs", "insurance"] as const;

/** Kelas perawatan, sesuai enum `ward_class`. */
const KELAS_INAP = ["intensive", "intermediate", "regular", "private"] as const;

/**
 * Perkiraan lama inap yang boleh diminta, dalam malam.
 *
 * Batas atas mencegah satu permintaan menahan kamar lebih lama dari
 * yang wajar. Nilai 30 malam sudah melebihi masa inap rujukan BPJS pada
 * hampir semua kasus.
 */
const MAKS_MALAM = 30;

/**
 * Perkiraan biaya kamar per malam dan batas lama inap, untuk isi formulir.
 *
 * Taruh di backend, bukan ditulis ulang di komponen, supaya angka yang dilihat
 * pengunjung sama dengan angka yang dipakai saat konfirmasi.
 */
export async function GET(): Promise<NextResponse> {
  return handle(async () =>
    ok({
      classes: Object.entries(BIAYA_KELAS).map(([kelas, biaya]) => ({ kelas, biaya })),
      max_nights: MAKS_MALAM,
    }),
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(request, "admissions", "admission", async (db, body) => {
      const errors = new Errors();

      const namaPasien = textRequired(errors, "patient_name", isi(body, "patient_name"), 3, 160);

      // NIK divalidasi formatnya supaya pengunjung mendapat umpan balik, tapi
      // nilainya tidak diteruskan ke query, sama seperti pada pendaftaran rawat
      // jalan.
      digitsExact(errors, "nik", isi(body, "nik"), 16);

      const telepon = phoneId(errors, "phone", isi(body, "phone"), true);
      const surel = email(errors, "email", isi(body, "email"), false);
      const alamat = textOptional(errors, "address", isi(body, "address"), 500);
      const keluhan = textOptional(errors, "complaint", isi(body, "complaint"), 1000);
      const rujukan = textOptional(errors, "referral_source", isi(body, "referral_source"), 160);
      const bayar = choice(errors, "payment_type", isi(body, "payment_type") || "general", METODE_BAYAR);
      const kelas = choice(errors, "requested_class", isi(body, "requested_class"), KELAS_INAP);

      const { minLeadDays, maxLeadDays } = config();
      const tanggalMasuk = dateIso(errors, "entry_date", isi(body, "entry_date"), true);
      const masuk = tanggalMasuk
        ? dateWithinDays(errors, "entry_date", tanggalMasuk, minLeadDays, maxLeadDays)
        : null;

      // Lama inap wajib diisi. Default 1 malam secara diam-diam akan membuat
      // permintaan yang tidak sengaja terasa sah, dan jumlah malam itu dipakai
      // untuk memperkirakan kebutuhan tempat tidur.
      const malam = angkaBentrok(errors, "estimated_nights", isi(body, "estimated_nights"), 1, MAKS_MALAM);

      // Kolom perangkap bot, sama seperti formulir rawat jalan.
      if (isiOpsional(body, "website") !== null && isi(body, "website") !== "") {
        throw ApiError.badRequest("Permintaan ditolak.");
      }

      selesaikan(errors);

      if (namaPasien === null || telepon === null || bayar === null || kelas === null) {
        throw ApiError.internal("validasi lolos tapi data kosong");
      }
      if (masuk === null || malam === null) throw ApiError.internal("tanggal atau malam kosong");

      return createAdmission(db, {
        ticket_code: generateTicket("admission"),
        patient_name: namaPasien,
        phone: telepon,
        email: surel,
        address: alamat,
        referral_source: rujukan,
        requested_class: kelas,
        entry_date: formatIsoDate(masuk),
        estimated_nights: malam,
        complaint: keluhan,
        payment_type: bayar,
      });
    });

    return created(hasil);
  });
}

/** Baca angka bulat dari body dengan batas; null berarti tidak valid. */
function angkaBentrok(
  errors: Errors,
  nama: string,
  mentah: string,
  min: number,
  maks: number,
): number | null {
  const teks = mentah.trim();
  if (teks === "") {
    errors.add(nama, "Isi jumlah malam.");
    return null;
  }
  const nilai = Number(teks);
  if (!Number.isInteger(nilai) || nilai < min || nilai > maks) {
    errors.add(nama, `Jumlah malam harus antara ${min} dan ${maks}.`);
    return null;
  }
  return nilai;
}
