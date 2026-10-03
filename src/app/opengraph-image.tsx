import { ImageResponse } from "next/og";
import { SITE } from "@/data/navigation";

/**
 * Gambar Open Graph untuk seluruh situs.
 *
 * Sebelumnya tidak ada `og:image` sama sekali di 130 halaman. Situs acuan
 * punya `og:image` yang menunjuk logo PNG-nya, jadi ketimpanya nyata di sini.
 *
 * File konvensi `opengraph-image` lebih baik daripada menaruh `og:url` manual
 * di setiap `generateMetadata`: Next.js memasang tag-nya sendiri untuk semua
 * rute, dan gambarnya cukup sekali dihitung saat build lalu di-cache.
 *
 * Warnanya diambil dari token yang sama dengan `src/styles/tokens.css`:
 * `--rs-accent: #1977cc`. Nilai `#1a77cc` yang ada di `tokens.css` hanya
 * untuk meta `theme-color` dan tidak boleh dipakai di sini.
 *
 * Font tidak dimuat sendiri karena Poppins datang dari `next/font/google` dan
 * berkas font hasil build tidak stabil ada di repo. `ImageResponse` memakai
 * font bawaan, jadi gambar tetap tergenerate.
 */
export const alt = `${SITE.name} - ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#ffffff",
          borderLeft: "24px solid #1977cc",
        }}
      >
        {/* Logo mark: lingkaran biru dengan tanda plus, sama dengan
            `.logo-mark` di header yang memakai `bi-plus-lg`. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 108,
            height: 108,
            borderRadius: 999,
            backgroundColor: "#1977cc",
            color: "#ffffff",
            fontSize: 76,
            lineHeight: 1,
            marginBottom: 36,
          }}
        >
          +
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#000000",
            lineHeight: 1.1,
          }}
        >
          {SITE.name}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 40,
            color: "#2c4964",
            marginTop: 16,
          }}
        >
          {SITE.tagline}
        </div>

        <div
          style={{
            display: "flex",
            width: 160,
            height: 8,
            borderRadius: 8,
            backgroundColor: "#1977cc",
            marginTop: 44,
          }}
        />
      </div>
    ),
    size
  );
}
