/**
 * URL dasar situs, tanpa garis miring di akhir.
 *
 * Dipakai tiga berkas: `src/app/layout.tsx` untuk `metadataBase`,
 * `src/app/sitemap.ts` untuk `<loc>`, dan `src/app/robots.ts` untuk baris
 * `Sitemap:`.
 *
 * Kenapa helper ini perlu ada. `layout.tsx` punya nilainya sejak awal, jadi
 * menyalinnya ke dua berkas baru berarti tiga tempat yang harus mengingat
 * environment variable yang sama. Kalau someday berubah di satu tempat saja,
 * sitemap akan menunjuk domain berbeda dari tautan kanonik di halaman.
 *
 * `NEXT_PUBLIC_SITE_URL` sudah ada di `.env.example`, tapi repo ini belum
 * punya nilai production untuknya, jadi ada nilai cadangan yang menunjuk
 * localhost. Konsekuensinya sitemap.xml dan robots.txt di localhost memakai
 * `http://localhost:3000`. Itu tidak merusak apa pun: keduanya hanya dibaca
 * mesin pencari setelah situs benar-benar dipublikasikan, dan nilainya diambil
 * dari environment saat build.
 */
export function siteUrl(): string {
  const dasar = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return dasar.replace(/\/+$/, "");
}

/**
 * Gabungan URL dasar dan path internal.
 *
 * Kedua bentuk path diterima: yang tanpa garis miring di awal otomatis
 * diberi pemisah, jadi `siteUrlFor("berita")` sama dengan
 * `siteUrlFor("/berita")`. Tetap kirim bentuk bergaris miring supaya
 * konsisten dengan pemanggil lain.
 */
export function siteUrlFor(path: string): string {
  return path.startsWith("/") ? `${siteUrl()}${path}` : `${siteUrl()}/${path}`;
}