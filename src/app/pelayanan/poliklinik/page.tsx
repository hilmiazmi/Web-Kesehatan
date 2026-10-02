import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ClinicDirectory from "@/components/pelayanan/ClinicDirectory";

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
 */
export default function PoliklinikPage() {
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
          <ClinicDirectory />

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