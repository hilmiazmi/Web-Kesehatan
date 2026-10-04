/**
 * Data untuk halaman profil, manajemen, dan layanan diagnostik.
 *
 * Gaya halaman-halaman ini ditiru dari situs referensi yang sudah diukur:
 * profil punya lima seksi (Visi dan Misi, Budaya Kerja, Company Profile,
 * Sejarah, serta Maklumat Pelayanan), manajemen memakai kisi empat kolom,
 * laboratorium memuat daftar pemeriksaan datar, dan radiologi memuat
 * pemeriksaan yang dikelompokkan per alat.
 *
 * Seluruh nama, jabatan, dan angka dibuat sendiri. Foto memakai aset stok
 * dari `src/data/images.ts`, bukan milik rumah sakit asli (PRD bagian 12
 * dan 13).
 */

export type AboutSection = {
  slug: string;
  title: string;
  /** Kalimat pembuka; satu kalimat saja. */
  lead: string;
  /** Butir isi seksi. */
  points: string[];
};

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    slug: "visi-misi",
    title: "Visi dan Misi",
    lead: "Visi dan misi dirangkum dalam tiga kalimat berikut.",
    points: [
      "Visi: menjadi rumah sakit pilihan warga Jakarta",
      "Misi: memberikan pelayanan yang aman",
      "Misi: menjaga mutu pelayanan",
    ],
  },
  {
    slug: "budaya-kerja",
    title: "Budaya Kerja",
    lead: "Budaya kerja dirumuskan sebagai sikap yang dipakai setiap hari.",
    points: [
      "Kepedulian terhadap pasien",
      "Kerja sama antar unit",
      "Disiplin dan tanggung jawab",
    ],
  },
  {
    slug: "company-profile",
    title: "Company Profile",
    lead: "Profil singkat rumah sakit dan jenis pelayanan yang tersedia.",
    points: [
      "Rumah sakit umum pemerintah",
      "Pelayanan rawat jalan dan rawat inap",
      "Instalasi gawat darurat 24 jam",
    ],
  },
  {
    slug: "sejarah",
    title: "Sejarah",
    lead: "Perjalanan singkat rumah sakit sejak berdiri sampai sekarang.",
    points: [
      "Berdiri sebagai pusat pelayanan kesehatan",
      "Penambahan poliklinik spesialis",
      "Perluasan layanan penunjang",
    ],
  },
  {
    slug: "maklumat-pelayanan",
    title: "Maklumat Pelayanan",
    lead: "Maklumat pelayanan memuat hak dan kewajiban pasien.",
    points: [
      "Hak memperoleh pelayanan",
      "Kewajiban mengikuti prosedur",
      "Jam praktik dan alamat seluruh unit",
    ],
  },
];

/** Satu kartu di dalam sebuah bagian, dengan daftar fungsinya. */
export type DiagnosticCard = {
  id: string;
  name: string;
  icon: string;
  /**
   * Fungsi tindakan pada alat, atau satu kalimat keterangan pada layanan.
   *
   * Bentuknya sengaja satu daftar untuk keduanya, bukan dua bidang terpisah,
   * supaya pemeriksa data cukup punya satu aturan: daftar ini tidak boleh
   * kosong. Halaman sendiri yang memutuskan ditampilkan sebagai paragraf
   * kalau isinya satu butir, atau sebagai daftar kalau lebih dari satu.
   */
  points: string[];
};

/**
 * Satu bagian halaman layanan, menjadi heading level dua.
 *
 * Dipakai untuk kedua layanan diagnostik sekaligus karena bentuk halaman
 * keduanya sama: ada bagian bertitel dengan daftar di dalamnya, dan ada
 * bagian bertitel dengan kartu di dalamnya.
 */
export type DiagnosticSection = {
  title: string;
  /** Paragraf pembuka bagian, tepat sebelum daftarnya. */
  lead?: string;
  /** Butir daftar. Berpasangan dengan `cards`, bukan dua-duanya. */
  points?: string[];
  /** Kartu layanan atau peralatan. Berpasangan dengan `points`. */
  cards?: DiagnosticCard[];
};

export type DiagnosticService = {
  slug: string;
  title: string;
  /** Kalimat ringkas yang dipakai sebagai deskripsi meta dan lead. */
  description: string;
  /** Paragraf pengantar setelah kalimat ringkas itu. */
  paragraphs?: string[];
  sections: DiagnosticSection[];
};

