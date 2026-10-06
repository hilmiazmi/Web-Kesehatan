import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import { FACILITY_PHOTOS, photo } from "@/data/images";

/**
 * Hanya slug yang sudah ada yang boleh dibuka; slug asing menjawab 404
 * sungguhan, bukan halaman yang di-render saat diminta.
 */
export const dynamicParams = false;

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
 * Isi tiap layanan ditata di `sections` pada `src/data/informasi.ts`, jadi
 * halaman ini tidak perlu membedakan laboratorium dari radiologi. Keduanya
 * punya bagian bertitel dengan daftar, dan bagian bertitel dengan kartu;
 * hanya isi di dalamnya yang berbeda.
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

              {service.paragraphs?.map((paragraf) => (
                <p key={paragraf}>{paragraf}</p>
              ))}

              {service.sections.map((bagian) => (
                <section key={bagian.title}>
                  <h2 className="detail-subheading">{bagian.title}</h2>

                  {bagian.lead ? <p>{bagian.lead}</p> : null}

                  {bagian.points && (
                    <ul className="detail-list">
                      {bagian.points.map((p) => (
                        <li key={p}>
                          <i className="bi bi-check-circle" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}

                  {bagian.cards && (
                    <div className="row g-4">
                      {bagian.cards.map((kartu) => (
                        <div
                          className="col-md-6 col-lg-4"
                          key={kartu.id}
                          id={kartu.id}
                        >
                          <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body">
                              <i
                                className={`bi ${kartu.icon} detail-card-icon`}
                                aria-hidden="true"
                              />
                              <h3 className="h5 mt-2">{kartu.name}</h3>

                              {/* Satu butir ditampilkan sebagai paragraf, karena
                                  keterangan kartu laboratorium memang satu
                                  kalimat. Lebih dari satu butir memakai daftar,
                                  seperti fungsi tindakan pada alat. */}
                              {kartu.points.length === 1 ? (
                                <p className="mb-0">{kartu.points[0]}</p>
                              ) : (
                                <>
                                  <p className="text-muted small mb-2">
                                    Fungsi tindakan:
                                  </p>
                                  <ul className="detail-list">
                                    {kartu.points.map((p) => (
                                      <li key={p}>
                                        <i
                                          className="bi bi-check-circle"
                                          aria-hidden="true"
                                        />
                                        {p}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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