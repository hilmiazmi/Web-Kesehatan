import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Bungkam peringatan deprecation Sass.
   *
   * `src/styles/bootstrap-subset.scss` mengimpor source SCSS Bootstrap 5.3.3,
   * dan source itu memakai sintaks Sass lama di mana-mana: fungsi global
   * (`unit()`, `red()`, `mix()`), sintaks `if()`, dan aturan `@import` itu
   * sendiri. Semuanya deprecated di Dart Sass modern dan setiap kompilasi
   * (dev maupun build) membanjiri terminal dengan 259+ peringatan yang sama.
   *
   * Tidak ada yang bisa diperbaiki dari sisi repo ini: source Bootstrap ada di
   * `node_modules` (jangan disentuh), dan Bootstrap 5.3.3 belum mendukung
   * `@use` sehingga `@import` tetap wajib dipakai. Satu-satunya yang benar
   * adalah membungkam kategorinya di sini:
   *
   * - `quietDeps: true` — peringatan dari dalam `node_modules` (semua kecuali
   *   milik sendiri) tidak ditampilkan sama sekali.
   * - `silenceDeprecations` — empat kategori di atas tidak ditampilkan, baik
   *   dari dependensi maupun dari berkas sendiri.
   *
   * Peringatan deprecation dari kode SCSS milik sendiri (kalau suatu hari ada)
   * tetap tampil, karena kategorinya di luar empat ini.
   */
  sassOptions: {
    quietDeps: true,
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
  },
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
   * Header keamanan untuk semua respons.
   *
   * Semuanya ditulis sebagai konfigurasi statis, bukan lewat `middleware`,
   * karena CSP berbasis nonce tidak bisa diterapkan di sini tanpa merusak
   * prerender. Penjelasan lengkap ada di `docs/AUDIT-KEAMANAN.md`; yang penting
   * sekarang adalah tidak ada header yang tidak sengaja membiarkan perilaku
   * perilaku bawaan yang tidak diinginkan.
   *
   * `source: "/:path*"` menutup semua respons termasuk halaman 404, yang
   *biaanya justru yang paling sering terlewat.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /**
           * Content Security Policy.
           *
           * Disusun dari pengukuran, bukan dari tebakan:
           *
           * - Tidak ada `<iframe>`, jadi `frame-src` dibiarkan fallback ke
           *   `default-src` ('self').
           * - Tidak ada `form action` ke host lain, jadi `form-action 'self'`
           *   aman dan memblokir pharming lewat form.
           * - Semua `fetch` dari klien hanya ke `/api/v1` pada origin yang
           *   sama, jadi `connect-src 'self'` cukup.
           * - Foto datang dari `images.unsplash.com` dan `picsum.photos`, jadi
           *   hanya dua host itu yang diizinkan di `img-src`.
           * - Font Poppins datang dari `next/font/google`, yang mengunduhnya
           *   saat build lalu disajikan dari origin sendiri. Tidak ada
           *   permintaan ke `fonts.googleapis.com` saat runtime.
           *
           * Dua kelonggaran yang tersisa itu disengaja dan masih diukur:
           *
           * - `script-src` butuh `'unsafe-inline'` karena App Router menyisipkan
           *   payload RSC lewat `<script>` sebaris, dan `style-src` butuh
           *   `'unsafe-inline'` karena Swiper dan enam komponen menulis
           *   `style={{...}}`. Menghapus keduanya butuh nonce, dan nonce hanya
           *   bisa diterbitkan di middleware, yang membuat seluruh 163 halaman
           *   berubah dari statis menjadi dinamis. Itu harga yang jauh lebih
           *   mahal daripada manfaat yang didapat, jadi dicatat sebagai sisa
           *   yang belum ditutup, bukan disamarkan.
           * - `'unsafe-eval'` sengaja tidak dimasukkan. Mode produksi
           *   membutuhkannya hanya di development.
           */
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://images.unsplash.com https://picsum.photos",
              "font-src 'self' data:",
              "connect-src 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          /**
           * HSTS.
           *
           * Dipakai browser hanya kalau respons datang lewat HTTPS, jadi
           * efeknya tidak merusak pengembangan lokal yang masih http.
           * `upgrade-insecure-requests` di atas juga aman untuk dev lokal:
           * diukur dengan Chromium headless, gambar seasal lewat
           * http://localhost dan http://127.0.0.1 tetap dimuat walau header
           * ini terkirim.
           */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          /**
           * Cegah browser menebak-nebak tipe isi berkas.
           *
           * Tanpa ini, berkas JSON atau teks bisa dibaca peramban sebagai HTML
           * dan skrip di dalamnya ikut dijalankan.
           */
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          /**
           * Jangan kirim URL lengkap ke pihak ketiga.
           *
           * `strict-origin-when-cross-origin` masih mengirim asalnya untuk
           * permintaan navigasi ke host yang sama, jadi Analytics internal tidak
           * kehilangan informasi, tapi path seperti `/admin/...` tidak ikut
           * bocor ke host lain lewat header Referer.
           */
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          /**
           * Matikan kapabilitas peramban yang tidak dipakai situs ini.
           *
           * Daftar diambil dari fitur yang benar-benar ada: tidak ada
           * pembayaran dalam situs, tidak ada kamera, tidak ada geolokasi,
           * tidak ada mikrofon. Menonaktifkannya di respons membuat browser
           * menolaknya lebih awal, dan tidak bisa diaktifkan ulang per situs.
           */
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "camera=()",
              "geolocation=()",
              "gyroscope=()",
              "microphone=()",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          /**
           * Versi lama dari `frame-ancestors`.
           *
           * Dipertahankan karena `X-Frame-Options` masih dibaca peramban yang
           * tidak mendukung CSP sama sekali. Keduanya menunjuk aturan yang sama,
           * jadi tidak ada perilaku yang bertentangan.
           */
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
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