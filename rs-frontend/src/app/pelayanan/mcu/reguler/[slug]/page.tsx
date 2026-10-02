import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { MCU_PACKAGES } from "@/data/home";
import { formatIDR } from "@/lib/format";


/** Prerender semua paket MCU saat build. */
export function generateStaticParams() {
  return MCU_PACKAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = MCU_PACKAGES.find((p) => p.slug === slug);
  if (!pkg) return { title: "Paket Tidak Ditemukan" };
  return {
    title: pkg.title,
    description: `Paket medical check up ${pkg.title} dengan harga ${formatIDR(pkg.price)}.`,
  };
}

export default async function McuPackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = MCU_PACKAGES.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const pkg = MCU_PACKAGES[index];
  const others = MCU_PACKAGES.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <>
      <PageHeader
        title={pkg.title}
        subtitle="Paket medical check up untuk membantu Anda mengenali kondisi kesehatan sejak dini."
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Reguler", href: "/pelayanan/mcu/reguler" },
          { label: pkg.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card mcu-detail-card">
                <div className="card-content">
                  <p className="mcu-price mcu-price-large">{formatIDR(pkg.price)}</p>

                  <h2 className="detail-heading">Rincian Pemeriksaan</h2>
                  <ul className="mcu-items mcu-items-detailed">
                    {pkg.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <h2 className="detail-heading mt-4">Syarat dan Ketentuan</h2>
                  <ul className="detail-list">
                    <li>
                      <i className="bi bi-check-circle" aria-hidden="true" />
                      Pesanan Minimal 2 hari sebelum pemeriksaan.
                    </li>
                    <li>
                      <i className="bi bi-check-circle" aria-hidden="true" />
                      Puasa 8 sampai 10 jam sebelum pemeriksaan.
                    </li>
                    <li>
                      <i className="bi bi-check-circle" aria-hidden="true" />
                      Bawa surat rujukan bila memakai BPJS Kesehatan.
                    </li>
                    <li>
                      <i className="bi bi-check-circle" aria-hidden="true" />
                      Hasil pemeriksaan berlaku selama 30 hari.
                    </li>
                  </ul>

                  <div className="d-flex gap-2 flex-wrap mt-4">
                    <Link
                      href={`/daftar-online?paket=${pkg.slug}`}
                      className="btn btn-primary"
                    >
                      Pesan Paket Ini
                    </Link>
                    <Link href="/pelayanan/mcu/reguler" className="btn btn-tertiary">
                      Semua Paket
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section light-background">
        <div className="container section-title pb-4">
          <h2>Paket Lainnya</h2>
        </div>
        <div className="container">
          <div className="row gy-4 gx-4">
            {others.map((p) => (
              <div className="col-md-4" key={p.slug}>
                <div className="card">
                  <div className="card-content">
                    <h3 className="card-title">{p.title}</h3>
                    <p className="mcu-price">{formatIDR(p.price)}</p>
                    <p className="card-description">{p.items[0]}</p>
                    <Link
                      href={`/pelayanan/mcu/reguler/${p.slug}`}
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