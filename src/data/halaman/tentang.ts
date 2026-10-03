import type { IsiHalaman } from "./types";

/**
 * Halaman "Tentang Kami".
 *
 * Halaman induk, jadi daftar subhalamannya diambil dari pohon navigasi lewat
 * blok `tautan-anak`, bukan ditulis manual. Kalau subhalaman dipindah, tautan
 * di sini ikut benar tanpa perlu disentuh.
 */
export const TENTANG: Record<string, IsiHalaman> = {
  "tentang-kami": {
    ringkas:
      "Rumah sakit pemerintah daerah kelas B, melayani rawat inap dan rawat jalan dalam satu lokasi.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "RSUD Contoh Sehat berdiri supaya warga di satu wilayah tidak perlu jauh untuk mendapat layanan dasar maupun rujukan.",
      },
      {
        jenis: "paragraf",
        teks:
          "Poliklinik spesialis, gawat darurat, ruang inap, laboratorium, radiologi, dan instalasi rehabilitasi berada dalam satu gedung.",
      },
      {
        jenis: "paragraf",
        teks:
          "Karena itu pemeriksaan penunjang tidak menuntut pasien pindah ke tempat lain.",
      },
      { jenis: "sub", teks: "Dua jalur pelayanan" },
      {
        jenis: "daftar",
        ikon: "bi-door-open",
        judul: "Rawat jalan",
        butir: [
          "Kunjungan sekali datang, mulai dari poliklinik sampai pemeriksaan kesehatan kerja.",
          "Poliklinik spesialis dibuka Senin sampai Jumat, pukul 07.30 sampai 14.00.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-hospital",
        judul: "Rawat inap",
        butir: [
          "Untuk pasien yang perlu tinggal lebih dari dua hari.",
          "Kelas perawatan dari perawatan intensif sampai perawatan biasa.",
        ],
      },
      { jenis: "sub", teks: "Prinsip kerja" },
      {
        jenis: "daftar",
        ikon: "bi-check2-circle",
        butir: [
          "Prioritas ditentukan oleh kebutuhan medis, bukan oleh urutan datang.",
          "Tindakan invasif dijelaskan lebih dulu, termasuk risiko dan alternatifnya.",
          "Perkiraan biaya diberikan secara tertulis sebelum tindakan dimulai.",
          "Data pasien hanya dipakai untuk keperluan pelayanan.",
        ],
      },
      { jenis: "sub", teks: "Halaman di bagian ini" },
      { jenis: "tautan-anak" },
    ],
  },
};