export const DIAGNOSTIC_SERVICES: DiagnosticService[] = [
  {
    slug: "laboratorium",
    title: "Laboratorium",
    description:
      "Pemeriksaan laboratorium penunjang diagnosis dan pemantauan penyakit.",
    paragraphs: [
      "Instalasi Laboratorium RSUD Contoh Sehat merupakan instalasi pelayanan penunjang medis dengan metode layanan diagnostik.",
    ],
    sections: [
      {
        title: "Jenis Pemeriksaan Laboratorium",
        points: [
          "Hematologi",
          "Urin lengkap",
          "Kimia darah",
          "Elektrolit",
          "Analisis gas darah",
          "Hemostasis dan lain-lain",
        ],
      },
      {
        title: "Keunggulan Laboratorium",
        lead: "Instalasi Laboratorium RSUD Contoh Sehat memiliki keunggulan berupa jenis pemeriksaan yang lengkap, hasil data yang akurat, dan harga terjangkau.",
      },
      {
        title: "Jenis Layanan Laboratorium",
        cards: [
          {
            id: "bank-darah",
            name: "Bank Darah",
            icon: "bi-droplet-fill",
            points: [
              "Menyediakan pengadaan kantong darah (PRC, PCRR, FPP, AHF, WE, TC), crossmatch, dan layanan rujukan incompatible.",
            ],
          },
          {
            id: "patologi-anatomi",
            name: "Laboratorium Patologi Anatomi",
            icon: "bi-eyedropper",
            points: [
              "Melayani pemeriksaan FNAB, histopatologi, sitopatologi ginekologi, dan sitopatologi non ginekologi.",
            ],
          },
          {
            id: "patologi-klinik",
            name: "Laboratorium Patologi Klinik",
            icon: "bi-activity",
            points: [
              "Melayani pemeriksaan kimia klinik, hematologi, imunologi, serologi, urinalisis, feses, dan cairan tubuh yang lengkap (termasuk analisis sperma).",
            ],
          },
          {
            id: "mikrobiologi",
            name: "Laboratorium Mikrobiologi",
            icon: "bi-bug",
            points: [
              "Melayani pemeriksaan kultur dan uji resistensi manual maupun otomatis, pemeriksaan Gram, BTA, dan sediaan jamur KOH.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "radiologi",
    title: "Radiologi",
    description:
      "Pemeriksaan pencitraan untuk melihat struktur dan fungsi organ.",
    paragraphs: [
      "Instalasi Radiologi RSUD Contoh Sehat merupakan pelayanan penunjang medis yang memberikan layanan pemeriksaan radiologi dengan hasil berupa foto atau gambar untuk membantu dokter merawat pasien dan menegakkan diagnosis.",
      "Instalasi Radiologi kami didukung peralatan yang canggih dan terbaru. Keunggulan kami antara lain CT Scan MSCT 128 Slices, USG Abdomen, serta pemeriksaan Magnetic Resonance Imaging (MRI).",
    ],
    sections: [
      {
        title: "Fasilitas Pemeriksaan",
        lead: "Instalasi Radiologi RSUD Contoh Sehat menyediakan beberapa jenis fasilitas pemeriksaan, di antaranya:",
        points: [
          "Rontgen Thorax",
          "Pemeriksaan Radiologi Tanpa Kontras",
          "Pemeriksaan Radiologi Kontras",
          "Pemeriksaan CT Scan",
          "Pemeriksaan Mammografi",
          "Panoramic",
        ],
      },
      {
        title: "Peralatan dan Fungsi Tindakan",
        cards: [
          {
            id: "fluoroscopy",
            name: "Fluoroscopy",
            icon: "bi-camera-video",
            points: [
              "Pemeriksaan HSG (gangguan kesuburan wanita)",
              "Pemeriksaan appendix",
              "Pemeriksaan kelainan saluran pencernaan",
            ],
          },
          {
            id: "mri",
            name: "Magnetic Resonance Imaging (MRI)",
            icon: "bi-magnet",
            points: [
              "Mendiagnosis penyakit",
              "Evaluasi jantung dan pembuluh darah",
              "Deteksi kanker",
              "Pemeriksaan jaringan lunak",
              "Memantau perkembangan penyakit dalam pengobatan",
            ],
          },
          {
            id: "usg",
            name: "USG",
            icon: "bi-soundwave",
            points: [
              "Mendiagnosis kondisi yang memengaruhi organ dan jaringan lunak tubuh",
              "Digunakan dalam pemeriksaan Medical Check Up (MCU)",
            ],
          },
          {
            id: "panoramic",
            name: "Panoramic",
            icon: "bi-emoji-smile",
            points: [
              "Pemeriksaan kelainan pada periodontal",
              "Pemeriksaan kista pada tulang rahang",
              "Pemeriksaan tumor rahang atau kanker mulut",
              "Pemeriksaan gigi geraham bagian belakang",
              "Pemeriksaan kelainan terkait daerah mulut lainnya",
            ],
          },
          {
            id: "cephalometri",
            name: "Cephalometri",
            icon: "bi-person-bounding-box",
            points: [
              "Mengukur struktur kepala dan rahang",
              "Diagnosis kelainan kraniofasial",
              "Perencanaan perawatan ortodontis",
              "Pemantauan pertumbuhan kraniofasial",
            ],
          },
          {
            id: "ct-scan",
            name: "CT-Scan 128 Slice",
            icon: "bi-disc",
            points: [
              "Mendeteksi masalah hati, ginjal, atau saluran kemih",
              "Membantu mendiagnosis atau memantau penyakit jantung arteri koroner atau dalam rangka operasi penggantian katup",
              "Mengidentifikasi tumor, pendarahan, trauma tulang, dan penyumbatan aliran darah pada kepala",
              "Mendiagnosis kelainan pada paru-paru",
              "Mendiagnosis cedera tulang atau kerusakan sendi",
            ],
          },
          {
            id: "mamografi",
            name: "Mamografi",
            icon: "bi-heart-pulse",
            points: [
              "Mendeteksi kanker.payudara",
              "Digunakan dalam pemeriksaan Medical Check Up (MCU)",
            ],
          },
          {
            id: "c-arm",
            name: "C-Arm",
            icon: "bi-bullseye",
            points: ["Penunjang proses pelayanan medis dan diagnosis penyakit tertentu"],
          },
          {
            id: "konvensional",
            name: "Radiologi Konvensional",
            icon: "bi-file-medical",
            points: [
              "Pemeriksaan organ tubuh bagian kepala",
              "Pemeriksaan paru-paru (thorax)",
              "Pemeriksaan abdomen (perut)",
              "Pemeriksaan tulang pada seluruh bagian tubuh",
            ],
          },
        ],
      },
    ],
  },
];
