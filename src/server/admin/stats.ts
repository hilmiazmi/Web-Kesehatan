import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { STATUSES_PENDAFTARAN, STATUSES_PENGAJUAN } from "./inbox";

/**
 * Angka ringkas untuk dasbor admin.
 */

/**
 * Status pendaftaran yang dihitung sebagai "belum ditangani".
 *
 * Nilainya bukan `new` seperti tiga jenis pengajuan lain: `appointments` memakai
 * enum `appointment_status` sendiri. Constant-nya diambil dari allowlist inbox,
 * bukan ditulis ulang sebagai string, supaya keduanya tidak bisa berbeda. Kalau
 * tidak, ketidakcocokan seperti ini tidak tertangkap compiler dan tidak tertangkap
 * test yang membandingkan teks, hanya muncul sebagai 400 "Format data tidak
 * dikenali" saat dasbor dibuka.
 */
const PENDAFTARAN_BELUM_DITANGANI = STATUSES_PENDAFTARAN[0]; // "pending"

/** Status pengajuan yang dihitung sebagai "belum ditangani". */
const PENGAJUAN_BELUM_DITANGANI = STATUSES_PENGAJUAN[0]; // "new"

export type InboxCounts = {
  appointments: number;
  admissions: number;
  mcu_registrations: number;
  feedbacks: number;
  wbs_reports: number;
  survey_responses: number;
};

export type Stats = {
  articles: number;
  services: number;
  mcu_packages: number;
  doctors: number;
  schedules: number;
  pages: number;
  hero_slides: number;
  /** Pesan yang belum ditangani di seluruh kemungkinan masuk. */
  inbox_unread: number;
  inbox_by_kind: InboxCounts;
  appointments_today: number;
  appointments_upcoming: number;
  beds_total: number;
  beds_available: number;
  survey_average: number | null;
  survey_responses: number;
};

/**
 * Hitung semua angka dasbor dalam satu kali bolak-balik.
 *
 * Dipakai satu transaksi read-only supaya angka-angkanya saling konsisten.
 * Kalau dihitung dengan beberapa permintaan terpisah, dasbor bisa menampilkan
 * "total 12" sementara rinciannya berjumlah 13 karena ada pendaftaran yang masuk
 * di antara dua permintaan.
 */
