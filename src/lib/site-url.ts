import { headers } from "next/headers";

/**
 * URL dasar situs, tanpa garis miring di akhir.
 *
 * Dipakai `src/app/layout.tsx` untuk `metadataBase`, dan sebagai cadangan bila
 * `siteUrlPermintaan()` tidak bisa membaca header permintaan.
 *
 * `NEXT_PUBLIC_SITE_URL` sudah ada di `.env.example`, dan nilainya dibeku saat
 * build. Karena itu jalur normal di deployment non-statis adalah
 * `siteUrlPermintaan()` di berkas route handler; nilai env hanya menang kalau
 * memang diisi, dan localhost tetap dipakai untuk development lokal.
 */
export function siteUrl(): string {
  const dasar = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return dasar.replace(/\/+$/, "");
}

/**
 * URL dasar menurut permintaan yang sedang dilayani, bukan menurut env.
 *
 * Versi async dari `siteUrl()`, khusus untuk route handler yang tahu host yang
 * dipanggil pengunjung. Dibutuhkan karena `NEXT_PUBLIC_SITE_URL` bersifat
 * *build-time*: ia dibeku saat image dibuat, sedangkan banyak deployment justru
 * memakai URL yang baru diketahui saat jalan — tunnel sementara, IP VPS, atau
 * domain yang diganti setelah image dibangun.
 *
 * Bukti kegagalannya: situs yang di-deploy lewat tunnel menjawab
 * `sitemap.xml` berisi `http://localhost:3000/...`, sehingga seluruh URL peta
 * menunjuk mesin sendiri. Terukur di produksi 10 Oktober 2026 (Cloudflare
 * quick tunnel).
 *
 * Urutannya: `SITE_URL` dulu (env biasa, bukan `NEXT_PUBLIC_`, jadi tidak
 * di-inline bundler), lalu header permintaan, lalu `siteUrl()` sebagai cadangan
 * terakhir untuk build dan lingkungan tanpa permintaan.
 *
 * Kenapa `NEXT_PUBLIC_SITE_URL` tidak dipakai di sini meski namanya mirip:
 * prefix `NEXT_PUBLIC_` membuat bundler menanam nilainya saat build. Server
 * yang sudah berjalan tetap membaca salinan build itu, bukan environment yang
 * baru diisi, jadi mengubahnya di dashboard platform tidak berpengaruh sampai
 * image dibangun ulang. Untuk deployment yang URL-nya baru diketahui setelah
 * naik — tunnel, IP, domain yang diganti — jalur itu mati. Itu sebabnya
 * override runtime-nya bernama `SITE_URL`.
 *
 * `x-forwarded-host` didahulukan atas `host` karena di belakang proksi — yang
 * umum di tunnel dan Coolify — `host` bisa berisi nama internal container.
 */
export async function siteUrlPermintaan(): Promise<string> {
  const dariEnv = process.env.SITE_URL;
  if (dariEnv && dariEnv.trim() !== "") return dariEnv.replace(/\/+$/, "");

  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
    if (host) {
      const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // Tidak ada konteks permintaan (misalnya dipanggil saat build). Jatuh ke
    // cadangan di bawah alih-alih menggagalkan seluruh halaman.
  }

  return siteUrl();
}

/** `siteUrlPermintaan()` digabung dengan path internal. */
export async function siteUrlForPermintaan(path: string): Promise<string> {
  const dasar = await siteUrlPermintaan();
  return path.startsWith("/") ? `${dasar}${path}` : `${dasar}/${path}`;
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