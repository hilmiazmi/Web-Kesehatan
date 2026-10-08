/**
 * Nama jenis inbox yang tampil ke operator.
 *
 * Ada di satu berkas karena dua tempat memakainya: sidebar panel
 * `admin/(panel)/layout.tsx` dan judul halaman `admin/(panel)/inbox/[kind]`.
 * Semula masing-masing punya salinan sendiri, dan keduanya sudah pernah
 * menyimpang: `admissions` ada di sidebar tapi tidak di judul halaman, sehingga
 * halamannya menampilkan "Inbox admissions" dengan slug teknis.
 *
 * Nama tetap ditulis di sini, bukan diambil dari backend, karena backend hanya
 * menyimpan slug teknis. Apa yang tampil ke operator adalah urusan tampilan.
 */
const LABEL: Record<string, string> = {
  appointments: "Pendaftaran Pasien",
  admissions: "Permintaan Rawat Inap",
  "mcu-registrations": "Registrasi MCU",
  feedbacks: "Kritik dan Saran",
  "wbs-reports": "Laporan WBS",
  "survey-responses": "Respons Survei",
};

/**
 * Nama untuk ditampilkan, atau slug-nya kalau jenisnya belum punya label.
 *
 * `slug` dikembalikan apa adanya sebagai cadangan, bukan karena disengaja: page
 * inbox boleh dipanggil dengan slug yang dikenal backend, dan `generateMetadata`
 * membaca label lebih dulu, sebelum `notFound()` sempat menolak di badan halaman.
 */
export function inboxLabel(slug: string): string {
  return LABEL[slug] ?? slug;
}