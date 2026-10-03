import type { Poliklinik } from "@/data/poliklinik";

/**
 * Pembantu untuk halaman daftar poliklinik.
 *
 * Dipisah dari komponen supaya bisa diuji tanpa merender (lihat
 * tests/poliklinik.test.ts). Berkas ini sengaja TIDAK mengimpor data konten
 * Home, supaya tidak ikut terbundel ke client component.
 */

/** Poliklinik beserta jumlah dokternya, siap ditampilkan. */
export type PoliklinikItem = Poliklinik & { doctorCount: number };

/** Jumlah dokter untuk satu spesialisasi; 0 kalau belum ada datanya. */
export function countDoctors(
  specialty: string,
  doctorsBySpecialty: Record<string, string[]>
): number {
  return doctorsBySpecialty[specialty]?.length ?? 0;
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
