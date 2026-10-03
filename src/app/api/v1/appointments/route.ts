import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { jalankanForm, isi, isiOpsional, selesaikan } from "@/server/api/form";
import {
  Errors,
  choice,
  dateIso,
  dateWithinDays,
  digitsExact,
  email,
  formatIsoDate,
  phoneId,
  textOptional,
  textRequired,
} from "@/server/validation";
import { config } from "@/server/config";
import { createAppointment, scheduleForBooking } from "@/server/db/repo/appointments";
import { generateTicket } from "@/server/ticket";
import { uuid } from "@/server/api/params";

/** Metode pembayaran yang diterima, sesuai enum `payment_type`. */
const METODE_BAYAR = ["general", "bpjs", "insurance"] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(request, "appointments", "appointment", async (db, body) => {
      const errors = new Errors();

      const namaPasien = textRequired(errors, "patient_name", isi(body, "patient_name"), 3, 160);

      // NIK divalidasi formatnya supaya pengunjung mendapat umpan balik, tapi
      // nilainya tidak diteruskan ke query. `NIK_SIMULASI` menggantinya dengan
      // angka nol sebelum INSERT, jadi isi NIK asli tidak pernah tersimpan.
      digitsExact(errors, "nik", isi(body, "nik"), 16);

      const telepon = phoneId(errors, "phone", isi(body, "phone"), true);
      const surel = email(errors, "email", isi(body, "email"), false);
      const alamat = textOptional(errors, "address", isi(body, "address"), 500);
      const keluhan = textOptional(errors, "complaint", isi(body, "complaint"), 1000);
      const bayar = choice(errors, "payment_type", isi(body, "payment_type") || "general", METODE_BAYAR);

      const { minLeadDays, maxLeadDays } = config();
      const tanggalKunjungan = dateIso(errors, "visit_date", isi(body, "visit_date"), true);
      const kunjungan = tanggalKunjungan
        ? dateWithinDays(errors, "visit_date", tanggalKunjungan, minLeadDays, maxLeadDays)
        : null;

      // Tanggal lahir opsional: kosong berarti tidak diisi, bukan berarti salah.
      const lahir = isiOpsional(body, "birth_date");
      const tanggalLahir = lahir === null ? null : dateIso(errors, "birth_date", lahir, false);

      selesaikan(errors);

      // Semua field di atas sudah lolos `selesaikan` sebelum baris ini, jadi
      // pemeriksaan di bawah hanya jaring pengaman.
      if (namaPasien === null || telepon === null || bayar === null || kunjungan === null) {
        throw ApiError.internal("validasi lolos tapi data kosong");
      }

      const jadwalId = uuid({ schedule_id: isi(body, "schedule_id") }, "schedule_id");
      const jadwal = await scheduleForBooking(db, jadwalId);
      if (jadwal === null) throw ApiError.notFound("jadwal");

      return createAppointment(db, {
        ticket_code: generateTicket("appointment"),
        doctor_id: jadwal.doctor_id,
        polyclinic_id: jadwal.polyclinic_id,
        patient_name: namaPasien,
        birth_date: tanggalLahir === null ? null : formatIsoDate(tanggalLahir),
        phone: telepon,
        email: surel,
        address: alamat,
        complaint: keluhan,
        visit_date: formatIsoDate(kunjungan),
        schedule_id: jadwalId,
        payment_type: bayar,
      });
    });

    return created(hasil);
  });
}
