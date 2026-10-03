import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ClinicDirectory from "@/components/pelayanan/ClinicDirectory";
import { CLINIC_DETAILS, CLINICS } from "@/data/clinics";
import { DOCTORS } from "@/data/doctors";

export const metadata: Metadata = {
  title: "Poliklinik",
  description:
    "Daftar klinik yang tersedia di RSUD Contoh Sehat beserta layanan di setiap klinik.",
};

/**
 * Direktori klinik.
 *
 * Halaman acuan `/poliklinik` di situs referensi memuat enam belas klinik
 * dalam bentuk tab vertikal, dan jumlah itu sudah dicocokkan saat pengukuran.
 *
 * `ClinicDirectory` adalah komponen client, jadi data diteruskan sebagai props
 * dari sini. Yang dikirim hanya kolom yang benar-benar dirender direktori:
 * deskripsi, layanan, dan jam praktik untuk klinik; nama, induknya, dan
 * spesialisnya saja untuk tiap kartu detail. Isi penuh 25 halaman detail —
 * deskripsi, layanan, jam — tidak perlu masuk browser karena tidak dirender di
 * halaman ini.
 *
 * `doctors` yang dikirim hanya slug, nama, dan spesialis. Jadwal praktiknya
 * tidak ikut, karena sudah tampil sendiri di `/jadwal-dokter`.
 */
export default function PoliklinikPage() {
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
  const doctors = DOCTORS.map(({ slug, name, specialty }) => ({
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
          <ClinicDirectory clinics={clinics} details={details} doctors={doctors} />

          <div className="d-flex gap-2 flex-wrap mt-5">
            <Link href="/daftar-online" className="btn btn-primary">
              Daftar Online
            </Link>
            <Link href="/pelayanan" className="btn btn-tertiary">
              Semua Jenis Pelayanan
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}