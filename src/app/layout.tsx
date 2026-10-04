import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/styles/tokens.css";
import "@/styles/site.css";
import "@/styles/pages.css";
import Topbar from "@/components/layout/Topbar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";
import QuickActionBar from "@/components/layout/QuickActionBar";
import { siteUrl } from "@/lib/site-url";

/**
 * Poppins dipakai sebagai pengganti Gotham/Gotham Rounded.
 * Font asli situs referensi berdesain lisensi komersial sehingga tidak boleh
 * disalin. Poppins dipilih karena paling dekat: sama-sama geometris dan bulat.
 * Lihat docs/design-tokens-terverifikasi.md bagian 2.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "RSUD Contoh Sehat | Rumah Sehat Untuk Semua",
    // Pola judul mengikuti situs referensi: "<Judul> | <Nama RS> - <Tagline>"
    template: "%s | RSUD Contoh Sehat",
  },
  description:
    "RSUD Contoh Sehat merupakan rumah sakit pemerintah daerah tipe B yang melayani layanan kesehatan primer dan rujukan bagi warga Jabodetabek.",
  keywords: [
    "rumah sakit",
    "RSUD",
    "layanan kesehatan",
    "dokter spesialis",
    "fasilitas rumah sakit",
    "medical check up",
    "rumah sakit pemerintah",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "RSUD Contoh Sehat",
  },
  robots: { index: true, follow: true },
};

/**
 * Warna bilah peramban, bukan warna aksen CSS.
 *
 * PRD bagian 8.2 menyebut `#1A77CC` sebagai "nilai theme-color pada meta
 * situs referensi", dan nilai itulah yang dipakai di sini. `--rs-accent`
 * yang `#1977cc` hanya untuk tombol, latar, dan garis.
 *
 * `themeColor` harus ada di sini, bukan di `metadata`. Sudah deprecated
 * sejak Next.js 14 di sana, dan Next.js membuangnya tanpa peringatan:
 * menulisnya di `metadata` tetap lolos typecheck, tapi tag-nya tidak
 * pernah muncul di HTML hasil build.
 *
 * Sebelum meta ini ditambahkan, nilai tersebut tidak muncul di HTML
 * sama sekali dan token `--rs-accent-theme-color` di `tokens.css` tidak
 * pernah dibaca siapa pun.
 */
export const viewport: Viewport = {
  themeColor: "#1a77cc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning diperlukan karena beberapa ekstensi browser
    // (Grammarly, LanguageTool, dan Grammarly alike) menyuntik atribut seperti
    // data-gr-ext-installed dan data-lt-installed ke <html> dan <body>
    // SEBELUM React selesai hydrate. Tanpa flag ini mismatch dilaporkan
    // sebagai error, padahal bukan bug kode kita.
    //
    // data-scroll-behavior="smooth" adalah atribut milik Next.js, bukan
    // atribut HTML. Bootstrap men-set scroll-behavior: smooth pada :root
    // selama pengguna tidak meminta reduced motion, dan Next.js memperingatkan
    // bahwa navigasi antar halaman tidak boleh memakai smooth scroll tanpa
    <html
      lang="id"
      className={poppins.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Lewati ke konten utama
        </a>
        <Topbar />
        <Navbar />
        {/* `tabIndex={-1}` membuat tautan lewati benar-benar memindahkan fokus,
            bukan hanya menggulir layar. Tanpa itu, menekan Tab setelah
            melompat ke sini mengembalikan fokus ke link itu sendiri, sehingga
            pengguna keyboard harus melompat satu per satu melewati seluruh
            header lagi. Nilainya -1 supaya elemen ini tidak masuk urutan Tab
            biasa. */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        {/* Bilah aksi cepat dan tombol kembali ke atas sama-sama melayang di
            luar alur halaman, jadi keduanya dipasang di luar `<main>` supaya
            tidak ikut bergeser bersama isi. Bilah aksi memakai tepi kanan;
            tombol kembali ke atas memakai tepi kiri, supaya keduanya tidak
            saling menutupi. Target `#main-content` sudah ada di atas, jadi
            tombol kembali ke atas tetap bekerja tanpa JavaScript. */}
        <QuickActionBar />
        <BackToTop />
      </body>
    </html>
  );
}