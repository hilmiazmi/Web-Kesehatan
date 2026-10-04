import type { MetadataRoute } from "next";
import { collectNavPaths } from "@/lib/nav-path";
import {
  ARTICLES,
  FACILITIES,
  MCU_HOLIDAY_PACKAGES,
  MCU_PACKAGES,
  PRIORITY_SERVICES,
} from "@/data/home";
import { BROSURS } from "@/data/brosur";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import { CLINIC_DETAILS } from "@/data/clinics";
import { PPID_SUBPAGES } from "@/data/ppid";
import { MANAGEMENT } from "@/data/manajemen";

/**
 * Peta situs XML untuk mesin pencari.
 *
 * Sebelum berkas ini ada, `/sitemap.xml` jatuh ke halaman 404 karena tidak
 * ada route yang menanganinya. Yang ada hanya `/sitemap` untuk manusia.
 * Akibatnya perayap hanya bisa menemukan halaman lewat tautan, tanpa daftar
 * lengkap yang bisa diminta sekaligus.
 *
 * Daftar URL diambil dari dua sumber yang sudah menjadi acuan di tempat
 * lain, bukan daftar manual ketiga:
 *
 * - `collectNavPaths()` — sumber yang sama dengan `generateStaticParams`
 *   di `src/app/[...slug]/page.tsx`, jadi halaman statis dan generik tidak
 *   akan berbeda dengan yang di-prerender.
 * - Array data yang sama dengan `generateStaticParams` di tiap halaman
 *   `[slug]`, jadi URL detail tidak akan berbeda dengan yang bisa dibuka.
 *
 * Kalau nanti ada route `[slug]` baru, daftarkan array datanya di bawah
 * supaya URL detailnya ikut masuk peta.
 */
const INDUK_DETAIL: { induk: string; slug: string[] }[] = [
  { induk: "/berita", slug: ARTICLES.map((a) => a.slug) },
  { induk: "/informasi-publik/brosur", slug: BROSURS.map((b) => b.slug) },
  {
    induk: "/pelayanan/diagnostik",
    slug: DIAGNOSTIC_SERVICES.map((d) => d.slug),
  },
  {
    induk: "/pelayanan/mcu/holiday",
    slug: MCU_HOLIDAY_PACKAGES.map((m) => m.slug),
  },
  { induk: "/pelayanan/mcu/reguler", slug: MCU_PACKAGES.map((m) => m.slug) },
  { induk: "/pelayanan/medis", slug: FACILITIES.map((f) => f.slug) },
  { induk: "/pelayanan/poliklinik", slug: CLINIC_DETAILS.map((d) => d.slug) },
  { induk: "/pelayanan/prioritas", slug: PRIORITY_SERVICES.map((p) => p.slug) },
  { induk: "/ppid", slug: PPID_SUBPAGES.map((p) => p.slug) },
  { induk: "/tentang-kami/manajemen", slug: MANAGEMENT.map((m) => m.slug) },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const dasar =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Set supaya tumpang-tindih antara path navigasi dan URL detail (kalau
  // suatu saat ada) tidak menghasilkan entri ganda.
  const path = new Set<string>(["/"]);
  for (const { slug } of collectNavPaths()) {
    path.add("/" + slug.join("/"));
  }
  for (const { induk, slug } of INDUK_DETAIL) {
    for (const s of slug) {
      path.add(`${induk}/${s}`);
    }
  }

  return [...path].map((p) => ({
    url: dasar + p,
    changeFrequency: p === "/" ? "daily" : "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));
}
