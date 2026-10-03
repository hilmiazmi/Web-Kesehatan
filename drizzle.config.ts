import { defineConfig } from "drizzle-kit";

/**
 * Konfigurasi drizzle-kit.
 *
 * `out` menunjuk ke `drizzle/`, bukan ke `api/migrations/`. Empat berkas SQL
 * yang sudah terbukti benar dipindahkan ke sana dan dicatat di
 * `drizzle/meta/_journal.json` sebagai baseline, supaya drizzle-kit
 * mengira sudah diterapkan dan tidak men-generate ulang tabel yang sama.
 *
 * Berkas baru untuk perubahan berikutnya tetap dihasilkan oleh
 * `bun run db:generate`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Hanya dipakai `drizzle-kit studio` dan `db:push`. Migrasi resmi lewat
    // `bun run db:migrate`, bukan lewat drizzle-kit, supaya ADDRESS URL dibaca
    // dari environment proses yang sama dengan aplikasi.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});