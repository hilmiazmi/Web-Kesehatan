/**
 * Membangun tautan ke halaman pendaftaran.
 *
 * Halaman layanan, klinik, dan widget beranda semuanya punya tombol
 * "Daftar Online" yang menuju `/daftar-online`. Kalau tautannya polos, orang
 * yang datang dari halaman Poliklinik Anak harus memilih ulang spesialitas
 *padahal sudah jelas sedang melihat layanan anak.
 *
 * Karena itu konteks dibawa lewat query string, bukan disimpan di state:
 * query string bertahan saat halaman di-bookmark, dibagikan lewat WhatsApp,
 * dan dibuka ulang setelah menekan tombol kembali di peramban.
 *
 * Kunci query memakai NAMA spesialitas, bukan slug. Nama yang muncul di
 * `GET /api/v1/doctors` sudah persis sama dengan yang dipakai klinik di
 * `src/data/clinics.ts`, jadi tidak perlu kamus tambahan untuk mengubah slug
 * menjadi nama. Kalau ternyata tidak ada dokter dengan nama itu, formulir
 * mengabaikannya dan menampilkan seluruh daftar.
 */

/** Nama spesialitas yang paling sering dibutuhkan. */
const UMUM = "Penyakit Dalam";

/**
 * Halaman layanan ke nama spesialitas yang paling relevan.
 *
 * Kunci ditulis sebagai path tanpa garis miring depan dan tanpa query,
 * jadi hasilnya bisa dipakai sebagai kunci `Record`.
 */
const PETA: Record<string, string> = {
  // Enam layanan prioritas.
  "pelayanan/prioritas/jantung-terpadu": "Jantung dan Pembuluh Darah",
  "pelayanan/prioritas/kanker-terpadu": "Tumor dan Kanker",
  "pelayanan/prioritas/stroke-terpadu": "Saraf dan Otak",
  "pelayanan/prioritas/uro-nefrologi": "Hemodialisa",
  "pelayanan/prioritas/maternal-center": "Kebidanan dan Kandungan",
  "pelayanan/prioritas/medical-check-up": UMUM,

  // Laboratorium paling sering dipakai dokter penyakit dalam, karena
  //hampir semua rujukan pemeriksaan darah berasal dari sana.
  "pelayanan/diagnostik/laboratorium": UMUM,
  "pelayanan/diagnostik/radiologi": UMUM,

  // Poliklinik dan paket MCU tidak punya satu spesialitas tunggal; yang paling
  // sering membutuhkan pendaftaran adalah dokter umum, jadi pakai `UMUM`.
  "pelayanan": UMUM,
  "pelayanan/medis": UMUM,
  "pelayanan/mcu": UMUM,
};

/**
 * Nama spesialitas yang cocok untuk sebuah path, atau `null` kalau tidak ada
 * petunjuk.
 *
 * `null` berarti tombolnya tetap menuju `/daftar-online` polos. Itu pilihan
 * yang lebih aman daripada menebak: formulir lebih baik menampilkan semua
 * dokter daripada otomatis membatasi ke satu spesialitas yang mungkin salah.
 */
export function spesialitasUntuk(pathname: string): string | null {
  const bersih = pathname.replace(/^\//, "").replace(/\/$/, "");
  if (PETA[bersih]) return PETA[bersih];

  // Halaman paket MCU berada dua sampai tiga segmen di bawah `/pelayanan/mcu`.
  if (bersih.startsWith("pelayanan/mcu/")) return UMUM;

  return null;
}

/**
 * Tautan "Daftar Online" yang membawa konteks页面 asal.
 *
 * `dokter` dan `tanggal` dipakai widget beranda yang sudah memilih
 * dokter dan hari. Halaman layanan hanya membawa spesialitas, karena satu
 * halaman layanan bisa dilayani lebih dari satu dokter.
 */
export function hrefDaftarOnline(
  pathname?: string,
  pilihan: { dokter?: string; tanggal?: string } = {},
): string {
  const p = new URLSearchParams();
  const spesialitas = pathname ? spesialitasUntuk(pathname) : null;
  if (spesialitas) p.set("spesialis", spesialitas);
  if (pilihan.dokter) p.set("dokter", pilihan.dokter);
  if (pilihan.tanggal) p.set("tanggal", pilihan.tanggal);
  const qs = p.toString();
  return qs ? `/daftar-online?${qs}` : "/daftar-online";
}

/** Kunci ini dibaca formulir untuk menandai bahwa pilihan datang dari query. */
export const KUNCI_QUERY = ["spesialis", "dokter", "tanggal"] as const;
