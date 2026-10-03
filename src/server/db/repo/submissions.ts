import type { Db } from "../client";
import { feedbacks, mcuRegistrations, surveyResponses, wbsReports } from "../schema";
import { ApiError, dbErrorCode } from "../../api/error";
import { generateTicket, type TicketKind } from "../../ticket";

/**
 * Penyimpanan formulir dari pengunjung: kritik dan saran, WBS, survei, dan
 * registrasi MCU.
 *
 * Semua fungsi di sini hanya INSERT. Tidak ada UPDATE dari sisi publik,
 * karena pengunjung tidak boleh mengubah apa pun setelah mengirim. Perubahan
 * status hanya lewat panel admin.
 */

/** Berapa kali percobaan membuat kode tiket sebelum menyerah. */
const TICKET_ATTEMPTS = 4;

/**
 * Sisipkan satu baris sambil membuat kode tiket yang dijamin unik.
 *
 * Kode tiket dibuat di sini, bukan di handler, supaya handler tidak perlu
 * mengulangi percobaan sendiri, dan tidak ada jalur kode yang bisa mengirim
 * tiket kosong.
 *
 * Tabrakan kode tiket astronomis kecil: alfabet 32 karakter dengan 8 posisi
 * memberi 2^40 kombinasi. Kalau empat kali berturut-turut tetap bertabrakan,
 * generator-nya bukan penyebabnya, melainkan ada yang salah di kodenya.
 */
async function withUniqueTicket(
  kind: TicketKind,
  insert: (code: string) => Promise<string>,
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < TICKET_ATTEMPTS; attempt += 1) {
    const code = generateTicket(kind);

    try {
      return await insert(code);
    } catch (err) {
      if (isUniqueViolation(err)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? ApiError.internal("gagal membuat kode tiket unik");
}

/**
 * Deteksi pelanggaran unique index pada kode tiket.
 *
 * Kode `23505` dibaca langsung lewat `dbErrorCode`, bukan lewat `mapDbError`.
 * `mapDbError` mengubahnya jadi `ApiError` supaya bisa sampai ke klien sebagai 500,
 * dan percobaan ulang justru membutuhkan informasi itu masih ada: kalau yang
 * diperiksa `ApiError.detail`, galat ini harus sudah dilewatkan `mapDbError`
 * dulu, dan setiap jalur lupa memanggilnya akan membuat percobaan ulang diam-diam
 * berhenti bekerja.
 */
function isUniqueViolation(err: unknown): boolean {
  return dbErrorCode(err) === "23505";
}

// ---------------------------------------------------------------------------
// Registrasi MCU
// ---------------------------------------------------------------------------

export type NewMcuRegistration = {
  package_id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  company_name: string | null;
  participant_count: number;
  preferred_date: string | null;
  notes: string | null;
};

export async function insertMcuRegistration(
  db: Db,
  input: NewMcuRegistration,
): Promise<string> {
  return withUniqueTicket("mcu", async (code) => {
    // Penulisan kolom satu per satu, bukan `...input`. Bentuk `NewMcuRegistration`
    // memakai nama snake_case supaya sama dengan bentuk JSON di formulir,
    // sedangkan nama kolom Drizzle memakai camelCase. Menyalin seluruh objek
    // membuat kedua bentuk itu harus selalu sama, dan satu perbedaan huruf
    // besar akan jadi galat yang baru muncul saat runtime.
    const rows = await db
      .insert(mcuRegistrations)
      .values({
        ticketCode: code,
        packageId: input.package_id,
        name: input.name,
        phone: input.phone,
        email: input.email,
        gender: input.gender,
        birthDate: input.birth_date,
        companyName: input.company_name,
        participantCount: input.participant_count,
        preferredDate: input.preferred_date,
        notes: input.notes,
      })
      .returning({ ticket_code: mcuRegistrations.ticketCode });

    return rows[0]!.ticket_code;
  });
}

// ---------------------------------------------------------------------------
// Kritik dan saran
// ---------------------------------------------------------------------------

export type NewFeedback = {
  feedback_type: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  service_unit: string | null;
};

export async function insertFeedback(db: Db, input: NewFeedback): Promise<string> {
  return withUniqueTicket("feedback", async (code) => {
    const rows = await db
      .insert(feedbacks)
      .values({
        ticketCode: code,
        type: input.feedback_type as never,
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        serviceUnit: input.service_unit,
      })
      .returning({ ticket_code: feedbacks.ticketCode });

    return rows[0]!.ticket_code;
  });
}

// ---------------------------------------------------------------------------
// Whistleblowing system
// ---------------------------------------------------------------------------

export type NewWbsReport = {
  subject: string;
  description: string;
  incident_date: string | null;
  location: string | null;
  involved_unit: string | null;
  is_anonymous: boolean;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  severity: string;
};

/**
 * Kolom identitas pada laporan WBS.
 *
 * Laporan anonim mengirim `null` untuk ketiga kolom, bukan sekadar menyembunyikan
 * tampilannya. CHECK di database menolak baris yang menandai dirinya anonim
 * sambil tetap menyimpan identitas, jadi tidak ada jalur kode yang bisa menyimpan
 * keduanya.
 */
function identitas(anonim: boolean, nilai: string | null): string | null {
  return anonim ? null : nilai;
}

export async function insertWbsReport(db: Db, input: NewWbsReport): Promise<string> {
  return withUniqueTicket("wbs", async (code) => {
    const rows = await db
      .insert(wbsReports)
      .values({
        ticketCode: code,
        subject: input.subject,
        description: input.description,
        incidentDate: input.incident_date,
        location: input.location,
        involvedUnit: input.involved_unit,
        isAnonymous: input.is_anonymous,
        reporterName: identitas(input.is_anonymous, input.reporter_name),
        reporterEmail: identitas(input.is_anonymous, input.reporter_email),
        reporterPhone: identitas(input.is_anonymous, input.reporter_phone),
        severity: input.severity as never,
      })
      .returning({ ticket_code: wbsReports.ticketCode });

    return rows[0]!.ticket_code;
  });
}

// ---------------------------------------------------------------------------
// Survei kepuasan masyarakat
// ---------------------------------------------------------------------------

export type NewSurveyResponse = {
  service_unit: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: unknown;
  overall_score: number;
  comment: string | null;
};

export async function insertSurveyResponse(
  db: Db,
  input: NewSurveyResponse,
): Promise<string> {
  return withUniqueTicket("survey", async (code) => {
    const rows = await db
      .insert(surveyResponses)
      .values({
        ticketCode: code,
        serviceUnit: input.service_unit,
        respondentName: input.respondent_name,
        respondentEmail: input.respondent_email,
        answers: input.answers as never,
        overallScore: input.overall_score,
        comment: input.comment,
      })
      .returning({ ticket_code: surveyResponses.ticketCode });

    return rows[0]!.ticket_code;
  });
}