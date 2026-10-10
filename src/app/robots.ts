import type { MetadataRoute } from "next";
import { siteUrlForPermintaan } from "@/lib/site-url";

/**
 * Petunjuk peramban untuk mesin pencari.
 *
 * Dua hal yang ditulis di sini:
 *
 * - `sitemap` diberi URL absolut penuh, bukan `/sitemap.xml`. Next.js tidak
 *   menambahkan `metadataBase` ke isi robots.txt. Path relatif di sitemap
 *   memang diperbolehkan, tapi URL absolut tidak pernah ambigu.
 * - `/api/` diblokir. Endpoint di sana mengembalikan JSON, dan menghitungnya
 *   sebagai halaman membuat peramban mengunduh respons yang tidak dimaksudkan
 *   untuk dibaca manusia.
 *
 * `/admin` sengaja tidak diblokir. Aturan robots mencocokkan awalan, bukan
 * segmen utuh, jadi `Disallow: /admin` ikut memblokir `/administrasi`, dan
 * `/administrasi` adalah halaman publik "Administrasi Pasien" yang memang
 * sengaja ada di navbar. Halaman admin ditandai `noindex` lewat metadata di
 * `src/app/admin/layout.tsx`, yang juga berlaku untuk halaman login.
 *
 * Domainnya diambil dari `siteUrlForPermintaan()`, sama seperti `metadataBase` di
 * `src/app/layout.tsx`. Kalau keduanya berbeda, sitemap dan halaman akan
 * menunjuk domain berbeda.
 *
 * `force-dynamic` wajib: tanpa baris ini route ini di-prerender saat build
 * (terverifikasi: `○ /robots.txt`), jadi domain yang benar tidak pernah terpakai
 * dan hasilnya beku mengikuti `NEXT_PUBLIC_SITE_URL` saat build.
 */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: await siteUrlForPermintaan("/sitemap.xml"),
  };
}