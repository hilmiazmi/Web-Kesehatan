import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Foto dummy diambil dari Unsplash (lisensi gratis untuk penggunaan).
    // Daftar ID sudah diverifikasi aktif (HTTP 200) pada 2 Oktober 2026.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },

  /**
   * Snapshot konten ikut dibawa ke hasil build.
   *
   * `src/server/api/snapshot.ts` membaca `snapshot/*.json` saat runtime, dan
   * pembacaan lewat `fs` dengan nama berkas yang berubah-ubah tidak bisa
   * ditelusuri otomatis oleh Next.js. Tanpa baris ini, build `standalone` dan
   * build di Vercel menghasilkan route handler yang tidak bisa menemukan
   * snapshot-nya, dan `API_MODE=snapshot` diam-diam menjawab 404 untuk
   * semuanya.
   *
   * Berkas snapshot ditulis ulang oleh `bun run db:snapshot`, jadi nama
   * direktorinya harus sama persis dengan yang dibaca modul itu.
   */
  outputFileTracingIncludes: {
    "/api/v1/**": ["./snapshot/**/*"],
  },

  /**
   * Tidak ada `rewrites` untuk `/api/v1` di sini.
   *
   * Sebelumnya awalan itu diteruskan lewat rewrite ke backend Rust terpisah.
   * Rewrite hanya berlaku di Next.js dan bentuknya berbeda dengan aturan Traefik
   * yang dipakai di VPS, jadi satu hal sederhana harus punya dua konfigurasi.
   *
   * Sekarang permintaan `/api/v1/*` ditangani oleh route handler di
   * `src/app/api/v1/`, dan route handler itulah yang memegang koneksi database.
   * Traefik di VPS hanya perlu meneruskan `/` ke Next.js, tanpa tahu bahwa
   * ada database di belakangnya.
   */
};

export default nextConfig;