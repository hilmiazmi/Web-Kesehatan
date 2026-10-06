import { ApiError } from "./api/error";
import { config } from "./config";

/**
 * Validasi input formulir di sisi server.
 *
 * Validasi di klien hanya untuk memberi umpan balik cepat. Yang benar-benar
 * menentukan ada di sini, karena klien bisa dilewati dengan satu `curl`.
 *
 * Bentuknya sengaja bukan pustaka skema: daftar aturan untuk satu form jadi
 * beberapa baris biasa yang mudah dibaca, dan tiap validator mengembalikan nilai
 * yang sudah bersih supaya pemanggil tidak perlu mengulang `trim()`.
 *
 * Setiap fungsi menerima `Errors` yang sama dan menggabungkan hasilnya, jadi
 * satu permintaan bisa melaporkan semua field yang salah sekaligus, bukan
 * berhenti di field pertama.
 */
export class Errors {
  private readonly fields = new Map<string, string>();

  add(field: string, message: string): void {
    // Field pertama yang gagal tetap tercatat. Kalau ada dua aturan untuk
    // field yang sama, pesan pertama biasanya yang paling spesifik
    // ("Wajib diisi"), sedangkan yang berikutnya hanya mungkin terjadi kalau
    // isiannya sudah ada.
    if (!this.fields.has(field)) this.fields.set(field, message);
  }

  merge(other: Errors): void {
    for (const [field, message] of other.entries()) this.add(field, message);
  }

  entries(): IterableIterator<[string, string]> {
    return this.fields.entries();
  }

  get isEmpty(): boolean {
    return this.fields.size === 0;
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.fields);
  }

  toApiError(): ApiError {
    return ApiError.validation(this.toObject());
  }
}

/** Lempar hasil validasi kalau ada satu saja field yang gagal. */
export function finish(errors: Errors): void {
  if (!errors.isEmpty) throw errors.toApiError();
}

/** Bersihkan dan periksa teks wajib isi. */
export function textRequired(
  errors: Errors,
  field: string,
  value: string,
  min: number,
  max: number,
): string | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    errors.add(field, "Wajib diisi.");
    return null;
  }

  // Panjang dihitung per karakter, bukan per byte, supaya nama dengan huruf
  // non-Latin tidak ikut terpotong diam-diam.
  const len = [...trimmed].length;
  if (len < min) {
    errors.add(field, `Minimal ${min} karakter.`);
    return null;
  }
  if (len > max) {
    errors.add(field, `Maksimal ${max} karakter.`);
    return null;
  }

  return trimmed;
}

/** Bersihkan dan periksa teks opsional. String kosong menjadi `null`. */
export function textOptional(
  errors: Errors,
  field: string,
  value: string,
  max: number,
): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  if ([...trimmed].length > max) {
    errors.add(field, `Maksimal ${max} karakter.`);
    return null;
  }
  return trimmed;
}

/**
 * Periksa alamat surel. Kosong diterima kalau `required` salah.
 *
 * Hasilnya selalu huruf kecil supaya dua akun dengan alamat berbeda kapital
 * tidak bisa terdaftar dua kali.
 */
export function email(
  errors: Errors,
  field: string,
  value: string,
  required: boolean,
): string | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    if (required) errors.add(field, "Alamat surel wajib diisi.");
    return null;
  }

  if (trimmed.length > 255 || !isEmail(trimmed)) {
    errors.add(field, "Format alamat surel tidak valid.");
    return null;
  }

  return trimmed.toLowerCase();
}

/**
 * Nomor telepon Indonesia: `08...` atau `+628...`.
 *
 * Spasi, tanda hubung, dan kurung dibiarkan karena orang mengetik seperti yang
 * tercetak di KTP. Yang diperiksa hanya digitnya.
 */
export function phoneId(
  errors: Errors,
  field: string,
  value: string,
  required: boolean,
): string | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    if (required) errors.add(field, "Nomor telepon wajib diisi.");
    return null;
  }

  const digits = trimmed.replace(/[ ()+-]/g, "");

  if (!/^\d+$/.test(digits) || digits.length < 9 || digits.length > 15) {
    errors.add(field, "Nomor telepon tidak valid.");
    return null;
  }

  return trimmed;
}

