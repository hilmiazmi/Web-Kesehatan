import type { Day, Doctor, DoctorSchedule } from "@/data/doctors";
import type { ClinicDetail } from "@/data/clinics";

/**
 * Pembantu untuk data dokter pada halaman detail klinik.
 *
 * Dipisah dari komponen supaya bisa diuji tanpa merender (lihat
 * tests/poliklinik.test.ts). Semua fungsi menerima data lewat argumen, jadi
 * berkas ini tidak ikut membundel data ke client component.
 */

export const DAY_ORDER: Day[] = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

/** Dokter yang praktik di satu spesialisasi. */
export function doctorsForSpecialty(
  specialty: string,
  doctors: Doctor[]
): Doctor[] {
  return doctors.filter((d) => d.specialty === specialty);
}

/** Jumlah dokter untuk satu spesialisasi; 0 kalau belum ada datanya. */
export function countDoctors(specialty: string, doctors: Doctor[]): number {
  return doctorsForSpecialty(specialty, doctors).length;
}

/**
 * Dokter untuk satu halaman detail klinik.
 *
 * Keterkaitan diambil dari `specialty` opsional pada data detail, bukan dari
 * tabel pemetaan terpisah. Kalau klinik tidak menandai spesialisasinya, klinik
 * itu tetap punya halaman detailnya, hanya tidak menampilkan daftar dokter.
 */
export function doctorsForClinic(
  detail: Pick<ClinicDetail, "specialty">,
  doctors: Doctor[]
): Doctor[] {
  return detail.specialty ? doctorsForSpecialty(detail.specialty, doctors) : [];
}

/** Urutkan jadwal Senin sampai Jumat tanpa mengubah array asli. */
export function sortSchedule(schedule: DoctorSchedule[]): DoctorSchedule[] {
  return [...schedule].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
}