/**
 * Siapkan akun admin sementara untuk E2E ber-database, lalu cetak kredensialnya.
 *
 * Alur yang diminta `e2e/alur-db.test.ts` langkah 1: file ini menulis
 * E2E_UJI_EMAIL/E2E_UJI_SANDI ke stdout (format `export A=B` per baris) supaya
 * pemanggil bisa `eval` hasilnya. Akunnya `super_admin` sementara di database
 * uji; hapus dengan `bun scripts/.bersihkan-admin-uji.ts <email>` setelah
 * test selesai. Kata sandi acak per jalan, jadi tidak ada kredensial yang
 * bisa dipakai ulang antar sesi. Yang dicetak ke stdout adalah nilai
 * sementara itu sendiri; jangan pernah ditulis ke berkas atau log yang
 * ikut ter-commit.
 */
import { sql } from "drizzle-orm";
import { dbOrNull } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";

const db = dbOrNull();
if (!db) throw new Error("butuh DATABASE_URL ke database uji");

const acak = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

const email = `e2e-uji-${Date.now()}@contoh-sehat.test`;
const sandi = `Uji-${acak()}-E2e!`;

await db.execute(sql`
  INSERT INTO users (email, name, role, password_hash, is_active)
  VALUES (${email}, 'E2E Uji Sementara', 'super_admin', ${await hashPassword(sandi)}, true)
`);

console.log(`export E2E_UJI_EMAIL=${email}`);
console.log(`export E2E_UJI_SANDI=${sandi}`);
