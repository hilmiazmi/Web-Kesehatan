import type { Poliklinik } from "@/data/poliklinik";
import type { Day, Doctor, DoctorSchedule } from "@/data/doctors";

/**
 * Pembantu untuk halaman poliklinik (daftar dan detail).
 *
 * Dipisah dari komponen supaya bisa diuji tanpa merender (lihat
 * tests/poliklinik.test.ts). Semua fungsi menerima data lewat argumen, jadi
 * berkas ini tidak ikut membundel data ke client component.
 */

/** Poliklinik beserta jumlah dokternya, siap ditampilkan. */
export type PoliklinikItem = Poliklinik & { doctorCount: number };

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

/** Cari poliklinik berdasarkan slug; undefined kalau tidak ada. */
export function findPoliklinik<T extends Poliklinik>(
  items: T[],
  slug: string
): T | undefined {
  return items.find((p) => p.slug === slug);
}

/** Urutkan jadwal Senin sampai Jumat tanpa mengubah array asli. */
export function sortSchedule(schedule: DoctorSchedule[]): DoctorSchedule[] {
  return [...schedule].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );
}

/**
 * Saring poliklinik berdasarkan kata kunci.
 *
 * Mencocokkan nama, deskripsi, lokasi, dan spesialisasi tanpa membedakan
 * huruf besar/kecil. Kata kunci kosong mengembalikan semuanya.
 */
export function filterPoliklinik<T extends Poliklinik>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((p) =>
    [p.name, p.description, p.location, p.specialty].some((field) =>
      field.toLowerCase().includes(q)
    )
  );
}
