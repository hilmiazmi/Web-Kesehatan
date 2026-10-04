import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../client";
import {
  appointments,
  doctorSchedules,
  doctorVisitQuotas,
  doctors,
  polyclinics,
  specialties,
} from "../schema";
import { ApiError, dbCause, dbErrorCode } from "../../api/error";
import { formatIsoDate } from "../../validation";

/**
 * Pendaftaran E-Pasien: pembuatan record dan penghitungan nomor antrean.
 */

/**
 * Nilai yang mengisi kolom `nik`.
 *
 * NIK adalah data pribadi, dan database ini bagian dari situs demo, jadi NIK
 * asli tidak boleh ikut tersimpan. Nilainya tetap divalidasi formatnya di
 * handler supaya pengunjung mendapat umpan balik, lalu diganti angka nol
 * sebelum query dijalankan.
 *
 * CHECK `appointments_nik_simulasi` di database menegakkan hal yang sama: kalau
 * ada jalur kode lain yang mencoba menyimpan NIK asli, INSERT ditolak dan bukan
 * diam-diam berhasil. Jadi nilai di bawah bukan sekadar kebiasaan, tetapi
 * pengaman kedua.
 */
export const NIK_SIMULASI = "0000000000000000";

/**
 * Nama unique index yang menyatukan nomor telepon dan jadwal.
 *
 * Dideklarasikan di `src/server/db/schema.ts` dan dibuat di
 * `drizzle/0003_anti_ganda.sql`. Disalin ke sini sebagai string biasa, bukan
 * dibaca dari skema, supaya modul ini tetap bisa diuji tanpa database.
 */
export const CONSTRAINT_DAFTAR_GANDA = "appointments_phone_schedule_unique";

/**
 * Pesan yang dilihat pasien kalau satu nomor telepon daftar dua kali untuk slot
 * yang sama.
 *
 * Sesuai bentuk paling sempit yang dipilih di `docs/roadmap.md` bagian 3.13:
 * satu nomor, satu jadwal, satu baris. Satu nomor tetap boleh mengambil antrean
 * di slot lain pada hari yang sama.
 */
export const PESAN_DAFTAR_GANDA =
  "Nomor ini sudah terdaftar untuk jadwal itu. Satu nomor hanya bisa satu antrean per jadwal.";

/**
 * Ubah pelanggaran unique anti-ganda menjadi pesan yang bisa dibaca pasien.
 *
 * Mengembalikan `null` kalau galatnya bukan itu, supaya pemanggil melempar
 * aslinya apa adanya dan pemetaan galat di lapisan pemanggil tetap berlaku.
 * Pemetaan global tidak bisa dipakai sebagai gantinya: di `mapDbError`, kode
 * `23505` selalu menjadi 500, karena di lapisan admin bentrok unique memang bug
 * pada kodenya. Di sini bentrok jadwal adalah jawaban yang benar untuk
 * permintaan yang memang salah.
 *
 * Nama constraint dan pesan PostgreSQL tidak ikut ke klien. Aturan itu berlaku
 * untuk semua galat, termasuk yang dipetakan di sini.
 */
export function kePesanDaftarGanda(err: unknown): ApiError | null {
  if (dbErrorCode(err) !== "23505") return null;
  if (dbCause(err).constraint !== CONSTRAINT_DAFTAR_GANDA) return null;

  return ApiError.badRequest(PESAN_DAFTAR_GANDA);
}

/** Data pendaftaran yang sudah lolos validasi. */
export type NewAppointment = {
  ticket_code: string;
  doctor_id: string;
  polyclinic_id: string;
  patient_name: string;
  birth_date: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  complaint: string | null;
  visit_date: string;
  schedule_id: string | null;
  payment_type: string;
};

/** Hasil yang dikembalikan ke pasien. */
export type AppointmentConfirmation = {
  ticket_code: string;
  queue_number: number;
  patient_name: string;
  doctor_name: string;
  specialty: string | null;
  polyclinic: string;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  status: string;
  /** Sisa kuota setelah pendaftaran ini. */
  remaining_quota: number | null;
};

/**
 * Nomor hari dalam seminggu menurut ISO: 1 Senin sampai 7 Minggu.
 *
 * Harus sama dengan kolom `day_of_week` di `doctor_schedules`, jadi dihitung
 * dari UTC agar hasilnya tidak ikut berubah kalau zona waktu server berbeda.
 */
