/**
 * Isi halaman brosur digital.
 *
 * Di situs referensi halaman brosur punya empat kategori dan dua puluh
 * brosur, masing-masing dengan halaman detail sendiri.
 *
 * Isi setiap brosur disusun ulang dari pengetahuan kesehatan umum, bukan
 * disalin dari rumah sakit asli (PRD bagian 12 dan 13).
 */

export type Brosur = {
  slug: string;
  title: string;
  /** Kategori induk; nilainya sama dengan `BROSUR_CATEGORIES[].slug`. */
  category: string;
  /** Kalimat pembuka satu kalimat. */
  lead: string;
  /** Isi brosur, dikelompokkan per seksi. */
  sections: { heading: string; points: string[] }[];
};

export type BrosurCategory = {
  slug: string;
  name: string;
};

export const BROSUR_CATEGORIES: BrosurCategory[] = [
  { slug: "anak-anak", name: "Anak-anak" },
  { slug: "ibu-hamil", name: "Ibu Hamil" },
  { slug: "penyakit-menular", name: "Penyakit Menular" },
  { slug: "penyakit-tidak-menular", name: "Penyakit Tidak Menular" },
];

export const BROSURS: Brosur[] = [{
    slug: "imunisasi",
    title: "Imunisasi",
    category: "anak-anak",
    lead: "Vaksin melindungi anak dari penyakit yang dapat dicegah.",
    sections: [
      {
        heading: "Jadwal Imunisasi Dasar",
        points: [
          "Hepatitis B: usia 0, 1, dan 6 bulan",
          "Polio: usia 0, 2, 3, dan 4 bulan",
          "Difteri, tetanus, dan campak: usia 2, 3, dan 9 bulan",
          "Rotavirus: usia 2 dan 4 bulan",
          "Campak dan rubella: usia 9 dan 18 bulan",
        ],
      },
      {
        heading: "Yang Perlu Disiapkan",
        points: [
          "Bawa buku KIA atau kartu imunisasi",
          "Pastikan anak sehat saat disuntik",
          "Tunggu 15 menit di ruang tunggu",
          "Simpan catatan imunisasi di rumah",
        ],
      },
    ],
  },
  {
    slug: "diare-pada-anak",
    title: "Diare Pada Anak",
    category: "anak-anak",
    lead: "Diare adalah buang air besar lebih dari tiga kali sehari.",
    sections: [
      {
        heading: "Tanda Perlu Perhatian",
        points: [
          "Mulut kering dan kulit tidak kembali seperti semula",
          "Air kemih sedikit sekali",
          "Demam tinggi atau tinja berdarah",
          "Anak tampak sangat lemah",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "Cuci tangan dengan air mengalir",
          "Minum air yang aman",
          "Jaga kebersihan makanan",
          "Imunisasi rotavirus",
        ],
      },
    ],
  },{
    slug: "cegah-stunting-itu-penting",
    title: "Cegah Stunting, Itu Penting",
    category: "anak-anak",
    lead: "Stunting terjadi karena kurangnya nutrisi pada masa tumbuh kembang.",
    sections: [
      {
        heading: "Penyebab",
        points: [
          "Asupan makanan tidak mencukupi",
          "Infeksi berulang pada saluran cerna",
          "Sanitasi lingkungan yang buruk",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "ASI eksklusif selama enam bulan pertama",
          "Pemberian makanan pendamping tepat waktu",
          "Pemantauan berat dan tinggi secara rutin",
          "Sanitasi air dan lingkungan yang bersih",
        ],
      },
    ],
  },
  {
    slug: "asi-eksklusif",
    title: "ASI Eksklusif",
    category: "ibu-hamil",
    lead: "ASI eksklusif diberikan tanpa cairan lain selama enam bulan pertama.",
    sections: [
      {
        heading: "Manfaat",
        points: [
          "Mengandung zat antibodi yang melindungi bayi",
          "Mendukung pertumbuhan otak",
          "Menurunkan risiko infeksi saluran cerna",
          "Selalu tersedia dan tidak perlu dimasak",
        ],
      },
      {
        heading: "Cara Melakukan",
        points: [
          "Memberi ASI langsung sejak satu jam pertama",
          "Memberi ASI sesuai permintaan bayi",
          "Melanjutkan ASI sampai usia dua tahun",
        ],
      },
    ],
  },
  {
    slug: "perawatan-untuk-ibu-nifas",
    title: "Perawatan Untuk Ibu Nifas",
    category: "ibu-hamil",
    lead: "Masa nifas berlangsung sekitar enam minggu setelah melahirkan.",
    sections: [
      {
        heading: "Perawatan Diri",
        points: [
          "Membersihkan bagian tubuh dengan air mengalir",
          "Istirahat cukup dan makan bergizi",
          "Menjaga kebersihan diri dan bayi",
        ],
      },
      {
        heading: "Tanda Perlu Periksa",
        points: [
          "Demam tinggi lebih dari 38 derajat",
          "Keluarnya darah dari jalan lahir berbau",
          "Nyeri kepala berat disertai pusing",
          "Bengkak pada tungkai atau wajah",
        ],
      },
    ],
  },{
    slug: "menjaga-kesehatan-ibu-hamil-janin",
    title: "Menjaga Kesehatan Ibu Hamil dan Janin",
    category: "ibu-hamil",
    lead: "Pemeriksaan kehamilan rutin menjaga ibu dan janin tetap sehat.",
    sections: [
      {
        heading: "Jadwal Pemeriksaan",
        points: [
          "Satu kali pada trimester pertama",
          "Dua kali pada trimester kedua",
          "Tiga kali pada trimester ketiga",
        ],
      },
      {
        heading: "Asupan Sehari-hari",
        points: [
          "Makan empat kali sehari dengan sumber karbohidrat yang varied",
          "Minum air putih secukupnya",
          "Konsumsi tablet tambah darah sesuai anjuran",
          "Hindari alkohol dan rokok",
        ],
      },
    ],
  },
  {
    slug: "skrinning-kehamilan",
    title: "Skrinning Kehamilan",
    category: "ibu-hamil",
    lead: "Skrinning mendeteksi risiko kehamilan lebih awal.",
    sections: [
      {
        heading: "Jenis Skrinning",
        points: [
          "Pemeriksaan darah dan air kencing",
          "Pemeriksaan dengan gelombang suara",
          "Deteksi diabetes pada kehamilan",
          "Deteksi tekanan darah tinggi",
        ],
      },
      {
        heading: "Waktu Pemeriksaan",
        points: [
          "Usia kehamilan sebulan",
          "Usia kehamilan enam bulan",
          "Usia kehamilan sembilan bulan",
        ],
      },
    ],
  },
  {
    slug: "demam-tipus",
    title: "Demam Tipus",
    category: "penyakit-menular",
    lead: "Demam typhoid disebabkan bakteri Salmonella Typhi.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Demam tinggi yang berlanjut beberapa hari",
          "Sakit kepala dan nyeri otot",
          "Nyeri perut",
          "Sulit buang air besar atau diare",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "Minum air yang aman dan makanan yang matang",
          "Cuci tangan dengan air mengalir",
          "Menjaga kebersihan makanan",
          "Vaksinasi typhoid bila tersedia",
        ],
      },
    ],
  },{
    slug: "hepatitis",
    title: "Hepatitis",
    category: "penyakit-menular",
    lead: "Hepatitis adalah radang hati akibat virus atau obat.",
    sections: [
      {
        heading: "Jenis",
        points: [
          "Hepatitis A: makanan dan air yang terkontaminasi",
          "Hepatitis B: cairan darah dan hubungan seksual",
          "Hepatitis C: darah yang terkontaminasi",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "Vaksinasi hepatitis B",
          "Tidak berbagi sikat gigi dan peralatan makan",
          "Pastikan alat suntik steril",
        ],
      },
    ],
  },
  {
    slug: "scabies",
    title: "Scabies",
    category: "penyakit-menular",
    lead: "Scabies adalah penyakit kulit akibat tungau Sarcoptes scabiei.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Gatal yang lebih terasa pada malam hari",
          "Ruam pada sela jari dan pergelangan tangan",
          "Bekas goresan akibat menggaruk",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Olesi obat pada seluruh area kulit",
          "Cuci dan ganti pakaian setiap hari",
          "Rawat seluruh anggota yang terkena",
        ],
      },
    ],
  },
  {
    slug: "informasi-dasar-hiv-aids",
    title: "Informasi Dasar HIV dan AIDS",
    category: "penyakit-menular",
    lead: "HIV adalah virus yang menyerang sistem pertahanan tubuh.",
    sections: [
      {
        heading: "Penjelasan",
        points: [
          "HIV bertahan di dalam tubuh dan merusak sistem imun",
          "AIDS adalah tahap akhir dari infeksi HIV",
          "Infeksi tidak menyebar lewat sentuhan biasa",
        ],
      },
      {
        heading: "Pencegahan dan Penanganan",
        points: [
          "Pemeriksaan HIV secara sukarela",
          "Pengambilan obat antiretroviral secara rutin",
          "Kondom sebagai perlindungan",
        ],
      },
    ],
  },{
    slug: "mengenal-penyakit-tbc",
    title: "Mengenal Penyakit Tuberkulosis",
    category: "penyakit-menular",
    lead: "Tuberkulosis adalah penyakit paru akibat bakteri Mycobacterium tuberculosis.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Batuk lebih dari dua minggu",
          "Batuk dengan dahak berdarah",
          "Demam ringan pada sore hari",
          "Penurunan berat badan",
          "Keringat pada malam hari",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Obat anti tuberkulosis selama enam bulan",
          "Pemeriksaan dahak secara rutin",
          "Jaga masker saat berbicara",
        ],
      },
    ],
  },
  {
    slug: "hipertensi-tekanan-darah-tinggi",
    title: "Hipertensi atau Tekanan Darah Tinggi",
    category: "penyakit-tidak-menular",
    lead: "Hipertensi adalah tekanan darah yang lebih tinggi dari normal.",
    sections: [
      {
        heading: "Klasifikasi",
        points: [
          "Normal: sistolik di bawah 120 dan diastolik di bawah 80",
          "Hipertensi tahap satu: sistolik 130 sampai 139",
          "Hipertensi tahap dua: sistolik 140 ke atas",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Pembatasan konsumsi garam",
          "Olahraga teratur",
          "Penurunan berat badan",
          "Obat antihipertensi sesuai anjuran dokter",
        ],
      },
    ],
  },
  {
    slug: "usus-buntu",
    title: "Usus Buntu",
    category: "penyakit-tidak-menular",
    lead: "Radang pada ujung usus buntu memerlukan penanganan cepat.",
    sections: [
      {
        heading: "Tanda Gejala",
        points: [
          "Nyeri perut di bagian kanan bawah",
          "Demam rendah",
          "Mual dan muntah",
          "Nyeri saat ditekan",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Pemeriksaan dokter segera",
          "Tindakan bedah bila perlu",
          "Perawatan setelah tindakan",
        ],
      },
    ],
  },{
    slug: "asma",
    title: "Asma",
    category: "penyakit-tidak-menular",
    lead: "Asma adalah gangguan saluran pernapasan yang kronis.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Sesak napas",
          "Batuk terutama pada malam hari",
          "Mengi",
          "Batuk berulang yang tidak membaik",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Menghindari pencetus seperti asap dan debu",
          "Memakai obat hirupan sesuai anjuran dokter",
          "Memantau kondisi secara berkala",
        ],
      },
    ],
  },
  {
    slug: "vertigo",
    title: "Vertigo",
    category: "penyakit-tidak-menular",
    lead: "Vertigo adalah rasa pusing berputar pada kepala.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Pusing berputar",
          "Nyeri kepala",
          "Mual dan muntah",
          "Keseimbangan terganggu",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Pemeriksaan keseimbangan",
          "Obat antigagal sesuai anjuran dokter",
          "Rehabilitasi keseimbangan",
        ],
      },
    ],
  },
  {
    slug: "hemoroid-wasir",
    title: "Hemoroid atau Wasir",
    category: "penyakit-tidak-menular",
    lead: "Hemoroid adalah pembengkakan pembuluh darah di anus.",
    sections: [
      {
        heading: "Gejala",
        points: [
          "Ada darah saat buang air besar",
          "Nyeri saat duduk lama",
          "Gatal pada area dubur",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Makan makanan berserat",
          "Minum air putih secukupnya",
          "Tidak menahan buang air besar",
        ],
      },
    ],
  },
{
    slug: "mengenal-stroke",
    title: "Mengenal Stroke",
    category: "penyakit-tidak-menular",
    lead: "Stroke adalah kerusakan otak akibat tersumbatnya atau pecahnya pembuluh darah.",
    sections: [
      {
        heading: "Tanda dan Gejala",
        points: [
          "Wajah menjadi turun satu sisi",
          "Satu lengan lemah dan sulit diangkat",
          "Ucapan sulit dipahami",
          "Penglihatan kabur atau hilang sebagian",
          "Sakit kepala berat mendadak",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Segera panggil ambulans",
          "Catat jam gejala mulai muncul",
          "Jangan memberi obat atau makanan sendiri",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "Kendalikan tekanan darah",
          "Kurangi garam dan lemak dalam makanan",
          "Jauhi asap rokok",
        ],
      },
    ],
  },
  {
    slug: "kanker-payudara",
    title: "Kanker Payudara",
    category: "penyakit-tidak-menular",
    lead: "Sel abnormal tumbuh di jaringan Putting.",
    sections: [
      {
        heading: "Faktor Risiko",
        points: [
          "Usia lanjut",
          "Riwayat keluarga",
          "Riwayat haid awal",
        ],
      },
      {
        heading: "Tanda dan Gejala",
        points: [
          "Benjolan di Putting",
          "Putting berubah bentuk",
        ],
      },
      {
        heading: "Pencegahan",
        points: [
          "Periksa Putting rutin",
          "Jaga berat badan",
        ],
      },
    ],
  },
  {
    slug: "sinusitis",
    title: "Sinusitis",
    category: "penyakit-tidak-menular",
    lead: "Sinusitis adalah peradangan rongga hidung.",
    sections: [
      {
        heading: "Penyebab",
        points: [
          "Infeksi virus",
          "Alergi",
          "Pilek",
        ],
      },
      {
        heading: "Gejala",
        points: [
          "Hidung tersumbat",
          "Keluar leleran",
          "Nyeri kepala",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Cairan garam",
          "Obat pereda nyeri",
        ],
      },
    ],
  },
  {
    slug: "mengenal-penyakit-katarak",
    title: "Mengenal Penyakit Katarak",
    category: "penyakit-tidak-menular",
    lead: "Katarak membuat penglihatan menjadi kabur.",
    sections: [
      {
        heading: "Tanda dan Gejala",
        points: [
          "Penglihatan kabur",
          "Warna dull",
        ],
      },
      {
        heading: "Penatalaksanaan",
        points: [
          "Operasi katarak",
          "Periksa mata rutin",
        ],
      },
    ],
  },
];
