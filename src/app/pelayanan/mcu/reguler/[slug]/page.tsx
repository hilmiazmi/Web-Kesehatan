import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  McuPackageDetail,
  FACILITY_PHOTOS,
} from "@/components/pelayanan/McuPackageDetail";
import { MCU_PACKAGES } from "@/data/home";
import { formatIDR } from "@/lib/format";
import { getPublicMcuPackage, getPublicMcuPackages } from "@/lib/content-loader";

const BASE = "/pelayanan/mcu/reguler";

export const dynamicParams = true;
export const revalidate = 60;

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
  const pkg = await getPublicMcuPackage("reguler", slug);
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
 *
 * Data dibaca via loader `getPublicMcuPackage()` dan `getPublicMcuPackages()`,
 * mendukung database live saat runtime dan fallback ke data statis.
 */
export default async function McuPackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await getPublicMcuPackage("reguler", slug);
  if (!pkg) notFound();

  const siblings = await getPublicMcuPackages("reguler");
  const index = Math.max(0, siblings.findIndex((p) => p.slug === slug));

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Reguler", href: BASE },
          { label: pkg.title },
        ]}
      />

      <section className="section">
        <div className="container">
          <McuPackageDetail
            pkg={pkg}
            index={index}
            siblings={siblings}
            basePath={BASE}
            photos={FACILITY_PHOTOS}
          />
        </div>
      </section>
    </>
  );
}
