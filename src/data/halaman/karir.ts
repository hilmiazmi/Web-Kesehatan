import type { IsiHalaman } from "./types";

/** Halaman "Karir" di bawah Informasi Publik. */
export const KARIR: Record<string, IsiHalaman> = {
  "informasi-publik/karir": {
    ringkas: "Lowongan pekerjaan dan program magang.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Pendaftaran pekerjaan dibuka bila ada kebutuhan.",
      },
      { jenis: "sub", teks: "Posisi yang biasa dibuka" },
      {
        jenis: "daftar",
        ikon: "bi-briefcase",
        butir: [
          "Dokter spesialis.",
          "Dokter umum.",
          "Perawat.",
          "Bidan.",
          "Tenaga analis laboratorium.",
          "Tenaga radiografer.",
        ],
      },
      { jenis: "sub", teks: "Syarat umum" },
      {
        jenis: "daftar",
        ikon: "bi-check2",
        butir: [
          "Ijazah sesuai jenjang pendidikan yang diminta.",
          "Surat keterangan sehat dan surat keterangan pengalaman kerja.",
        ],
      },
    ],
  },
};
