import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import { FACILITY_PHOTOS, photo } from "@/data/images";

/** Prerender semua layanan diagnostik saat build. */
export function generateStaticParams() {
  return DIAGNOSTIC_SERVICES.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = DIAGNOSTIC_SERVICES.find((d) => d.slug === slug);
  if (!service) return { title: "Layanan Tidak Ditemukan" };
  return {
    title: service.title,
    description: service.description,
  };
}

/**
 * Halaman detail satu layanan diagnostik.
 *
 * Laboratorium memuat daftar pemeriksaan datar, sedangkan radiologi
 * menampilkan pemeriksaan yang dikelompokkan per alat. Keduanya memakai
 * bentuk data yang sama di `src/data/informasi.ts` supaya halaman ini tidak
 * perlu branching.
 */
export default async function DiagnosticServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = DIAGNOSTIC_SERVICES.findIndex((d) => d.slug === slug);
  if (index === -1) notFound();

  const service = DIAGNOSTIC_SERVICES[index];
  const href = `/pelayanan/diagnostik/${service.slug}`;

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Layanan Diagnostik", href: "/pelayanan/diagnostik" },
          { label: service.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={DIAGNOSTIC_SERVICES.map((d) => ({
              href: `/pelayanan/diagnostik/${d.slug}`,
              label: d.title,
            }))}
            currentHref={href}
          >
            <article>
              <h1 className="detail-title">{service.title}</h1>

              <div className="detail-body-photo">
                <Photo
                  src={photo(
                    FACILITY_PHOTOS[(index + 2) % FACILITY_PHOTOS.length],
                    900,
                    600
                  )}
                  alt={service.title}
                  sizes="(max-width: 992px) 100vw, 720px"
                  preload
                  height={280}
                  radius="all"
                />
              </div>

              <p className="detail-lead">{service.description}</p>

              {service.groups.map((group) => (
                <section key={group.name}>
                  <h2 className="detail-subheading">{group.name}</h2>
                  <ul className="detail-list">
                    {group.points.map((p) => (
                      <li key={p}>
                        <i className="bi bi-check-circle" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <div className="d-flex gap-2 flex-wrap mt-4">
                <Link href="/daftar-online" className="btn btn-primary">
                  Daftar Online
                </Link>
                <Link href="/pelayanan/diagnostik" className="btn btn-tertiary">
                  Semua Layanan Diagnostik
                </Link>
              </div>
            </article>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}