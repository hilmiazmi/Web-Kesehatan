/**
 * Ekstrak data seed dari database yang sudah terisi menjadi satu berkas JSON.
 *
 * Seed aslinya ditulis di Rust dan kini diarsipkan. Menulis ulang ribuan baris
 * seed secara manual ke TypeScript hanya menambah tempat yang bisa berbeda dari
 * sumbernya, dan perbedaannya baru terlihat saat isi halaman tidak cocok dengan
 * yang diharapkan. Jadi data seed diekstrak dari database yang sudah terisi,
 * lalu disimpan apa adanya sebagai satu berkas JSON.
 *
 * Berkas hasil ekstraksi dipakai `scripts/db-seed.ts`. Kalau isi seed berubah,
 * jalankan ulang skrip ini lalu periksa `git diff` pada berkasnya.
 *
 * Butuh database yang sudah ter-seed. Skrip ini hanya dipakai saat
 * mengganti isi database, tidak pernah di produksi.
 */

import { getTableColumns } from "drizzle-orm";
import { PgTimestamp, type PgTable } from "drizzle-orm/pg-core";
import { type Db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

/**
 * Tabel yang isinya ditulis aplikasi, bukan seed.
 *
 * Baris di tabel ini dibuat oleh pengunjung saat mengisi formulir, atau oleh
 * pendaftaran saat menghitung nomor antrean. Menyalinnya ke berkas seed akan
 * membuat setiap instalasi baru mulai dengan pengaduan milik orang lain dan
 * nomor antrean yang sudah terpakai.
 */
export const TABEL_RUNTIME: readonly string[] = [
  "appointments",
  "doctor_visit_quotas",
  "feedbacks",
  "mcu_registrations",
  "survey_responses",
  "wbs_reports",
];

/**
 * Tabel yang ikut diekstrak, dalam urutan penyisipan.
 *
 * Urutan di sini penting dan tidak boleh diubah: `mcu_package_items` dan
 * `doctor_schedules` menunjuk tabel lain, dan menyisipkan anak lebih dulu akan
 * melanggar kunci asing. Tabel selain `users` yang tidak ada di daftar ini akan
 * tertinggal kosong tanpa pesan apa pun.
 *
 * `users` sengaja tidak ada: akun admin pertama dibuat `db-seed.ts` dari
 * environment, bukan disalin dari arsip. Kalau ikut diekstrak, kata sandinya
 * akan ikut ter-commit.
 */
export const TABEL_SEED = [
  "specialties",
  "polyclinics",
  "doctors",
  "doctorSchedules",
  "services",
  "mcuPackages",
  "mcuPackageItems",
  "articles",
  "pages",
  "managementMembers",
  "documents",
  "heroSlides",
  "awards",
  "galleryItems",
  "testimonials",
  "insurancePartners",
  "faqs",
  "bedCapacity",
  "jobVacancies",
  "siteSettings",
] as const;

/**
 * Versi bentuk data seed.
 *
 * Naikkan kalau bentuk tiap baris berubah, bukan kalau hanya menambah atau
 * mengurangi baris. `db-seed.ts` menolak berkas yang versinya tidak dikenal,
 * supaya berkas lama tidak dipakai diam-diam untuk database dengan skema baru.
 */
export const VERSI_SEED = 1;

export type IsiSeed = {
  version: number;
  tables: Record<string, Record<string, unknown>[]>;
};

/** Ambil seluruh baris satu tabel sebagai objek biasa. */
export async function bacaSemua(db: Db, tabel: PgTable): Promise<Record<string, unknown>[]> {
  const baris = await db.select().from(tabel);
  return baris as unknown as Record<string, unknown>[];
}

/**
 * Susun muatan seed dari database yang diberikan.
 *
 * Dipisah dari bagian skrip supaya bisa dipanggil dari test tanpa menulis
 * berkas.
 */
export async function kumpulkanSeed(db: Db): Promise<IsiSeed> {
  const tables: Record<string, Record<string, unknown>[]> = {};

  for (const nama of TABEL_SEED) {
    const baris = await bacaSemua(db, schema[nama] as unknown as PgTable);
    tables[nama] = baris;
  }

  return { version: VERSI_SEED, tables };
}

/**
 * Ubah kembali nilai kolom waktu dari teks ISO menjadi `Date`.
 *
 * `scripts/seed-data.json` menyimpan waktu sebagai teks ISO, karena JSON tidak
 * punya tipe tanggal dan `JSON.stringify` akan menuliskan `Date` sebagai teks
 * biasa. Drizzle, sebaliknya, mode `timestamp` hanya menerima `Date`.
 * Tanpa perubahan di sini, seed berhenti di tabel pertama dengan
 * `value.toISOString is not a function`.
 *
 * Hanya kolom bertipe waktu yang diubah. Mengubah semua kunci yang terlihat
 * seperti tanggal akan merusak kolom teks yang kebetulan isinya menyerupai
 * tanggal.
 */
export function kembalikanWaktu(
  tabel: PgTable,
  baris: Record<string, unknown>,
): Record<string, unknown> {
  const kolom = getTableColumns(tabel);

  for (const [nama, definisi] of Object.entries(kolom)) {
    if (!(definisi instanceof PgTimestamp)) continue;

    const nilai = baris[nama];
    if (typeof nilai === "string") baris[nama] = new Date(nilai);
  }

  return baris;
}

/**
 * Namai tabel SQL untuk nama ekspor Drizzle.
 *
 * Dipakai supaya pesan seed menyebut nama yang sama dengan yang muncul di
 * `psql`, bukan `mcuPackages`. Admin yang menjalankan seed dari terminal akan
 * melihat nama yang harus diketik ulang kalau ada yang gagal.
 */
export function namaSql(namaEkspor: string): string {
  return (
    namaEkspor.charAt(0).toLowerCase() +
    namaEkspor
      .slice(1)
      .replace(/[A-Z]/g, (huruf) => `_${huruf.toLowerCase()}`)
  );
}
