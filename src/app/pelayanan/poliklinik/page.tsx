import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PoliklinikList from "@/components/pelayanan/PoliklinikList";
import { SITE } from "@/data/navigation";
import { DOCTORS } from "@/data/doctors";
import { POLIKLINIK } from "@/data/poliklinik";
import { countDoctors } from "@/lib/poliklinik";

// Judul memakai template di layout: "%s | RSUD Contoh Sehat".
export const metadata: Metadata = {
  title: "Poliklinik",
  description: `Daftar poliklinik rawat jalan ${SITE.name} beserta lokasi dan jumlah dokternya.`,
};

/**
 * Daftar poliklinik, path `/pelayanan/poliklinik` (sama dengan href di navbar).
 * Setiap kartu menuju halaman detail `/poliklinik/[slug]`.
 *
 * Route spesifik ini otomatis menang atas halaman umum `[...slug]`, jadi
 * tidak perlu mengubah `navigation.ts` maupun `nav-path.ts`.
 */
export default function PoliklinikPage() {
  const items = POLIKLINIK.map((p) => ({
    ...p,
    doctorCount: countDoctors(p.specialty, DOCTORS),
  }));

  return (
    <>
      <PageHeader
        title="Poliklinik"
        subtitle="Pelayanan rawat jalan Senin sampai Jumat, pukul 07.30 sampai 14.00."
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Poliklinik" },
        ]}
      />

      <section className="section">
        <div className="container">
          <PoliklinikList items={items} />
        </div>
      </section>
    </>
  );
}
