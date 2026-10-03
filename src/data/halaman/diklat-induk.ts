import type { IsiHalaman } from "./types";

/** Halaman induk "Diklat". */
export const DIKLAT_INDUK: Record<string, IsiHalaman> = {
  diklat: {
    ringkas:
      "Pendidikan, penelitian, dan pembandingingan layanan bagi pihak luar.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Tiga bentuk kegiatan ini terbuka bagi mahasiswa, peneliti, dan instansi lain.",
      },
      {
        jenis: "daftar",
        ikon: "bi-mortarboard",
        butir: [
          "Pendidikan klinik untuk mahasiswa dan residen.",
          "Izin penelitian bagi peneliti dan institusi pendidikan.",
          "Kaji banding terhadap rumah sakit lain.",
        ],
      },
      { jenis: "tautan-anak", judul: "Halaman di bagian ini" },
    ],
  },
};
