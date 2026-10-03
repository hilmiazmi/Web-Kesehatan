import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "../db/client";
import { dbOrNull } from "../db/client";
import { config } from "../config";
import { ApiError } from "./error";

/**
 * Baca dari database, dengan snapshot sebagai cadangan.
 *
 * Snapshot dipakai dalam dua keadaan, dan keduanya penting untuk lingkungan
 * pratinjau Vercel: `API_MODE=snapshot` yang membuat build pratinjau tidak
 * butuh database sama sekali, dan database yang gagal dibaca saat mode
 * `live`.
 *
 * Hanya pembacaan. Endpoint yang menulis tidak pernah diam-diam melaporkan
 * berhasil tanpa menyimpan apa pun, jadi kegagalan itu harus tetap terlihat.
 *
 * `kunci` adalah nama berkas snapshot tanpa ekstensi, misalnya `mcu__packages`
 * untuk `/api/v1/mcu/packages`. `snapshotKey()` sehari-hari menghitungnya dari
 * URL, dan `scripts/db-snapshot.ts` menulis ulang seluruh berkasnya.
 *
 * Isi berkas snapshot adalah muatan yang akan dibungkus `ok()`, bukan amplop
 * lengkapnya. Kalau amplop ikut disimpan, hasilnya `{ "data": { "data": ... } }`
 * dan setiap klien harus membongkar dua lapis.
 */
export async function denganSnapshot<T>(
  sumber: (db: Db) => Promise<T>,
  kunci: string,
): Promise<T> {
  const db = dbOrNull();

  // Mode snapshot tidak punya database sama sekali. Membaca lewat jalur
  // database hanya akan menghasilkan koneksi yang ditolak.
  if (db === null) {
    const dariSnapshot = await baca(kunci);
    if (dariSnapshot === null) {
      throw ApiError.notFound("data");
    }
    return dariSnapshot as T;
  }

  try {
    return await sumber(db);
  } catch (err) {
    if (config().apiMode !== "live") throw err;

    const dariSnapshot = await baca(kunci);
    if (dariSnapshot === null) throw err;

    // Dicatat sebagai peringatan, bukan galat: pengguna tetap mendapat
    // jawaban, dan yang perlu diperbaiki adalah database-nya.
    console.warn(`[api] snapshot dipakai untuk "${kunci}":`, err instanceof Error ? err.message : err);

    return dariSnapshot as T;
  }
}

/**
 * Nama berkas snapshot untuk satu rute.
 *
 * Segmen URL disambung dengan `__`, jadi `/api/v1/mcu/packages/paket-dasar-1`
 * menjadi `mcu__packages__paket-dasar-1`. Aturan ini harus sama persis dengan
 * yang dipakai `scripts/db-snapshot.ts`; kalau tidak, fallback diam-diam selalu
 * gagal dan tidak ada yang menyadarinya. Karena itu keduanya memanggil fungsi
 * yang sama, bukan implementasi terpisah.
 */
export function snapshotKey(rute: string): string {
  return rute
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map(sanitizeSegmen)
    .join("__");
}

/** Direktori snapshot, relatif terhadap akar proyek. */
function snapshotRoot(): string {
  return path.join(process.cwd(), "snapshot");
}

/**
 * Satu segmen nama berkas snapshot.
 *
 * Segmen rute berasal dari URL, jadi belum tentu aman jadi nama berkas.
 * Karakter di luar huruf, angka, tanda hubung, dan garis bawah diganti, bukan
 * ditolak: `/api/v1/articles/jam-layanan` dan `/api/v1/articles/jam_layanan`
 * harusnya tetap bisa menemukan berkas yang sama, dan penolakan hanya akan
 * menjauh dari sumber masalahnya.
 */
function sanitizeSegmen(segmen: string): string {
  return segmen.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
}

async function baca(kunci: string): Promise<unknown | null> {
  const root = snapshotRoot();
  const target = path.join(root, `${kunci}.json`);

  // Penjaga kedua. Nama berkas sudah dibersihkan di atas, jadi ini tidak akan
  // terjadi; tapi jalur keluar dari direktori snapshot harus tetap mustahil
  // kalau nanti ada pemanggil yang mengirim kunci mentah.
  if (path.dirname(target) !== root) return null;

  try {
    return JSON.parse(await readFile(target, "utf8")) as unknown;
  } catch {
    return null;
  }
}