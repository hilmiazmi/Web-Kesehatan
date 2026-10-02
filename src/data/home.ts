/**
 * Data konten Home.
 *
 * SEMUA ISI DI SINI ADALAH FIKTIF dan dibuat specifically untuk proyek demo,
 * sesuai PRD bagian 9. Tidak ada foto, nama dokter, testimoni, nomor kontak,
 * atau logo asli dari situs referensi. Lihat docs/design-tokens-terverifikasi.md
 * bagian 6 untuk daftar aset yang tidak disalin dan alasannya.
 */

/** Slide hero. Aset asli diganti placeholder. */
export const HERO_SLIDES = [
  { title: "Instalasi Gawat Darurat 24 Jam", subtitle: "Siap melayani pasien gawat darurat setiap saat" },
  { title: "Layanan Jantung Terpadu", subtitle: "Kateterisasi jantung dan pemasangan ring" },
  { title: "Layanan Kanker Terpadu", subtitle: "Radioterapi dan bedah onkologi terpadu" },
  { title: "Paket Medical Check Up", subtitle: "Pemeriksaan kesehatan menyeluruh" },
  { title: "Maternal Center", subtitle: "Pelayanan ibu dan anak terpadu" },
  { title: "MRI Terpadu", subtitle: "Diagnostik pencitraan resolusi tinggi" },
  { title: "Jam Pendaftaran", subtitle: "Senin sampai Jumat pukul 07.30 sampai 14.00" },
  { title: "Cath Lab", subtitle: "Layanan kateterisasi jantung" },
  { title: "Rawat Inap 24 Jam", subtitle: "Tersedia kapan saja Anda membutuhkan" },
];

/**
 * 30 spesialis. Nama spesialisasi bersifat generik sehingga boleh dipakai
 * (PRD bagian 9). Kode poliklinik sengaja dibuat berbeda dari situs asli
 * supaya tidak menyerupai data internal mereka.
 */
export const SPECIALTIES = [
  "Anak",
  "Anestesi",
  "Bedah Digestive",
  "Bedah Onkologi",
  "Bedah Saraf",
  "Bedah Toraks dan Kardiovaskular",
  "Bedah Umum",
  "Gigi Spesialis Bedah Mulut",
  "Gigi Spesialis Endodonsi",
  "Gigi Spesialis Ortodonti",
  "Gigi Spesialis Pedodontis",
  "Gigi Spesialis Prostodonsia",
  "Ginekologi Onkologi",
  "Gizi Klinik",
  "Jantung",
  "Kebidanan dan Kandungan",
  "Kulit dan Kelamin",
  "Mata",
  "Onkologi Radiasi (Radioterapi)",
  "Ortopedi",
  "Paru",
  "Penyakit Dalam",
  "Penyakit Dalam Hematologi Onkologi Medik",
  "Psikiatri",
  "Psikologi",
  "Rehab Medik",
  "Saraf",
  "TB DOTS",
  "THT",
  "Urologi",
];

/**
 * 6 layanan unggulan (section 3: "Layanan Unggulan & Prioritas").
 * Jumlah dan urutan mengikuti situs referensi yang sudah diverifikasi.
 */
export const PRIORITY_SERVICES = [
  {
    slug: "jantung-terpadu",
    title: "Jantung Terpadu",
    description: "Pelayanan katerisasi jantung dan pemasangan ring",
  },
  {
    slug: "kanker-terpadu",
    title: "Kanker Terpadu",
    description:
      "Layanan radioterapi, pembedahan onkologi, bedah saraf, dan bedah onkologi",
  },
  {
    slug: "medical-check-up",
    title: "Medical Check Up",
    description: "Layanan pengecekan kesehatan secara komprehensif",
  },
  {
    slug: "stroke-terpadu",
    title: "Stroke Terpadu",
    description: "Sistem penanganan stroke yang dilakukan secara cepat dan tepat",
  },
  {
    slug: "uro-nefrologi",
    title: "Uro Nefrologi",
    description:
      "Layanan medis yang berfokus untuk menangani penyakit pada sistem saluran kemih, ginjal, dan organ terkait",
  },
  {
    slug: "maternal-center",
    title: "Maternal Center",
    description: "Pelayanan ibu dan anak terpadu",
  },
];

/**
 * 8 fasilitas (section 4: "Fasilitas & Layanan").
 * Site asli pakai tab vertikal di kiri dan gambar di kanan; BURTON ini.
 */