/**
 * Satu jadwal aktif beserta identitas dokter dan polikliniknya.
 *
 * Dipisah dari `ScheduleRow` karena pendaftaran hanya butuh dua kolom ini, dan
 * mengembalikan baris jadwal lengkap ke sini akan membuka jalan bagi pemanggil
 * lain ikut memakai kolom yang tidak ada artinya saat memesan.
 */
export type BookableSchedule = {
  doctor_id: string;
  polyclinic_id: string;
};

/**
 * Ambil jadwal aktif yang dipilih untuk pendaftaran.
 *
 * Jadwal yang sudah dinonaktifkan menghasilkan `null`, bukan baris: form yang
 * masih terbuka di browser pasien bisa saja mengirim jadwal yang sudah dimatikan
 * admin beberapa menit lalu, dan menerimanya akan membukukan jadwal yang
 * tidak pernah dibuka.
 */
export async function scheduleForBooking(
  db: Db,
  scheduleId: string,
): Promise<BookableSchedule | null> {
  const rows = await db
    .select({
      doctor_id: doctorSchedules.doctorId,
      polyclinic_id: doctorSchedules.polyclinicId,
    })
    .from(doctorSchedules)
    .where(and(eq(doctorSchedules.id, scheduleId), eq(doctorSchedules.isActive, true)))
    .limit(1);

  return rows[0] ?? null;
}

export function isoWeekday(date: Date): number {
  const hari = date.getUTCDay();
  return hari === 0 ? 7 : hari;
}

/** Konversi dari nomor hari ISO ke nama hari berbahasa Indonesia. */
export function weekdayName(day: number): string {
  return ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][day] ?? "-";
}

/**
 * Buat pendaftaran sekaligus menghitung nomor antrean, dalam satu transaksi.
 *
 * Urutan di dalam transaksi penting dan tidak boleh diubah:
 *
 * 1. `INSERT ... ON CONFLICT DO UPDATE` pada `doctor_visit_quotas` membuat baris
 *    penghitung kalau belum ada, lalu `RETURNING taken` mengembalikan angka
 *    setelah bertambah satu. Klausa ini mengunci baris sampai transaksi selesai,
 *    jadi dua permintaan yang datang bersamaan tidak bisa membaca angka yang
 *    sama.
 * 2. Nomor antrean adalah nilai `taken` yang baru dikembalikan.
 * 3. Kuota dicek. Kalau lewat, transaksi dibatalkan, sehingga baris penghitung
 *    juga kembali seperti semula.
 * 4. Baris pendaftaran disimpan, dengan dua unique index sebagai pengaman
 *    kedua: `(doctor_id, visit_date, queue_number)` untuk nomor antrean, dan
 *    `(phone, schedule_id)` untuk pendaftaran ganda pada satu slot. Pelanggaran
 *    yang kedua dipetakan jadi pesan pasien oleh `kePesanDaftarGanda`.
 *
 * Kalau langkah 1 diganti jadi "SELECT count lalu INSERT", langkah 2 dan 3 akan
 * membaca angka yang sama pada dua permintaan bersamaan, dan keduanya mendapat
 * nomor antrean yang sama.
 */
