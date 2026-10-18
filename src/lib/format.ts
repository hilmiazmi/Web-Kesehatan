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

/**
 * Bersihkan tag HTML menjadi teks polos untuk pembaca layar atau text-to-speech.
 * Tag blok (seperti p, div, li) dipisahkan oleh spasi, sedangkan tag sebaris
 * (seperti strong, em, span) dibuang tanpa menyisipkan spasi berlebih sebelum tanda baca.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
