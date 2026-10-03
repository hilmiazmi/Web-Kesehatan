import type { IsiHalaman } from "./types";

/** Halaman "Administrasi Pasien". */
export const ADMINISTRASI: Record<string, IsiHalaman> = {
  administrasi: {
    ringkas:
      "Antrean, rekam medis, surat keterangan, dan administrasi biaya.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Administrasi pasien berjalan terpisah dari pemeriksaan. Bagian ini menangani antrean, berkas, dan biaya, bukan kondisi medis.",
      },
      { jenis: "sub", teks: "Antrean dan pendaftaran" },
      {
        jenis: "langkah",
        butir: [
          "Pendaftaran dilakukan di loket atau lewat Daftar Online.",
          "Nomor antrean diambil dan dipanggil sesuai urutan.",
          "Poliklinik tujuan ditentukan oleh jenis layanan yang dipilih.",
        ],
      },
      { jenis: "sub", teks: "Rekam medis" },
      {
        jenis: "daftar",
        ikon: "bi-file-earmark-medical",
        butir: [
          "Setiap pasien punya satu berkas rekam medis.",
          "Salinan rekam medis diberikan sesuai ketentuan yang berlaku.",
          "Pengambilan rekam medis memerlukan surat izin dari pasien atau walinya.",
        ],
      },
      { jenis: "sub", teks: "Surat keterangan" },
      {
        jenis: "daftar",
        ikon: "bi-file-earmark-text",
        butir: [
          "Surat keterangan sehat dan surat keterangan sakit dapat dimohon di bagian layanan.",
          "Waktu pengerjaan bergantung pada jenis surat dan tujuan pemakaiannya.",
        ],
      },
      { jenis: "sub", teks: "Biaya" },
      {
        jenis: "daftar",
        ikon: "bi-cash-coin",
        butir: [
          "Perkiraan biaya diberikan secara tertulis sebelum tindakan dimulai.",
          "Pembayaran dapat dilakukan di loket pembayaran.",
        ],
      },
    ],
  },
};
