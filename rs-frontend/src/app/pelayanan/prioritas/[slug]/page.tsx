import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { FACILITIES, PRIORITY_SERVICES } from "@/data/home";
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

export default async function PriorityServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = PRIORITY_SERVICES.findIndex((s) => s.slug === slug);
  if (index === -1) notFound();

  const service = PRIORITY_SERVICES[index];
  const others = PRIORITY_SERVICES.filter((s) => s.slug !== slug);

  // Daftar fasilitas pendukung diambil dari data fasilitas yang sudah ada,
  // bukan daftar baru, supaya tidak ada data yangdobel.
  const relatedFacilities = FACILITIES.slice(index % 3, (index % 3) + 3);

  return (
    <>
      <PageHeader
        title={service.title}
        subtitle={service.description}
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Layanan Prioritas", href: "/pelayanan/prioritas" },
          { label: service.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6">
                <Photo
                  src={photo(PRIORITY_PHOTOS[index % PRIORITY_PHOTOS.length], 900, 700)}
                  alt={service.title}
                  sizes="(max-width: 992px) 100vw, 560px"
                  priority
                  height={230}
                  radius="all"
                />
            </div>

            <div className="col-lg-6">
              <h2 className="detail-heading">{service.title}</h2>
              <p className="detail-lead">{service.description}</p>

              <h3 className="detail-subheading">Fasilitas pendukung</h3>
              <ul className="detail-list">
                {relatedFacilities.map((f) => (
                  <li key={f.slug}>
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {f.title}
                  </li>
                ))}
              </ul>

              <div className="d-flex gap-2 flex-wrap mt-4">
                <Link href="/daftar-online" className="btn btn-primary">
                  Daftar Online
                </Link>
                <Link href="/pelayanan/prioritas" className="btn btn-tertiary">
                  Semua Layanan Prioritas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section light-background">
        <div className="container section-title pb-4">
          <h2>Layanan Prioritas Lainnya</h2>
        </div>
        <div className="container">
          <div className="row gy-4 gx-4">
            {others.map((s, i) => (
              <div className="col-md-4" key={s.slug}>
                <div className="card">
                  <div className="image-content">
                      <Photo
                        src={photo(
                          PRIORITY_PHOTOS[(index + i + 1) % PRIORITY_PHOTOS.length],
                          600,
                          400
                        )}
                        alt={s.title}
                        sizes="(max-width: 768px) 100vw, 360px"
                        height={190}
                        radius="top"
                      />
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{s.title}</h3>
                    <p className="card-description">{s.description}</p>
                    <Link
                      href={`/pelayanan/prioritas/${s.slug}`}
                      className="btn btn-primary"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}