import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  McuPackageDetail,
  FACILITY_PHOTOS,
} from "@/components/pelayanan/McuPackageDetail";
import { MCU_HOLIDAY_PACKAGES } from "@/data/home";
import { formatIDR } from "@/lib/format";

const BASE = "/pelayanan/mcu/holiday";

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
  const pkg = MCU_HOLIDAY_PACKAGES.find((p) => p.slug === slug);
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
 */
export default async function McuHolidayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = MCU_HOLIDAY_PACKAGES.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  return (
    <>
      <PageHeader
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "MCU", href: "/pelayanan/mcu" },
          { label: "Paket Health Meets Holiday", href: BASE },
          { label: MCU_HOLIDAY_PACKAGES[index].title },
        ]}
      />

      <section className="section">
        <div className="container">
          <McuPackageDetail
            pkg={MCU_HOLIDAY_PACKAGES[index]}
            index={index}
            siblings={MCU_HOLIDAY_PACKAGES}
            basePath={BASE}
            photos={FACILITY_PHOTOS}
          />
        </div>
      </section>
    </>
  );
}