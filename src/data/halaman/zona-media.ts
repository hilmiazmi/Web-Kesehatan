import { GALLERY_PHOTOS } from "@/data/images";
import type { IsiHalaman } from "./types";

/** Halaman "Video" dan "Foto Kegiatan" di bawah Zona Integritas. */
export const ZONA_MEDIA: Record<string, IsiHalaman> = {
  "zona-integritas/video": {
    ringkas: "Kumpulan video kegiatan rumah sakit.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Daftar video yang tersedia untuk dipublikasikan.",
      },
      { jenis: "sub", teks: "Daftar video" },
      {
        jenis: "daftar",
        ikon: "bi-play-btn",
        butir: [
          "Profil rumah sakit.",
          "Profil layanan prioritas.",
          "Kenali layanan kami lebih dekat.",
        ],
      },
    ],
  },

  "zona-integritas/foto-kegiatan": {
    ringkas: "Dokumentasi kegiatan dalam bentuk foto.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Foto kegiatan yang dipublikasikan.",
      },
      {
        jenis: "galeri",
        foto: GALLERY_PHOTOS.map((id) => ({
          src: id,
          alt: "Foto kegiatan di RSUD Contoh Sehat",
        })),
      },
    ],
  },
};
