/**
 * Aturan validasi yang dipakai bersama sisi klien dan sisi server.
 *
 * Berkas ini sengaja di `src/lib/`, bukan di `src/server/validation.ts`.
 * Modul server itu mengimpor `config` dan `ApiError`, dan kalau ia diimpor
 * dari komponen klien, keduanya ikut terbawa ke bundel peramban. Isinya tidak
 * berbahaya, tapi bundelnya ikut besar dan konfigurasi lingkungan ikut bisa
 * terbaca dari klien.
 *
 * Aturan surel dulu ditulis ulang di setiap formulir, masing-masing dengan
 * polanya sendiri, dan itu sumber kelas bug yang tidak terlihat dari mata:
 * formulir menerima surel berbentuk `budi..@contoh.test`, tombol kirim percaya
 * diri, lalu ditolak server dengan galat yang hanya muncul setelah menunggu.
 *
 * Aturan telepon sengaja tetap dua, dan itu bukan kelalaian. Sisi klien boleh
 * lebih ketat daripada server, dan itu arah yang aman: tidak ada isian yang
 * diterima formulir lalu ditolak server. Sebaliknya berbahaya — formulir yang
 * lebih longgar dari server menghasilkan tolakan yang baru diketahui setelah
 * menunggu. Yang penting keduanya berbagi cara membaca isian, karena salah
 * membersihkan spasi adalah cara lain agar nomor yang sama terlihat berbeda
 * di dua sisi.
 */

/** Panjang maksimum alamat surel, sama dengan batas yang dipakai server. */
export const SUREL_MAKS = 255;

/** Panjang maksimum bagian lokal, sebelum tanda `@`. */
const LOKAL_MAKS = 64;

/** Panjang maksimum setiap label domain. */
const LABEL_MAKS = 63;

/**
 * Bagian lokal alamat surel sebelah `@`.
 *
 * Himpun karakternya mengikuti RFC 5322 `atext`, plus aturan titik: setiap
 * segmen harus berisi setidaknya satu karakter, dan pemisahnya satu titik.
 * Aturan titik itu yang membuat `budi..@contoh.test`, `.budi@`, dan `budi.@`
 * ditolak tanpa perlu diperiksa satu per satu.
 */
const LOKAL_SURAT =
  /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/;

/** Label domain: diawali dan diakhiri huruf atau angka, tanda hubung hanya di tengah. */
const LABEL_DOMAIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

/**
 * Bentuk nomor Indonesia: `08...`, `62...`, atau `+62...`, diikuti 8 sampai 13
 * digit. Ini aturan sisi formulir.
 */
const TELEPON_FORM = /^(\+62|62|0)\d{8,13}$/;

/**
 * Bentuk nomor sisi server: sembarang 9 sampai 15 digit.
 *
 * Longgarnya salah, dan itu disengaja. Nomor yang sudah tersimpan dengan bentuk
 * keliru sebaiknya tetap bisa dibaca daripada tertolak kembali setiap kali data
 * lama direkap. Yang menjaga angka tetap masuk akal adalah klien, bukan ini.
 */
const TELEPON_SERVER = /^\d{9,15}$/;

/**
 * Buang spasi, tanda hubung, dan tanda kurung dari nomor telepon.
 *
 * Tanda `+` sengaja TIDAK dibuang: itu penanda kode negara, bukan hiasan.
 * Membuangnya membuat `+6281234567890` dan `6281234567890` terlihat sama,
 * padahal yang pertama menegaskan nomor itu berformat internasional.
 *
 * Dipakai dua sisi supaya nomor `0812 3456 7890` dan `081234567890` tidak
 * pernah salah dibanding sebagai nomor yang berbeda.
 */
export function teleponBersih(nilai: string): string {
  // Tanda `+` ikut dibuang. Alasannya bukan kerapian: `TELEPON_FORM` menerima
  // awalan `+62`, sedangkan `TELEPON_SERVER` hanya menerima angka. Kalau `+`
  // tidak dibuang di sini, nomor `+628...` lolos validasi formulir lalu ditolak
  // validasi server, dan pengunjung mendapat penolakan untuk nomor yang bentuk
  // sendiri justru diajakkan oleh sisi klien.
  return nilai.replace(/[ ()+-]/g, "");
}

/** Apakah teks ini nomor telepon yang sah menurut aturan sisi formulir. */
export function teleponFormValid(nilai: string): boolean {
  return TELEPON_FORM.test(nilai.replace(/[\s-]/g, ""));
}

/**
 * Apakah teks ini nomor telepon yang sah menurut aturan sisi server.
 *
 * Tanda `+` dibuang di sini, bukan di `teleponBersih`, karena `+62...` dan
 * `62...` merujuk nomor yang sama dan keduanya harus lolos.
 */
export function teleponServerValid(nilai: string): boolean {
  return TELEPON_SERVER.test(teleponBersih(nilai).replace(/^\+/, ""));
}

/** Apakah teks ini alamat surel yang bentuknya benar. */
export function surelValid(nilai: string): boolean {
  if (/\s/.test(nilai)) return false;
  if (nilai.length > SUREL_MAKS) return false;

  // Satu `@` saja. Dua tanda `@` tidak pernah sah, dan kalau hanya yang
  // pertama diperiksa, `dua@@at.com` lolos karena domainnya `@at.com` tetap
  // mengandung titik.
  const bagian = nilai.split("@");
  if (bagian.length !== 2) return false;

  const lokal = bagian[0];
  const domain = bagian[1];
  if (lokal.length === 0 || lokal.length > LOKAL_MAKS) return false;

  // Satu regex menggantikan tiga pemeriksaan ad-hoc di bawah. Ketiganya hanya
  // mencari titik di posisi salah: titik ganda, titik di awal, titik di akhir.
  // Hasilnya segmen kosong di salah satu ujung atau di tengah, dan itu bentuk
  // yang tidak pernah sah. Regex memeriksanya sekali jalan sekaligus menolak
  // karakter di luar himpunan yang boleh, jadi pemeriksaan per kasus tidak perlu
  // ditambah satu per satu setiap kali ada penemuan baru.
  if (!LOKAL_SURAT.test(lokal)) return false;

  if (domain.length > SUREL_MAKS) return false;

  // Domain tanpa titik tidak pernah sah: tidak ada TLD bernama satu kata.
  // Server dulu menerimanya karena hanya memeriksa tiap label, bukan jumlah
  // titiknya, dan itu berarti `budi@contoh` sampai ke database sebagai alamat
  // yang pasti gagal dikirimi surel.
  if (!domain.includes(".")) return false;

  // Setiap label dipisah titik, tidak boleh kosong, tidak boleh lebih panjang
  // dari batas, dan tidak boleh diawali atau diakhiri tanda hubung.
  return domain
    .split(".")
    .every(
      (bagi) => bagi.length > 0 && bagi.length <= LABEL_MAKS && LABEL_DOMAIN.test(bagi),
    );
}