import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { ApiError } from "../api/error";
import {
  Errors,
  email as validateEmail,
  phoneId,
  searchPattern,
  squash,
  textOptional,
  textRequired,
} from "../validation";
import { find, field as findField, sortableColumns, writable, type Field, type TableSpec } from "./registry";

/**
 * CRUD generik untuk seluruh tabel konten.
 *
 * Nama tabel dan kolom selalu datang dari `./registry`, tidak pernah dari
 * request. Karena itu modul ini juga dipakai handler akun admin.
 *
 * Query-nya ditulis dengan SQL mentah, bukan query builder Drizzle, karena
 * bentuk SQL-nya bergantung pada nama tabel dan daftar kolom yang ditentukan
 * registri. Nama identifier disisipkan apa adanya lewat `sql.raw`, dan itu
 * aman justru karena `sql.raw` hanya menerima string dari registri. Nilai dari
 * request tetap menjadi parameter PostgreSQL, tidak pernah ikut disisipkan.
 */

/** Batas baris per halaman di panel admin. */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export function defaultPageSize(): number {
  return DEFAULT_PAGE_SIZE;
}

/**
 * Daftar baris dengan pagination, pencarian, dan pengurutan.
 *
 * Setiap baris dikembalikan sebagai objek JSON hasil `to_jsonb`, jadi panel
 * admin selalu melihat seluruh kolom yang ada di tabel, termasuk kolom yang
 * belum tampil di panel. Daftar eksplisit per tabel akan cepat basi setiap
 * kali ada kolom baru.
 */
export async function listRecords(
  db: Db,
  spesifikasi: TableSpec,
  options: {
    page: number;
    pageSize: number;
    search?: string | null;
    sort?: string | null;
    descending?: boolean;
  },
): Promise<Record<string, unknown>> {
  const size = clamp(options.pageSize, 1, MAX_PAGE_SIZE);
  const page = Math.max(1, options.page);
  const offset = (page - 1) * size;

  // `sort` hanya diterima kalau persis sama dengan nama kolom yang dikenal.
  // Nilai ini masuk ke SQL tanpa tanda kutip, jadi daftar putih di sini
  // satu-satunya penghalang antara request dan injeksi SQL.
  const allowed = sortableColumns(spesifikasi);
  const orderColumn =
    options.sort && allowed.has(options.sort) ? options.sort : spesifikasi.defaultOrder;
  const arah = options.descending ? "DESC" : "ASC";

  const needle = options.search ? squash(options.search) : "";
  const pola = searchPattern(needle);

  // Klausa pencarian hanya ditambahkan kalau memang ada kata kunci. Kalau
  // klausanya selalu ditambahkan, kata kunci kosong dikirim sebagai NULL, dan
  // `kolom ILIKE NULL` bernilai NULL untuk semua baris. Hasilnya: daftar tanpa
  // kata kunci selalu kosong, dan gejalanya terlihat seperti database yang
  // kosong, bukan seperti filter yang salah.
  const syarat = spesifikasi.searchColumns.map(
    (column) => sql`${sql.raw(`"${column}"::text`)} ILIKE ${pola} ESCAPE '\\'`,
  );
  const where =
    needle !== "" && syarat.length > 0 ? sql` WHERE ${sql.join(syarat, sql` OR `)}` : sql``;

  const rows = await db.execute(sql`
    SELECT to_jsonb(t) AS row FROM ${sql.raw(`"${spesifikasi.table}"`)} t${where}
    ORDER BY ${sql.raw(`"${orderColumn}" ${arah}`)}, ${sql.raw(`"id" ${arah}`)}
    LIMIT ${size} OFFSET ${offset}
  `);

  const total = await db.execute(sql`
    SELECT count(*)::int AS total FROM ${sql.raw(`"${spesifikasi.table}"`)} t${where}
  `);

  const jumlah = Number((total[0] as { total: number }).total);
  const dir = arah.toLowerCase();

  return {
    items: rows.map((r) => (r as { row: unknown }).row),
    total: jumlah,
    page,
    page_size: size,
    pages: size > 0 ? Math.ceil(jumlah / size) : 1,
    sort: orderColumn,
    direction: dir,
    search: needle === "" ? null : needle,
  };
}

/** Ambil satu baris berdasarkan ID. */
export async function getRecord(
  db: Db,
  spesifikasi: TableSpec,
  id: string,
): Promise<Record<string, unknown> | null> {
  const rows = await db.execute(sql`
    SELECT to_jsonb(t) AS row
      FROM ${sql.raw(`"${spesifikasi.table}"`)} t
     WHERE t.id = ${id}::uuid
  `);

  return rows[0] ? ((rows[0] as { row: unknown }).row as Record<string, unknown>) : null;
}

