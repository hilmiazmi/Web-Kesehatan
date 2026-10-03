import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ProfileTabs from "@/components/tentang/ProfileTabs";

export const metadata: Metadata = {
  title: "Profile RSUD",
  description:
    "Visi dan misi, budaya kerja, profil singkat, sejarah, dan maklumat pelayanan RSUD Contoh Sehat.",
};

/**
 * Halaman profil.
 *
 * Halaman acuan `/about` di situs referensi memuat lima seksi: Visi dan Misi,
 * Budaya Kerja, Company Profile, Sejarah, lalu Maklumat Pelayanan. Kelimanya
 * tidak ditumpuk berurutan melainkan jadi lima tab dengan daftar vertikal di
 * kolom kiri. Bagian tabnya ada di `src/components/tentang/ProfileTabs.tsx`.
 *
 * Urutan dan isi kelima seksi dijaga di `src/data/informasi.ts`.
 */
export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile RSUD"
        subtitle="Profil singkat, visi dan misi, sejarah, serta maklumat pelayanan."
        trail={[
          { label: "Tentang Kami", href: "/tentang-kami" },
          { label: "Profile RSUD" },
        ]}
      />

      <ProfileTabs />

      <section className="section">
        <div className="container">
          <Link href="/tentang-kami/manajemen" className="btn btn-primary">
            Lihat Manajemen
          </Link>
        </div>
      </section>
    </>
  );
}
