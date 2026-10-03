import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { ClinicDetailBody } from "@/components/pelayanan/ClinicDetailBody";
import { CLINIC_DETAILS } from "@/data/clinics";

export const dynamicParams = false;

/** Prerender seluruh 25 halaman detail klinik saat build. */
export function generateStaticParams() {
  return CLINIC_DETAILS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = CLINIC_DETAILS.find((x) => x.slug === slug);
  if (!d) return { title: "Klinik Tidak Ditemukan" };
  return { title: d.name, description: d.description };
}

/**
 * Halaman detail satu klinik poliklinik.
 *
 * Di situs referensi setiap kartu klinik di /poliklinik menuju ke halaman
 * seperti ini. Susunannya sama dengan halaman detail layanan: daftar klinik
 * di kolom kiri, isi di kolom kanan.
 */
export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = CLINIC_DETAILS.find((x) => x.slug === slug);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Poliklinik", href: "/pelayanan/poliklinik" },
          { label: detail.name },
        ]}
      />

      <section className="section">
        <div className="container">
          <ClinicDetailBody detail={detail} />
        </div>
      </section>
    </>
  );
}