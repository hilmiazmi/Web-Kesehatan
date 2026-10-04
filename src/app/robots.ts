import type { MetadataRoute } from "next";

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
 * `NEXT_PUBLIC_SITE_URL` sama dengan `metadataBase` di `src/app/layout.tsx`.
 * Kalau keduanya berbeda, sitemap dan halaman akan menunjuk domain berbeda.
 */
export default function robots(): MetadataRoute.Robots {
  const asal = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${asal.replace(/\/+$/, "")}/sitemap.xml`,
  };
}