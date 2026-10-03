import { asc, sql } from "drizzle-orm";
import type { Db } from "../client";
import { bedCapacity } from "../schema";
import { iso } from "./iso";

/**
 * Query ketersediaan tempat tidur.
 *
 * `available_beds` dihitung di database, bukan di frontend: kalau hanya
 * `total_beds` dan `occupied_beds` yang dikirim, setiap penyaji harus
 * menghitung ulang dan bisa salah karena keliru mengurangi yang juga
 * seharusnya ikut terpotong.
 */

export type BedRow = {
  ward_name: string;
  class_name: string;
  room_code: string | null;
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  gender_policy: string | null;
  note: string | null;
  /** Waktu peninjauan dalam ISO 8601 dengan `Z`. */
  observed_at: string;
};

export type BedSummary = {
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  /**
   * Persentase bed terisi dalam satu angka desimal.
   *
   * Pembulatan dilakukan satu kali di sini, bukan di frontend, supaya angka
   * yang sama tidak muncul sebagai 68.8 di satu tempat dan 69 di tempat lain.
   */
  occupancy_percent: number;
  observed_at: string | null;
  room_count: number;
};

const AVAILABLE = sql<number>`${bedCapacity.totalBeds} - ${bedCapacity.occupiedBeds} - ${bedCapacity.reservedBeds}`;

export async function listBeds(db: Db): Promise<BedRow[]> {
  const rows = await db
    .select({
      ward_name: bedCapacity.wardName,
      class_name: bedCapacity.className,
      room_code: bedCapacity.roomCode,
      total_beds: bedCapacity.totalBeds,
      occupied_beds: bedCapacity.occupiedBeds,
      reserved_beds: bedCapacity.reservedBeds,
      available_beds: AVAILABLE,
      gender_policy: bedCapacity.genderPolicy,
      note: bedCapacity.note,
      observed_at: bedCapacity.observedAt,
    })
    .from(bedCapacity)
    .orderBy(asc(bedCapacity.wardName), asc(bedCapacity.className));

  return rows.map((row) => ({ ...row, observed_at: iso(row.observed_at) }));
}

/** Total keseluruhan untuk kartu ringkasan di atas tabel. */
export async function loadBedSummary(db: Db): Promise<BedSummary> {
  const rows = await db
    .select({
      total_beds: sql<number>`coalesce(sum(${bedCapacity.totalBeds}), 0)::int`,
      occupied_beds: sql<number>`coalesce(sum(${bedCapacity.occupiedBeds}), 0)::int`,
      reserved_beds: sql<number>`coalesce(sum(${bedCapacity.reservedBeds}), 0)::int`,
      available_beds: sql<number>`coalesce(sum(${AVAILABLE}), 0)::int`,
      occupancy_percent: sql<string>`
        CASE WHEN coalesce(sum(${bedCapacity.totalBeds}), 0) = 0 THEN '0'
             ELSE round(coalesce(sum(${bedCapacity.occupiedBeds}), 0)::numeric
                         * 100 / sum(${bedCapacity.totalBeds}), 1)::text
        END`,
      observed_at: sql<Date | null>`max(${bedCapacity.observedAt})`,
      room_count: sql<number>`count(*)::int`,
    })
    .from(bedCapacity);

  const row = rows[0];

  return {
    total_beds: row?.total_beds ?? 0,
    occupied_beds: row?.occupied_beds ?? 0,
    reserved_beds: row?.reserved_beds ?? 0,
    available_beds: row?.available_beds ?? 0,
    occupancy_percent: Number(row?.occupancy_percent ?? "0"),
    observed_at: row?.observed_at ? iso(row.observed_at) : null,
    room_count: row?.room_count ?? 0,
  };
}

/** Daftar dan ringkasan sekaligus, untuk satu respons `/beds`. */
export async function loadBeds(db: Db): Promise<{ items: BedRow[]; summary: BedSummary }> {
  const [items, summary] = [await listBeds(db), await loadBedSummary(db)];
  return { items, summary };
}

/**
 * Simpan hasil peninjauan satu baris kapasitas bed.
 *
 * Penulisan memakai satu lingkup: `observed_at` diperbarui bersama sisanya
 * supaya angka di tabel dan waktu peninjauan tidak pernah berbeda tanggal.
 */
/** Satu baris kapasitas yang dikirim panel untuk diperbarui. */
export type BedUpdate = {
  ward_name: string;
  class_name: string;
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
};

/**
 * Perbarui jumlah tempat tidur beberapa baris sekaligus, dalam satu transaksi.
 *
 * Transaksi dipakai karena panel mengirim seluruh tabel dalam satu permintaan.
 * Kalau tiap baris memakai transaksi sendiri dan permintaan gagal di tengah,
 * separuh tabel sudah berubah sementara panel masih menampilkan angka lama,
 * sehingga operator tidak tahu angka mana yang benar.
 *
 * Baris yang tidak ada di database tidak dihitung sebagai perubahan dan tidak
 * diperiksa: panel mengirim apa yang ditampilkan layarnya, dan layar itu bisa
 * sudah usang karena ada orang yang mengisi kapasitas lewat luar panel.
 */
export async function perbaruiTempatTidur(db: Db, updates: BedUpdate[]): Promise<number> {
  return db.transaction(async (tx) => {
    let berubah = 0;

    for (const item of updates) {
      const rows = await tx.execute(sql`
        UPDATE bed_capacity
           SET total_beds    = ${item.total_beds},
               occupied_beds = ${item.occupied_beds},
               reserved_beds = ${item.reserved_beds},
               observed_at   = now()
         WHERE ward_name = ${item.ward_name}
           AND class_name = ${item.class_name}
        RETURNING id
      `);

      berubah += rows.length;
    }

    return berubah;
  });
}

export async function saveBed(
  db: Db,
  input: {
    ward_name: string;
    class_name: string;
    room_code: string | null;
    total_beds: number;
    occupied_beds: number;
    reserved_beds: number;
    gender_policy: string | null;
    note: string | null;
  },
): Promise<BedRow> {
  const now = new Date();

  const rows = await db
    .update(bedCapacity)
    .set({
      roomCode: input.room_code,
      totalBeds: input.total_beds,
      occupiedBeds: input.occupied_beds,
      reservedBeds: input.reserved_beds,
      genderPolicy: input.gender_policy,
      note: input.note,
      observedAt: now,
      updatedAt: now,
    })
    .where(
      sql`${bedCapacity.wardName} = ${input.ward_name} AND ${bedCapacity.className} = ${input.class_name}`,
    )
    .returning({
      ward_name: bedCapacity.wardName,
      class_name: bedCapacity.className,
      room_code: bedCapacity.roomCode,
      total_beds: bedCapacity.totalBeds,
      occupied_beds: bedCapacity.occupiedBeds,
      reserved_beds: bedCapacity.reservedBeds,
      available_beds: AVAILABLE,
      gender_policy: bedCapacity.genderPolicy,
      note: bedCapacity.note,
      observed_at: bedCapacity.observedAt,
    });

  const found = rows[0];
  return { ...found, observed_at: iso(found.observed_at) };
}