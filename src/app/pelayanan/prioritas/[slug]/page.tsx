import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { DetailBody, DetailLayout } from "@/components/pelayanan/DetailLayout";
import { PRIORITY_SERVICES } from "@/data/home";
import { DETAIL_CONTENT, DETAIL_INTRO_TAIL } from "@/data/detail-content";
import { PRIORITY_PHOTOS, photo } from "@/data/images";

/** Prerender semua layanan prioritas saat build. */
export function generateStaticParams() {
  return PRIORITY_SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = PRIORITY_SERVICES.find((s) => s.slug === slug);
  if (!service) return { title: "Layanan Tidak Ditemukan" };
  return {
    title: service.title,
    description: service.description,
  };
}

/**
 * Halaman detail satu layanan prioritas.
 *
 * Susunannya mengikuti halaman detail di situs referensi: daftar layanan
 * prioritas lain di kolom kiri, isi layanan di kolom kanan. Karena itu judul
 * tidak lagi dipakai di PageHeader, yang di sini hanya merender remah roti.
 */
export default async function PriorityServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = PRIORITY_SERVICES.findIndex((s) => s.slug === slug);
  if (index === -1) notFound();

  const service = PRIORITY_SERVICES[index];
  const href = `/pelayanan/prioritas/${service.slug}`;
  const points = DETAIL_CONTENT[service.slug]?.points ?? [];

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Layanan Prioritas", href: "/pelayanan/prioritas" },
          { label: service.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={PRIORITY_SERVICES.map((s) => ({
              href: `/pelayanan/prioritas/${s.slug}`,
              label: s.title,
            }))}
            currentHref={href}
          >
            <DetailBody
              title={service.title}
              description={service.description}
              points={points}
              photoSrc={photo(
                PRIORITY_PHOTOS[index % PRIORITY_PHOTOS.length],
                900,
                600
              )}
              photoAlt={service.title}
              introTail={DETAIL_INTRO_TAIL}
            />

            <div className="d-flex gap-2 flex-wrap mt-4">
              <Link href="/daftar-online" className="btn btn-primary">
                Daftar Online
              </Link>
              <Link href="/pelayanan/prioritas" className="btn btn-tertiary">
                Semua Layanan Prioritas
              </Link>
            </div>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}