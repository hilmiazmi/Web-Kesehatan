/**
 * Data navigasi global.
 *
 * Struktur ini mengikuti DOM situs referensi yang sudah diverifikasi:
 * 11 item level-1, dengan dropdown sampai 3 tingkat
 * (Pelayanan → MCU → Paket Reguler → daftar paket).
 *
 * CATATAN: nama RS dan kontak di sini adalah FIKTIF sesuai PRD bagian 9.
 * Aset, nama dokter, dan kontak asli situs referensi tidak disalin.
 */

import { NAV_PPID_CHILDREN } from "./ppid-nav";

export type NavChild = {
  label: string;
  href: string;
  /** Anak tingkat ketiga, mis. daftar paket MCU di dalam "Paket Reguler". */
  children?: NavChild[];
  /** Tandai link yang di situs asal menuju ke luar (iframe/embed pihak ketiga). */
  external?: boolean;
};

export type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Tentang Kami",
    href: "/tentang-kami",
    children: [
      { label: "Profile RSUD", href: "/tentang-kami/profile" },
      { label: "Manajemen", href: "/tentang-kami/manajemen" },
    ],
  },
  {
    label: "Pelayanan",
    href: "/pelayanan",
    children: [
      { label: "Poliklinik", href: "/pelayanan/poliklinik" },
      {
        label: "Layanan Prioritas",
        href: "/pelayanan/prioritas",
        children: [
          { label: "Jantung Terpadu", href: "/pelayanan/prioritas/jantung-terpadu" },
          { label: "Kanker Terpadu", href: "/pelayanan/prioritas/kanker-terpadu" },
          { label: "Medical Check Up", href: "/pelayanan/prioritas/medical-check-up" },
          { label: "Stroke Terpadu", href: "/pelayanan/prioritas/stroke-terpadu" },
          { label: "Uro Nefrologi", href: "/pelayanan/prioritas/uro-nefrologi" },
          { label: "Maternal Center", href: "/pelayanan/prioritas/maternal-center" },
        ],
      },
      {
        label: "Layanan Diagnostik",
        href: "/pelayanan/diagnostik",
        children: [
          { label: "Laboratorium", href: "/pelayanan/diagnostik/laboratorium" },
          { label: "Radiologi", href: "/pelayanan/diagnostik/radiologi" },
        ],
      },
      {
        label: "Layanan Medis",
        href: "/pelayanan/medis",
        children: [
          { label: "Instalasi Gawat Darurat", href: "/pelayanan/medis/instalasi-gawat-darurat" },
          { label: "Rawat Jalan", href: "/pelayanan/medis/rawat-jalan" },
          { label: "Rawat Inap", href: "/pelayanan/medis/rawat-inap" },
          { label: "Rawat Inap Khusus", href: "/pelayanan/medis/rawat-inap-khusus" },
          // Empat unit ini sudah punya data di FACILITIES dan DETAIL_CONTENT,
          // sehingga rutenya terbentuk sendiri dari generateStaticParams. Tapi
          // tanpa baris di sini, tidak ada satu pun tautan yang mengarah
          // kepadanya: submenu ini, halaman indeks "/pelayanan/medis", dan
          // blok tautan-anak di "/informasi-publik/fasilitas" semuanya membaca
          // dari NAV_ITEMS. Halaman yang tidak punya jalan masuk hanya bisa
          // dibuka lewat URL yang diketik tangan.
          { label: "Diagnostic Center", href: "/pelayanan/medis/diagnostic-center" },
          { label: "ESWL", href: "/pelayanan/medis/eswl" },
          { label: "MRI", href: "/pelayanan/medis/mri" },
          { label: "Klinik Eksekutif", href: "/pelayanan/medis/klinik-eksekutif" },
        ],
      },
      {
        label: "MCU",
        href: "/pelayanan/mcu",
        children: [
          {
            label: "Paket Reguler",
            href: "/pelayanan/mcu/reguler",
            children: [
              { label: "Paket Dasar 1", href: "/pelayanan/mcu/reguler/paket-dasar-1" },
              { label: "Paket Dasar 2", href: "/pelayanan/mcu/reguler/paket-dasar-2" },
              { label: "Paket Calon Karyawan Pria", href: "/pelayanan/mcu/reguler/paket-calon-karyawan-pria" },
              { label: "Paket Calon Karyawan Wanita", href: "/pelayanan/mcu/reguler/paket-calon-karyawan-wanita" },
              { label: "Paket Eksekutif Pria", href: "/pelayanan/mcu/reguler/paket-eksekutif-pria" },
              { label: "Paket Eksekutif Wanita", href: "/pelayanan/mcu/reguler/paket-eksekutif-wanita" },
              { label: "Paket Pemeriksaan Bebas Narkoba", href: "/pelayanan/mcu/reguler/paket-pemeriksaan-bebas-narkoba" },
              { label: "Paket Pemeriksaan Sehat Rohani", href: "/pelayanan/mcu/reguler/paket-pemeriksaan-sehat-rohani" },
            ],
          },
          {
            label: "Paket Health Meets Holiday",
            href: "/pelayanan/mcu/holiday",
            children: [
              { label: "Paket Anak Sekolah - Basic: Health & Fun", href: "/pelayanan/mcu/holiday/anak-sekolah-basic-health-fun" },
              { label: "Paket Anak Sekolah - Medical & Explore", href: "/pelayanan/mcu/holiday/anak-sekolah-medical-explore" },
              { label: "Paket Anak Sekolah - Fun & Talent", href: "/pelayanan/mcu/holiday/anak-sekolah-fun-talent" },
              { label: "Paket Screening Cancer Male", href: "/pelayanan/mcu/holiday/screening-cancer-male" },
              { label: "Paket Screening Cancer Female", href: "/pelayanan/mcu/holiday/screening-cancer-female" },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "Informasi Publik",
    href: "/informasi-publik",
    children: [
      { label: "Survey Kepuasan Masyarakat", href: "/informasi-publik/skm" },
      { label: "Standar Pelayanan", href: "/dokumen/standar-pelayanan" },
      { label: "Kompensasi Pelayanan", href: "/dokumen/kompensasi-pelayanan" },
      { label: "Pengaduan Masyarakat", href: "/informasi-publik/pengaduan" },
      {
        label: "Fasilitas",
        href: "/informasi-publik/fasilitas",
        children: [{ label: "Aula", href: "/informasi-publik/aula" }],
      },
      { label: "Karir", href: "/informasi-publik/karir" },
      { label: "Brosur Digital", href: "/informasi-publik/brosur" },
      { label: "Budaya Keselamatan", href: "/informasi-publik/budaya-keselamatan" },
    ],
  },
  {
    label: "Zona Integritas",
    href: "/zona-integritas",
    children: [
      { label: "Video Zona Integritas", href: "/zona-integritas/video" },
      { label: "WBS", href: "/zona-integritas/wbs" },
      { label: "Regulasi Zona Integritas", href: "/dokumen/regulasi-zi" },
      { label: "Foto Kegiatan", href: "/zona-integritas/foto-kegiatan" },
    ],
  },
  {
    label: "PPID",
    href: "/ppid",
    children: NAV_PPID_CHILDREN,
  },
  {
    label: "Diklat",
    href: "/diklat",
    children: [
      { label: "Kemahasiswaan", href: "/diklat/kemahasiswaan" },
      { label: "Penelitian", href: "/diklat/penelitian" },
      { label: "Kaji Banding", href: "/diklat/kaji-banding" },
    ],
  },
  { label: "Kapasitas Bed", href: "/kapasitas-bed" },
];

/** Dua tombol CTA di kanan header. */
export const HEADER_CTAS = [
  { label: "Daftar Online", href: "/daftar-online", className: "btn-primary" },
  { label: "Administrasi Pasien", href: "/administrasi", className: "btn-tertiary" },
];

/**
 * Tautan kecil di footer.
 *
 * Disimpan sebagai data, bukan ditulis langsung di JSX, supaya ikut ikut
 * didaftarkan oleh `collectNavPaths()` dan tidak berakhir jadi tautan mati.
 */
export const FOOTER_LINKS = [
  { label: "Jadwal Dokter", href: "/jadwal-dokter" },
  { label: "Peta Situs", href: "/sitemap" },
  { label: "Kontak", href: "/kontak" },
];

/**
 * Alamat yang tampil di footer.
 *
 * Dipisah dari komponen supaya tidak ada alamat yang ditulis langsung di
 * markup. Isinya fiktif, bukan alamat rumah sakit nyata.
 */
export const FOOTER_ADDRESS = [
  "Jl. Contoh No. 123",
  "Ragunan, Pasar Minggu",
  "Jakarta Selatan, DKI Jakarta",
  "Indonesia 12560",
];

/**
 * Isi blok "Link Terkait" di footer.
 *
 * Di situs referensi isinya logo instansi pemerintah lain yang membuka tab
 * baru. Logo resmi tidak disalin (PRD bagian 12), jadi tempat logo dipakai
 * link internal yang benar-benar ada di situs ini. Menautkan ke situs
 * pemerintah sungguhan dari identitas fiktif akan menyesatkan.
 */
export const FOOTER_RELATED = [
  { label: "PPID", href: "/ppid" },
  { label: "Peta Situs", href: "/sitemap" },
  { label: "Daftar Online", href: "/daftar-online" },
  { label: "Zona Integritas", href: "/zona-integritas" },
  { label: "Kontak", href: "/kontak" },
  { label: "Tentang Kami", href: "/tentang-kami" },
];

/** Kontak di topbar. Fiktif, bukan data asli. */
export const CONTACT = {
  phone: "(021) 5000 1234",
  phoneHref: "tel:+622150001234",
  whatsapp: "+6281100001234",
  whatsappHref: "https://wa.me/6281100001234",
  email: "info@rsudcontoh.go.id",
};

/** Tautan sosial media. */
export const SOCIALS = [
  { icon: "bi-facebook", href: "https://facebook.com", label: "Facebook" },
  { icon: "bi-twitter", href: "https://x.com", label: "X" },
  { icon: "bi-instagram", href: "https://instagram.com", label: "Instagram" },
  { icon: "bi-youtube", href: "https://youtube.com", label: "YouTube" },
];

/** Identitas situs. Nama fiktif, bisa diubah nanti lewat konfigurasi. */
export const SITE = {
  name: "RSUD Contoh Sehat",
  tagline: "Rumah Sehat Untuk Semua",
  description:
    "RSUD Contoh Sehat merupakan rumah sakit pemerintah daerah tipe B yang melayani layanan kesehatan primer dan rujukan bagi warga Jabodetabek.",
};