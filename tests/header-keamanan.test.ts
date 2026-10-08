import { describe, expect, it } from "vitest";

/**
 * Header keamanan di `next.config.ts`.
 *
 * Ini dibaca sebagai teks sumber, bukan lewat respons HTTP, karena dua
 * alasannya:
 *
 * - Respons hanya bisa dilihat dengan server yang sedang berjalan, jadi test
 *   ini tidak akan jalan di `bun run test` biasa.
 * - Yang perlu dijaga adalah **isi konfigurasi**, bukan perilaku peramban.
 *   Perilaku peramban bisa berubah karena Next.js, sedangkan daftar header ini
 *   adalah keputusan yang dibuat repo ini sendiri dan bisa hilang dalam satu
 *   refactor tanpa ada yang menyadari.
 *
 * Konsekuensinya: test ini tidak membuktikan header sampai ke soket. Itu
 * dibuktikan manual lewat `curl -D -`, dan hasilnya dicatat di
 * `docs/AUDIT-KEAMANAN.md`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sumber = readFileSync(
  fileURLToPath(new URL("../next.config.ts", import.meta.url)),
  "utf8",
);

/**
 * Nilai satu header dari konfigurasi.
 *
 * Dua bentuknya harus ditangani: nilai string biasa
 * (`value: "nosniff"`) dan nilai yang dirakit dari array lalu di-`join`
 * (CSP dan Permissions-Policy). Kalau hanya satu bentuk yang dibaca, header
 * yang bentuk satunya akan lolos dari pemeriksaan hanya karena tidak
 * ditemukan, bukan karena isinya benar.
 */
function nilaiHeader(kunci: string): string {
  const mulai = sumber.indexOf(`key: "${kunci}"`);
  if (mulai < 0) throw new Error(`Header ${kunci} tidak ditemukan di next.config.ts`);

  const valueIdx = sumber.indexOf("value:", mulai);
  const setelahValue = sumber.slice(valueIdx + "value:".length);

  // Bentuk kedua: array yang ditutup dengan `.join(...)`.
  const kurung = setelahValue.indexOf("[");
  const tutupKurung = setelahValue.indexOf("]");
  const kutip = setelahValue.indexOf('"');

  if (kurung >= 0 && kurung < kutip) {
    const isi = setelahValue.slice(kurung + 1, tutupKurung);
    const pemisah = sumber.slice(tutupKurung, tutupKurung + 30).match(/\.join\("([^"]*)"\)/)?.[1];
    return isi
      .split(",")
      .map((bagian) => bagian.trim().replace(/^"|"$/g, ""))
      .filter((bagian) => bagian !== "")
      .join(pemisah ?? "; ");
  }

  // Bentuk pertama: satu string literal.
  const isi = setelahValue.match(/^\s*"([^"]*)"/)?.[1];
  if (isi === undefined) throw new Error(`Nilai header ${kunci} tidak bisa dibaca`);
  return isi;
}

describe("header keamanan wajib ada", () => {
  const WAJIB = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Frame-Options",
  ] as const;

  for (const kunci of WAJIB) {
    it(`menyertakan ${kunci}`, () => {
      expect(nilaiHeader(kunci).length).toBeGreaterThan(0);
    });
  }

  it("menjangkau semua respons, bukan hanya halaman utama", () => {
    // Tanpa `/:path*`, header tidak ikut ke halaman 404 dan ke route handler,
    // yang justru yang paling sering terlewat.
    expect(sumber).toMatch(/source:\s*"\/:path\*"/);
  });
});

describe("isi CSP", () => {
  const csp = nilaiHeader("Content-Security-Policy");

  it("melarang framing lewat dua mekanisme", () => {
    // `frame-ancestors` berlaku di peramban modern; `X-Frame-Options` dibaca
    // peramban lama. Hanya satu dari keduanya berarti ada versi yang unprotected.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(nilaiHeader("X-Frame-Options")).toBe("DENY");
  });

  it("melarang objek, basis, dan form ke luar origin", () => {
    // `object-src 'none'` memblokir vektor `<object>` dan `<embed>` yang
    // yang kadang lolos dari kontrol skrip biasa.
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("hanya mengizinkan dua host foto yang memang dipakai", () => {
    // Daftar ini harus sama dengan `remotePatterns` di `next.config.ts`.
    // Host yang lebih banyak berarti permukaan serang lebih luas tanpa alasan;
    // host yang lebih sedikit berarti gambar gagal dimuat.
    const hosts = [...csp.matchAll(/https:\/\/([a-z.]+)/g)].map((m) => m[1]);
    expect(new Set(hosts)).toEqual(new Set(["images.unsplash.com", "picsum.photos"]));
  });

  it("tidak mengizinkan eval, karena mode produksi tidak membutuhkannya", () => {
    // `unsafe-eval` hanya dipakai bundler di mode pengembangan. Membiarkannya di
    // produksi mencabut hampir seluruh kekuatan `script-src`.
    expect(csp).not.toContain("unsafe-eval");
  });

  it("membolehkan unsafe-inline hanya karena alasan yang tercatat", () => {
    // Ini kelonggaran yang diketahui dan disengaja. Kalau suatu hari bisa dihapus
    // tanpa merusak 178 halaman statis, test inilah yang harus diperbarui
    // bersama komentarnya di `next.config.ts`.
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(sumber).toMatch(/App Router menyisipkan/);
  });

  it("tidak mengizinkan sumber skrip dari luar origin", () => {
    // Tidak ada embed pihak ketiga yang aktif, jadi tidak ada alasan
    // `script-src` mengizinkan host luar.
    const scriptSrc = csp.match(/script-src ([^;]*)/)?.[1] ?? "";
    expect(scriptSrc).not.toContain("https://");
  });
});

describe("isi HSTS dan Referrer-Policy", () => {
  it("HSTS punya max-age dalam satuan detik, bukan hari", () => {
    // Nilai yang salah di sini sangat berbahaya: `max-age` dibaca dalam detik,
    // jadi angka yang dimaksud sebagai "satu tahun" kalau ditulis 365 hanya
    // berarti 6 menit.
    const nilai = nilaiHeader("Strict-Transport-Security");
    const maxAge = Number(nilai.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
  });

  it("Referrer-Policy tidak mengirim path ke host lain", () => {
    // `no-referrer` terlalu ketat untuk navigasi ke host yang sama; yang dipakai
    // adalah policies yang memangkas path ke origin lain saja.
    expect(nilaiHeader("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});