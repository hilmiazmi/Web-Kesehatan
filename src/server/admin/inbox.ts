import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { ApiError } from "../api/error";
import { searchPattern, squash } from "../validation";
import { isTicketShapeValid } from "../ticket";

/**
 * Inbox: daftar dan perubahan status formulir yang masuk dari pengunjung.
 *
 * Kelima jenis formulir punya bentuk kolom yang berbeda, jadi setiap jenis punya
 * satu query daftar. Yang disatukan adalah daftar jenis yang dikenal dan
 * himpunan status yang boleh dipakai, sehingga handler HTTP cukup satu.
 */

/** Status `appointments`, sesuai enum `appointment_status`. */
export const STATUSES_PENDAFTARAN = ["pending", "confirmed", "cancelled", "no_show"] as const;

/**
 * Status pengajuan, sesuai enum `submission_status`.
 *
 * Status `new` berarti pengajuan sudah masuk tapi belum ditindaklanjuti, jadi
 * itulah yang dihitung sebagai "belum ditangani" di dasbor.
 */
export const STATUSES_PENGAJUAN = ["new", "in_progress", "resolved", "rejected"] as const;

type StatusDaftar = (typeof STATUSES_PENDAFTARAN)[number];
type StatusPengajuan = (typeof STATUSES_PENGAJUAN)[number];

/** Specifikasi satu jenis inbox: nama rute, nama tabel, dan kolom cari. */
export type InboxKind = {
  /** Nama untuk segmen URL: `/admin/inbox/appointments`. */
  readonly slug: string;
  /** Nama tabel SQL. */
  readonly table: string;
  readonly searchColumns: readonly string[];
  /** Apakah tabelnya punya kolom `status`. */
  readonly hasStatus: boolean;
  readonly statuses: readonly (StatusDaftar | StatusPengajuan)[];
};

const KINDS = {
  appointments: {
    slug: "appointments",
    table: "appointments",
    searchColumns: ["patient_name", "ticket_code", "phone", "complaint"],
    hasStatus: true,
    statuses: STATUSES_PENDAFTARAN,
  },
  "mcu-registrations": {
    slug: "mcu-registrations",
    table: "mcu_registrations",
    searchColumns: ["name", "ticket_code", "phone", "company_name"],
    hasStatus: true,
    statuses: STATUSES_PENGAJUAN,
  },
  feedbacks: {
    slug: "feedbacks",
    table: "feedbacks",
    searchColumns: ["name", "subject", "message", "ticket_code"],
    hasStatus: true,
    statuses: STATUSES_PENGAJUAN,
  },
  "wbs-reports": {
    slug: "wbs-reports",
    table: "wbs_reports",
    searchColumns: ["subject", "description", "ticket_code", "involved_unit"],
    hasStatus: true,
    statuses: STATUSES_PENGAJUAN,
  },
  "survey-responses": {
    slug: "survey-responses",
    table: "survey_responses",
    searchColumns: ["respondent_name", "ticket_code", "service_unit", "comment"],
    hasStatus: false,
    statuses: [],
  },
} as const satisfies Record<string, InboxKind>;

/** Semua jenis inbox, untuk halaman daftar. */
export function allKinds(): readonly InboxKind[] {
  return Object.values(KINDS);
}

/**
 * Cari jenis inbox dari segmen URL, atau `undefined` kalau tidak dikenal.
 *
 * `undefined` berarti request ditolak. Nama tabel masuk ke SQL tanpa tanda
 * kutip, jadi daftar putih di sini satu-satunya penghalang antara request dan
 * injeksi SQL. Karena itu `parse` harus total untuk semua nilai yang mungkin
 * dikirim, termasuk yang berisi spasi atau titik koma.
 */
export function parseKind(value: string): InboxKind | undefined {
  return Object.prototype.hasOwnProperty.call(KINDS, value)
    ? KINDS[value as keyof typeof KINDS]
    : undefined;
}

/**
 * Daftar baris satu jenis inbox, dengan pagination dan pencarian.
 *
 * `survey_responses` tidak punya kolom `status`, jadi klausa status harus
 * dilewati untuk jenis itu. Bukan sekadar mengabaikan filter: kolomnya memang
 * tidak ada, jadi menyebutnya membuat query gagal.
 */
