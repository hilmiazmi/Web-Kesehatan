import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { MCU_PACKAGES } from "@/data/home";
import { FACILITY_PHOTOS, photo } from "@/data/images";
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

/** Syarat pendaftaran yang berlaku untuk semua paket reguler. */
const SYARAT = [
  "Pesanan minimal 2 hari sebelum pemeriksaan.",
  "Puasa 8 sampai 10 jam sebelum pemeriksaan.",
  "Bawa surat rujukan bila memakai BPJS Kesehatan.",
  "Hasil pemeriksaan berlaku selama 30 hari.",
];

/**
 * Halaman detail satu paket medical check up.
 *
 * Daftar paket lain diletakkan di kolom kiri, mengikuti halaman detail paket
 * di situs referensi. Rincian pemeriksaan diambil dari data paket, bukan
 * ditulis ulang di sini.
 */
export default async function McuPackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = MCU_PACKAGES.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const pkg = MCU_PACKAGES[index];
  const href = `/pelayanan/mcu/reguler/${pkg.slug}`;

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Reguler", href: "/pelayanan/mcu/reguler" },
          { label: pkg.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={MCU_PACKAGES.map((p) => ({
              href: `/pelayanan/mcu/reguler/${p.slug}`,
              label: p.title,
            }))}
            currentHref={href}
          >
            <article>
              <h1 className="detail-title">{pkg.title}</h1>

              <div className="detail-body-photo">
                <Photo
                  src={photo(FACILITY_PHOTOS[index % FACILITY_PHOTOS.length], 900, 600)}
                  alt={pkg.title}
                  sizes="(max-width: 992px) 100vw, 720px"
                  priority
                  height={280}
                  radius="all"
                />
              </div>

              <p className="mcu-price mcu-price-large">{formatIDR(pkg.price)}</p>

              <p className="detail-lead">
                Paket medical check up untuk membantu Anda mengenali kondisi
                kesehatan sejak dini.
              </p>

              <h2 className="detail-subheading">Rincian Pemeriksaan</h2>
              <ul className="mcu-items mcu-items-detailed">
                {pkg.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h2 className="detail-subheading">Syarat dan Ketentuan</h2>
              <ul className="detail-list">
                {SYARAT.map((s) => (
                  <li key={s}>
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {s}
                  </li>
                ))}
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
            </article>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}