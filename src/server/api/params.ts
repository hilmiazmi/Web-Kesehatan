import { ApiError } from "./error";
import { Errors, parseIsoDate, type Tanggal } from "../validation";

/**
 * Pembacaan parameter query dan segmen path.
 *
 * Semua helper di sini mengembalikan nilai yang sudah dinormalisasi, atau
 * melempar `ApiError` dengan pesan yang menyebut nama parameternya. Menulis
 * pembacaan parameter di setiap route handler membuat pesan galat jadi berbeda
 *-beda, dan panel admin tidak bisa menampilkan pesan yang benar karena tidak
 * tahu field mana yang salah.
 */

/** Source tempat parameter dibaca, untuk pesan galat. */
export type Sumber = URLSearchParams | Record<string, string | string[] | undefined>;

/**
 * Ambil satu parameter teks, sudah dipangkas spasi.
 *
 * Nilai kosong dan spasi saja menjadi `null`, bukan string kosong. Tanpa itu
 * setiap filter perlu memeriksa dua bentuk "tidak ada filter", dan satu
 * pemeriksaan yang lupa akan mengubah `?category=` menjadi "hanya kategori
 * kosong".
 */
export function teks(sumber: Sumber, nama: string): string | null {
  const mentah = baca(sumber, nama);
  if (mentah === undefined || mentah === null) return null;

  const dipangkas = mentah.trim();
  return dipangkas === "" ? null : dipangkas;
}

/** Ambil seluruh nilai dari parameter yang boleh berulang. */
export function teksSemua(sumber: Sumber, nama: string): string[] {
  const mentah = bacaSemua(sumber, nama);
  return mentah.map((v) => v.trim()).filter((v) => v !== "");
}

/**
 * Ambil parameter sebagai bilangan bulat.
 *
 * Nilai yang bukan angka berarti kesalahan, bukan memakai bawaan. `?page=dua`
 * yang diam-diam jadi halaman satu membuat panel terlihat rusak tanpa
 * penjelasan.
 */
export function bilangan(sumber: Sumber, nama: string, bawaan: number): number {
  const mentah = teks(sumber, nama);
  if (mentah === null) return bawaan;

  if (!/^-?\d+$/.test(mentah)) {
    throw ApiError.validation({ [nama]: "Harus bilangan bulat." });
  }
  return Number(mentah);
}

/**
 * Ambil parameter sebagai bilangan bulat dalam rentang tertentu.
 *
 * Nilai di luar rentang dijepit, bukan ditolak: panel yang mengirim
 * `page_size=1000` lebih baik dilayani sepuluh penuh daripada ditolak.
 */
export function bilanganTerbatas(
  sumber: Sumber,
  nama: string,
  bawaan: number,
  min: number,
  maks: number,
): number {
  const nilai = bilangan(sumber, nama, bawaan);
  if (!Number.isFinite(nilai)) return bawaan;
  return Math.min(Math.max(nilai, min), maks);
}

/** Parameter yang menandai ya atau tidak. */
export function boolean(sumber: Sumber, nama: string): boolean {
  const mentah = (teks(sumber, nama) ?? "").toLowerCase();
  return ["1", "true", "yes", "on", "ya"].includes(mentah);
}

/**
 * Baca segmen path yang berisi UUID.
 *
 * `params` pada route handler Next.js selalu berupa objek dengan nilai
 * `string | string[] | undefined`, dan untuk segmen dinamis selalu `string`.
 * Spasi di sekitar UUID tetap diterima supaya URL yang disalin dari peramban
 * tidak langsung ditolak karena ada spasi nyasar.
 */
export function uuid(params: Record<string, string | string[] | undefined>, nama: string): string {
  const mentah = baca(params, nama);
  const dipangkas = (mentah ?? "").trim();

  if (!UUID_PATTERN.test(dipangkas)) {
    throw ApiError.validation({ [nama]: "Format ID tidak valid." });
  }
  return dipangkas;
}

/**
 * Parameter tanggal `YYYY-MM-DD`.
 *
 * Diterima juga tanggal lengkap dengan waktu, karena beberapa klien mengirim
 * nilai dari `<input type="date">` bersama jam WIB, dan menolaknya hanya akan
 * memaksa klien memangkas sendiri.
 */
export function tanggal(
  sumber: Sumber,
  nama: string,
): { ada: false } | { ada: true; nilai: Tanggal } {
  const mentah = teks(sumber, nama);
  if (mentah === null) return { ada: false };

  const potong = mentah.slice(0, 10);
  if (parseIsoDate(potong) === null) {
    throw ApiError.validation({ [nama]: "Tanggal harus format YYYY-MM-DD." });
  }
  return { ada: true, nilai: potong };
}

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function baca(sumber: Sumber, nama: string): string | null {
  if (sumber instanceof URLSearchParams) return sumber.get(nama);

  const nilai = sumber[nama];
  if (Array.isArray(nilai)) return nilai.length > 0 ? nilai[0] : null;
  return nilai ?? null;
}

function bacaSemua(sumber: Sumber, nama: string): string[] {
  if (sumber instanceof URLSearchParams) return sumber.getAll(nama);

  const nilai = sumber[nama];
  if (Array.isArray(nilai)) return nilai;
  return nilai === undefined ? [] : [nilai];
}

/** Kumpulkan galat dari beberapa sumber sekaligus, lalu lempar satu kali. */
export function gabung(errors: Errors): void {
  if (!errors.isEmpty) throw errors.toApiError();
}