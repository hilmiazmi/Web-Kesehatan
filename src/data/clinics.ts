/**
 * Data klinik untuk halaman /pelayanan/poliklinik.
 *
 * Polanya ditiru dari halaman /poliklinik di situs referensi: enam belas klinik
 * sebagai tab, dan setiap klinik punya satu atau lebih subspesialisasi yang
 * masing-masing punya halaman detail sendiri. Jumlah tab dan jumlah kartu
 * detail sudah dicocokkan saat pengukuran (16 tab, 25 kartu detail).
 *
 * Hubungan klinik ke subspesialisasinya penting, bukan dandalan: "Klinik
 * Bedah" di acuan memuat enam subspesialisasi, sementara "Klinik THT - KL"
 * hanya satu.
 *
 * Nama klinik adalah istilah kedokteran baku, bukan merek. Foto memakai aset
 * stok, dan jam praktik dibuat sendiri karena PRD bagian 12 dan 13 melarang
 * menyalin isi rumah sakit asli.
 */

/** Satu halaman detail klinik. */
export type ClinicDetail = {
  slug: string;
  /** Nama yang tampil di kartu dan judul halaman, huruf kapital. */
  name: string;
  description: string;
  services: string[];
  hours: string;
  /**
   * Spesialis di `src/data/doctors.ts`, kalau klinik ini punya dokter.
   *
   * Tidak semua klinik punya dokter, jadi field ini opsional. Yang penting
   * nilainya sama persis dengan `specialty` di `src/data/doctors.ts`; itu
   * dijaga oleh tes di tests/poliklinik.test.ts.
   */
  specialty?: string;
};

export type Clinic = {
  slug: string;
  /** Nama tab, huruf kapital mengikuti gaya situs referensi. */
  name: string;
  description: string;
  services: string[];
  hours: string;
  /** Kartu detail yang tampil di bawah tab klinik ini. */
  details: ClinicDetail[];
};

/**
 * Enam belas klinik, urut abjad seperti di acuan.
 *
 * Setiap detail memakai slug acuan supaya URL-nya sama pola dengan situs
 * rujukan; isi dan jam praktiknya tetap karangan sendiri.
 */
