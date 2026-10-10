import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEDA_BASI_MENIT, bolehLepas, terkunci } from "../scripts/kunci-build";

/**
 * Protokol kunci build paralel.
 *
 * `.next` dipakai bersama semua sesi di mesin ini. Tanpa kunci, satu sesi
 * bisa menimpa build yang sedang dipakai sesi lain untuk E2E, dan hasilnya
 * mustahil dibedakan dari regresi sungguhan (terjadi 10 Oktober 2026).
 *
 * Yang dikunci di sini tiga hal: aturannya (penanda basi setelah 20 menit,
 * supaya proses yang mati tidak memblokir selamanya), pemasangannya (mode
 * harus tetap terpasang di `package.json` dan `playwright.config.ts`), dan
 * aturan lepasnya (hanya token yang cocok boleh melepas kunci E2E, supaya
 * teardown satu sesi tidak menghapus kunci sesi lain).
 */

const paket = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

const konfigurasi = readFileSync(
  new URL("../playwright.config.ts", import.meta.url),
  "utf8",
);

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

  it("test:e2e menahan kunci bertoken lalu menjalankan playwright", () => {
    // `tunggu-tandai` mencetak token ke stdout; `export ... $(...) &&`
    // memastikan playwright tidak jalan kalau menunggunya gagal, dan token
    // sampai ke globalTeardown lewat environment.
    expect(paket.scripts["test:e2e"]).toContain("kunci-build.ts tunggu-tandai");
    expect(paket.scripts["test:e2e"]).toContain("KUNCI_E2E=");
    expect(paket.scripts["test:e2e"]).toContain("playwright test");
  });

  it("teardown terpasang di konfigurasi playwright", () => {
    // Tanpa baris ini, kunci E2E tidak pernah dilepas saat tes gagal,
    // karena hook `post` bun dilewati saat skripnya gagal.
    expect(konfigurasi).toContain("globalTeardown");
    expect(konfigurasi).toContain("global-teardown");
  });
});

describe("aturan lepas kunci E2E", () => {
  it("token yang cocok boleh melepas", () => {
    expect(bolehLepas("123-456\n", "123-456")).toBe(true);
  });

  it("token beda tidak boleh melepas kunci sesi lain", () => {
    expect(bolehLepas("123-456\n", "789-0")).toBe(false);
  });

  it("token kosong tidak boleh melepas apa pun", () => {
    // Teardown yang jalan tanpa lewat `test:e2e` tidak punya token.
    expect(bolehLepas("123-456\n", "")).toBe(false);
  });

  it("tanpa berkas kunci tidak ada yang dilepas", () => {
    expect(bolehLepas(null, "123-456")).toBe(false);
  });
});
