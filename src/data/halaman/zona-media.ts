import { GALLERY_PHOTOS, photo } from "@/data/images";
import type { IsiHalaman } from "./types";

/** Halaman "Video" dan "Foto Kegiatan" di bawah Zona Integritas. */
export const ZONA_MEDIA: Record<string, IsiHalaman> = {
  "zona-integritas/video": {
    ringkas: "Kumpulan video kegiatan rumah sakit.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Daftar video yang tersedia untuk dipublikasikan. Video dibuat oleh tim humas dan boleh disebar untuk keperluan edukasi.",
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
        teks:
          "Foto kegiatan yang dipublikasikan. Seluruh foto memakai aset stok karena dokumentasi internal tidak diterbitkan di situs demo ini.",
      },
      {
        jenis: "galeri",
        foto: GALLERY_PHOTOS.map((id) => ({
          src: photo(id, 1200, 800),
          alt: "Foto kegiatan di RSUD Contoh Sehat",
        })),
      },
    ],
  },
};
