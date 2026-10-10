/**
 * Pembuat CSV untuk ekspor dari panel admin.
 *
 * Sengaja fungsi murni tanpa DOM supaya aturutannya bisa diuji tanpa merender
 * komponen, mengikuti pola `format.ts` dan `nav-path.ts`.
 */

/**
 * Ubah baris tabel menjadi teks CSV.
 *
 * Bentuk keluaran mengikuti RFC 4180: pemisah koma, baris diakhiri CRLF, dan
 * nilai yang memuat koma, tanda kutip, atau baris baru dibungkus tanda kutip
 * dengan tanda kutip di dalamnya digandakan.
 *
 * Dua hal yang mudah terlewat dan sengaja dikerjakan di sini:
 *
 * 1. **BOM (`\uFEFF`) di awal berkas.** Tanpa itu Excel di Windows membaca CSV
 *    UTF-8 memakai halaman kode lokal, dan setiap nama beraksen serta tanda
 *    baca Indonesia keluar sebagai karakter rusak. BOM adalah satu-satunya cara
 *    menyebutkan encoding tanpa mengubah format berkasnya.
 * 2. **Formula injection.** Nilai yang diawali `=`, `+`, `-`, atau `@`
 *    dieksekusi Excel sebagai rumus, bukan dibaca sebagai teks. Isi formulir
 *    publik masuk ke inbox tanpa disaring dari sisi ini, jadi satu pengiriman
 *    bernama `=SHELL(...)` akan menjadi rumus ketika berkas dibuka. Awalan
 *    tanda kutip tunggal membuat Excel memperlakukan seluruh sel sebagai teks.
 *    Ini bukan teori: kelas serangan ini punya nama (CSV injection) dan paling
 *    sering ditemukan justru di tombol "ekspor" panel admin.
 */
export function keCsv(
  kolom: readonly string[],
  baris: readonly Record<string, unknown>[],
  judul: Record<string, string> = {},
): string {
  const kepala = kolom.map((k) => sel(judul[k] ?? k));
  const isi = baris.map((b) => kolom.map((k) => sel(b[k])).join(","));

  // Baris terakhir tetap ditutup CRLF supaya baris data terakhir tidak ikut
  // tergabung dengan baris berikutnya kalau berkasnya dirakit ulang.
  return `\uFEFF${[kepala, ...isi].join("\r\n")}\r\n`;
}

/** Satu nilai sel, sudah dibungkus tanda kutip kalau perlu. */
function sel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";

  // Objek (termasuk array) tidak punya bentuk tabular yang jelas. Disimpan
  // sebagai JSON supaya tidak berubah menjadi "[object Object]" yang tidak
  // bisa dibaca manusia maupun mesin.
  const teks = typeof nilai === "object" ? JSON.stringify(nilai) : String(nilai);

  // Formula injection: awalan `=`, `+`, `-`, `@`, TAB, atau CR dieksekusi Excel
  // sebagai rumus. Satu tanda kutip tunggal di depan membuat seluruh sel tetap
  // dibaca sebagai teks. `aman` dipakai tiga kali di bawah, jadi dihitung sekali.
  const aman = teks.replace(/^([=+\-@\t\r])/, "'$1");

  if (/[",\r\n]/.test(aman)) {
    return `"${aman.replace(/"/g, '""')}"`;
  }

  return aman;
}

/**
 * Nama berkas ekspor, dengan tanggal supaya ekspor berulang tidak saling
 * menimpa di folder Unduhan.
 */
export function namaBerkasCsv(awalan: string, sekarang: Date = new Date()): string {
  const tanggal = sekarang.toISOString().slice(0, 10);
  return `${awalan}-${tanggal}.csv`;
}
