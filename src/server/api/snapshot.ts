import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "../db/client";
import { dbOrNull } from "../db/client";
import { config } from "../config";
import { ApiError, dbErrorCode } from "./error";

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
 * `ruteApi` adalah path endpoint seperti yang dibaca klien, tanpa awalan
 * `/api/v1`: `"/mcu/packages/paket-dakar-1"`. Nama berkasnya dihitung sendiri
 * oleh `snapshotKey()`, jadi pemanggil tidak pernah menulis nama berkas secara
 * manual.
 *
 *MELEWATKAN PATH, bukan nama berkas, bukan pilihan gaya. Bentuk lama
 * (`` `pages_$_slug` ``) terlihat benar di diff dan diam-diam selalu salah,
 * karena `$_slug` bukan interpolasi. Fallback yang selalu gagal menghasilkan
 * 404 di mode pratinjau tanpa jejak apa pun di log.
 *
 * Isi berkas snapshot adalah muatan yang akan dibungkus `ok()`, bukan amplop
 * lengkapnya. Kalau amplop ikut disimpan, hasilnya `{ "data": { "data": ... } }`
 * dan setiap klien harus membongkar dua lapis.
 *
 * `sesuaikan` menutup satu celah: snapshot menyimpan hasil satu kueri dengan
 * parameter tertentu, sedangkan rute bisa dipanggil dengan parameter lain.
 *Tanpa callback ini, `?category=kerjasama` dijawab dengan seluruh isi
 * snapshot dan status 200, sehingga tidak ada yang bisa membedakan jawaban
 * benar dari jawaban salah. Rute yang tidak menyaring tidak perlu mengisinya.
 * Mekanismenya ada di `snapshot-query.ts`.
 */
export async function denganSnapshot<T>(
  sumber: (db: Db) => Promise<T>,
  ruteApi: string,
  sesuaikan?: (muatan: unknown) => T,
): Promise<T> {
  const kunci = snapshotKey(ruteApi);
  const db = dbOrNull();

  // Callback ini hanya menyentuh muatan snapshot, bukan hasil kueri. Hasil
  // kueri sudah disaring dan dipotong oleh SQL-nya sendiri.
  const terapkan = (muatan: unknown): T =>
    sesuaikan ? sesuaikan(muatan) : (muatan as T);

  // Mode snapshot tidak punya database sama sekali. Membaca lewat jalur
  // database hanya akan menghasilkan koneksi yang ditolak.
  if (db === null) {
    const dariSnapshot = await baca(kunci);
    if (dariSnapshot === null) {
      throw ApiError.notFound("data");
    }
    return terapkan(dariSnapshot);
  }

  try {
    return await sumber(db);
  } catch (err) {
    if (config().apiMode !== "live") throw err;

    // Hanya database yang tidak bisa dihubungi yang boleh dialihkan ke
    // snapshot. Galat lain harus diteruskan apa adanya.
    //
    // Batas ini penting. Tanpa itu, satu nilai enum yang salah ketik di
    // parameter permintaan membuat kueri gagal, lalu database dituduh tidak
    // hidup, lalu snapshot membalikkan seluruh daftar tanpa filter. Hasilnya 200
    // dengan isi yang salah, dan tidak ada satu pun tanda bahwa ada yang rusak.
    if (!bisaKonek(err)) throw err;

    const dariSnapshot = await baca(kunci);
    if (dariSnapshot === null) throw err;

    // Dicatat sebagai peringatan, bukan galat: pengguna tetap mendapat
    // jawaban, dan yang perlu diperbaiki adalah database-nya.
    console.warn(
      `[api] database tidak menjawab, snapshot dipakai untuk "${kunci}"`,
      err instanceof Error ? err.message : err,
    );

    return terapkan(dariSnapshot);
  }
}

/**
 * Apakah galat ini berarti database tidak bisa dihubungi.
 *
 * Daftar kode di bawah adalah galat koneksi dan jaringan, bukan galat kueri. Kode
 * `22xxx` (data exception) sengaja tidak ada di sini: `?category=kerjasama`
 * pada enum yang tidak memuatnya adalah kesalahan permintaan, dan menjawabnya
 * dari snapshot hanya menyembunyikan kesalahannya.
 */
function bisaKonek(err: unknown): boolean {
  const kode = dbErrorCode(err);

  if (kode === undefined) return false;

  return (
    kode.startsWith("08") || // connection exception
    kode.startsWith("53") || // insufficient resources
    kode.startsWith("57") || // operator intervention, termasuk admin shutdown
    kode.startsWith("58") || // system error, termasuk koneksi terputus
    kode.startsWith("99")
  );
}

/**
 * Nama berkas snapshot untuk satu rute.
 *
 * Segmen URL disambung dengan `__`, jadi `/mcu/packages/paket-dasar-1`
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