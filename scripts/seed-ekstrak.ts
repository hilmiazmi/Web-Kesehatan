/**
 * Tulis `scripts/seed-data.json` dari database yang sudah ter-seed.
 *
 * Jalankan sekali setelah mengisi database dari backend Rust yang diarsipkan,
 * atau setiap kali isi seed berubah:
 *
 * ```bash
 * DATABASE_URL=postgres://... bun run seed:ekstrak
 * ```
 *
 * Berkas yang dihasilkan di-commit, dan tidak ikut di produksi. Database produksi diisi
 * dari berkas itu sendiri lewat `bun run db:seed`, sehingga isi seed di kedua tempat
 * dijamin sama.
 */

import { writeFile } from "node:fs/promises";
import { closeDb, dbOrNull } from "@/server/db/client";
import { kumpulkanSeed, namaSql, TABEL_SEED } from "./seed-data";

const BERKAS = "scripts/seed-data.json";

const db = dbOrNull();
if (db === null) {
  console.error(
    "Ekstraksi seed butuh database. Isi DATABASE_URL lalu jalankan ulang.",
  );
  process.exit(1);
}

const muatan = await kumpulkanSeed(db);

for (const nama of TABEL_SEED) {
  const baris = muatan.tables[nama];
  const kosong = baris.length === 0;

  console.log(
    `${namaSql(nama).padEnd(20)} ${String(baris.length).padStart(4)}` +
      (kosong ? "   PERINGATAN: kosong" : ""),
  );
}

await writeFile(BERKAS, `${JSON.stringify(muatan, null, 1)}\n`, "utf8");
await closeDb();

console.log(`\nselesai: ${BERKAS}`);
