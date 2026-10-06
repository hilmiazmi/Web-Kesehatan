import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  McuPackageDetail,
  FACILITY_PHOTOS,
} from "@/components/pelayanan/McuPackageDetail";
import { MCU_PACKAGES } from "@/data/home";
import { formatIDR } from "@/lib/format";

const BASE = "/pelayanan/mcu/reguler";

/**
 * Hanya slug yang sudah ada yang boleh dibuka; slug asing menjawab 404
 * sungguhan, bukan halaman yang di-render saat diminta.
 */
export const dynamicParams = false;

/** Prerender semua paket MCU reguler saat build. */
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

/**
 * Halaman detail satu paket MCU reguler.
 *
 * Daftar paket lain diletakkan di kolom kiri, mengikuti halaman detail paket
 * di situs referensi.
 */
export default async function McuPackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = MCU_PACKAGES.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Reguler", href: BASE },
          { label: MCU_PACKAGES[index].title },
        ]}
      />

      <section className="section">
        <div className="container">
          <McuPackageDetail
            pkg={MCU_PACKAGES[index]}
            index={index}
            siblings={MCU_PACKAGES}
            basePath={BASE}
            photos={FACILITY_PHOTOS}
          />
        </div>
      </section>
    </>
  );
}