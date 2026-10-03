import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { BROSUR_CATEGORIES, BROSURS } from "@/data/brosur";

export const dynamicParams = false;

export function generateStaticParams() {
  return BROSURS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = BROSURS.find((x) => x.slug === slug);
  if (!b) return { title: "Halaman Tidak Ditemukan" };
  return { title: b.title, description: b.lead };
}

/**
 * Satu halaman brosur.
 *
 * Kolom kiri berisi daftar brosur satu kategori yang sama, kolom kanan berisi
 * isi. Daftar diambil dari `BROSURS` supaya tidak ada daftar path manual.
 */
export default async function BrosurDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brosur = BROSURS.find((x) => x.slug === slug);
  if (!brosur) notFound();

  const kategori = BROSUR_CATEGORIES.find((c) => c.slug === brosur.category);
  const saudara = BROSURS.filter((b) => b.category === brosur.category);

  return (
    <>
      <PageHeader
        trail={[
          { label: "Informasi Publik", href: "/informasi-publik" },
          { label: "Brosur Digital", href: "/informasi-publik/brosur" },
          { label: brosur.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={saudara.map((s) => ({
              href: `/informasi-publik/brosur/${s.slug}`,
              label: s.title,
            }))}
            currentHref={`/informasi-publik/brosur/${brosur.slug}`}
          >
            <article>
              <h1 className="detail-title">{brosur.title}</h1>
              <p className="detail-lead">{brosur.lead}</p>

              {kategori ? (
                <p className="klinik-panel-hours">
                  <i className="bi bi-tag" aria-hidden="true" />
                  {kategori.name}
                </p>
              ) : null}

              {brosur.sections.map((s) => (
                <section key={s.heading}>
                  <h2 className="detail-subheading">{s.heading}</h2>
                  <ul className="detail-list">
                    {s.points.map((p) => (
                      <li key={p}>
                        <i className="bi bi-check-circle" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </article>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}