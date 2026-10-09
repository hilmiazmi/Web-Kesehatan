import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi Playwright minimal.
 *
 * Cakupannya sengaja sempit: yang diuji hanya alur yang bisa berjalan tanpa
 * database, karena server CI/pratinjau memakai `API_MODE=snapshot`. Alur yang
 * butuh database (login admin sungguhan, pengiriman formulir sampai tersimpan)
 * tidak diuji di sini; keduanya butuh PostgreSQL lokal yang tidak selalu ada.
 *
 * Browser memakai Chromium sistem (`/usr/bin/chromium`), bukan hasil unduhan
 * `playwright install`. Alasannya praktis: image CI dan VPS tidak perlu
 * mengunduh 170 MB browser yang sama persis dengan yang sudah ada di sistem.
 * Kalau Chromium sistem tidak ada, test gagal dengan pesan yang jelas, bukan
 * dengan timeout misterius.
 *
 * Server diasumsikan sudah berjalan di `BASE_URL` (bawaan port 3399 dalam mode
 * snapshot). Playwright tidak menjalankan `bun run start` sendiri, karena
 * skrip `webServer` akan menyalakan server kedua yang berebut port dan
 * `.next` dengan server yang sudah ada.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3399",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
  ],
});
