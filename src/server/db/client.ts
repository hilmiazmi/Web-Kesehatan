import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";
import { mapDbError } from "../api/error";
import * as schema from "./schema";

/**
 * Koneksi PostgreSQL dan instance Drizzle.
 *
 * Dibuat saat pertama kali dibutuhkan, bukan saat modul diimpor, supaya
 * `next build` tidak membuka koneksi ke database yang memang tidak ada di
 * lingkungan build.
 *
 * Bentuk singleton dipakai karena `postgres.js` punya connection pool sendiri.
 * Membuat pool per permintaan akan menghabiskan semua slot koneksi PostgreSQL
 * dalam beberapa detik, dan gejalanya (connection refused) muncul jauh dari
 * penyebabnya.
 */
export type Db = PostgresJsDatabase<typeof schema>;

type Koneksi = {
  sql: postgres.Sql;
  db: Db;
};

let koneksi: Koneksi | null = null;
let gagal: unknown = null;

/**
 * Ambil koneksi, atau `null` kalau mode snapshot.
 *
 * Mode snapshot memang tidak punya database. Mengembalikan `null` membuat
 * pemanggil wajib mempertimbangkan cabangnya, sehingga tidak ada jalur yang diam-diam
 * mengembalikan data kosong untuk permintaan yang seharusnya error.
 */
export function dbOrNull(): Db | null {
  if (config().apiMode === "snapshot") return null;

  if (gagal) throw mapDbError(gagal);
  if (koneksi) return koneksi.db;

  try {
    const { databaseUrl, dbMaxConnections, dbAcquireTimeoutSeconds } = config();
    const sql = postgres(databaseUrl, {
      max: dbMaxConnections,
      // Batas menunggu koneksi. Tanpa ini, ketika semua slot terpakai aplikasi
      // menunggu tanpa henti dan permintaan menggantung lebih lama daripada
      // timeout yang sudah ditetapkan Traefik di depannya.
      connect_timeout: dbAcquireTimeoutSeconds,
      // Jam server dipatok ke UTC. Tanpa ini, `to_jsonb` pada kolom
      // `timestamptz` menulis offset zona waktu server, jadi hasil yang sama
      // akan berbeda antara mesin lokal dan VPS. `CURRENT_DATE` di dasbor juga
      // ikut bergeser, sehingga "pendaftaran hari ini" bisa menghitung tanggal
      // yang berbeda tergantung tempat aplikasinya berjalan.
      connection: { TimeZone: "UTC" },
      // Serverless sering lingered karena koneksi tidak ditutup. Batas idle
      // membuat koneksi dilepas sendiri sebelum itu terjadi.
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      onnotice: () => {},
    });

    koneksi = { sql, db: drizzle(sql, { schema }) };
    return koneksi.db;
  } catch (err) {
    gagal = err;
    throw mapDbError(err);
  }
}

/** Tutup pool. Dipanggil skrip CLI sebelum keluar supaya tidak menggantung. */
export async function closeDb(): Promise<void> {
  if (!koneksi) return;
  await koneksi.sql.end({ timeout: 5 });
  koneksi = null;
  gagal = null;
}

/**
 * Periksa koneksi dengan satu query.
 *
 * Dipakai health check. `SELECT 1` saja tidak berguna: koneksi bisa hidup
 * sementara database sudah menerima koneksi lain tapi tabelnya hilang.
 */
export async function checkDb(): Promise<{ ok: boolean; detail: string }> {
  const db = dbOrNull();
  if (!db) return { ok: true, detail: "mode snapshot, database tidak disentuh" };

  try {
    await db.execute("SELECT 1");
    return { ok: true, detail: "database menjawab" };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export { schema };