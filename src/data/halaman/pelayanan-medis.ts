import type { IsiHalaman } from "./types";

/** Halaman induk "Layanan Diagnostik" dan "Layanan Medis". */
export const PELAYANAN_MEDIS: Record<string, IsiHalaman> = {
  "pelayanan/diagnostik": {
    ringkas:
      "Pemeriksaan penunjang yang dipakai dokter memastikan diagnosis tidak hanya ditegakkan dari perkiraan.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Diagnosis memerlukan data, bukan perkiraan. Dua unit penunjang di rumah sakit ini adalah laboratorium dan radiologi.",
      },
      {
        jenis: "daftar",
        ikon: "bi-droplet",
        butir: [
          "Laboratorium, untuk pemeriksaan darah, urine, dan bahan tubuh lainnya.",
          "Radiologi, untuk foto, tomografi, dan ultrasonografi.",
        ],
      },
      { jenis: "tautan-anak" },
    ],
  },

  "pelayanan/medis": {
    ringkas:
      "Empat unit pelayanan medis, dari gawat darurat sampai ruang inap khusus.",
    blok: [
      {
        jenis: "daftar",
        ikon: "bi-activity",
        judul: "Instalasi Gawat Darurat",
        butir: [
          "Buka 24 jam, termasuk malam hari dan hari libur.",
          "Menangani kondisi yang tidak boleh ditunda.",
          "Dikerjakan oleh dokter spesialis yang sedang bertugas.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-door-open",
        judul: "Rawat Jalan",
        butir: [
          "Poliklinik spesialis buka Senin sampai Jumat, pukul 07.30 sampai 14.00.",
          "Pendaftaran langsung di loket atau lewat Daftar Online.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-hospital",
        judul: "Rawat Inap",
        butir: [
          "Untuk pasien yang perlu tinggal lebih dari dua hari.",
          "Kelas perawatan dari perawatan intensif sampai perawatan biasa.",
          "Kapasitas tidur dapat dilihat di halaman Kapasitas Bed.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-heart-pulse",
        judul: "Rawat Inap Khusus",
        butir: [
          "Kamar dengan isolasi untuk pasien yang perlu dipisahkan.",
          "Kamar dengan monitor khusus untuk pasien yang butuh pemantauan terus-menerus.",
        ],
      },
      { jenis: "tautan-anak" },
    ],
  },
};
