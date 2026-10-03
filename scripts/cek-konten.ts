/**
 * Periksa bahwa snapshot dan kode route saling asustan.
 *
 * Dua tempat menentukan nama berkas snapshot: `scripts/db-snapshot.ts` yang
 * menulisnya, dan setiap route handler yang membacanya lewat `denganSnapshot`.
 * Kalau keduanya berbeda, fallback diam-diam selalu gagal: mode snapshot
 * menjawab 404 untuk halaman yang sebenarnya ada isinya, dan tidak ada pesan
 * error yang menyinggungnya.
 *
 * Yang diperiksa di sini:
 *
 * 1. Setiap rute di `snapshot/manifest.json` punya berkas yang bisa dibaca dan
 *    isinya bukan `null`.
 * 2. Setiap kunci statis yang dipakai route handler ada di manifest.
 * 3. Kunci dinamis punya route yang benar-benar memakai polanya.
 * 4. Tabel seed tidak kosong, supaya masalah `db:seed` yang belum dijalankan
 *    ketahuan sebelum)/— di panel.
 *
 * ```bash
 * DATABASE_URL=postgres://... bun run cek:konten
 * ```
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { closeDb, dbOrNull } from "@/server/db/client";
import { TABEL_SEED, namaSql } from "./seed-data";

const DIREKTORI = path.join(process.cwd(), "snapshot");

/**
 * Kunci statis yang harus ada di manifest.
 *
 * Ditulis manual, bukan diambil dari kode, justru supaya skrip ini bisa
 * menangkap route yang lupa memakai `denganSnapshot`: kalau daftarnya ikut
 * dihitung dari kode, kunci yang hilang dari kedua tempat akan lolos.
 */
const KUNCI_WAJIB = [
  "home",
  "specialties",
  "polyclinics",
  "doctors",
  "services",
  "mcu__packages",
  "documents",
  "jobs",
  "settings__public",
  "beds",
  "articles",
];

/** Pola kunci dinamis, dengan `*` sebagai satu segmen yang berubah. */
const POLA_DINAMIS: readonly [string, RegExp][] = [
  ["articles", /^articles__[^/]+$/],
  ["services", /^services__[^/]+$/],
  ["pages", /^pages__[^/]+$/],
  ["mcu/packages", /^mcu__packages__[^/]+$/],
  ["jobs", /^jobs__[^/]+$/],
  ["doctors/{id}/schedules", /^doctors__[^/]+__schedules$/],
];

type Manifest = { versi: number; jumlah: number; rute: Record<string, string> };

let gagal = 0;

function lapis(pesan: string): void {
  console.log(`  GAGAL  ${pesan}`);
  gagal += 1;
}

async function main(): Promise<void> {
  const isi = await readFile(path.join(DIREKTORI, "manifest.json"), "utf8");
  const manifest = JSON.parse(isi) as Manifest;

  console.log(`manifest versi ${manifest.versi}, ${manifest.jumlah} rute\n`);

  if (Object.keys(manifest.rute).length !== manifest.jumlah) {
    lapis(
      `jumlah di manifest (${manifest.jumlah}) tidak sama dengan isi peta (${Object.keys(manifest.rute).length})`,
    );
  }

  const ada = new Set(await readdir(DIREKTORI));
  const kunciAda = new Set(Object.values(manifest.rute).map((n) => n.replace(/\.json$/, "")));

  console.log("berkas snapshot");
  for (const [ruteApi, namaBerkas] of Object.entries(manifest.rute)) {
    if (!ada.has(namaBerkas)) {
      lapis(`${ruteApi}: berkas ${namaBerkas} tidak ada`);
      continue;
    }

    const teks = await readFile(path.join(DIREKTORI, namaBerkas), "utf8");

    if (teks.trim() === "") {
      lapis(`${ruteApi}: berkas ${namaBerkas} kosong`);
      continue;
    }

    if (teks.trim() === "null") {
      lapis(`${ruteApi}: ${namaBerkas} berisi null`);
    }
  }

  console.log("\nkunci statis dari route handler");
  for (const kunci of KUNCI_WAJIB) {
    if (!kunciAda.has(kunci)) lapis(`kunci ${kunci} tidak ada di snapshot`);
  }

  console.log("\npola kunci dinamis");
  for (const [nama, pola] of POLA_DINAMIS) {
    const cocok = [...kunciAda].filter((k) => pola.test(k));
    if (cocok.length === 0) lapis(`tidak ada satu pun kunci untuk ${nama}`);
    else console.log(`  ${nama.padEnd(26)} ${cocok.length} berkas`);
  }

  const db = dbOrNull();
  if (db !== null) {
    console.log("\nisi tabel seed");
    const kosong: string[] = [];

    for (const nama of TABEL_SEED) {
      // Nama tabel berasal dari daftar konstanta di `seed-data.ts`, bukan dari
      // permintaan HTTP, jadi tidak ada nilai yang bisa disisipkan ke sini.
      // `sql.raw` dipakai karena Drizzle tidak bisa memakai `${string}` di
      // template: objek string-nya jadi parameter ikatan, bukan identifier.
      const hasil = await db.execute(
        sql`SELECT count(*)::int AS n FROM ${sql.raw(namaSql(nama))}`,
      );
      const n = (hasil as unknown as { n: number }[])[0]?.n ?? 0;
      if (n === 0) kosong.push(namaSql(nama));
    }

    if (kosong.length > 0) {
      lapis(`tabel kosong: ${kosong.join(", ")}. Jalankan \`bun run db:seed\`.`);
    } else {
      console.log(`  ${TABEL_SEED.length} tabel terisi`);
    }

    await closeDb();
  }

  console.log(gagal === 0 ? "\nsemua berkas snapshot konsisten" : `\n${gagal} masalah`);
  if (gagal > 0) process.exit(1);
}

await main();
