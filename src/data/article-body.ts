/**
 * Isi artikel untuk halaman detail berita.
 *
 * Data berita di `src/data/home.ts` hanya berisi judul, tanggal, dan ringkasan
 * karena itulah yang tampil di kartu. Untuk halaman detail, paragrafnya
 * disusun dari ringkasan tersebut plus konteks umum, supaya tidak menulis
 * 16 x 4 paragraf secara manual dan tetap konsisten antarartikel.
 *
 * Ringkasan untuk meta description memakai `summarize()` dari
 * `@/lib/format`, bukan fungsi sendiri.
 *
 * Semua teks di sini karangan sendiri. Tidak ada kutipan dari sumber mana pun.
 */

/** Paragraf penutup yang sama untuk semua artikel. */
const CLOSING: string[] = [
  "Informasi ini dapat berubah sewaktu-waktu. Untuk keterangan terbaru, silakan menghubungi loket informasi rumah sakit atau datang langsung ke instalasi terkait.",
  "Bagi warga yang ingin melakukan pendaftaran, dapat memakai kanal resmi rumah sakit atau datang ke loket pendaftaran pada jam kerja. Bawa dokumen identitas dan surat rujukan bila diperlukan.",
];

export function articleBody(title: string, excerpt: string): string[] {
  return [
    excerpt,
    "Kegiatan terkait \"" + title + "\" merupakan bagian dari upaya rumah sakit dalam meningkatkan mutu pelayanan bagi masyarakat. Setiap tahapannya mengikuti standar prosedur yang berlaku agar hasilnya konsisten dan dapat dipertanggungjawabkan.",
    "Sebelum kegiatan dimulai, tim sudah menyiapkan segala hal dari sisi SDM maupun sarana prasarana. Satu hal yang menjadi penekanan adalah waktu tunggu pasien diminimalkan.",
    CLOSING[0],
    CLOSING[1],
  ];
}
