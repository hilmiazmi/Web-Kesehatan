import type { IsiHalaman } from "./types";

/** Halaman "Budaya Keselamatan". */
export const BUDAYA_KESELAMATAN: Record<string, IsiHalaman> = {
  "informasi-publik/budaya-keselamatan": {
    ringkas: "Sikap yang dipakai setiap petugas, setiap hari.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Keselamatan pasien tidak bergantung pada satu orang.",
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
        ].slice(0, 3),
      },
    ],
  },
};
