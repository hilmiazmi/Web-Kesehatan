import type { IsiHalaman } from "./types";

/** Halaman "Survey Kepuasan Masyarakat". */
export const SKM: Record<string, IsiHalaman> = {
  "informasi-publik/skm": {
    ringkas: "Menilai pelayanan yang sudah diterima.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Survei diisi sendiri, tanpa nama.",
      },
      { jenis: "sub", teks: "Isi survei" },
      {
        jenis: "daftar",
        ikon: "bi-ui-checks",
        butir: [
          "Kenyamanan ruang tunggu.",
          "Keramahan petugas.",
          "Kecepatan pelayanan.",
          "Kesesuaian biaya dengan layanan.",
        ],
      },
      { jenis: "sub", teks: "Cara mengisi" },
      {
        jenis: "langkah",
        butir: [
          "Mengambil tautan survei di loket keluar.",
          "Mengisi survei lewat telepon.",
        ],
      },
      {
        jenis: "catatan",
        teks: "Hasil survei dipakai untuk memperbaiki pelayanan.",
      },
    ],
  },
};
