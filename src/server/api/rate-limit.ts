import { config } from "../config";
import { ApiError } from "./error";

/**
 * Rate limit in-memory untuk endpoint tulis publik.
 *
 * Disengaja in-memory, bukan di database atau di Redis: satu instance Next.js
 * di VPS adalah satu-satunya yang melayani, jadi menyimpannya di memori proses
 * sudah cukup dan tidak menambah satu infrastruktur yang harus dijaga tetap
 * hidup.
 *
 * Batas yang harus diingat sebelum memakai ini di lebih dari satu instance:
 * setiap instance punya memorinya sendiri, jadi satu alamat bisa melewati batas
 * sebanyak jumlah instance. Kalau backend nanti berjalan di beberapa instance,
 * penyimpanannya wajib pindah ke Redis atau ke tabel.
 */

type Bucket = { count: number; resetAt: number };

/**
 * Disimpan di `globalThis` supaya penghitung tidak ikut ter-reset ketika
 * `next dev` memuat ulang modul di tengah siklus pengembangan.
 */
const globalKey = "__rsudRateLimit__";
type WithStore = { [globalKey]?: Map<string, Bucket> };
const store: Map<string, Bucket> = ((globalThis as WithStore)[globalKey] ??= new Map());

/** Buang bucket yang sudah lewat, supaya Map tidak tumbuh tanpa batas. */
function sweep(now: number): void {
  if (store.size < 512) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

/**
 * Alamat IP-effective dari header proxy.
 *
 * `X-Forwarded-For` adalah rantai: nilai paling kiri ditulis pihak yang
 * paling dekat dengan penyerang, yaitu penyerang itu sendiri kalau tidak ada
 * proxy yang menyaringnya lebih dulu.
 *
 * Traefik sebagai reverse proxy di depan aplikasi ini memakai konfigurasi
 * bawaan: `forwardedHeaders.insecure` tidak diaktifkan dan `trustedIPs` kosong,
 * sehingga Traefik **menghapus** header yang masuk lalu menuliskan alamat klien
 * yang dia lihat sendiri (lihat `pkg/middlewares/forwardedheaders` di Traefik).
 * Pada konfigurasi itu rantainya hanya berisi satu nilai dan tidak bisa
 * dipalsukan.
 *
 * Yang dipakai di sini tetap nilai paling **kanan**, bukan paling kiri, karena
 * benar pada kedua perilaku Traefik:
 *
 * - Mode `overwrite` (konfigurasi sekarang): rantai cuma berisi satu nilai,
 *   jadi kedua ujung sama saja.
 * - Mode `append` (muncul kalau `trustedIPs` diisi, misalnya kalau kelak ada
 *   Nginx atau Cloudflare di depan Traefik): Traefik menambahkan alamat yang
 *   dia lihat di ujung rantai. Di mode ini nilai paling kiri milik penyerang,
 *   dan mengambilnya membuat rate limit bisa dilewati dengan header buatan
 *   sendiri.
 *
 * Jadi pilihan ini tidak diam-diam rusak kalau konfigurasi proxy berubah.
 *
 * Batas yang tidak bisa dihilangkan dari dalam aplikasi: kalau aplikasi
 * suatu saat dibuka langsung tanpa proxy di depannya, alamat di header sepenuhnya
 * dikontrol klien dan rate limit per alamat tidak lagi bermakna. Yang perlu
 * dilakukan untuk itu bukan membaca header lebih pintar, melainkan memastikan
 * aplikasi tidak pernah terbuka tanpa proxy — dan `docs/deploy-api-rust.md`
 * sudah mencantumkan bahwa Traefik tidak pernah dibuka langsung ke internet.
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Dibaca dari ujung, bukan dari awal. Keterangan di atas
    // menjelaskan kenapa ujung itu yang dipakai.
    const rantai = forwarded.split(",");
    for (let i = rantai.length - 1; i >= 0; i -= 1) {
      const alamat = rantai[i]?.trim();
      if (alamat) return alamat;
    }
  }
  return headers.get("x-real-ip")?.trim() || "tidak-diketahui";
}

/**
 * Catat satu permintaan dan lempar 429 kalau sudah melewati batas.
 *
 * Kunci penyimpanannya gabungan alamat IP dan nama endpoint. Satu IP yang
 * menyalahgunakan satu endpoint tidak boleh otomatis memblokir endpoint yang
 * lain, karena formulir pendaftaran yang gagal bukan berarti formulir pencarian
 * juga.
 */
export function limitRequest(headers: Headers, endpoint: string): void {
  const { rateLimitWindowSeconds, rateLimitMax } = config();
  const now = Date.now();
  sweep(now);

  const key = `${endpoint}:${clientAddress(headers)}`;
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rateLimitWindowSeconds * 1000 });
    return;
  }

  if (bucket.count >= rateLimitMax) {
    const remaining = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw ApiError.rateLimited(remaining);
  }

  bucket.count += 1;
}

/**
 * Setel ulang penghitung untuk satu alamat dan endpoint.
 *
 * Dipanggil setelah proses berhasil, supaya orang yang mengirim lima form
 * pertama dengan benar tidak terkunci pada percobaan berikutnya.
 */
export function resetLimit(headers: Headers, endpoint: string): void {
  store.delete(`${endpoint}:${clientAddress(headers)}`);
}

/** Jumlah permintaan yang tercatat, untuk test. */
export function currentCount(headers: Headers, endpoint: string): number {
  const bucket = store.get(`${endpoint}:${clientAddress(headers)}`);
  if (!bucket) return 0;
  return bucket.resetAt <= Date.now() ? 0 : bucket.count;
}

/** Kosongkan semua penghitung, untuk test. */
export function clearAll(): void {
  store.clear();
}