export async function loadStats(db: Db): Promise<Stats> {
  return db.transaction(async (tx) => {
    // Semua query digabung jadi satu pernyataan. PostgreSQL mengirim seluruh
    // string sebagai satu paket, jadi ini tetap satu kali bolak-balik, dan
    // tidak perlu closure yang menahan `tx` sehingga tidak bisa dipakai lagi
    // pada pemanggilan berikutnya.
    const angka = await tx.execute(sql`
      SELECT
        (SELECT count(*) FROM articles           WHERE is_published)             AS articles,
        (SELECT count(*) FROM services           WHERE is_active)                AS services,
        (SELECT count(*) FROM mcu_packages       WHERE is_active)                AS mcu_packages,
        (SELECT count(*) FROM doctors            WHERE is_active)                AS doctors,
        (SELECT count(*) FROM doctor_schedules   WHERE is_active)                AS schedules,
        (SELECT count(*) FROM pages              WHERE is_published)             AS pages,
        (SELECT count(*) FROM hero_slides        WHERE is_active)                AS hero_slides,
        (SELECT count(*) FROM appointments
          WHERE status = ${PENDAFTARAN_BELUM_DITANGANI}::appointment_status)    AS pendaftaran_baru,
        (SELECT count(*) FROM mcu_registrations
          WHERE status = ${PENGAJUAN_BELUM_DITANGANI}::submission_status)        AS mcu_baru,
        (SELECT count(*) FROM feedbacks
          WHERE status = ${PENGAJUAN_BELUM_DITANGANI}::submission_status)        AS kritik_baru,
        (SELECT count(*) FROM wbs_reports
          WHERE status = ${PENGAJUAN_BELUM_DITANGANI}::submission_status)        AS wbs_baru,
        (SELECT count(*) FROM admissions
          WHERE status = ${PENDAFTARAN_BELUM_DITANGANI}::admission_status)       AS inap_baru,
        (SELECT count(*) FROM survey_responses)                                   AS survei_total,
        (SELECT count(*) FROM appointments WHERE visit_date = CURRENT_DATE)       AS pendaftaran_hari_ini,
        (SELECT count(*) FROM appointments WHERE visit_date > CURRENT_DATE)       AS pendaftaran_akan_datang,
        coalesce((SELECT sum(total_beds) FROM bed_capacity), 0)                  AS tempat_total,
        coalesce((SELECT sum(total_beds - occupied_beds - reserved_beds)
                    FROM bed_capacity), 0)                                        AS tempat_tersedia,
        (SELECT round(avg(overall_score), 2) FROM survey_responses)              AS survei_rata
    `);

    const baris = angka[0] as Record<string, string | number | null>;

    const inbox_by_kind: InboxCounts = {
      appointments: Number(baris.pendaftaran_baru),
      admissions: Number(baris.inap_baru),
      mcu_registrations: Number(baris.mcu_baru),
      feedbacks: Number(baris.kritik_baru),
      wbs_reports: Number(baris.wbs_baru),
      // Survei tidak punya kolom status, jadi tidak bisa dihitung sebagai "belum
      // ditangani". Yang dihitung di sini adalah jumlah seluruh isian, dan
      // angkanya sengaja tidak ikut `inbox_unread`.
      survey_responses: Number(baris.survei_total),
    };

    return {
      articles: Number(baris.articles),
      services: Number(baris.services),
      mcu_packages: Number(baris.mcu_packages),
      doctors: Number(baris.doctors),
      schedules: Number(baris.schedules),
      pages: Number(baris.pages),
      hero_slides: Number(baris.hero_slides),
      inbox_unread:
        inbox_by_kind.appointments +
        inbox_by_kind.admissions +
        inbox_by_kind.mcu_registrations +
        inbox_by_kind.feedbacks +
        inbox_by_kind.wbs_reports,
      inbox_by_kind,
      appointments_today: Number(baris.pendaftaran_hari_ini),
      appointments_upcoming: Number(baris.pendaftaran_akan_datang),
      beds_total: Number(baris.tempat_total),
      beds_available: Number(baris.tempat_tersedia),
      survey_average: baris.survei_rata === null ? null : Number(baris.survei_rata),
      survey_responses: inbox_by_kind.survey_responses,
    };
  });
}

/**
 * Rata-rata kepuasan per unit layanan, untuk tabel ringkasan survei.
 *
 * Unit tanpa respons tetap dikembalikan, supaya panel bisa membedakan antara
 * "belum ada yang mengisi" dan "nilainya jelek".
 */
export async function surveyByUnit(db: Db): Promise<{ unit: string; average: number; total: number }[]> {
  const rows = await db.execute(sql`
    SELECT coalesce(service_unit, 'Tidak diisi') AS unit,
           round(avg(overall_score), 2)          AS rata,
           count(*)::int                         AS jumlah
      FROM survey_responses
     GROUP BY 1
     ORDER BY 1
  `);

  return rows.map((r) => {
    const baris = r as { unit: string; rata: string | number | null; jumlah: number };
    return {
      unit: baris.unit,
      average: Number(baris.rata ?? 0),
      total: Number(baris.jumlah),
    };
  });
}

/**
 * Jumlah pendaftaran per hari untuk empat belas hari terakhir, untuk grafik
 * dasbor.
 *
 * Tanggal tanpa pendaftaran tetap dikembalikan dengan nilai nol, supaya panel
 * tidak perlu menebak hari mana yang dilewati.
 */
export async function appointmentsPerDay(db: Db): Promise<{ date: string; total: number }[]> {
  const rows = await db.execute(sql`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS tanggal,
           coalesce(count(a.id), 0)::int AS jumlah
      FROM generate_series(
               CURRENT_DATE - interval '13 days',
               CURRENT_DATE,
               interval '1 day'
           ) AS d(day)
      LEFT JOIN appointments a ON a.visit_date = d.day::date
     GROUP BY d.day
     ORDER BY d.day
  `);

  return rows.map((r) => {
    const baris = r as { tanggal: string; jumlah: number };
    return { date: baris.tanggal, total: Number(baris.jumlah) };
  });
}

export { PENDAFTARAN_BELUM_DITANGANI, PENGAJUAN_BELUM_DITANGANI };