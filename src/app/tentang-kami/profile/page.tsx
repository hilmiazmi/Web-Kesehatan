import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { ABOUT_SECTIONS } from "@/data/informasi";

export const metadata: Metadata = {
  title: "Profile RSUD",
  description:
    "Visi dan misi, budaya kerja, profil singkat, sejarah, dan maklumat pelayanan RSUD Contoh Sehat.",
};

/**
 * Halaman profil.
 *
 * Halaman acuan `/about` di situs referensi memuat lima seksi berurutan: Visi
 * dan Misi, Budaya Kerja, Company Profile, Sejarah, lalu Maklumat Pelayanan.
 * Lima seksi itu dipakai apa adanya di sini, dan urutannya dijaga di
 * `src/data/informasi.ts`.
 *
 * Di halaman acuan kelima seksi itu sama-sama memakai tag h1. Tag itu tidak
 * ditiru: halaman ini punya satu h1 di PageHeader, tiap seksi memakai h2.
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

      {ABOUT_SECTIONS.map((section) => (
        <section className="section" key={section.slug}>
          <div className="container">
            <h2 className="detail-heading">{section.title}</h2>
            <p className="detail-lead">{section.lead}</p>
            <ul className="detail-list">
              {section.points.map((p) => (
                <li key={p}>
                  <i className="bi bi-check-circle" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

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