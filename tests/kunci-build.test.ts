import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEDA_BASI_MENIT, terkunci } from "../scripts/kunci-build";

/**
 * Protokol kunci build paralel.
 *
 * `.next` dipakai bersama semua sesi di mesin ini. Tanpa kunci, satu sesi
 * bisa menimpa build yang sedang dipakai sesi lain untuk E2E, dan hasilnya
 * mustahil dibedakan dari regresi sungguhan (terjadi 10 Oktober 2026).
 *
 * Yang dikunci di sini dua hal: aturannya (penanda basi setelah 20 menit,
 * supaya build yang mati tidak memblokir selamanya) dan pemasangannya
 * (tiga mode harus tetap terpasang di `package.json`).
 */

const paket = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

describe("aturan kedaluwarsa penanda", () => {
  it("penanda baru berarti terkunci", () => {
    const sekarang = Date.now();
    expect(terkunci(sekarang, sekarang)).toBe(true);
    expect(terkunci(sekarang - 19 * 60_000, sekarang)).toBe(true);
  });

  it("penanda basi berarti bebas", () => {
    const sekarang = Date.now();
    expect(terkunci(sekarang - BEDA_BASI_MENIT * 60_000, sekarang)).toBe(
      false,
    );
    expect(terkunci(sekarang - 60 * 60_000, sekarang)).toBe(false);
  });

  it("batas basi 20 menit, bukan angka lain", () => {
    // Build lokal selesai dalam 1-2 menit; 20 menit berarti yang menandai
    // sudah pasti mati, bukan lambat. Kalau batas ini diubah, perbarui juga
    // komentar di `scripts/kunci-build.ts`.
    expect(BEDA_BASI_MENIT).toBe(20);
  });

  it("pemeriksaan proses tidak meledak di mesin ini", async () => {
    const { adaBuildBerjalan } = await import("../scripts/kunci-build");
    expect(typeof adaBuildBerjalan()).toBe("boolean");
  });
});

describe("pemasangan protokol di package.json", () => {
  it("prebuild menandai, postbuild melepas", () => {
    expect(paket.scripts["prebuild"]).toContain("kunci-build.ts tandai");
    expect(paket.scripts["postbuild"]).toContain("kunci-build.ts lepas");
  });

  it("test:e2e menunggu dulu", () => {
    expect(paket.scripts["test:e2e"]).toContain("kunci-build.ts tunggu");
    expect(paket.scripts["test:e2e"]).toContain("playwright test");
  });
});
