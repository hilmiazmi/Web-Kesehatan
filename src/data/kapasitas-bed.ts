/**
 * Data kapasitas tempat tidur.
 *
 * ANGKA DI SINI FIKTIF. Hanya untuk mengisi tampilan, bukan data ketersediaan
 * nyata. Halaman `/kapasitas-bed` menyatakan hal itu di bawah tabelnya.
 *
 * Situs referensi memuat angka ini dari layanan terpisah yang berubah setiap
 * menit. Repo ini belum punya Route Handler untuk itu, jadi angkanya tetap di
 * dalam `src/data/`.
 */

export type RuangRawat = {
  /** Nama ruang, ditampilkan apa adanya di tabel. */
  nama: string;
  /** Kelas perawatan. */
  kelas: string;
  /** Jumlah tempat tidur. */
  total: number;
  /** Tempat tidur yang terisi. */
  terisi: number;
};

/** Delapan ruang rawat inap. */
export const RUANG_RAWAT: RuangRawat[] = [
  { nama: "Anggrek 1", kelas: "Anggrek", total: 24, terisi: 17 },
  { nama: "Anggrek 2", kelas: "Anggrek", total: 24, terisi: 19 },
  { nama: "Cendana", kelas: "Cendana", total: 18, terisi: 11 },
  { nama: "Damar", kelas: "Damar", total: 18, terisi: 14 },
  { nama: "ICU Dewasa", kelas: "Perawatan Intensif", total: 8, terisi: 6 },
  { nama: "NICU", kelas: "Perawatan Intensif", total: 10, terisi: 7 },
  { nama: "Isolasi Dewasa", kelas: "Isolasi", total: 12, terisi: 4 },
  { nama: "Isolasi Anak", kelas: "Isolasi", total: 8, terisi: 3 },
];

/** Jumlah tempat tidur yang tersedia di seluruh ruang. */
export function bedTersedia(): number {
  return RUANG_RAWAT.reduce((n, r) => n + (r.total - r.terisi), 0);
}

/** Jumlah tempat tidur seluruhnya. */
export function bedTotal(): number {
  return RUANG_RAWAT.reduce((n, r) => n + r.total, 0);
}

/** Jumlah tempat tidur yang sedang terisi. */
export function bedTerisi(): number {
  return RUANG_RAWAT.reduce((n, r) => n + r.terisi, 0);
}