export const FACILITIES = [
  {
    slug: "instalasi-gawat-darurat",
    title: "Instalasi Gawat Darurat",
    description:
    "RSUD Contoh Sehat berkomitmen memberikan pelayanan terbaik dalam situasi darurat",
  },
  {
    slug: "rawat-jalan",
    title: "Rawat Jalan",
    description:
      "Pelayanan rawat jalan terbaik untuk kesehatan Anda, dengan layanan profesional, cepat, dan nyaman",
  },
  {
    slug: "rawat-inap",
    title: "Rawat Inap",
    description:
      "Memberikan pelayanan rawat inap yang nyaman, komprehensif, serta tenaga medis profesional",
  },
  {
    slug: "rawat-inap-khusus",
    title: "Rawat Inap Khusus",
    description:
      "Rawat inap khusus yang komprehensif, didukung tenaga medis profesional dan fasilitas penunjang medis modern",
  },
  {
    slug: "diagnostic-center",
    title: "Diagnostic Center",
    description:
      "Fasilitas medis yang menyediakan berbagai layanan diagnostik untuk mendeteksi, menganalisis, dan mengevaluasi kesehatan pasien secara komprehensif",
  },
  {
    slug: "eswl",
    title: "ESWL (Extracorporeal Shock Wave Lithotripsy)",
    description:
      "Layanan penguin batu kanal kemih menggunakan gelombang kejut tanpa pembedahan",
  },
  {
    slug: "mri",
    title: "MRI",
    description:
      "Pencitraan resonansi magnetik resolusi tinggi untuk membantu diagnosis yang lebih akurat",
  },
  {
    slug: "klinik-eksekutif",
    title: "Klinik Eksekutif",
    description:
      "Layanan '-' untuk pasien yang membutuhkan konsultasi cepat dengan dokter spesialis",
  },
];

/** 8 paket MCU reguler (section 5). Harga dan isi dibuat sendiri. */
export const MCU_PACKAGES = [
  {
    slug: "paket-dasar-1",
    title: "Paket Dasar 1",
    price: 750_000,
    items: ["Pemeriksaan dokter umum", "Darah lengkap", "Gula darah", "Kolesterol", "Urine"],
  },
  {
    slug: "paket-dasar-2",
    title: "Paket Dasar 2",
    price: 1_150_000,
    items: ["Semua Paket Dasar 1", "Fungsi hati", "Fungsi ginjal", "Asam urat", "EKG"],
  },
  {
    slug: "paket-calon-karyawan-pria",
    title: "Paket Calon Karyawan Pria",
    price: 1_450_000,
    items: ["Semua Paket Dasar 2", "Rontgen toraks", "Golongan darah", "Riwayatunteduh"],
  },
  {
    slug: "paket-calon-karyawan-wanita",
    title: "Paket Calon Karyawan Wanita",
    price: 1_450_000,
    items: ["Semua Paket Dasar 2", "Rontgen toraks", "Golongan darah", "USG abdomen"],
  },
  {
    slug: "paket-eksekutif-pria",
    title: "Paket Eksekutif Pria",
    price: 2_800_000,
    items: ["Semua Paket Calon Karyawan Pria", "Treadmill", "Audiometri", "SPIrometry", "USG karotis"],
  },
  {
    slug: "paket-eksekutif-wanita",
    title: "Paket Eksekutif Wanita",
    price: 2_950_000,
    items: ["Semua Paket Calon Karyawan Wanita", "Treadmill", "Mamografi", "Audiometri", "USG karotis"],
  },
  {
    slug: "paket-pemeriksaan-bebas-narkoba",
    title: "Paket Pemeriksaan Bebas Narkoba",
    price: 350_000,
    items: ["Tes urine", "Tes rambut", "Wawancara dengan konselor"],
  },
  {
    slug: "paket-pemeriksaan-sehat-rohani",
    title: "Paket Pemeriksaan Sehat Rohani",
    price: 400_000,
    items: ["Tes kebugaran jasmani", "Psikotest", "Tes EQ", "Konseling"],
  },
];

