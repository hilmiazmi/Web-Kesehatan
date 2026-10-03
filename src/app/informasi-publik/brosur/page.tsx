import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import BrosurDirectory from "@/components/informasi/BrosurDirectory";
import { BROSURS } from "@/data/brosur";

export const metadata: Metadata = {
  title: "Brosur Digital",
  description: "Daftar brosur kesehatan untuk masyarakat di RSUD Contoh Sehat.",
};

/**
 * Halaman induk brosur digital.
 *
 * Kategori dan isi keduanya dibaca dari `src/data/brosur.ts`, jadi tab dan
 * kartu tidak mungkin berbeda dengan data.
 */
export default function BrosurPage() {
  return (
    <>
      <PageHeader
        title="Brosur Digital"
        subtitle="Materi kesehatan untuk masyarakat."
        trail={[
          { label: "Informasi Publik", href: "/informasi-publik" },
          { label: "Brosur Digital" },
        ]}
      />

      <section className="section">
        <div className="container">
          <p className="detail-lead">
            Pilih kategori di samping untuk melihat brosur yang tersedia.
          </p>

          <BrosurDirectory />

          <p className="klinik-panel-hours mt-4">
            <i className="bi bi-info-circle" aria-hidden="true" />
            {BROSURS.length} brosur tersedia.
          </p>
        </div>
      </section>
    </>
  );
}