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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
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
    <html lang="id" className={poppins.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Lewati ke konten utama
        </a>
        <Topbar />
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}