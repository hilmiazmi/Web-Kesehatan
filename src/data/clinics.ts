/**
 * Data klinik untuk halaman /pelayanan/poliklinik.
 *
 * Jumlah dan urutan mengikuti halaman /poliklinik di situs referensi yang
 * sudah diverifikasi: 16 klinik, urut abjad.
 *
 * Nama klinik adalah istilah kedokteran baku, bukan merek. Foto memakai aset
 * stok, dan jam praktik dibuat sendiri karena PRD bagian 12 dan 13 melarang
 * menyalin isi rumah sakit asli.
 */

export type Clinic = {
  slug: string;
  /** Ditampilkan dalam huruf kapital, mengikuti gaya situs referensi. */
  name: string;
  description: string;
  /** Layanan yang bisa ditanyakan di loket klinik ini. */
  services: string[];
  hours: string;
};

export const CLINICS: Clinic[] = [
  {
    slug: "gizi-klinik",
    name: "GIZI KLINIK",
    description: "Konseling pola makan bagi pasien yang sedang dalam perawatan penyakit.",
    services: ["Konseling Pola Makan", "Evaluasi Gizi"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "anak",
    name: "KLINIK ANAK",
    description: "Pemeriksaan anak, imunisasi, dan pemantauan tumbuh kembang.",
    services: ["Pemeriksaan Anak", "Imunisasi", "Pemantauan Tumbuh Kembang"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
  },
  {
    slug: "bedah",
    name: "KLINIK BEDAH",
    description: "Konsultasi bedah, persiapan operasi, dan kontrol pascabedah.",
    services: ["Konsultasi Bedah", "Persiapan Operasi", "Kontrol Pascabedah"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "gigi",
    name: "KLINIK GIGI",
    description: "Pemeriksaan gigi, pembersihan karang gigi, dan penambungan.",
    services: ["Pemeriksaan Gigi", "Scaling Gigi", "Penambungan", "Kawat Gigi"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "jantung-dan-pembuluh-darah",
    name: "KLINIK JANTUNG DAN PEMBULUH DARAH",
    description: "Penanganan gangguan jantung dan pembuluh darah oleh dokter spesialis.",
    services: ["Konsultasi Jantung", "EKG", "Ekocardiografi", "Holter"],
    hours: "Senin, Rabu, Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "jiwa",
    name: "KLINIK JIWA",
    description: "Penilaian dan penanganan gangguan mental oleh dokter spesialis jiwa.",
    services: ["Konsultasi Psikiater", "Psikoterapi", "Penilaian Gangguan Mental"],
    hours: "Senin sampai Jumat, 08.00 sampai 14.00",
  },
  {
    slug: "kebidanan-dan-kandungan",
    name: "KLINIK KEBIDANAN & KANDUNGAN",
    description: "Pemeriksaan kehamilan, ginekologi, dan layanan persalinan.",
    services: ["Pemeriksaan Kehamilan", "Konsultasi Kandungan", "Pemeriksaan Ginekologi", "Persalinan"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
  },
  {
    slug: "kulit-dan-kelamin",
    name: "KLINIK KULIT & KELAMIN",
    description: "Pemeriksaan penyakit kulit dan layanan kesehatan reproduksi.",
    services: ["Pemeriksaan Kulit", "Penanganan Kelamin", "Konsultasi Kesehatan Reproduksi"],
    hours: "Senin, Rabu, Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "mata",
    name: "KLINIK MATA",
    description: "Pemeriksaan penglihatan, katarak, glaukoma, dan kelainan retina.",
    services: ["Pemeriksaan Mata", "Katarak", "Glaukoma", "Pemeriksaan Retina"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "onkologi-radiasi",
    name: "KLINIK ONKOLOGI RADIASI",
    description: "Konsultasi kanker dan perencanaan terapi radiasi.",
    services: ["Konsultasi Onkologi", "Perencanaan Terapi Radiasi", "Evaluasi Respons"],
    hours: "Senin sampai Jumat, 08.00 sampai 14.00",
  },
  {
    slug: "paru",
    name: "KLINIK PARU",
    description: "Penanganan penyakit saluran napas seperti asma dan bronkitis.",
    services: ["Pemeriksaan Paru", "Uji Fungsi Paru", "Konsultasi Asma"],
    hours: "Senin, Rabu, Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "penyakit-dalam",
    name: "KLINIK PENYAKIT DALAM",
    description: "Penanganan penyakit dewasa seperti diabetes dan hipertensi.",
    services: ["Konsultasi Penyakit Dalam", "Kontrol Diabetes", "Kontrol Hipertensi"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "psikolog",
    name: "KLINIK PSIKOLOG",
    description: "Asesmen psikologis dan konseling bagi anak maupun dewasa.",
    services: ["Asesmen Psikologis", "Konseling", "Terapi", "Tes Kemampuan"],
    hours: "Senin sampai Jumat, 08.00 sampai 14.00",
  },
  {
    slug: "rehabilitasi-medik",
    name: "KLINIK REHABILITASI MEDIK",
    description: "Pemulihan fungsi gerak tubuh setelah cedera atau penyakit.",
    services: ["Fisioterapi", "Terapi Okupasi", "Latihan Gaya Hidup"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
  },
  {
    slug: "saraf-neurologi",
    name: "KLINIK SARAF (NEUROLOGI)",
    description: "Penanganan sakit kepala, pusing, dan gangguan saraf lain.",
    services: ["Konsultasi Saraf", "EEG", "Elektromyografi", "Penatalaksanaan Nyeri"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
  {
    slug: "tht-kl",
    name: "KLINIK THT - KL",
    description: "Penanganan hidung, tenggorokan, dan telinga termasuk pendengaran.",
    services: ["Pemeriksaan THT", "Konsultasi Pendengaran", "Tindakan THT Ringan"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
  },
];
