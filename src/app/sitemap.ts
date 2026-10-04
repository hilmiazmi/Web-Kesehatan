import type { MetadataRoute } from "next";
import { collectSitemapPaths } from "@/lib/sitemap";

/**
 * Peta situs untuk mesin pencari.
 *
 * Tanpa berkas ini `/sitemap.xml` menjawab 404, jadi mesin pencari tidak punya
 * peta untuk menemukan 150-an halaman yang saling menautkan.
 *
 * URL-nya harus absolut lengkap dengan domain. `metadataBase` di
 * `src/app/layout.tsx` tidak berlaku di sini: itu hanya untuk `metadata`,
 * dan sitemap memakai aturan sendiri. Karena itu domain diambil langsung dari
 * `NEXT_PUBLIC_SITE_URL`, sama seperti `metadataBase`.
 *
 * Aturan pathname-nya ada di `collectSitemapPaths()` pada
 * `src/lib/sitemap.ts`, supaya bisa diuji tanpa merender.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const asal = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

  return collectSitemapPaths().map((entri) => ({
    url: `${asal}${entri.path}`,
    changeFrequency: entri.changeFrequency,
    priority: entri.priority,
  }));
}