/** Buat satu baris baru. */
export async function createRecord(
  db: Db,
  spesifikasi: TableSpec,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const errors = new Errors();
  const kolom: string[] = [];
  const nilai: unknown[] = [];

  for (const kolomSpec of writable(spesifikasi)) {
    const raw = body[kolomSpec.column];

    // Field yang tidak dikirim dan punya nilai bawaan diisi default. Field
    // tanpa default dibiarkan, dan database menarisi DEFAULT-nya.
    if (raw === undefined) {
      if (kolomSpec.default !== undefined) {
        kolom.push(kolomSpec.column);
        nilai.push(defaultValue(kolomSpec, kolomSpec.default));
      }
      continue;
    }

    const hasil = coerce(errors, kolomSpec, raw);
    if (hasil !== undefined) {
      kolom.push(kolomSpec.column);
      nilai.push(hasil);
    }
  }

  if (!errors.isEmpty) throw errors.toApiError();

  if (kolom.length === 0) {
    throw ApiError.badRequest("Tidak ada kolom yang bisa diisi.");
  }

  const rows = await db.execute(sql`
    INSERT INTO ${sql.raw(`"${spesifikasi.table}"`)}
      (${sql.join(kolom.map((k) => sql`${sql.raw(`"${k}"`)}`), sql`, `)})
    VALUES (${sql.join(kolom.map((_, i) => sql`${nilai[i]}`), sql`, `)})
    RETURNING to_jsonb(${sql.raw(`"${spesifikasi.table}"`)}) AS row
  `);

  return (rows[0] as { row: unknown }).row as Record<string, unknown>;
}

/** Ubah satu baris. Kolom yang tidak ada di body tidak disentuh. */
export async function updateRecord(
  db: Db,
  spesifikasi: TableSpec,
  id: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const errors = new Errors();
  const set = new Map<string, unknown>();

  for (const [key, raw] of Object.entries(body)) {
    // Kunci yang bukan kolom tabel diabaikan. Menolaknya akan lebih ketat,
    // tapi form admin yang masih punya field usang akan gagal menyimpan, dan
    // itu lebih sulit didiagnosis daripada field yang diabaikan.
    const kolomSpec = findField(spesifikasi, key);
    if (!kolomSpec || kolomSpec.locked) continue;

    const hasil = coerce(errors, kolomSpec, raw);
    if (hasil !== undefined) set.set(kolomSpec.column, hasil);
  }

  if (!errors.isEmpty) throw errors.toApiError();

  if (set.size === 0) {
    throw ApiError.badRequest("Tidak ada kolom yang bisa diubah.");
  }

  const pasang: SQL[] = [...set.entries()].map(
    ([kolom, value]) => sql`${sql.raw(`"${kolom}"`)} = ${value}`,
  );

  const rows = await db.execute(sql`
    UPDATE ${sql.raw(`"${spesifikasi.table}"`)}
       SET ${sql.join(pasang, sql`, `)}
     WHERE id = ${id}::uuid
    RETURNING to_jsonb(${sql.raw(`"${spesifikasi.table}"`)}) AS row
  `);

  const found = rows[0];
  if (!found) throw ApiError.notFound("baris");

  return (found as { row: unknown }).row as Record<string, unknown>;
}

/** Hapus satu baris. */
export async function deleteRecord(db: Db, spesifikasi: TableSpec, id: string): Promise<void> {
  const rows = await db.execute(sql`
    DELETE FROM ${sql.raw(`"${spesifikasi.table}"`)}
     WHERE id = ${id}::uuid
    RETURNING id
  `);

  if (rows.length === 0) throw ApiError.notFound("baris");
}

/** Ambil spesifikasi tabel, atau gagal dengan pesan yang jelas. */
export function mustFind(table: string): TableSpec {
  const spesifikasi = find(table);
  if (!spesifikasi) {
    throw ApiError.badRequest("Tabel tidak dikenal.");
  }
  return spesifikasi;
}

// ---------------------------------------------------------------------------
// Konversi nilai
// ---------------------------------------------------------------------------

/**
 * Nilai bawaan sebuah field, sudah dalam bentuk siap bind.
 *
 * Boolean dikirim sebagai boolean, bukan teks `"true"`. Kalau dikirim sebagai
 * teks, PostgreSQL harus mengetahuinya dari konteks, dan pada kolom `boolean`
 * nilai `"true"` justru ditolak karena bukan literal boolean.
 */
function defaultValue(kolom: Field, bawaan: string): string | boolean {
  return kolom.kind.type === "boolean" ? bawaan === "true" : bawaan;
}

/**
 * Ubah nilai dari JSON menjadi bentuk yang bisa di-bind ke PostgreSQL.
 *
 * `undefined` berarti nilai tidak valid; pesan errornya sudah masuk ke `errors`,
 * jadi pemanggil cukup memeriksa `errors.isEmpty` di akhir. Nilai yang valid
 * bisa berupa `null`, dan `null` berarti kosongkan kolom.
 */
