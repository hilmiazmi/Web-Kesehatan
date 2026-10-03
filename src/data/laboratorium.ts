// Konten halaman /laboratorium. Identitas fiktif (data demo/portofolio).
// Saat backend siap, pindahkan ke tabel `pages`/`services` (PRD bagian 7).

export type LayananLab = { id: string; nama: string; ikon: string; deskripsi: string };

export const labInfo = {
  judul: "Layanan Laboratorium",
  pengantar:
    "Instalasi Laboratorium RSUD Contoh Sehat merupakan instalasi pelayanan penunjang medis dengan metode layanan diagnostik.",
  keunggulan:
    "Instalasi Laboratorium RSUD Contoh Sehat memiliki keunggulan berupa jenis pemeriksaan yang lengkap, hasil data yang akurat, dan harga terjangkau.",
} as const;

export const jenisPemeriksaanLab: string[] = [
  "Hematologi",
  "Urin lengkap",
  "Kimia darah",
  "Elektrolit",
  "Analisis gas darah",
  "Hemostasis dan lain-lain",
];

export const layananLab: LayananLab[] = [
  {
    id: "bank-darah",
    nama: "Bank Darah",
    ikon: "bi-droplet-fill",
    deskripsi:
      "Menyediakan pengadaan kantong darah (PRC, PCRR, FPP, AHF, WE, TC), crossmatch, dan layanan rujukan incompatible.",
  },
  {
    id: "patologi-anatomi",
    nama: "Laboratorium Patologi Anatomi",
    ikon: "bi-eyedropper",
    deskripsi:
      "Melayani pemeriksaan FNAB, histopatologi, sitopatologi ginekologi, dan sitopatologi non ginekologi.",
  },
  {
    id: "patologi-klinik",
    nama: "Laboratorium Patologi Klinik",
    ikon: "bi-activity",
    deskripsi:
      "Melayani pemeriksaan kimia klinik, hematologi, imunologi, serologi, urinalisis, feses, dan cairan tubuh yang lengkap (termasuk analisis sperma).",
  },
  {
    id: "mikrobiologi",
    nama: "Laboratorium Mikrobiologi",
    ikon: "bi-bug",
    deskripsi:
      "Melayani pemeriksaan kultur dan uji resistensi manual maupun otomatis, pemeriksaan Gram, BTA, dan sediaan jamur KOH.",
  },
];
