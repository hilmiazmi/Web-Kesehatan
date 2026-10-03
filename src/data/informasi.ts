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

export type DiagnosticGroup = {
  /** Nama alat atau kelompok pemeriksaan. */
  name: string;
  /** Indikasi atau cakupan pemeriksaan. */
  points: string[];
};

/**
 * Laboratorium memuat daftar pemeriksaan datar, sedangkan radiologi
 * memuat pemeriksaan yang dikelompokkan per alat. Satu bentuk data dipakai
 * untuk keduanya, dan grup pertama pada laboratorium cukup diisi satu butir.
 */
export type DiagnosticService = {
  slug: string;
  title: string;
  description: string;
  groups: DiagnosticGroup[];
};

export const DIAGNOSTIC_SERVICES: DiagnosticService[] = [
  {
    slug: "laboratorium",
    title: "Laboratorium",
    description:
      "Pemeriksaan laboratorium penunjang diagnosis dan pemantauan penyakit.",
    groups: [
      {
        name: "Jenis Pemeriksaan",
        points: [
          "Hematologi",
          "Urin lengkap",
          "Kimia darah",
          "Elektrolit",
          "Analisis gas darah",
          "Hemostatis",
        ],
      },
    ],
  },
  {
    slug: "radiologi",
    title: "Radiologi",
    description:
      "Pemeriksaan pencitraan untuk melihat struktur dan fungsi organ.",
    groups: [
      {
        name: "Rontgen Thorax",
        points: ["Pemeriksaan rontgen dada"],
      },
      {
        name: "Tanpa Kontras",
        points: [
          "Kepala",
          "Tulang belakang",
          "Perut",
          "Ekstremitas",
          "Pelvis",
        ],
      },
      {
        name: "Dengan Kontras",
        points: [
          "Saluran cerna atas",
          "Saluran cerna bawah",
          "Sistem saluran kemih",
          "Pembuluh darah",
        ],
      },
      {
        name: "CT Scan",
        points: [
          "Kepala",
          "Toraks",
          "Abdomen",
          "Punggung",
        ],
      },
      {
        name: "Mamografi",
        points: ["Pemeriksaan rontgen payu dada"],
      },
      {
        name: "Panoramic",
        points: [
          "Perawatan gigi dan rahang",
          "Kista pada tulang rahang",
          "Tumor rahang",
          "Perencanaan ortodontis",
        ],
      },
    ],
  },
];
