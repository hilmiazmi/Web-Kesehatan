/**
 * Pencatatan riwayat tindakan admin.
 *
 * Ditujukan untuk satu pertanyaan yang tidak bisa dijawab dari tabel konten:
 * siapa yang mengubah isi ini, dan kapan. Tabel konten menyimpan `updated_by`
 * hanya di dua tempat (`pages` dan `site_settings`), dan keduanya menimpa nilai
 * lama setiap kali ada perubahan — jadi riwayatnya hilang begitu tindakan
 * berikutnya terjadi.
 */

import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import type { AksiAudit } from "../db/schema";

/** Batas panjang ringkasan, sama dengan kolomnya di database. */
const MAKS_RINGKASAN = 255;

/** Satu baris riwayat yang ditampilkan di panel. */
export type BarisAudit = {
  id: string;
  actor_email: string;
  action: string;
  table_name: string;
  row_id: string | null;
  summary: string;
  created_at: string;
};

/**
 * Kolom yang paling sering dipakai sebagai "nama" sebuah baris konten.
 *
 * Dicari berurutan, bukan disimpulkan dari nama tabel, karena registry tidak
 * menandai kolom mana yang jadi nama tampilan.
 */
const KOLOM_NAMA: readonly string[] = [
  "title",
  "name",
  "full_name",
  "question",
  "subject",
  "key",
];

/**
 * Ambil nama yang bisa dibaca manusia dari satu baris, untuk isi ringkasan.
 *
 * Fungsi murni supaya bisa diuji tanpa database. Baris yang tidak punya kolom
 * nama dikenal jatuh ke `bawaan` (label tabel), bukan ke id: id UUID tidak
 * berarti apa-apa bagi orang yang membaca riwayat.
 */
export function ringkasBaris(baris: Record<string, unknown>, bawaan: string): string {
  for (const kolom of KOLOM_NAMA) {
    const nilai = baris[kolom];
    if (typeof nilai === "string" && nilai.trim() !== "") return nilai.trim();
  }
  return bawaan;
}

/**
 * Rapikan ringkasan satu baris riwayat.
 *
 * Dipisah dari penulisannya supaya aturannya bisa diuji tanpa database, mengikuti
 * pola `hakAksesDiriSendiri` di `accounts.ts`.
 *
 * Dua hal yang dikerjakan di sini dan mudah terlewat:
 *
 * - Baris baru dan karakter kontrol dibuang. Ringkasan berasal dari judul yang
 *   ditulis admin, dan satu judul yang memuat baris baru akan memecah satu baris
 *   riwayat menjadi dua di tampilan mana pun.
 * - Teks dipangkas. Kolomnya `varchar(255)`, dan PostgreSQL menolak nilai yang
 *   lebih panjang dengan galat alih-alih memotongnya diam-diam.
 */
export function ringkasAudit(
  action: AksiAudit,
  tableName: string,
  rowId: string | null,
  summary: string,
): { action: AksiAudit; tableName: string; rowId: string | null; summary: string } {
  const bersih = summary
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    action,
    tableName,
    rowId,
    summary: bersih.length > MAKS_RINGKASAN ? `${bersih.slice(0, MAKS_RINGKASAN - 1)}…` : bersih,
  };
}

/**
 * Tulis satu baris riwayat.
 *
 * Sengaja tidak pernah menggagalkan tindakan yang mendahuluinya: kalau
 * pencatatan riwayat lempar, tindakan aslinya sudah terjadi, dan membatalkannya
 * akan lebih membingungkan daripada riwayat yang bolong. Galatnya ditelan lalu
 * dicatat ke log server.
 */
export async function catatAudit(
  db: Db,
  masuk: {
    actorId: string | null;
    actorEmail: string;
    action: AksiAudit;
    tableName: string;
    rowId?: string | null;
    summary?: string;
  },
): Promise<void> {
  const isi = ringkasAudit(
    masuk.action,
    masuk.tableName,
    masuk.rowId ?? null,
    masuk.summary ?? "",
  );

  try {
    await db.execute(sql`
      INSERT INTO admin_audit (actor_id, actor_email, action, table_name, row_id, summary)
      VALUES (${masuk.actorId}::uuid, ${masuk.actorEmail}, ${isi.action},
              ${isi.tableName}, ${isi.rowId}::uuid, ${isi.summary})
    `);
  } catch (err) {
    console.error("[audit] gagal menulis riwayat:", err instanceof Error ? err.message : err);
  }
}

/**
 * Daftar riwayat, terbaru lebih dulu.
 *
 * Nama tabel untuk penyaring divalidasi pemanggil lewat `tabelAuditValid`, bukan
 * di sini, karena nama itu masuk ke SQL sebagai literal.
 */
export async function listAudit(
  db: Db,
  opsi: { page?: number; size?: number; tableName?: string | null } = {},
): Promise<{ items: BarisAudit[]; total: number }> {
  const page = opsi.page ?? 1;
  const size = opsi.size ?? 25;

  // `sql` mentah hanya untuk percabangan; nilainya tetap lewat bind parameter.
  const saring = opsi.tableName ? sql`WHERE table_name = ${opsi.tableName}` : sql``;

  const total = await db.execute(sql`
    SELECT count(*)::int AS total FROM admin_audit ${saring}
  `);
  const jumlah = Number((total[0] as { total: number }).total);

  const rows = await db.execute(sql`
    SELECT id, actor_email, action, table_name, row_id, summary,
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM admin_audit ${saring}
     ORDER BY created_at DESC
     LIMIT ${size} OFFSET ${(page - 1) * size}
  `);

  return { items: rows as unknown as BarisAudit[], total: jumlah };
}

/**
 * Nama tabel yang boleh dipakai menyaring riwayat.
 *
 * Daftar putih, bukan daftar terbuka: nama tabel masuk ke SQL, dan yang tidak
 * ada di sini ditolak sebelum sampai ke query.
 */
export const TABEL_AUDIT: readonly string[] = [
  "articles",
  "services",
  "pages",
  "mcu_packages",
  "specialties",
  "polyclinics",
  "doctors",
  "doctor_schedules",
  "hero_slides",
  "awards",
  "gallery_items",
  "testimonials",
  "insurance_partners",
  "faqs",
  "documents",
  "management_members",
  "job_vacancies",
  "users",
  "site_settings",
];

export function tabelAuditValid(nama: string): boolean {
  return TABEL_AUDIT.includes(nama);
}