/**
 * NIK 16 digit.
 *
 * Nilai yang lolos di sini diperiksa lagi di database lewat CHECK, karena
 * fungsi ini tidak bisa melihat apakah isinya dummy atau bukan.
 */
export function digitsExact(
  errors: Errors,
  field: string,
  value: string,
  len: number,
): string | null {
  const trimmed = value.replace(/[ -]/g, "");

  if (trimmed.length !== len || !/^\d+$/.test(trimmed)) {
    errors.add(field, `Harus ${len} digit angka.`);
    return null;
  }
  return trimmed;
}

/** Tanggal dalam bentuk `YYYY-MM-DD`, dibaca sebagai tanggal UTC. */
export type Tanggal = string;

/** Ubah `YYYY-MM-DD` menjadi objek tanggal, atau `null` kalau tidak valid. */
export function parseIsoDate(value: string): Date | null {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!cocok) return null;

  const [, tahun, bulan, hari] = cocok;
  const date = new Date(
    Date.UTC(Number(tahun), Number(bulan) - 1, Number(hari)),
  );

  // Menolak tanggal yang meluncur, misalnya 31 Februari: `new Date` akan
  // menggesernya ke 2 Maret tanpa memberi tanda.
  if (date.getUTCMonth() !== Number(bulan) - 1) return null;
  if (date.getUTCDate() !== Number(hari)) return null;

  return date;
}

/** Format tanggal menjadi `YYYY-MM-DD` dari objek tanggal UTC. */
export function formatIsoDate(date: Date): Tanggal {
  return date.toISOString().slice(0, 10);
}

/** Periksa tanggal `YYYY-MM-DD`. */
export function dateIso(
  errors: Errors,
  field: string,
  value: string,
  required: boolean,
): Date | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    if (required) errors.add(field, "Tanggal wajib diisi.");
    return null;
  }

  const date = parseIsoDate(trimmed);
  if (!date) {
    errors.add(field, "Tanggal tidak valid.");
    return null;
  }
  return date;
}

/**
 * Pastikan tanggal berada di antara `minDays` dan `maxDays` dari hari ini.
 *
 * Perbandingan dilakukan di server memakai tanggal UTC, jadi hasilnya tidak
 * bergantung pada zona waktu server yang kebetulan berubah.
 */
export function dateWithinDays(
  errors: Errors,
  field: string,
  date: Date,
  minDays: number,
  maxDays: number,
): Date | null {
  const { minLeadDays, maxLeadDays } = config();
  const min = minDays ?? minLeadDays;
  const max = maxDays ?? maxLeadDays;

  const today = new Date();
  const awal = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  const hariIni = awal.getTime() / 86_400_000;
  const hariDipilih = date.getTime() / 86_400_000;

  if (hariDipilih < hariIni + min) {
    errors.add(field, "Tanggal terlalu cepat.");
    return null;
  }
  if (hariDipilih > hariIni + max) {
    errors.add(field, "Tanggal terlalu jauh ke depan.");
    return null;
  }
  return date;
}

/** Pastikan nilai ada di dalam daftar yang diizinkan. */
export function choice<T extends string>(
  errors: Errors,
  field: string,
  value: string,
  allowed: readonly T[],
): T | null {
  const trimmed = value.trim();
  if ((allowed as readonly string[]).includes(trimmed)) return trimmed as T;

  errors.add(field, "Pilihan tidak dikenali.");
  return null;
}

/** Periksa bilangan bulat dengan rentang. */
export function integerRange(
  errors: Errors,
  field: string,
  value: number,
  min: number,
  max: number,
): number | null {
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.add(field, `Nilai harus antara ${min} dan ${max}.`);
    return null;
  }
  return value;
}

/**
 * Buang seluruh spasi ganda dan spasi di awal atau bawah.
 *
 * Diterapkan pada kolom pencarian admin supaya spasi berlebih tidak membuat
 * pencarian yang sama memberi hasil berbeda.
 */
export function squash(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).join(" ");
}