export const CLINICS: Clinic[] = [
  {
    slug: "gizi-klinik",
    name: "GIZI KLINIK",
    description: "Konseling pola makan bagi pasien yang sedang dalam perawatan penyakit.",
    services: ["Konseling Pola Makan", "Evaluasi Gizi"],
    hours: "Senin sampai Jumat, 07.30 sampai 14.00",
    details: [
      {
        slug: "gizi-klinik",
        name: "GIZI KLINIK",
        specialty: "Gizi Klinik",
        description:
          "Klinik untuk pasien yang sedang dalam perawatan penyakit, dengan fokus pada pengaturan pola makan.",
        services: [
          "Konseling pola makan",
          "Evaluasi status gizi",
          "Perencanaan menu harian",
          "Pemantauan berat badan",
        ],
        hours: "Senin sampai Jumat, 07.30 sampai 14.00",
      },
    ],
  },
  {
    slug: "anak",
    name: "KLINIK ANAK",
    description: "Pemeriksaan anak, imunisasi, dan pemantauan tumbuh kembang.",
    services: ["Pemeriksaan Anak", "Imunisasi", "Pemantauan Tumbuh Kembang"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-anak",
        name: "KLINIK ANAK",
        specialty: "Anak",
        description: "Pemeriksaan kesehatan anak dan pemantauan tumbuh kembang.",
        services: [
          "Pemeriksaan anak",
          "Imunisasi",
          "Pemantauan tumbuh kembang",
          "Konseling tumbuh kembang",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "bedah",
    name: "KLINIK BEDAH",
    description: "Konsultasi bedah, persiapan operasi, dan kontrol pascabedah.",
    services: ["Konsultasi Bedah", "Persiapan Operasi", "Kontrol Pascabedah"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-bedah-toraks-kardiovaskulas-btkv",
        name: "KLINIK BEDAH TORAKS & KARDIOVASKULAS",
        description: "Tindakan bedah pada paru, jantung, dan pembuluh darah besar.",
        services: [
          "Konsultasi bedah toraks",
          "Bedah paru",
          "Bedah jantung dan pembuluh darah",
          "Kontrol pascabedah",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-bedah-saraf",
        name: "KLINIK BEDAH SARAF",
        description: "Bedah untuk penyakit saraf pusat dan saraf tepi.",
        services: [
          "Konsultasi bedah saraf",
          "Bedah saraf pusat",
          "Bedah saraf tepi",
          "Rehabilitasi pascabedah",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-bedah-urologi",
        name: "KLINIK BEDAH UROLOGI",
        description: "Bedah saluran kemih dan sistem reproduksi pria.",
        services: [
          "Konsultasi bedah urologi",
          "Tindakan batu saluran kemih",
          "Bedah prostat",
          "Tindakan bedah prostat",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-bedah-onkologi",
        name: "KLINIK BEDAH ONKOLOGI",
        description: "Bedah tumor ganas di seluruh tubuh.",
        services: [
          "Konsultasi bedah onkologi",
          "Biopsi tumor",
          "Bedah tumor",
          "Perawatan luka pascabedah",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-bedah-umum",
        name: "KLINIK BEDAH UMUM",
        specialty: "Bedah Umum",
        description: "Bedah hernia, usus buntu, dan jaringan lunak.",
        services: [
          "Konsultasi bedah umum",
          "Bedah hernia",
          "Bedah usus buntu",
          "Biopsi kelenjar getah bening",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-bedah-orthopaedi",
        name: "KLINIK BEDAH ORTHOPAEDI",
        specialty: "Ortopedi",
        description: "Bedah tulang, sendi, dan jaringan pengikat.",
        services: [
          "Konsultasi ortopedi",
          "Bedah tulang patah",
          "Rekonstruksi sendi",
          "Tindakan pinggang dan lutut",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
    ],
  },
  {
    slug: "gigi",
    name: "KLINIK GIGI",
    description: "Perawatan gigi, gusi, dan rahang.",
    services: ["Tambal Gigi", "Cabut Gigi", "Perawatan Gusi"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-orthodonti",
        name: "KLINIK ORTHODONTI",
        description: "Perbaikan susunan gigi dengan beberapa alat.",
        services: [
          "Konsultasi ortodonti",
          "Pemasangan behel",
          "Penyesuaian alat",
          "Retainer",
        ],
        hours: "Senin sampai Jumat, 09.00 sampai 14.00",
      },
      {
        slug: "klinik-kedokteran-bedah-mulut",
        name: "KLINIK KEDOKTERAN BEDAH MULUT",
        description: "Tindakan bedah pada jaringan mulut dan rahang.",
        services: [
          "Bedah periodontis",
          "Tindakan pada gigi yang tumbuh miring",
          "Biopsi jaringan mulut",
          "Tindakan tumor jinak rahang",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 13.00",
      },
      {
        slug: "klinik-konservasi-gigi-endodontis",
        name: "KLINIK KONSERVASI GIGI (ENDODONTIS)",
        description: "Perawatan saluran akar dan pembersihan gigi yang berlubang.",
        services: [
          "Perawatan saluran akar",
          "Tambal gigi berlubang",
          "Pemulihan gigi",
          "Perawatan gigi sensitif",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
      {
        slug: "klinik-gigi-anak-pedodontis",
        name: "KLINIK GIGI ANAK (PEDODONTIS)",
        description: "Perawatan gigi khusus anak.",
        services: [
          "Pemeriksaan gigi anak",
          "Penatalaksanaan kanal akar gigi anak",
          "Tambal gigi anak",
          "Penanganan gigi anak",
        ],
        hours: "Senin sampai Jumat, 08.00 sampai 13.00",
      },
    ],
  },
  {
    slug: "jantung-dan-pembuluh-darah",
    name: "KLINIK JANTUNG DAN PEMBULUH DARAH",
    description: "Pemeriksaan dan penanganan penyakit jantung serta pembuluh darah.",
    services: ["EKG", "Ekocardiografi", "Konsultasi Jantung"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-jantung-pembuluh-darah",
        name: "KLINIK JANTUNG & PEMBULUH DARAH",
        specialty: "Jantung",
        description: "Pemeriksaan jantung dan pembuluh darah oleh dokter spesialis.",
        services: [
          "Konsultasi jantung",
          "Elektrokardiogram",
          "Ekocardiografi",
          "Pemeriksaan treadmill",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "jiwa",
    name: "KLINIK JIWA",
    description: "Konsultasi dan penanganan gangguan kejiwa.",
    services: ["Konsultasi Psikiatri", "Psikoterapi", "Terapi keluarga"],
    hours: "Senin sampai Jumat, 08.00 sampai 14.00",
    details: [
      {
        slug: "klinik-psikiatri",
        name: "KLINIK PSIKIATRI",
        description: "Penanganan gangguan kejiwa oleh dokter spesialis psikiatri.",
        services: [
          "Konsultasi psikiatri",
          "Penatalaksanaan depresi dan kecemasan",
          "Penatalaksanaan gangguan tidur",
          "Konseling lanjutan",
        ],
        hours: "Senin sampai Jumat, 08.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "kebidanan-dan-kandungan",
    name: "KLINIK KEBIDANAN & KANDUNGAN",
    description: "Pemeriksaan kehamilan, persalinan, dan perawatan nifas.",
    services: ["Pemeriksaan Kehamilan", "Persalinan", "Perawatan Nifas"],
    hours: "Senin sampai Minggu, 07.00 sampai 20.00",
    details: [
      {
        slug: "klinik-ginekologi-onkologi",
        name: "KLINIK GINEKOLOGI ONKOLOGI",
        description: "Penanganan kanker pada organ reproduksi wanita.",
        services: [
          "Konsultasi ginekologi onkologi",
          "Ultrasonografi panggul",
          "Biopsi",
          "Perawatan paliatif",
        ],
        hours: "Senin sampai Jumat, 08.00 sampai 13.00",
      },
      {
        slug: "klinik-kebidanan-kandungan",
        name: "KLINIK KEBIDANAN & KANDUNGAN",
        specialty: "Kebidanan dan Kandungan",
        description: "Pemeriksaan kehamilan dan perawatan ibu hamil.",
        services: [
          "Pemeriksaan kehamilan",
          "Ultrasonografi",
          "Persalinan",
          "Perawatan nifas",
        ],
        hours: "Senin sampai Minggu, 07.00 sampai 20.00",
      },
    ],
  },
  {
    slug: "kulit-dan-kelamin",
    name: "KLINIK KULIT & KELAMIN",
    description: "Penanganan penyakit kulit dan kelamin.",
    services: ["Konsultasi Kulit", "Perawatan Penyakit Kulit", "Tindakan bedah kulit"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-kulit-kelamin",
        name: "KLINIK KULIT & KELAMIN",
        specialty: "Kulit dan Kelamin",
        description: "Penanganan penyakit kulit dan kesehatan reproduksi.",
        services: [
          "Konsultasi dermatologi",
          "Perawatan penyakit kulit",
          "Tindakan kuretase dan biopsi kulit",
          "Konsultasi kesehatan reproduksi",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "mata",
    name: "KLINIK MATA",
    description: "Pemeriksaan dan penanganan gangguan penglihatan.",
    services: ["Pemeriksaan Mata", "Katarak", "Pemeriksaan OCT retina"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-mata",
        name: "KLINIK MATA",
        specialty: "Mata",
        description: "Pemeriksaan dan penanganan gangguan penglihatan.",
        services: [
          "Pemeriksaan mata",
          "Tindakan katarak",
          "Pemeriksaan OCT retina",
          "Pemeriksaan lapangan pandang",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "onkologi-radiasi",
    name: "KLINIK ONKOLOGI RADIASI",
    description: "Penanganan kanker dengan radioterapi.",
    services: ["Konsultasi Onkologi", "Radioterapi", "Evaluasi Respons"],
    hours: "Senin sampai Jumat, 08.00 sampai 14.00",
    details: [
      {
        slug: "klinik-onkologi-radiasiradioterapi",
        name: "KLINIK ONKOLOGI RADIASI / RADIOTERAPI",
        description: "Penanganan kanker dengan teknologi radioterapi.",
        services: [
          "Konsultasi radioterapi",
          "Perencanaan radiasi",
          "Sesi radioterapi",
          "Evaluasi respons tumor",
        ],
        hours: "Senin sampai Jumat, 08.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "paru",
    name: "KLINIK PARU",
    description: "Penanganan penyakit paru dan pernapasan.",
    services: ["Konsultasi Paru", "Spirometri", "Uji Fungsi Paru"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-paru",
        name: "KLINIK PARU",
        specialty: "Paru",
        description: "Penanganan penyakit paru dan saluran pernapasan.",
        services: [
          "Konsultasi paru",
          "Spirometri",
          "Uji fungsi paru",
          "Pemeriksaan paru",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "penyakit-dalam",
    name: "KLINIK PENYAKIT DALAM",
    description: "Penanganan penyakit dalam dan kronis.",
    services: ["Konsultasi Penyakit Dalam", "Kontrol Diabetes", "Kontrol Tekanan Darah"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-penyakit-dalam",
        name: "KLINIK PENYAKIT DALAM",
        specialty: "Penyakit Dalam",
        description: "Penanganan penyakit dalam dan penyakit kronis.",
        services: [
          "Konsultasi penyakit dalam",
          "Kontrol diabetes melitus",
          "Kontrol tekanan darah",
          "Penatalaksanaan penyakit kronis",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "psikolog",
    name: "KLINIK PSIKOLOG",
    description: "Konsultasi psikologi dan terapi perilaku.",
    services: ["Konsultasi Psikolog", "Psikoterapi", "Tes Psikologi"],
    hours: "Senin sampai Jumat, 09.00 sampai 15.00",
    details: [
      {
        slug: "klinik-psikolog",
        name: "KLINIK PSIKOLOG",
        description: "Konsultasi psikologi untuk berbagai kebutuhan pasien.",
        services: [
          "Konsultasi psikologi",
          "Psikoterapi",
          "Tes psikologi",
          "Pendampingan keluarga",
        ],
        hours: "Senin sampai Jumat, 09.00 sampai 15.00",
      },
    ],
  },
  {
    slug: "rehabilitasi-medik",
    name: "KLINIK REHABILITASI MEDIK",
    description: "Pemulihan fungsi tubuh setelah penyakit atau cedera.",
    services: ["Fisioterapi", "Terapi Okupasi", "Terapi Wajah"],
    hours: "Senin sampai Sabtu, 07.00 sampai 15.00",
    details: [
      {
        slug: "klinik-rehabilitasi-medik",
        name: "KLINIK REHABILITASI MEDIK",
        description: "Pemulihan fungsi tubuh melalui program rehabilitasi.",
        services: [
          "Fisioterapi",
          "Terapi okupasi",
          "Terapi wicara",
          "Latihan gerak dan aerobik ringan",
        ],
        hours: "Senin sampai Sabtu, 07.00 sampai 15.00",
      },
    ],
  },
  {
    slug: "saraf-neurologi",
    name: "KLINIK SARAF (NEUROLOGI)",
    description: "Penanganan gangguan saraf pusat dan saraf tepi.",
    services: ["Konsultasi Saraf", "Elektroensefalogram", "Pemeriksaan Saraf"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-saraf-neurologi",
        name: "KLINIK SARAF (NEUROLOGI)",
        specialty: "Saraf",
        description: "Penanganan gangguan saraf pusat dan saraf tepi.",
        services: [
          "Konsultasi neurologi",
          "Elektroensefalogram",
          "Pencitraan saraf",
          "Penatalaksanaan epilepsi",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
  {
    slug: "tht-kl",
    name: "KLINIK THT - KL",
    description: "Penanganan penyakit telinga, hidung, tenggorokan, dan kepala-leher.",
    services: ["Konsultasi THT", "Pemeriksaan Pendengaran", "Tindakan THT"],
    hours: "Senin sampai Jumat, 07.00 sampai 14.00",
    details: [
      {
        slug: "klinik-telinga-hidung-tenggorokan-kepala-leher",
        name: "KLINIK TELINGA HIDUNG TENGGOROKAN - KEPALA LEHER",
        specialty: "THT",
        description: "Penanganan penyakit THT dan daerah kepala-leher.",
        services: [
          "Konsultasi THT",
          "Pemeriksaan pendengaran",
          "Endoskopi hidung",
          "Tindakan THT",
        ],
        hours: "Senin sampai Jumat, 07.00 sampai 14.00",
      },
    ],
  },
];

/**
 * Semua halaman detail klinik dalam satu daftar data.
 *
 * Dipakai `generateStaticParams` dan untuk mencari induk sebuah kartu, supaya
 * halaman detail bisa menampilkan sidebar klinik yang benar.
 */
export const CLINIC_DETAILS: (ClinicDetail & { clinicSlug: string; clinicName: string })[] =
  CLINICS.flatMap((klinik) =>
    klinik.details.map((d) => ({
      ...d,
      clinicSlug: klinik.slug,
      clinicName: klinik.name,
    }))
  );