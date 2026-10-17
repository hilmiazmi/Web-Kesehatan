/**
 * Backup database dengan nama berpola waktu dan rotasi otomatis.
 *
 * Bedanya dengan perintah `pg_dump` yang ditulis manual di
 * `docs/DEPLOY-VPS.md`: skrip ini memberi nama berkas yang bisa diurut,
 * memutar berkas lama, dan bukti bahwa berkasnya benar-benar ada dan terisi.
 * Tiga hal itu tidak bisa diandalkan ke perintah manual karena ketiganya
 * dilupakan tepat saat dibutuhkan.
 *
 * Perintah seperti apa pun yang mengubah isi database, skrip ini **tidak**
 * pernah menghapus dump terbaru. Rotasi hanya menyentuh berkas yang lebih
 * lama dari `SIMPAN_HARI`, dan satu berkas terbaru selalu dilewati.
 *
 * Jalankan:
 *
 *   BACKUP_DIR=/srv/web-kesehatan/backup bun run db:backup
 *   SIMPAN_HARI=30 bun run db:backup
 */
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";

const { config } = await import("@/server/config");
const { dbOrNull, closeDb } = await import("@/server/db/client");

const DIR = process.env["BACKUP_DIR"] ?? "./backup";
/** Berapa hari dump yang dipakai masih disimpan. */
const SIMPAN_HARI = Number(process.env["SIMPAN_HARI"] ?? "14");

/** Tanggal menurut zona waktu yang sama dengan aturan aplikasi, bukan UTC. */
const cap = process.env["TZ"] ?? "Asia/Jakarta";

function waktu(): string {
  const d = new Date();
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: cap,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  // en-CA memberi `YYYY-MM-DD, HH:mm`; jadikan `YYYY-MM-DD_HHMM`.
  const [tanggal, jam] = bagian.split(", ");
  const jamRapi = jam.split(":").slice(0, 2).join("");
  return `${tanggal}_${jamRapi}`;
}

/**
 * Jalankan perintah dan kumpulkan keluaran standarnya.
 *
 * `execFile`, bukan `exec`: perintahnya tidak lewat shell, jadi nama berkas
 * yang mengandung spasi tidak terpecah jadi dua argumen.
 */
function jalan(perintah: string, argumen: string[]): Promise<void> {
  return new Promise((selesai, tolak) => {
    execFile(perintah, argumen, { maxBuffer: 64 * 1024 * 1024 }, (galat) => {
      if (galat) tolak(galat);
      else selesai();
    });
  });
}

async function main(): Promise<void> {
  // Database dibaca dari konfigurasi, sama seperti kegiatan lain. Yang dibutuhkan
  // hanya nama database, user, dan host; `pg_dump` yang memegang koneksinya.
  const kfg = config();
  if (kfg.apiMode !== "live") {
    throw new Error(
      "mode snapshot: tidak ada database untuk di-backup. Set API_MODE=live.",
    );
  }

  // Pastikan database benar-benar menjangkau sebelum menulis berkas. Dump kosong
  // yang muncul "berhasil" adalah bentuk kegagalan paling menipu.
  const db = dbOrNull();
  if (!db) throw new Error("DATABASE_URL tidak diisi, tidak ada yang bisa di-backup.");
  await db.execute(sql`select 1`);
  await closeDb();

  await fs.mkdir(DIR, { recursive: true });

  const nama = path.join(DIR, `rsud_${waktu()}.dump`);

  // Ketiga nilai ini diambil dari DATABASE_URL yang sudah dipakai aplikasi,
  // bukan dari variabel terpisah, supaya tidak mungkin berbeda sasaran.
  const url = new URL(kfg.databaseUrl);
  const database = url.pathname.replace(/^\//, "");
  const user = url.username;
  const host = url.hostname;
  const port = url.port || "5432";

  await jalan("pg_dump", [
    "-h",
    host,
    "-p",
    port,
    "-U",
    user,
    "-d",
    database,
    "-F",
    "c",
    "-f",
    nama,
  ]);

  // Bukti bahwa berkasnya benar-benar terisi. Ukuran nol lolos dari `ls` dan
  // dari `echo selesai`, lalu ketahuan saat dipulihkan.
  const isi = await fs.stat(nama);
  if (isi.size < 1024) {
    await fs.rm(nama, { force: true });
    throw new Error(
      `dump hanya ${isi.size} byte, dibuang. Database kemungkinan kosong atau koneksi putus.`,
    );
  }

  const ukuran = (isi.size / 1024 / 1024).toFixed(1);
  console.log(`dump tersimpan: ${nama} (${ukuran} MB)`);

  // Rotasi: dump yang lebih tua dari SIMPAN_HARI dihapus, tapi yang paling
  // baru tidak pernah ikut walau keadaannya penuh.
  const batas = Date.now() - SIMPAN_HARI * 24 * 60 * 60 * 1000;
  const semua = (await fs.readdir(DIR)).filter((f) => f.endsWith(".dump")).sort();
  const yangDipakai = semua.at(-1);
  let dihapus = 0;

  for (const berkas of semua) {
    if (berkas === yangDipakai) continue;
    const info = await fs.stat(path.join(DIR, berkas));
    if (info.mtimeMs < batas) {
      await fs.rm(path.join(DIR, berkas), { force: true });
      dihapus += 1;
    }
  }

  console.log(
    `rotasi: ${dihapus} dump lebih tua dari ${SIMPAN_HARI} hari dihapus, ${semua.length - dihapus} dump tersisa.`,
  );
}

await main();