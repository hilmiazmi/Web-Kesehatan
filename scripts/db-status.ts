/**
 * Laporkan konfigurasi backend yang sedang aktif.
 *
 * Jalankan ini lebih dulu kalau sebuah endpoint menjawab 404 padahal tabelnya
 * ada, atau kalau `"denganSnapshot"` diam-diam membaca berkas lama. Hampir
 * seluruh penyebabnya adalah `DATABASE_URL` yang salah atau `API_MODE` yang
 * masih `snapshot`.
 *
 * Yang dicetak hanya nama variabel dan apakah isinya terisi. Nilai aslinya tidak
 * pernah dicetak: `DATABASE_URL` berisi kata sandi, dan `AUTH_SECRET` adalah
 * kunci penandatangan yang membatalkan seluruh sesi kalau bocor.
 */

import { sql } from "drizzle-orm";
import { closeDb, dbOrNull } from "@/server/db/client";
import { config } from "@/server/config";
import { AUTH_SECRET_MIN } from "@/server/config";

/**
 * Jumlah tabel yang harus ada setelah migrasi.
 *
 * Dihitung dari `schema.ts`: 28 tabel, termasuk `admissions` dan `bed_capacity`
 * yang ikut migrations rawat inap. Angka ini sengaja ditulis tangan supaya
 * penyimpangan ketikanya terlihat langsung di berkas ini, bukan tersembunyi di
 * hasil hitungan yang selalu ikut berubah sendiri.
 */
const TABEL_HARAP = 28;

async function main(): Promise<void> {
  const c = config();

  console.log("konfigurasi");
  console.log(`  API_MODE       ${c.apiMode}`);
  console.log(`  DATABASE_URL   ${c.databaseUrl === "" ? "kosong" : "terisi"}`);
  console.log(
    `  AUTH_SECRET    ${
      c.authSecret === "" ? "kosong" : `terisi (${c.authSecret.length} karakter)`
    }` +
      (c.authSecret.length > 0 && c.authSecret.length < AUTH_SECRET_MIN
        ? `  PERINGATAN: minimal ${AUTH_SECRET_MIN} karakter`
        : ""),
  );
  console.log(`  ADMIN_ORIGIN   ${c.adminOrigin}`);

  const db = dbOrNull();
  if (db === null) {
    console.log("\ndatabase: tidak ada koneksi (mode snapshot)");
    return;
  }

  console.log("\ndatabase");

  const versi = await db.execute(sql`SELECT version() AS v`);
  const baris = versi as unknown as { v: string }[];
  console.log(`  server         ${baris[0]?.v.split(",")[0] ?? "tidak diketahui"}`);

  const jumlah = await db.execute(sql`
    SELECT count(*)::int AS n
      FROM information_schema.tables
     WHERE table_schema = 'public'
  `);
  const n = (jumlah as unknown as { n: number }[])[0]?.n ?? 0;
  console.log(
    `  tabel publik   ${n}` +
      (n === TABEL_HARAP ? "" : `   PERINGATAN: diharapkan ${TABEL_HARAP}, jalankan \`bun run db:migrate\``),
  );

  const isi = await db.execute(sql`
    SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name <> 'users'
  `);
  const nIsi = (isi as unknown as { n: number }[])[0]?.n ?? 0;
  console.log(`  tabel berisi   ${nIsi}` + (nIsi === 0 ? "   PERINGATAN: jalankan \`bun run db:seed\`" : ""));

  await closeDb();
}

await main();
