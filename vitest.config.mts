import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi Vitest.
 *
 * Ekstensi .mts dipakai karena paket ini tidak menulis "type": "module",
 * sedangkan Vite membaca berkas .ts memakai pemuat CommonJS.
 *
 * Semua yang diuji di repo ini logika murni (pembantu format, penelusuran
 * path menu, aturan validasi formulir), jadi tidak perlu DOM. `environment`
 * karena itu dibiarkan "node" dan jsdom tidak dipasang.
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
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});