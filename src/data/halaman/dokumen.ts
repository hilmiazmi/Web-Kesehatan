import type { IsiHalaman } from "./types";

/** Halaman di bawah menu "Dokumen". */
export const DOKUMEN: Record<string, IsiHalaman> = {
  "dokumen/regulasi-zi": {
    ringkas: "Dasar hukum pelaksanaan zona integritas.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Dasar hukum di bawah ini adalah peraturan nasional.",
      },
      { jenis: "sub", teks: "Peraturan yang berlaku" },
      {
        jenis: "daftar",
        ikon: "bi-journal-text",
        butir: [
          "Undang-Undang Nomor 31 Tahun 1999.",
          "Undang-Undang Nomor 30 Tahun 2002.",
          "Instruksi Presiden Nomor 2 Tahun 2014.",
          "Peraturan Pemerintah Nomor 60 Tahun 2008.",
          "Permen PAN RB Nomor 90 Tahun 2021.",
        ],
      },
      {
        jenis: "catatan",
        teks: "Peraturan milik pemerintah daerah tidak dicantumkan.",
      },
    ],
  },

  "dokumen/standar-pelayanan": {
    ringkas: "Standar pelayanan yang dipakai sebagai pegangan.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Standar ini disusun dari ketentuan yang berlaku.",
      },
      { jenis: "sub", teks: "Bidang standar" },
      {
        jenis: "daftar",
        ikon: "bi-clipboard2-check",
        butir: [
          "Standar pelayanan rawat inap.",
          "Standar pelayanan rawat jalan.",
          "Standar pelayanan gawat darurat.",
          "Standar pelayanan penunjang.",
        ],
      },
    ],
  },

  "dokumen/kompensasi-pelayanan": {
    ringkas: "Bentuk ganti rugi bila pelayanan tidak sesuai standar.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Kompensasi diberikan setelah pengaduan diperiksa.",
      },
      { jenis: "sub", teks: "Bentuk kompensasi" },
      {
        jenis: "daftar",
        ikon: "bi-arrow-repeat",
        butir: [
          "Gratis untuk pemeriksaan ulang.",
          "Perbaikan hasil tindakan yang bermasalah.",
          "Referensi ke fasilitas lain bila perlu.",
        ],
      },
    ],
  },
};
