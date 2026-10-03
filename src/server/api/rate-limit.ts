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

/** Alamat IP-effective dari header. */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Header ini bisa berisi daftar. Yang pertama adalah klien asli.
    const pertama = forwarded.split(",")[0]?.trim();
    if (pertama) return pertama;
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