function coerce(errors: Errors, kolom: Field, raw: unknown): unknown | undefined {
  // `null` berarti kosongkan kolom, dan hanya boleh kalau field tidak wajib.
  if (raw === null) {
    if (kolom.required) {
      errors.add(kolom.column, `${kolom.label} wajib diisi.`);
      return undefined;
    }
    return null;
  }

  switch (kolom.kind.type) {
    case "boolean": {
      const nilai = parseBool(raw);
      if (nilai === undefined) {
        errors.add(kolom.column, `${kolom.label} harus ya atau tidak.`);
        return undefined;
      }
      return nilai;
    }

    case "integer": {
      const nilai = asInteger(raw);
      if (nilai === undefined) {
        errors.add(kolom.column, `${kolom.label} harus bilangan bulat.`);
        return undefined;
      }
      return nilai;
    }

    case "money": {
      const nilai = asMoney(raw);
      if (nilai === undefined) {
        errors.add(kolom.column, `${kolom.label} harus angka positif.`);
        return undefined;
      }
      return nilai;
    }

    case "choice": {
      const teks = String(raw ?? "").trim();
      if (kolom.kind.allowed.includes(teks)) return teks;
      errors.add(kolom.column, "Pilihan tidak dikenali.");
      return undefined;
    }

    case "email":
      return (
        validateEmail(errors, kolom.column, String(raw ?? ""), kolom.required) ?? undefined
      );

    case "phone":
      return phoneId(errors, kolom.column, String(raw ?? ""), kolom.required) ?? undefined;

    case "slug": {
      const teks = String(raw ?? "").trim().toLowerCase();
      const hasil = textRequired(errors, kolom.column, teks, 2, kolom.maxLen);
      if (hasil === null) return undefined;
      if (!isSlug(hasil)) {
        errors.add(kolom.column, "Slug hanya boleh huruf, angka, dan tanda hubung.");
        return undefined;
      }
      return hasil;
    }

    case "url": {
      const teks = String(raw ?? "");
      if (teks.trim() === "" && !kolom.required) return null;

      const hasil = textRequired(errors, kolom.column, teks, 1, kolom.maxLen);
      if (hasil === null) return undefined;
      if (!isSafeUrl(hasil)) {
        errors.add(kolom.column, "URL harus diawali http:// atau https://");
        return undefined;
      }
      return hasil;
    }

    case "long":
    case "markdown": {
      const teks = String(raw ?? "");
      if (kolom.required) return textRequired(errors, kolom.column, teks, 1, kolom.maxLen) ?? undefined;
      return textOptional(errors, kolom.column, teks, kolom.maxLen);
    }

    default: {
      // short dan date
      const teks = String(raw ?? "");
      const diperiksa = kolom.required
        ? textRequired(errors, kolom.column, teks, 1, kolom.maxLen)
        : (textOptional(errors, kolom.column, teks, kolom.maxLen) ?? "");

      if (diperiksa === null) return undefined;

      if (kolom.kind.type === "date" && diperiksa !== "" && !isIsoDate(diperiksa)) {
        errors.add(kolom.column, "Tanggal harus format YYYY-MM-DD.");
        return undefined;
      }

      return diperiksa === "" ? null : diperiksa;
    }
  }
}

function parseBool(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;

  if (typeof raw === "string") {
    const teks = raw.trim().toLowerCase();
    if (["true", "1", "yes", "on", "ya"].includes(teks)) return true;
    if (["false", "0", "no", "off", "tidak"].includes(teks)) return false;
  }

  return undefined;
}

function asInteger(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : undefined;
  if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) return Number(raw.trim());
  return undefined;
}

/**
 * Baca angka uang dari teks.
 *
 * Form admin mengirim angka, tapi panel yang sengaja diketik tangan bisa
 * mengirim `"350.000"` atau `"350000,50"`. Dua bentuk itu diterima supaya
 * kesalahan ketik tidak berubah jadi data yang gagal disimpan tanpa penjelasan.
 */
function asMoney(raw: unknown): string | undefined {
  let teks: string;
  if (typeof raw === "number") teks = String(raw);
  else if (typeof raw === "string") teks = raw.trim();
  else return undefined;

  const cleaned = /^-?[\d.]+,\d+$/.test(teks)
    ? teks.replace(/\./g, "").replace(",", ".")
    : teks.replace(/[ ,]/g, "");

  const nilai = Number(cleaned);
  if (!Number.isFinite(nilai) || nilai < 0) return undefined;

  return nilai.toFixed(2);
}

function isSlug(value: string): boolean {
  return value !== "" && /^[a-z0-9-]+$/.test(value);
}

function isIsoDate(value: string): boolean {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!cocok) return false;

  const tanggal = new Date(`${value}T00:00:00Z`);
  return (
    tanggal.getUTCFullYear() === Number(cocok[1]) &&
    tanggal.getUTCMonth() === Number(cocok[2]) - 1 &&
    tanggal.getUTCDate() === Number(cocok[3])
  );
}

/**
 * Terima hanya `http` dan `https`.
 *
 * Admin tidak boleh menyimpan `javascript:` ke kolom gambar atau tautan, karena
 * nilai itu akan ikut masuk ke atribut `src` dan `href` di halaman publik.
 * Path relatif juga diterima karena sebagian gambar memakai path internal.
 */
function isSafeUrl(value: string): boolean {
  const kecil = value.trim().toLowerCase();
  return kecil.startsWith("http://") || kecil.startsWith("https://") || kecil.startsWith("/");
}

function clamp(nilai: number, min: number, max: number): number {
  if (!Number.isFinite(nilai)) return min;
  return Math.min(Math.max(Math.trunc(nilai), min), max);
}