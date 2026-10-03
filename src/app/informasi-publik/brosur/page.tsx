import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import BrosurDirectory from "@/components/informasi/BrosurDirectory";
import { BROSUR_CATEGORIES, BROSURS } from "@/data/brosur";

export const metadata: Metadata = {
  title: "Brosur Digital",
  description: "Daftar brosur kesehatan untuk masyarakat di RSUD Contoh Sehat.",
};

/**
 * Halaman induk brosur digital.
 *
 * Kategori dan isi keduanya dibaca dari `src/data/brosur.ts`, jadi tab dan
 * kartu tidak mungkin berbeda dengan data.
 *
 * `BrosurDirectory` adalah komponen client karena kategori di sampingnya perlu
 * `useState`. Yang dikirim ke sana hanya kolom yang dirender: slug, judul,
 * kategori, dan lead. Isi tiap brosur beserta poin-poinnya tidak perlu masuk
 * browser, karena detailnya dibaca server di halaman masing-masing.
 */
export default function BrosurPage() {
  const brosurs = BROSURS.map(({ slug, title, category, lead }) => ({
    slug,
    title,
    category,
    lead,
  }));

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

          <BrosurDirectory categories={BROSUR_CATEGORIES} brosurs={brosurs} />

          <p className="klinik-panel-hours mt-4">
            <i className="bi bi-info-circle" aria-hidden="true" />
            {BROSURS.length} brosur tersedia.
          </p>
        </div>
      </section>
    </>
  );
}