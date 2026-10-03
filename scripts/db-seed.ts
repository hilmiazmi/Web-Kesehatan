/**
 * Isi database kosong dari `scripts/seed-data.json`.
 *
 * Aman dijalankan berulang kali: setiap tabel disisipkan dengan
 * `ON CONFLICT DO NOTHING`, jadi baris yang sudah ada tidak ditimpa dan baris
 * yang belum ada ditambahkan. Sifat idempoten itu gunanya bukan untuk
 * mengoreksi isi, tapi supaya menjalankan seed setelah menambah satu tabel tidak
 * menghapus riwayat yang sudah terkumpul.
 *
 * Akun admin pertama tidak ikut dalam berkas seed. Ia dibuat dari environment,
 * supaya kata sandinya tidak pernah masuk Git.
 *
 * ```bash
 * DATABASE_URL=postgres://... AUTH_SECRET=... bun run db:seed
 * ```
 */

import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { closeDb, dbOrNull, type Db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { Errors, email as validateEmail } from "@/server/validation";
import { TABEL_SEED, VERSI_SEED, keSLeiaWaktu, namaSql, type IsiSeed } from "./seed-data";

const BERKAS = "scripts/seed-data.json";

/**
 * Jumlah baris per satu INSERT.
 *
 * PostgreSQL punya batas 65535 parameter per pernyataan, dan tabel seed
 * terbesar punya lebih dari seribu kolom di seluruh barisnya. Lima puluh baris
 * menjaga margin dengan lega tanpa menambah jumlah permintaan berarti.
 */
const BATCH = 50;

type Baris = Record<string, unknown>;

function gagal(pesan: string): never {
  console.error(`\nGAGAL: ${pesan}`);
  process.exit(1);
}

async function isiTabel(db: Db, nama: string, baris: Baris[]): Promise<void> {
  if (baris.length === 0) {
    console.log(`${namaSql(nama).padEnd(20)}    0   dilewati`);
    return;
  }

  const tabel = schema[nama as keyof typeof schema] as unknown as PgTable;

  for (let mulai = 0; mulai < baris.length; mulai += BATCH) {
    const potongan = baris
      .slice(mulai, mulai + BATCH)
      .map((satu) => keSLeiaWaktu(tabel, satu));

    await db.insert(tabel).values(potongan as never[]).onConflictDoNothing();
  }

  console.log(`${namaSql(nama).padEnd(20)} ${String(baris.length).padStart(4)}`);
}

/**
 * Buat akun admin pertama kalau belum ada.
 *
 * Pengecekan dilakukan sebelum penyisipan, bukan lewat `ON CONFLICT`, supaya
 * menjalankan seed berulang kali tidak diam-diam mengubah kata sandi admin yang
 * sudah ada. Seed bukan alat untuk menyetel ulang kata sandi, dan tidak
 * seharusnya bisa dipakai tanpa sengaja oleh siapa pun yang punya akses ke
 * environment.
 */
async function isiAdmin(db: Db): Promise<void> {
  const surel = (process.env.SEED_ADMIN_EMAIL ?? "").trim();
  const sandi = process.env.SEED_ADMIN_PASSWORD ?? "";
  const nama = (process.env.SEED_ADMIN_NAME ?? "").trim() || "Administrator";

  const errors = new Errors();
  const surelAkhir = validateEmail(errors, "SEED_ADMIN_EMAIL", surel, true);

  if (sandi.length < 10) {
    errors.add("SEED_ADMIN_PASSWORD", "Kata sandi minimal 10 karakter.");
  }

  if (!errors.isEmpty) {
    gagal(
      "Variabel seed admin belum benar:\n  " +
        [...errors.entries()].map(([field, pesan]) => `${field}: ${pesan}`).join("\n  "),
    );
  }

  const ada = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, surelAkhir!));

  if (ada.length > 0) {
    console.log(`${"users (admin)".padEnd(20)}    1   sudah ada, dilewati`);
    return;
  }

  await db.insert(schema.users).values({
    email: surelAkhir!,
    name: nama,
    role: "super_admin",
    passwordHash: await hashPassword(sandi),
    isActive: true,
  });

  console.log(`${"users (admin)".padEnd(20)}    1   dibuat dari environment`);
}

async function main(): Promise<void> {
  const db = dbOrNull();
  if (db === null) {
    gagal("Seed butuh database. Isi DATABASE_URL lalu jalankan ulang.");
  }

  const isi = JSON.parse(await readFile(BERKAS, "utf8")) as IsiSeed;

  if (isi.version !== VERSI_SEED) {
    gagal(
      `Versi berkas seed ${isi.version} tidak dikenal; skrip ini hanya membaca ` +
        `versi ${VERSI_SEED}. Jalankan \`bun run seed:ekstrak\` lagi.`,
    );
  }

  console.log(
    `Isi seed versi ${isi.version}, ${Object.keys(isi.tables).length} tabel.\n`,
  );

  await isiAdmin(db!);

  for (const nama of TABEL_SEED) {
    const baris = isi.tables[nama];
    if (baris === undefined) {
      console.warn(`PERINGATAN tabel ${namaSql(nama)} tidak ada di berkas seed.`);
      continue;
    }
    await isiTabel(db!, nama, baris);
  }

  await closeDb();
  console.log("\nselesai");
}

await main();
