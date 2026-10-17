import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  McuPackageDetail,
  FACILITY_PHOTOS,
} from "@/components/pelayanan/McuPackageDetail";
import { MCU_HOLIDAY_PACKAGES } from "@/data/home";
import { formatIDR } from "@/lib/format";
import { getPublicMcuPackage, getPublicMcuPackages } from "@/lib/content-loader";

const BASE = "/pelayanan/mcu/holiday";

export const dynamicParams = true;
export const revalidate = 60;

/** Prerender semua paket holiday saat build. */
export function generateStaticParams() {
  return MCU_HOLIDAY_PACKAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPublicMcuPackage("holiday", slug);
  if (!pkg) return { title: "Paket Tidak Ditemukan" };
  return {
    title: pkg.title,
    description: `Paket medical check up ${pkg.title} dengan harga ${formatIDR(pkg.price)}.`,
  };
}

/**
 * Halaman detail satu paket Health Meets Holiday.
 *
 * Tata letaknya sama dengan paket reguler; yang berbeda hanya sumber data dan
 * remah roti.
 *
 * Data dibaca via loader `getPublicMcuPackage()` dan `getPublicMcuPackages()`,
 * mendukung database live saat runtime dan fallback ke data statis.
 */
export default async function McuHolidayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await getPublicMcuPackage("holiday", slug);
  if (!pkg) notFound();

  const siblings = await getPublicMcuPackages("holiday");
  const index = Math.max(0, siblings.findIndex((p) => p.slug === slug));

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Health Meets Holiday", href: BASE },
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
