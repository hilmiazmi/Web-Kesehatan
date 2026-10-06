import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { DetailBody, DetailLayout } from "@/components/pelayanan/DetailLayout";
import { DETAIL_CONTENT, DETAIL_INTRO_TAIL } from "@/data/detail-content";
import { FACILITIES } from "@/data/home";
import { FACILITY_PHOTOS, photo } from "@/data/images";

/**
 * Hanya slug yang sudah ada yang boleh dibuka; slug asing menjawab 404
 * sungguhan, bukan halaman yang di-render saat diminta.
 */
export const dynamicParams = false;

/** Prerender semua fasilitas medis saat build. */
export function generateStaticParams() {
  return FACILITIES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = FACILITIES.find((f) => f.slug === slug);
  if (!facility) return { title: "Fasilitas Tidak Ditemukan" };
  return {
    title: facility.title,
    description: facility.description,
  };
}

/**
 * Halaman detail satu fasilitas medis.
 *
 * Jumlah dan urutan fasilitas mengikuti halaman instalasi gawat darurat di
 * situs referensi, yang memuat delapan fasilitas di sidebar halaman detailnya.
 * Sidebar di sini memuat seluruh fasilitas yang ada, bukan hanya yang tampil
 * di sana, supaya tidak ada halaman yatim.
 */
export default async function MedicalFacilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = FACILITIES.findIndex((f) => f.slug === slug);
  if (index === -1) notFound();

  const facility = FACILITIES[index];
  const href = `/pelayanan/medis/${facility.slug}`;
  const points = DETAIL_CONTENT[facility.slug]?.points ?? [];

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Layanan Medis", href: "/pelayanan/medis" },
          { label: facility.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={FACILITIES.map((f) => ({
              href: `/pelayanan/medis/${f.slug}`,
              label: f.title,
            }))}
            currentHref={href}
          >
            <DetailBody
              title={facility.title}
              description={facility.description}
              points={points}
              photoSrc={photo(
                FACILITY_PHOTOS[index % FACILITY_PHOTOS.length],
                900,
                600
              )}
              photoAlt={facility.title}
              introTail={DETAIL_INTRO_TAIL}
            />

            <div className="d-flex gap-2 flex-wrap mt-4">
              <Link href="/daftar-online" className="btn btn-primary">
                Daftar Online
              </Link>
              <Link href="/pelayanan/medis" className="btn btn-tertiary">
                Semua Layanan Medis
              </Link>
            </div>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}