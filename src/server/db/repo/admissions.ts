/**
 * Penyimpanan permintaan rawat inap.
 *
 * Berbeda dari `appointments`, tidak ada nomor antrean dan tidak ada slot per
 * dokter yang perluurangi. Yang benar-benar dikurangi adalah tempat tidur, dan itu
 * sudah tercatat di `bed_capacity.reserved_beds` supaya tidak dihitung dua
 * kali di sini.
 */

import { desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { admissions, bedCapacity } from "@/server/db/schema";
import { NIK_SIMULASI } from "./appointments";

/** Bentuk masukan untuk satu permintaan inap. */
export type NewAdmission = {
  ticket_code: string;
  patient_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  referral_source: string | null;
  requested_class: string;
  entry_date: string;
  estimated_nights: number;
  complaint: string | null;
  payment_type: string;
};

/** Hasil yang dikembalikan ke pengunjung. */
export type AdmissionConfirmation = {
  ticket_code: string;
  patient_name: string;
  requested_class: string;
  entry_date: string;
  estimated_nights: number;
  status: string;
  /**
   * Perkiraan biaya kamar per malam untuk kelas yang diminta.
   *
   * Hanya perkiraan. Biaya akhir ditetapkan petugas sesuai kondisi pasien,
   * dan angka ini tidak dipakai untuk penagihan apa pun.
   */
  estimated_cost_per_night: number;
};

/**
 * Perkiraan biaya kamar per malam per kelas, dalam rupiah.
 *
 * Angkanya karangan dan tidak diambil dari rumah sakit mana pun. Ditaruh di
 * sini, bukan di formulir, supaya satu angka dipakai bersama oleh backend dan
 * frontend; kalau berbeda, pengunjung melihat angka yang tidak sama dengan
 * yang muncul di struk.
 */
export const BIAYA_KELAS: Record<string, number> = {
  intensive: 3_500_000,
  intermediate: 2_200_000,
  regular: 1_400_000,
  private: 5_000_000,
};

/**
 * Simpan satu permintaan rawat inap.
 *
 * Tidak memakai transaksi karena tidak ada penghitung yang harus terjaga:
 * Berbeda dari `createAppointment`, tidak ada nomor urut yang dihitung dengan
 * `INSERT ... ON CONFLICT`. Yang perlu dijaga hanya keunikan kode tiket,
 * dan itu sudah ditangani `uniqueIndex` di database.
 */
export async function createAdmission(
  db: Db,
  input: NewAdmission,
): Promise<AdmissionConfirmation> {
  const [baris] = await db
    .insert(admissions)
    .values({
      ticketCode: input.ticket_code,
      patientName: input.patient_name,
      // NIK tidak pernah ikut ke query, sama seperti pada `appointments`.
      nik: NIK_SIMULASI,
      phone: input.phone,
      email: input.email,
      address: input.address,
      referralSource: input.referral_source,
      requestedClass: input.requested_class as never,
      entryDate: input.entry_date,
      estimatedNights: input.estimated_nights,
      complaint: input.complaint,
      paymentType: input.payment_type as never,
    })
    .returning();

  return {
    ticket_code: baris.ticketCode,
    patient_name: baris.patientName,
    requested_class: baris.requestedClass,
    entry_date: baris.entryDate,
    estimated_nights: baris.estimatedNights,
    status: baris.status,
    estimated_cost_per_night: BIAYA_KELAS[baris.requestedClass] ?? 0,
  };
}

/**
 * Permintaan inap terbaru, untuk pemeriksaan internal dan tes.
 *
 * Dipakai oleh `tests/api-detail-dan-rate-limit.test.ts` dan skrip
 * `cek:tulis`. Halaman publik tidak memanggilnya.
 */
export async function listAdmissions(
  db: Db,
  batas = 20,
): Promise<
  {
    id: string;
    ticket_code: string;
    patient_name: string;
    requested_class: string;
    entry_date: string;
    status: string;
  }[]
> {
  const baris = await db
    .select({
      id: admissions.id,
      ticket_code: admissions.ticketCode,
      patient_name: admissions.patientName,
      requested_class: admissions.requestedClass,
      entry_date: admissions.entryDate,
      status: admissions.status,
    })
    .from(admissions)
    .where(eq(admissions.status, "pending"))
    .orderBy(desc(admissions.createdAt))
    .limit(batas);

  return baris;
}

/** Sisa tempat tidur pada satu kelas perawatan. */
export async function sisaTempatTidur(
  db: Db,
  kelas: string,
): Promise<{ total: number; terisi: number; tersedia: number } | null> {
  const baris = await db
    .select()
    .from(bedCapacity)
    .where(eq(bedCapacity.className, kelas as never))
    .limit(1);

  const row = baris[0];
  if (!row) return null;

  return {
    total: row.totalBeds,
    terisi: row.occupiedBeds,
    tersedia: Math.max(0, row.totalBeds - row.occupiedBeds - row.reservedBeds),
  };
}
