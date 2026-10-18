import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi Vitest.
 *
 * Ekstensi .mts dipakai karena paket ini tidak menulis "type": "module",
 * sedangkan Vite membaca berkas .ts memakai pemuat CommonJS.
 *
 * Semua test .test.ts menguji logika murni (pembantu format, penelusuran
 * path menu, aturan validasi formulir), jadi default `environment` tetap
 * "node". Test komponen DOM memakai ekstensi .test.tsx dan memilih jsdom
 * per berkas lewat komentar `@vitest-environment jsdom`.
 *
 * Alias `@/` harus dideklarasikan ulang di sini; `tsconfig.json` tidak dibaca
 * otomatis oleh Vite.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
});