export async function listInbox(
  db: Db,
  kind: InboxKind,
  options: {
    status?: string | null;
    page: number;
    pageSize: number;
    search?: string | null;
  },
): Promise<Record<string, unknown>> {
  if (options.status && kind.hasStatus && !kind.statuses.includes(options.status as never)) {
    throw ApiError.badRequest("Status tidak dikenal.");
  }

  const size = clamp(options.pageSize, 1, 100);
  const page = Math.max(1, options.page);
  const offset = (page - 1) * size;

  const needle = options.search ? squash(options.search) : "";
  const pola = searchPattern(needle);

  // Klausa pencarian hanya ditambahkan kalau memang ada kata kunci. Kalau
  // klausanya selalu ditambahkan, kata kunci kosong dikirim sebagai NULL, dan
  // `kolom ILIKE NULL` bernilai NULL untuk semua baris: daftar inbox tanpa
  // kata kunci selalu kosong, dan itu terlihat seperti tidak ada pengajuan
  // sama sekali.
  const cari = kind.searchColumns.map(
    (column) => sql`${sql.raw(`"${column}"::text`)} ILIKE ${pola} ESCAPE '\\'`,
  );
  const cariSql =
    needle !== "" && cari.length > 0
      ? sql` AND (${sql.join(cari, sql` OR `)})`
      : sql``;

  // Status `null` berarti "semua status", jadi klausanya ditulis sebagai
  // `IS NULL OR status = ...`. Menempelkan `status = ...` tanpa cabang `IS
  // NULL` akan membuat daftar tanpa filter tiba-tiba hanya berisi satu status.
  const statusSql = kind.hasStatus
    ? sql` AND (${options.status ?? null}::text IS NULL OR status = ${options.status ?? null})`
    : sql``;

  const rows = await db.execute(sql`
    SELECT to_jsonb(t) AS row
      FROM ${sql.raw(`"${kind.table}"`)} t
     WHERE true${statusSql}${cariSql}
     ORDER BY created_at DESC
     LIMIT ${size} OFFSET ${offset}
  `);

  const total = await db.execute(sql`
    SELECT count(*)::int AS total
      FROM ${sql.raw(`"${kind.table}"`)} t
     WHERE true${statusSql}${cariSql}
  `);

  const jumlah = Number((total[0] as { total: number }).total);

  return {
    items: rows.map((r) => (r as { row: unknown }).row),
    total: jumlah,
    page,
    page_size: size,
    kind: kind.slug,
    status: kind.hasStatus ? (options.status ?? null) : null,
    search: needle === "" ? null : needle,
  };
}

/** Ubah status satu baris dan simpan catatan admin. */
export async function updateStatus(
  db: Db,
  kind: InboxKind,
  id: string,
  status: string,
  adminNote: string | null,
): Promise<void> {
  // Survei diperiksa lebih dulu supaya pesannya tetap menjelaskan bahwa jenis
  // ini memang tidak punya status, bukan sekadar "tidak dikenal".
  if (!kind.hasStatus) {
    throw ApiError.badRequest(
      "Survei tidak punya status. Gunakan kolom komentar bila perlu mencatat tindak lanjut.",
    );
  }

  if (!kind.statuses.includes(status as never)) {
    throw ApiError.badRequest("Status tidak dikenal.");
  }

  const rows = await db.execute(sql`
    UPDATE ${sql.raw(`"${kind.table}"`)}
       SET status = ${status}, admin_note = coalesce(${adminNote}, admin_note)
     WHERE id = ${id}::uuid
    RETURNING id
  `);

  if (rows.length === 0) throw ApiError.notFound("baris");
}

/**
 * Satu baris inbox berdasarkan kode tiket, untuk pengecekan status oleh
 * pengunjung yang menyimpan kodenya.
 *
 * Waktu dikembalikan sebagai ISO dengan `Z`, bukan bentuk `timestamptz::text`
 * milik PostgreSQL. Bentuk ISO jauh lebih enak dibaca `new Date()` di sisi
 * peramban, dan peramban tidak akan salah membaca sebagai waktu lokal.
 */
export async function findByTicket(
  db: Db,
  kind: InboxKind,
  ticketCode: string,
): Promise<Record<string, unknown> | null> {
  const rows = await db.execute(sql`
    SELECT ticket_code,
           ${kind.hasStatus ? sql`status` : sql`NULL::text AS status`},
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
           to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
      FROM ${sql.raw(`"${kind.table}"`)}
     WHERE ticket_code = ${ticketCode.toUpperCase()}
  `);

  return rows[0] ? (rows[0] as Record<string, unknown>) : null;
}

/**
 * Periksa bentuk kode tiket sebelum dipakai sebagai parameter query.
 *
 * Pemeriksaan di sini membuat endpoint `/tickets/...` menolak input aneh dengan
 * pesan yang jelas, bukan mengembalikan 404 yang menyesatkan.
 *
 * Aturannya tidak ditulis ulang di berkas ini. Daftar awalan dan susunan
 * karakter sudah ada di `ticket.isTicketShapeValid`, yang juga menguji persis
 * apa yang bisa dihasilkan `ticket.generate`. Dua daftar terpisah pasti akan
 * berbeda begitu satu jenis formulir baru ditambahkan, dan yang tertinggal akan
 * menolak kode yang baru tanpa memberi tanda apa pun.
 */
export function looksLikeTicketCode(code: string): boolean {
  return isTicketShapeValid(code);
}

function clamp(nilai: number, min: number, max: number): number {
  if (!Number.isFinite(nilai)) return min;
  return Math.min(Math.max(Math.trunc(nilai), min), max);
}