import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ClinicDirectory from "@/components/pelayanan/ClinicDirectory";
import { CLINIC_DETAILS, CLINICS } from "@/data/clinics";
import { getPublicDoctors } from "@/lib/content-loader";

export const metadata: Metadata = {
  title: "Poliklinik",
  description:
    "Daftar klinik yang tersedia di RSUD Contoh Sehat beserta layanan di setiap klinik.",
};

export const revalidate = 60;

/**
 * Direktori klinik.
 *
 * Halaman acuan `/poliklinik` di situs referensi memuat enam belas klinik
 * dalam bentuk tab vertikal, dan jumlah itu sudah dicocokkan saat pengukuran.
 *
 * `ClinicDirectory` adalah komponen client, jadi data diteruskan sebagai props
 * dari sini. Yang dikirim hanya kolom yang benar-benar dirender direktori:
 * deskripsi, layanan, dan jam praktik untuk klinik; nama, induknya, dan
 * spesialisnya saja untuk tiap kartu detail.
 *
 * `doctors` yang dikirim dibaca via `getPublicDoctors()`, mencakup dokter
 * dari database jika mode live dan fallback ke data statis bawaan.
 */
export default async function PoliklinikPage() {
  const allDoctors = await getPublicDoctors();
  const clinics = CLINICS.map(({ slug, name, description, services, hours }) => ({
    slug,
    name,
    description,
    services,
    hours,
  }));
  const details = CLINIC_DETAILS.map(({ slug, name, clinicSlug, specialty }) => ({
    slug,
    name,
    clinicSlug,
    // Spesialis di sini yang menghubungkan klinik ke dokter. Tanpa itu,
    // `cariKlinik()` tidak bisa menampilkan dokter di bawah klinik yang tepat.
    specialty,
  }));
  // Jadwal dokter tidak ikut dikirim. Yang dibutuhkan pencarian hanya nama dan
  // spesialisnya, sedangkan jadwalnya sudah tampil di `/jadwal-dokter`.
  const doctors = allDoctors.map(({ slug, name, specialty }) => ({
    slug,
    name,
    specialty,
  }));

  return (
    <>
      <PageHeader
        title="Poliklinik"
        subtitle="Pilih klinik sesuai keluhan Anda. Daftar di bawah memuat enam belas klinik."
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Poliklinik" },
        ]}
      />

      <section className="section">
        <div className="container">
          <ClinicDirectory
            clinics={clinics}
            details={details}
            doctors={doctors}
          />

          <div className="d-flex gap-2 flex-wrap mt-4">
            <Link href="/daftar-online" className="btn btn-primary">
              Daftar Online
            </Link>
            <Link href="/jadwal-dokter" className="btn btn-tertiary">
              Lihat Jadwal Lengkap
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