export async function createAppointment(
  db: Db,
  input: NewAppointment,
): Promise<AppointmentConfirmation> {
  return db.transaction(async (tx) => {
    const baris = await tx.execute(sql`
      INSERT INTO doctor_visit_quotas (doctor_id, visit_date, taken)
      VALUES (${input.doctor_id}, ${input.visit_date}, 1)
      ON CONFLICT (doctor_id, visit_date)
      DO UPDATE SET taken = doctor_visit_quotas.taken + 1
      RETURNING taken
    `);

    const taken_after = Number(firstRow(baris)?.taken ?? 0);

    const jadwal = await tx
      .select({
        quota: doctorSchedules.quota,
        dayOfWeek: doctorSchedules.dayOfWeek,
        startTime: doctorSchedules.startTime,
        endTime: doctorSchedules.endTime,
        room: doctorSchedules.room,
        polyclinic: polyclinics.name,
        doctorName: doctors.fullName,
        specialty: specialties.name,
      })
      .from(doctorSchedules)
      .innerJoin(polyclinics, eq(doctorSchedules.polyclinicId, polyclinics.id))
      .innerJoin(doctors, eq(doctorSchedules.doctorId, doctors.id))
      .leftJoin(specialties, eq(doctors.specialtyId, specialties.id))
      .where(
        and(
          eq(doctorSchedules.id, input.schedule_id ?? ""),
          eq(doctorSchedules.doctorId, input.doctor_id),
          eq(doctorSchedules.isActive, true),
        ),
      )
      .limit(1);

    // Keluar dari sini dengan melempar galat membatalkan transaksi, sehingga
    // `taken` tidak bertambah. Itu yang membuat kuota tidak berkurang untuk
    // pendaftaran yang ditolak.
    const schedule = jadwal[0];
    if (!schedule) {
      throw ApiError.badRequest("Slot jadwal yang dipilih tidak tersedia.");
    }

    if (isoWeekday(new Date(`${input.visit_date}T00:00:00Z`)) !== schedule.dayOfWeek) {
      throw ApiError.badRequest("Tanggal kunjungan tidak sesuai hari praktik dokter.");
    }

    const taken_before = taken_after - 1;
    const remaining_before = schedule.quota - taken_before;

    if (remaining_before <= 0) {
      throw ApiError.badRequest(
        `Kuota tanggal itu sudah penuh, daya tampang ${schedule.quota} orang.`,
      );
    }

    try {
      await tx.insert(appointments).values({
        ticketCode: input.ticket_code,
        doctorId: input.doctor_id,
        polyclinicId: input.polyclinic_id,
        patientName: input.patient_name,
        // NIK tidak pernah ikut ke query. Formulir tetap memvalidasinya sebagai
        // enam belas digit supaya pengunjung mendapat umpan balik yang benar,
        // tapi nilainya dibuang di sini.
        nik: NIK_SIMULASI,
        birthDate: input.birth_date,
        phone: input.phone,
        email: input.email,
        address: input.address,
        complaint: input.complaint,
        visitDate: input.visit_date,
        scheduleId: input.schedule_id,
        paymentType: input.payment_type as never,
        queueNumber: taken_after,
      });
    } catch (err) {
      // Pelanggaran `appointments_phone_schedule_unique` berarti pendaftaran ganda
      // untuk slot yang sama. Galatnya dilempar dari sini, di dalam transaksi,
      // supaya `taken` yang sudah dinaikkan di langkah 1 ikut kembali lagi.
      //
      // Tidak ada pengecekan SELECT sebelum INSERT. Alasannya, pemetaan di bawah
      // menghasilkan pesan yang persis sama, jadi pengecekan awal hanya menambah
      // satu query tanpa menambah informasi. Dan pengecekan awal tidak bisa
      // menggantikan index: dua permintaan yang datang bersamaan bisa sama-sama
      // lolos pengecekan, lalu sama-sama mendapat nomor antrean yang berbeda, dan
      // hanya database yang bisa memastikan salah satunya ditolak.
      const ganda = kePesanDaftarGanda(err);
      if (ganda) throw ganda;
      throw err;
    }

    return {
      ticket_code: input.ticket_code,
      queue_number: taken_after,
      patient_name: input.patient_name,
      doctor_name: schedule.doctorName,
      specialty: schedule.specialty,
      polyclinic: schedule.polyclinic,
      visit_date: formatIsoDate(new Date(`${input.visit_date}T00:00:00Z`)),
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      room: schedule.room,
      status: "pending",
      remaining_quota: remaining_before - 1,
    };
  });
}

/** Berapa pasien yang sudah terdaftar untuk satu dokter pada satu tanggal. */
export async function countTaken(db: Db, doctorId: string, visitDate: string): Promise<number> {
  const rows = await db
    .select({ taken: doctorVisitQuotas.taken })
    .from(doctorVisitQuotas)
    .where(
      and(eq(doctorVisitQuotas.doctorId, doctorId), eq(doctorVisitQuotas.visitDate, visitDate)),
    )
    .limit(1);

  return rows[0]?.taken ?? 0;
}

/**
 * Ambil satu baris pertama dari hasil SQL mentah.
 *
 * `execute` mengembalikan `RowList`, yang berupa larik biasa, jadi baris
 * pertama diambil langsung dengan indeks nol.
 */
function firstRow(result: unknown): Record<string, unknown> | undefined {
  return Array.isArray(result)
    ? (result[0] as Record<string, unknown> | undefined)
    : undefined;
}