import type { MetadataRoute } from "next";
import { ARTICLES } from "@/data/home";
import { collectSitemapPaths } from "@/lib/sitemap";
import { getPublicArticles } from "@/lib/content-loader";
import { siteUrlFor } from "@/lib/site-url";

/**
 * Peta situs untuk mesin pencari.
 *
 * Tanpa berkas ini `/sitemap.xml` menjawab 404, jadi mesin pencari tidak punya
 * peta untuk menemukan 150-an halaman yang saling menautkan.
 *
 * URL-nya harus absolut lengkap dengan domain. `metadataBase` di
 * `src/app/layout.tsx` tidak berlaku di sini: itu hanya untuk `metadata`,
 * dan sitemap memakai aturan sendiri. Karena itu domain diambil dari
 * `siteUrlFor()`, yang membaca env yang sama dengan `metadataBase`.
 *
 * Aturan pathname-nya ada di `collectSitemapPaths()` pada
 * `src/lib/sitemap.ts`, supaya bisa diuji tanpa merender.
 *
 * Daftar beritanya diambil dari `getPublicArticles()`, bukan dari modul statis.
 * Berita yang dibuat di panel admin harus masuk peta, dan satu-satunya cara
 * supaya masuk adalah dengan membaca sumber yang sama dengan halamannya.
 *
 * Kedua daftar digabung, bukan saling menggantikan. Loader mengembalikan data
 * statis kalau database tidak ada, tapi kalau database hidup isinya bisa saja
 * tidak sama sekali: sepuluh berita seed dengan slug yang tidak ada di modul
 * statis. `/berita/<slug>` untuk kedua kelompok itu sama-sama dilayani, jadi
 * keduanya harus sama-sama masuk sitemap. `collectSitemapPaths()` memakai
 * `Set`, jadi slug yang kebetulan kembar tidak menghasilkan URL ganda.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dariDb = await getPublicArticles();

  return collectSitemapPaths([...ARTICLES, ...dariDb]).map((entri) => ({
    url: siteUrlFor(entri.path),
    changeFrequency: entri.changeFrequency,
    priority: entri.priority,
  }));
}
