import type { Metadata } from "next";
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
        {/* Dipasang di luar `<main>` karena posisinya tetap di layar dan tidak
            boleh ikut bergeser bersama isi halaman. Targetnya `#main-content`
            sudah ada di atas, jadi tombol ini tetap bekerja tanpa JavaScript. */}
        <BackToTop />
      </body>
    </html>
  );
}