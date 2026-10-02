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
};

export default nextConfig;