import { FACILITIES } from "@/data/home";
import type { IsiHalaman } from "./types";

/** Halaman induk "Informasi Publik" dan halaman "Fasilitas". */
export const INFORMASI_INDUK: Record<string, IsiHalaman> = {
  "informasi-publik": {
    ringkas:
      "Informasi terbuka untuk umum, dari fasilitas sampai lowongan kerja.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Semua halaman di bawah ini terbuka tanpa perlu login.",
      },
      { jenis: "tautan-anak", judul: "Semua informasi publik" },
    ],
  },

  "informasi-publik/fasilitas": {
    ringkas:
      "Delapan unit dan fasilitas pendukung yang tersedia di rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Fasilitas dibagi menurut cara pasien memakainya, supaya mudah dicari saat dibutuhkan.",
      },
      {
        jenis: "daftar",
        ikon: "bi-building",
        butir: FACILITIES.map((f) => `${f.title}. ${f.description}`),
      },
      { jenis: "tautan-anak" },
    ],
  },
};
