/**
 * Ubah nilai waktu dari driver PostgreSQL menjadi ISO 8601 dengan `Z`.
 *
 * Dipakai di semua respons publik karena bentuk bawaan driver adalah objek
 * `Date`, sedangkan bentuk dari driver lain adalah teks PostgreSQL. Tanpa
 * penyamaan ini, satu perubahan driver akan diam-diam mengubah format tanggal
 * di seluruh API dan merusak `new Date(...)` di sisi klien.
 */
export function iso(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