/** Berita & artikel kesehatan (section 6). Judul dan isi karangan sendiri. */
export const ARTICLES = [
  { slug: "rsud-contoh-sehat-terima-akreditasi-utama", title: "RSUD Contoh Sehat Terima Akreditasi Utama", date: "2026-09-28", excerpt: "RSUD Contoh Sehat resmi menerima akreditasi utama dari lembaga kesehatan nasional." },
  { slug: "layanan-stroke-terpadu", title: "Layanan Stroke Terpadu", date: "2026-09-22", excerpt: "Penanganan stroke cepat dengan tim defibrilasi dan UNIT stroke siaga." },
  { slug: "program-promosi-layanan-jantung", title: "Program Promosi Layanan Jantung Terpadu", date: "2026-09-15", excerpt: "Penawaran dan informasi layanan jantung terpadu." },
  { slug: "workshop-kesehatan-untuk-warga", title: "Workshop Kesehatan Untuk Warga", date: "2026-09-09", excerpt: "Kegiatan edukasi kesehatan rutin." },
  { slug: "peresmian-unit-maternal-center-baru", title: "Peresmian Unit Maternal Center Baru", date: "2026-09-03", excerpt: "Fasilitas ibu dan anak yang lebih lengkap." },
  { slug: "pemeriksaan-kesehatan-gratis-untuk-masyarakat", title: "Pemeriksaan Kesehatan Gratis Untuk Masyarakat", date: "2026-08-27", excerpt: "Ajang sosial kesehatan berkala." },
  { slug: "kanal-youtube-tersedia-resmi", title: "Kanal Youtube Tersedia Resmi", date: "2026-08-20", excerpt: "Siaran langsung dan podcast." },
  { slug: "pemantauan-tumbuh-kembang-bayi", title: "Pantauan Tumbuh Kembang Bayi", date: "2026-08-14", excerpt: "Layanan pemantauan tumbuh kembang anak secara berkala." },
  { slug: "kerja-sama-dengan-puskesmas", title: "Kerja Sama Dengan Puskesmas Waik", date: "2026-08-08", excerpt: "Rujukan berjenjang lebih baik." },
  { slug: "pelatihan-tenaga-kesehatan", title: "Pelatihan Tenaga Kesehatan", date: "2026-08-02", excerpt: "Peningkatan kompetensi tenaga kesehatan di lingkungan rumah sakit." },
  { slug: "zona-integritas-2026", title: "Zona Integritas 2026", date: "2026-07-27", excerpt: "Komitmen anti-korupsi yang kuat di seluruh unit kerja." },
  { slug: "rawat-inap-khusus-trauma", title: "Rawat Inap Khusus Untuk Pasien Trauma", date: "2026-07-20", excerpt: "Kamar VIP dan fasilitas perawatan intensif dengan pemantauan intensif." },
  { slug: "pemeriksaan-lab-cepat-dan-akurat", title: "Pemeriksaan Lab Cepat dan Akurat", date: "2026-07-14", excerpt: "Alat laboratorium modern." },
  { slug: "edukasi-gizi-bagi-keluarga", title: "Edukasi Gizi Bagi Keluarga", date: "2026-07-08", excerpt: "Pola makan seimbang." },
  { slug: "layanan-telemedicine-dikembangkan", title: "Layanan Telemedicine Dikembangkan", date: "2026-07-01", excerpt: "Konsultasi jarak jauh." },
  { slug: "kerja-sama-dengan-universitas", title: "Kerja Sama Dengan Universitas", date: "2026-06-24", excerpt: "Pendidikan dan penelitian bersama mitra universitas." },
];

/** Penghargaan & akreditasi (section 7). Placeholder generik. */
export const AWARDS = [
  "Penghargaan Beta Template 2026",
  "Akreditasi Rumah Sakit 2025",
  "Penghargaan Preventif Primer 2025",
  "Penghargaan Naik Kelas 2025",
  "Sertifikat Akreditasi Utama 2024",
  "Penghargaan Pelayanan Terbaik 2024",
  "Sertifikat ISO 9001 2024",
];

/** Galeri (section 8). Placeholder. */
export const GALLERY = [
  "Farmasi",
  "Poli Mata",
  "Rehabilitasi Medik",
  "Instalasi Gawat Darurat",
  "Ruang Perawatan",
  "Laboratorium",
];

