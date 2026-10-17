import type { IsiHalaman } from "./types";

/** Halaman di bawah menu "Dokumen". */
export const DOKUMEN: Record<string, IsiHalaman> = {
  "dokumen/regulasi-zi": {
    ringkas: "Dasar hukum pelaksanaan zona integritas.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Dasar hukum di bawah ini adalah peraturan nasional. Seluruhnya tersedia untuk umum dan menjadi acuan pembangunan zona integritas di rumah sakit ini.",
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
        teks:
          "Standar ini disusun dari ketentuan yang berlaku. Ia menjadi pegangan petugas sekaligus janji yang bisa ditagih pasien bila pelayanan menyimpang.",
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
      { jenis: "sub", teks: "Cara membaca standar" },
      {
        jenis: "langkah",
        butir: [
          "Cari bidang layanan yang dipakai, misalnya rawat jalan.",
          "Bandingkan waktu tunggu dan alur yang dialami dengan yang tertulis.",
          "Sampaikan lewat kanal pengaduan bila ada penyimpangan.",
        ],
      },
    ],
  },

  "dokumen/kompensasi-pelayanan": {
    ringkas: "Bentuk ganti rugi bila pelayanan tidak sesuai standar.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Kompensasi diberikan setelah pengaduan diperiksa. Pemeriksaan memastikan keluhan benar terjadi dan menentukan bentuk ganti yang sesuai.",
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
      { jenis: "sub", teks: "Alur sampai kompensasi diterima" },
      {
        jenis: "langkah",
        butir: [
          "Mengirim pengaduan lewat kanal resmi beserta bukti yang dimiliki.",
          "Menunggu pemeriksaan oleh tim dan menerima nomor pengaduan.",
          "Menerima pemberitahuan hasil beserta bentuk kompensasinya.",
        ],
      },
    ],
  },
};
