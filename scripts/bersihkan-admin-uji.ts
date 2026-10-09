/**
 * Hapus akun admin sementara E2E beserta baris uji yang ia tinggalkan.
 *
 * Pakai: `bun scripts/bersihkan-admin-uji.ts <email>`. Menghapus user-nya
 * plus feedback yang pesannya diawali "Pesan uji E2E" (pola yang dipakai
 * `e2e/alur-db.test.ts`). Pengaturan situs tidak perlu disentuh: test-nya
 * sendiri mengembalikan tagline ke nilai awal.
 */
import { sql } from "drizzle-orm";
import { dbOrNull } from "@/server/db/client";

const db = dbOrNull();
if (!db) throw new Error("butuh DATABASE_URL ke database uji");

const email = process.argv[2];
if (!email || !email.endsWith("@contoh-sehat.test")) {
  console.error("pakai: bun scripts/.bersihkan-admin-uji.ts <email-uji>");
  process.exit(1);
}

const hapusUser = await db.execute(sql`DELETE FROM users WHERE email = ${email} RETURNING id`);
const hapusFb = await db.execute(
  sql`DELETE FROM feedbacks WHERE message LIKE 'Pesan uji E2E%' RETURNING id`,
);

console.log(`user dihapus: ${hapusUser.length}, feedback uji dihapus: ${hapusFb.length}`);