/** 9 FAQ (section 13). Ditulis ulang dengan jawaban sesuai data fiktif. */
export const FAQS = [
  {
    question: "Apa saja layanan yang tersedia di RSUD Contoh Sehat?",
    answer:
      "Kami menyediakan layanan rawat jalan dengan 30 spesialisasi, rawat inap dan rawat inap khusus, instalasi gawat darurat 24 jam, layanan diagnostik seperti laboratorium dan radiologi, serta layanan prioritas seperti jantung terpadu, kanker terpadu, stroke terpadu, uro nefrologi, maternal center, dan medical check up.",
  },
  {
    question: "Bagaimana cara mendaftar Poli di RSUD Contoh Sehat?",
    answer:
      "Anda dapat mendaftar melalui halaman Daftar Online dengan mengisi formulir elektronik, atau datang langsung ke loket pendaftaran pada jam kerja. Pendaftaran daring memerlukan data diri berupa nama lengkap dan nomor telepon aktif.",
  },
  {
    question: "Apakah RSUD Contoh Sehat menerima pasien BPJS Kesehatan?",
    answer:
      "Ya, kami menerima rujukan pasien BPJS Kesehatan dari fasilitas kesehatan primer. Pasien disarankan membawa kartu BPJS yang masih aktif dan surat rujukan dari fasilitas kesehatan tempatEDFDC akan dilayani.",
  },
  {
    question: "Bagaimana alur pasien gawat darurat?",
    answer:
      "Pasien gawat darurat yang datang langsung ke instalasi gawat darurat akan segera ditriage oleh petugas kesehatan untuk menentukan tingkat kegawatdaruratan. Pasien dengan kondisi stabil akan diarahkan ke poli sesuai spesialisasinya.",
  },
  {
    question: "Apakah tersedia paket medical check up?",
    answer:
      "Tersedia delapan paket medical check up reguler dan beberapa paket Health Meets Holiday. Setiap paket mencakup pemeriksaan dokter, laboratorium, serta pemeriksaan penunjang sesuai tingkatan paket.",
  },
  {
    question: "Bagaimana cara mengetahui jadwal dokter?",
    answer:
      "Gunakan widget Cari Jadwal Dokter pada halaman utama. Pilih spesialisasi, lalu pilih dokter, kemudian pilih hari. Jadwal yang tersedia akan dimuat otomatis setelah pilihan lengkap.",
  },
  {
    question: "Apakah saya bisa menggunakan asuransi swasta?",
    answer:
      "Kami bekerja sama dengan berbagai perusahaan asuransi swasta. Anda dapat menghubungi bagian konfirmasi untuk memastikan procedur yang berlaku sebelum datang.",
  },
  {
    question: "Bagaimana cara menyampaikan keluhan atau keluhan?",
    answer:
      "Anda dapat menyampaikan masukan melalui halaman Kritik dan Saran. Setiap masukan yang terkirim akan diberi kode tiket sehingga dapat ditindaklanjuti oleh tim.front office.",
  },
  {
    question: "Di mana lokasi RSUD Contoh Sehat dan jam bukanya?",
    answer:
      "RSUD Contoh Sehat terletak di Jakarta Selatan. Layanan rawat jalan dibuka Senin sampai Jumat pukul 07.30 sampai 14.00, sedangkan instalasi gawat darurat dan layanan rawat inap tersedia 24 jam setiap hari.",
  },
];

/** 4 testimoni (section 11). Entirely Karangan sendiri, bukan data pasien nyata. */
export const TESTIMONIALS = [
  {
    name: "Aisyah Rahmawati",
    role: "Warga Tetangga Jakarta Selatan",
    quote:
      "Pelayanan di RSUD Contoh Sehat sangat memuaskan. Petugas kesehatan selalu sabar dan memberikan penjelasan yang mudah dipahami.",
  },
  {
    name: "Budi Santoso",
    role: "Warga Jakarta Selatan",
    quote:
      "Saya rutin melakukan pemeriksaan kesehatan di sini karena pelayanannya cepat dan tempatnya nyaman.",
  },
  {
    name: "Citra Dewi",
    role: "Warga Jakarta Selatan",
    quote:
      "Pendaftaran lewat sistem online sangat membantu, tidak perlu datang sebelum jam empat pagi untuk ambil nomor.",
  },
  {
    name: "Dimas Prasetyo",
    role: "Warga Jakarta Selatan",
    quote:
      "Instalasi gawat darurat bekerja dengan baik. Saya membawa keluarga yang kondisinya darurat dan ditangani dengan cepat serta tepat.",
  },
];

/** Mitra asuransi (section 12). Nama generik, bukan logo/asuransi nyata. */
export const INSURANCES = [
  "Asuransi Alfa",
  "Asuransi Beta",
  "Asuransi Cakra",
  "Asuransi Delta",
];

/** 3 tombol pendaftaran (section 9). */
export const REGISTRATION_OPTIONS = [
  { title: "JAKSEHAT", description: "Aplikasi Jaminan Kesehatan", icon: "bi-phone", href: "#" },
  { title: "JKN", description: "Jaminan Kesehatan Nasional", icon: "bi-shield-check", href: "#" },
  { title: "E-Pasien", description: "RSUD Contoh Sehat", icon: "bi-hospital", href: "/daftar-online" },
];

/** Nama dokter fiktif, dibuat dengan pola gelar seperti PRD bagian 9. */
export const DOCTORS_BY_SPECIALTY: Record<string, string[]> = {
  Anak: ["dr. Rina Kartika, Sp.A", "dr. Bayu Nugroho, Sp.A", "dr. Maya Puspita, Sp.A"],
  Jantung: ["dr. Fajar Ramadhan, Sp.JP", "dr. Nadia Kurnia, Sp.JP"],
  "Penyakit Dalam": ["dr. Agus Salim, Sp.PD", "dr. Gita Larasati, Sp.PD"],
  "Kebidanan dan Kandungan": ["dr. Siti Aminah, Sp.OG", "dr. Ratna Dewi, Sp.OG"],
  Mata: ["dr. Indra Wijaya, Sp.M", "dr. Melati Anggraini, Sp.M"],
  THT: ["dr. Yuni Shara, Sp.THT-KL", "dr. Gilang Perkasa, Sp.THT-KL"],
};