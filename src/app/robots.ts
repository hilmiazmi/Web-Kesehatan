import type { MetadataRoute } from "next";

/**
 * Aturan perayap.
 *
 * `layout.tsx` sudah menyatakan `robots: { index: true, follow: true }`,
 * jadi isi di sini mengikutinya: semua perayap boleh masuk, dan peta situs
 * XML ditunjuk supaya tidak perlu ditebak.
 */
export default function robots(): MetadataRoute.Robots {
  const dasar =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${dasar}/sitemap.xml`,
  };
}
