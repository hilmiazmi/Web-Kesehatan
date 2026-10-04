import type { MetadataRoute } from "next";
import { siteUrlFor } from "@/lib/site-url";

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
 * Domainnya diambil dari `siteUrlFor()`, sama seperti `metadataBase` di
 * `src/app/layout.tsx`. Kalau keduanya berbeda, sitemap dan halaman akan
 * menunjuk domain berbeda.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: siteUrlFor("/sitemap.xml"),
  };
}