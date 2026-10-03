import { CONTACT } from "@/data/navigation";
import type { IsiHalaman } from "./types";

/** Halaman induk "Zona Integritas" dan sistem pelaporan WBS. */
export const ZONA: Record<string, IsiHalaman> = {
  "zona-integritas": {
    ringkas: "Komitmen pelayanan yang bebas kepentingan pribadi.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Zona integritas adalah janji kerja yang bisa diuji.",
      },
      { jenis: "sub", teks: "Prinsip yang dijalankan" },
      {
        jenis: "daftar",
        ikon: "bi-shield-check",
        butir: [
          "Keputusan tidak dipengaruhi hubungan pribadi.",
          "Pemberian pelayanan tidak berdasarkan kepentingan pribadi.",
          "Penggunaan aset dipakai untuk kepentingan pelayanan.",
          "Data pasien tidak dibuka di luar kewajiban.",
        ],
      },
      { jenis: "tautan-anak", judul: "Halaman di bagian ini" },
    ],
  },

  "zona-integritas/wbs": {
    ringkas: "Cara melaporkan dugaan pelanggaran.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Nama pelapor tidak perlu dipublikasikan.",
      },
      { jenis: "sub", teks: "Alur pelaporan" },
      {
        jenis: "langkah",
        butir: [
          "Mengirim laporan lewat kanal resmi.",
          "Menyertakan kronologi dan bukti yang dimiliki.",
          "Menunggu hasil pemeriksaan oleh tim.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Kanal pelaporan",
        kolom: ["Kanal", "Keterangan"],
        baris: [
          ["Telepon", CONTACT.phone],
          ["Surel", CONTACT.email],
        ],
      },
    ],
  },
};
