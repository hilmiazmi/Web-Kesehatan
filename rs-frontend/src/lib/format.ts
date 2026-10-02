/**
 * Pemformat yang dipakai di banyak halaman.
 *
 * Dipisah ke satu berkas supaya tidak diduplikasi di tiap route; kalau aturan
 * format berubah, cukup ubah di sini.
 */

/** Tanggal Indonesia, mis. "28 September 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Rupiah tanpa desimal, mis. "Rp1.150.000". */
export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Ringkas teks untuk meta description, maksimal 155 karakter. */
export function summarize(text: string, limit = 155): string {
  const clean = text.trim();
  return clean.length > limit ? `${clean.slice(0, limit - 3)}...` : clean;
}