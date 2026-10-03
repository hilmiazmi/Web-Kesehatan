// Konten halaman /laboratorium. Seluruhnya fiktif (data demo/portofolio).
// Saat backend siap, pindahkan ke tabel `pages`/`services` (PRD bagian 7).

export type KategoriLab = {
  id: string;
  nama: string;
  ikon: string; // nama kelas Bootstrap Icons
  deskripsi: string;
  pemeriksaan: string[];
};

export type LangkahLab = { judul: string; isi: string };
export type FaqLab = { tanya: string; jawab: string };

export const labInfo = {
  judul: "Layanan Laboratorium",
  ringkasan:
    "Pemeriksaan laboratorium klinik untuk menunjang diagnosis, pemantauan terapi, dan pemeriksaan kesehatan berkala dengan alur yang cepat dan terstandar.",
  jam: [
    { layanan: "Rawat jalan", waktu: "Senin–Jumat, 07.00–14.00" },
    { layanan: "Instalasi Gawat Darurat", waktu: "24 jam" },
    { layanan: "Rawat inap", waktu: "24 jam" },
  ],
  lokasi: "Gedung Penunjang Lantai 1 (data demo)",
  kontak: "(021) 000-0000 (nomor dummy)",
} as const;

export const kategoriLab: KategoriLab[] = [
  {
    id: "hematologi",
    nama: "Hematologi",
    ikon: "bi-droplet-half",
    deskripsi: "Pemeriksaan sel darah dan fungsi pembekuan darah.",
    pemeriksaan: [
      "Darah lengkap",
      "Hemoglobin",
      "Hematokrit",
      "Laju endap darah (LED)",
      "Hitung jenis leukosit",
      "Masa perdarahan dan pembekuan",
    ],
  },
  {
    id: "kimia-klinik",
    nama: "Kimia Klinik",
    ikon: "bi-activity",
    deskripsi: "Pemeriksaan kadar zat kimia dalam darah untuk menilai fungsi organ.",
    pemeriksaan: [
      "Gula darah puasa dan sewaktu",
      "HbA1c",
      "Profil lemak (kolesterol, trigliserida)",
      "Fungsi hati (SGOT, SGPT)",
      "Fungsi ginjal (ureum, kreatinin)",
      "Asam urat",
      "Elektrolit",
    ],
  },
  {
    id: "imunologi",
    nama: "Imunologi dan Serologi",
    ikon: "bi-shield-check",
    deskripsi: "Pemeriksaan penanda infeksi dan respons kekebalan tubuh.",
    pemeriksaan: [
      "Penanda hepatitis",
      "Tes widal",
      "Dengue (NS1, IgG/IgM)",
      "CRP",
      "Tes kehamilan",
    ],
  },
  {
    id: "urinalisa",
    nama: "Urinalisa dan Feses",
    ikon: "bi-clipboard2-pulse",
    deskripsi: "Pemeriksaan urine dan feses rutin.",
    pemeriksaan: [
      "Urine lengkap",
      "Sedimen urine",
      "Protein urine",
      "Feses lengkap",
      "Darah samar feses",
    ],
  },
  {
    id: "mikrobiologi",
    nama: "Mikrobiologi",
    ikon: "bi-bug",
    deskripsi: "Pemeriksaan kuman penyebab infeksi dan uji kepekaan antibiotik.",
    pemeriksaan: [
      "Pewarnaan Gram",
      "Pewarnaan BTA (TB)",
      "Kultur dan uji kepekaan antibiotik",
      "Pemeriksaan jamur",
    ],
  },
];

export const alurLab: LangkahLab[] = [
  {
    judul: "Daftar",
    isi: "Daftar di loket atau melalui Daftar Online, lalu bawa surat permintaan pemeriksaan dari dokter.",
  },
  {
    judul: "Pengambilan sampel",
    isi: "Petugas mengambil sampel darah, urine, atau feses sesuai jenis pemeriksaan.",
  },
  {
    judul: "Pemeriksaan",
    isi: "Sampel diperiksa di laboratorium dengan pengendalian mutu berkala.",
  },
  {
    judul: "Hasil",
    isi: "Hasil diserahkan ke pasien atau diteruskan ke dokter pemeriksa sesuai waktu layanan.",
  },
];

export const persiapanLab: string[] = [
  "Puasa 8–10 jam untuk gula darah puasa dan profil lemak (air putih boleh).",
  "Bawa surat permintaan dokter dan kartu identitas.",
  "Informasikan obat yang sedang dikonsumsi kepada petugas.",
  "Untuk urine, gunakan sampel pancar tengah pagi hari bila diminta.",
];

export const faqLab: FaqLab[] = [
  {
    tanya: "Apakah harus puasa sebelum periksa?",
    jawab:
      "Hanya pemeriksaan tertentu seperti gula darah puasa dan profil lemak. Petugas akan menginformasikan persiapan saat pendaftaran.",
  },
  {
    tanya: "Berapa lama hasil keluar?",
    jawab:
      "Pemeriksaan rutin umumnya selesai pada hari yang sama. Kultur kuman membutuhkan waktu lebih lama.",
  },
  {
    tanya: "Apakah bisa periksa tanpa surat dokter?",
    jawab:
      "Untuk pemeriksaan mandiri tertentu bisa, tetapi interpretasi hasil tetap disarankan melalui dokter.",
  },
];
