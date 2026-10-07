import type { IsiHalaman } from "./types";

/** Halaman "Karir" di bawah Informasi Publik. */
export const KARIR: Record<string, IsiHalaman> = {
  "informasi-publik/karir": {
    ringkas: "Lowongan pekerjaan dan program magang.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Pendaftaran pekerjaan dibuka bila ada kebutuhan. Lowongan diumumkan di halaman ini beserta batas waktu dan cara melamarnya.",
      },
      {
        jenis: "paragraf",
        teks:
          "Selain lowongan tetap, tersedia program magang untuk mahasiswa tingkat akhir dan lulusan baru yang ingin mengenal kerja rumah sakit.",
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
          "Tenaga rekam medis dan administrasi.",
        ],
      },
      { jenis: "sub", teks: "Syarat umum" },
      {
        jenis: "daftar",
        ikon: "bi-check2",
        butir: [
          "Ijazah sesuai jenjang pendidikan yang diminta.",
          "Surat keterangan sehat dan surat keterangan pengalaman kerja.",
          "Surat tanda registrasi yang masih berlaku untuk tenaga kesehatan.",
        ],
      },
      { jenis: "sub", teks: "Tahapan seleksi" },
      {
        jenis: "langkah",
        butir: [
          "Mengirim berkas lamaran sebelum batas waktu yang diumumkan.",
          "Mengikuti seleksi berkas dan ujian tertulis.",
          "Mengikuti wawancara dan pemeriksaan kesehatan.",
          "Menunggu pengumuman hasil seleksi di halaman ini.",
        ],
      },
      {
        jenis: "catatan",
        teks:
          "Seluruh proses seleksi tidak dipungut biaya. Hati-hati terhadap pihak yang mengatasnamakan rumah sakit untuk meminta imbalan.",
      },
    ],
  },
};
