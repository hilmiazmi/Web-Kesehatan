import type { MetadataRoute } from "next";
import { ARTICLES } from "@/data/home";
import { collectSitemapPaths } from "@/lib/sitemap";
import { getPublicArticles } from "@/lib/content-loader";
import { siteUrlPermintaan } from "@/lib/site-url";

/**
 * Peta situs untuk mesin pencari.
 *
 * Tanpa berkas ini `/sitemap.xml` menjawab 404, jadi mesin pencari tidak punya
 * peta untuk menemukan 150-an halaman yang saling menautkan.
 *
 * URL-nya harus absolut lengkap dengan domain. `metadataBase` di
 * `src/app/layout.tsx` tidak berlaku di sini: itu hanya untuk `metadata`,
 * dan sitemap memakai aturan sendiri. Karena itu domain diambil dari
 * `siteUrlForPermintaan()`, yang membaca host permintaan lebih dulu: tanpa itu,
 * deployment di balik tunnel atau domain yang berganti menghasilkan sitemap
 * berisi `http://localhost:3000/...` — sudah terjadi di produksi 10 Oktober 2026.
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
 *
 * `force-dynamic` bukan kemewahan. `revalidate = 3600` membekukan hasil di
 * build, dan domain yang benar baru diketahui saat permintaan datang (tunnel,
 * IP, domain yang diganti setelah image dibangun). Tanpa baris ini,
 * `siteUrlPermintaan()` membaca header yang tidak pernah sampai karena
 * responsnya sudah disajikan dari cache build — dan itu yang terjadi di
 * produksi 10 Oktober 2026: sitemap tetap memuat `http://localhost:3000/`.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dariDb = await getPublicArticles();
  const dasar = await siteUrlPermintaan();

  return collectSitemapPaths([...ARTICLES, ...dariDb]).map((entri) => ({
    url: `${dasar}${entri.path}`,
    changeFrequency: entri.changeFrequency,
    priority: entri.priority,
  }));
}
