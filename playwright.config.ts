import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi Playwright minimal.
 *
 * Cakupannya sengaja sempit: yang diuji hanya alur yang bisa berjalan tanpa
 * database, karena server CI/pratinjau memakai `API_MODE=snapshot`. Alur yang
 * butuh database (login admin sungguhan, pengiriman formulir sampai tersimpan)
 * tidak diuji di sini; keduanya butuh PostgreSQL lokal yang tidak selalu ada.
 *
 * Browser memakai Chromium sistem (`/usr/bin/chromium`) kalau ada, bukan hasil
 * unduhan `playwright install`. Alasannya praktis: image CI dan VPS tidak perlu
 * mengunduh 170 MB browser yang sama persis dengan yang sudah ada di sistem.
 * Kalau Chromium sistem tidak ada, test memakai browser bawaan Playwright
 * (butuh sekali `playwright install chromium`), bukan gagal dengan pesan
 * path yang hanya berlaku di satu mesin.
 *
 * Server dijalankan sendiri oleh Playwright (`webServer` di bawah), bukan
 * mengandalkan server yang kebetulan sudah ada. Alasannya sudah terbukti:
 * default lama menembak `:3399` milik pengembang yang `.next`-nya basi,
 * sehingga chunk JS menjawab 500, hidrasi gagal total, dan test hero gagal
 * dengan hitungan 0 yang terlihat seperti regresi Swiper. Server sendiri
 * selalu build produksi yang segar di port khusus (3401) yang tidak dipakai
 * siapa pun, jadi hasil test tidak tergantung pada keadaan mesin.
 *
 * Kalau `BASE_URL` diisi eksplisit (misalnya untuk `alur-db.test.ts` yang
 * butuh server live ber-database), `webServer` tetap jalan tapi tidak
 * dipakai oleh test itu. `reuseExistingServer: true` supaya jalan ulang
 * tidak menyalakan server kedua kalau port 3401 sudah terisi.
 */
const CHROMIUM_SISTEM = "/usr/bin/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "line",
  // Melepas kunci E2E milik sendiri (e2e/global-teardown.mjs). Tetap jalan
  // saat tes gagal, tidak seperti hook `post` bun yang dilewati saat gagal.
  globalTeardown: "./e2e/global-teardown.mjs",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3401",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "env API_MODE=snapshot bun run start --port 3401",
    url: "http://localhost:3401/",
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Path tetap ke Chromium sistem membuat E2E gagal di mesin tanpa
          // Chromium di jalur itu. Pakai sistem kalau ada, kalau tidak serahkan
          // ke browser bawaan Playwright.
          ...(existsSync(CHROMIUM_SISTEM) ? { executablePath: CHROMIUM_SISTEM } : {}),
          args: ["--no-sandbox"],
        },
      },
    },
  ],
});
