import type { IsiHalaman } from "./types";

/** Halaman "Budaya Keselamatan". */
export const BUDAYA_KESELAMATAN: Record<string, IsiHalaman> = {
  "informasi-publik/budaya-keselamatan": {
    ringkas: "Sikap yang dipakai setiap petugas, setiap hari.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Keselamatan pasien tidak bergantung pada satu orang. Ia dijaga oleh kebiasaan kecil yang dilakukan berulang oleh seluruh petugas, dari dokter sampai pramuhusada.",
      },
      { jenis: "sub", teks: "Lima sikap dasar" },
      {
        jenis: "daftar",
        ikon: "bi-shield-check",
        butir: [
          "Sebut nama pasien sebelum memulai tindakan.",
          "Tanyakan ulang identitas dan tujuan tindakan.",
          "Cuci tangan sebelum dan sesudah kontak dengan pasien.",
          "Periksa ulang obat sebelum pemberian.",
          "Catat setiap perubahan kondisi yang diamati.",
        ],
      },
      { jenis: "sub", teks: "Melapor tanpa takut" },
      {
        jenis: "paragraf",
        teks:
          "Petugas yang melihat kejadian nyaris celaka wajib melaporkannya, dan laporan itu tidak dipakai untuk menghukum pelapor. Tanpa laporan, celaka yang sama akan terulang pada pasien berikutnya.",
      },
      {
        jenis: "catatan",
        teks:
          "Pasien dan keluarga ikut menjaga keselamatan: tanyakan nama obat yang diberikan, pastikan identitas diperiksa sebelum tindakan, dan sampaikan alergi yang dimiliki.",
      },
    ],
  },
};