/**
 * Ubah kata kunci pencarian menjadi pola `ILIKE`.
 *
 * Dua hal dikerjakan di sini, dan keduanya soal apa yang dilakukan server
 * terhadap teks yang dikirim pengguna.
 *
 * **Dibungkus wildcard.** `ILIKE` tanpa `%` berarti pencocokan seluruh nilai,
 * jadi mengetik "gigi" di kotak pencarian tidak akan menemukan baris yang
 * isinya "Penyakit Gigi dan Mulut". Pola yang benar selalu punya `%` di kedua
 * ujungnya.
 *
 * **Wildcard di dalam teks di-escape.** Kalau tidak, `100%` akan terbaca
 * sebagai "mulai dengan 100", dan satu `%` saja akan cocok dengan seluruh
 * tabel. Backslash dipakai sebagai penandanya, jadi setiap query yang memakai
 * hasil fungsi ini wajib menyertakan `ESCAPE '\'`.
 *
 * Fungsi ini hanya mengubah bentuk teksnya, bukan kelayakannya: kata kunci
 * kosong menghasilkan string kosong, dan pemanggil wajib memilih untuk tidak
 * menambahkan klausa pencarian sama sekali. `kolom ILIKE ''` tidak pernah
 * bernilai benar, jadi menempelkan klausanya membuat daftar selalu kosong.
 */
export function searchPattern(needle: string): string {
  const teks = squash(needle);
  if (teks === "") return "";
  return `%${teks.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Validasi honeypot.
 *
 * Kolom perangkap diisi robot dan tidak pernah diisi manusia, jadi kalau ada
 * isinya, permintaan dianggap bot. Return `true` kalau terisi.
 */
export function isHoneypotTrap(value: string): boolean {
  return value.trim() !== "";
}

/**
 * Periksa bentuk alamat surel.
 *
 * Cakupannya sengaja longgar: yang diperiksa adalah susunan yang mustahil
 * bermasalah, bukan kepatuhan penuh terhadap RFC 5322. Server ini tidak
 * pernah mengirim surel dari situs ini, jadi tujuannya menyaring ketikan yang
 * jelas salah, bukan membuktikan alamat itu nyata.
 */
function isEmail(value: string): boolean {
  if (/\s/.test(value)) return false;

  // Satu `@` saja. Dua tanda `@` tidak pernah sah, dan kalau hanya yang
  // pertama yang diperiksa, `dua@@at.com` lolos karena bagian domainnya
  // `@at.com` masih mengandung titik.
  if (value.split("@").length !== 2) return false;

  const pemisah = value.indexOf("@");
  const local = value.slice(0, pemisah);
  const domain = value.slice(pemisah + 1);

  if (local.length === 0 || local.length > 64 || domain.length > 255) return false;

  // Setiap label domain dipisah titik, dan tidak boleh kosong, tidak boleh
  // diawali atau diakhiri tanda hubung, dan tidak boleh lebih dari 63 karakter.
  const label = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
  const domainBaik = domain.split(".").every(
    (bagian) => bagian.length > 0 && bagian.length <= 63 && label.test(bagian),
  );

  return domainBaik;
}

/**
 * Baca body permintaan sebagai objek JSON.
 *
 * Batas ukuran diperiksa di sini, bukan di lapisan server, karena
 * `Request.json()` sudah membaca seluruh body ke memori sebelum sempat
 * diukur. Satu permintaan 200 MB akan menahan memori selama proses baca,
 * bahkan kalau hasilnya langsung ditolak.
 *
 * Hasil yang dikembalikan selalu objek. Body kosong, body `null`, dan body
 * berupa larik semuanya menjadi objek kosong, karena pengirim formulir dari
 * panel admin dan skrip uji sama-sama mengirim `{}` saat tidak ada yang mau
 * diubah, dan sebuah galat untuk kasus itu akan sangat membingungkan.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const batas = config().bodyLimitBytes;

  const panjang = request.headers.get("content-length");
  if (panjang !== null && Number(panjang) > batas) {
    throw ApiError.payloadTooLarge();
  }

  const teks = await request.text();
  if (new TextEncoder().encode(teks).length > batas) {
    throw ApiError.payloadTooLarge();
  }

  if (teks.trim() === "") return {};

  let data: unknown;
  try {
    data = JSON.parse(teks);
  } catch {
    throw ApiError.badRequest("Body permintaan bukan JSON yang valid.");
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw ApiError.badRequest("Body permintaan harus berupa objek JSON.");
  }

  return data as Record<string, unknown>;
}
