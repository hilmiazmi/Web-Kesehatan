import { sql } from "drizzle-orm";
import { closeDb, dbOrNull } from "@/server/db/client";
import { listDoctors, listSchedules } from "@/server/db/repo/content";
import {
  countTaken,
  createAppointment,
  isoWeekday,
  weekdayName,
} from "@/server/db/repo/appointments";
import {
  insertFeedback,
  insertMcuRegistration,
  insertSurveyResponse,
  insertWbsReport,
} from "@/server/db/repo/submissions";

const db = dbOrNull();
if (!db) throw new Error("tidak ada db");

// Kode tiket di bawah harus unik setiap kali skrip ini dijalankan. Kode tetap
// membuat skrip hanya bisa dipakai sekali per database, dan jalannya kedua
// gagal dengan pelanggaran unique constraint, yang jauh lebih mudah salah
// dibaca sebagai backend rusak daripada sebagai skrip pemeriksa yang tidak
// bisa diulang.
const suntik = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
  .toString(36)
  .padStart(2, "0")}`.toUpperCase();

for (const d of ["2026-10-05", "2026-10-11"]) {
  const tanggal = new Date(`${d}T00:00:00Z`);
  console.log(`${d} -> ${isoWeekday(tanggal)} (${weekdayName(isoWeekday(tanggal))})`);
}

const dokter = await listDoctors(db);
const semuaJadwal = await listSchedules(db);
const grouped = new Map<string, typeof semuaJadwal>();
for (const s of semuaJadwal) {
  grouped.set(s.doctor_id, [...(grouped.get(s.doctor_id) ?? []), s]);
}
const [doktorId, jadwalDoktor] = [...grouped.entries()].find(([, arr]) => arr.length > 0)!;
const dok = dokter.find((d) => d.id === doktorId)!;
console.log(`dokter: ${dok.full_name} (${dok.specialty ?? "tanpa spesialis"})`);

const target = new Date();
while (isoWeekday(target) !== jadwalDoktor[0].day_of_week) {
  target.setUTCDate(target.getUTCDate() + 1);
}
const visitDate = target.toISOString().slice(0, 10);

const jadwalPenuh = await db.execute(sql`
  SELECT sc.polyclinic_id
    FROM doctor_schedules sc
   WHERE sc.id = ${jadwalDoktor[0].id}
`);
const polyclinicId = (jadwalPenuh[0] as { polyclinic_id: string }).polyclinic_id;

const sebelum = await countTaken(db, doktorId, visitDate);
const sesudah = await createAppointment(db, {
  ticket_code: `EP-UJIKONTEN${suntik}`,
  doctor_id: doktorId,
  polyclinic_id: polyclinicId,
  patient_name: "Pasien Uji",
  birth_date: "1990-05-05",
  phone: "081234567890",
  email: "pasien@contoh.test",
  address: "Jl. Uji 1",
  complaint: "Keluhan uji",
  visit_date: visitDate,
  schedule_id: jadwalDoktor[0].id,
  payment_type: "general",
});
console.log(`antrean ${sebelum} -> ${sesudah.queue_number}:`, JSON.stringify(sesudah));
console.log("taken sesudah:", await countTaken(db, doktorId, visitDate));

// Tanggal yang salah hari harus ditolak dan tidak menambah taken.
const salahHari = new Date(target);
salahHari.setUTCDate(salahHari.getUTCDate() + 1);
try {
  await createAppointment(db, {
    ticket_code: `EP-UJISALAH${suntik}`,
    doctor_id: doktorId,
    polyclinic_id: polyclinicId,
    patient_name: "Pasien Uji",
    birth_date: "1990-05-05",
    phone: "081234567890",
    email: null,
    address: null,
    complaint: null,
    visit_date: salahHari.toISOString().slice(0, 10),
    schedule_id: jadwalDoktor[0].id,
    payment_type: "general",
  });
  console.log("BOCOR: tanggal salah hari diterima");
} catch (err) {
  console.log("tanggal salah hari ditolak:", (err as Error).message);
}

const paketId = (
  (await db.execute(sql`SELECT id FROM mcu_packages WHERE is_active ORDER BY sort_order LIMIT 1`))[0] as {
    id: string;
  }
).id;

console.log("MCU:", await insertMcuRegistration(db, {
  package_id: paketId,
  name: "Uji MCU",
  phone: "081200000001",
  email: "mcu@contoh.test",
  gender: "wanita",
  birth_date: "1988-02-02",
  company_name: null,
  participant_count: 3,
  preferred_date: visitDate,
  notes: null,
}));

console.log(
  "kritik:",
  await insertFeedback(db, {
    feedback_type: "suggestion",
    name: "Pengirim Uji",
    email: "pengirim@contoh.test",
    phone: "081200000002",
    subject: "Saran uji",
    message: "Ini pesan saran untuk pengujian backend.",
    service_unit: "Poliklinik Umum",
  }),
);

console.log(
  "WBS anonim:",
  await insertWbsReport(db, {
    subject: "Laporan uji",
    description: "Deskripsi laporan uji yang cukup panjang untuk lolos batas minimum.",
    incident_date: "2026-09-01",
    location: "Loket",
    involved_unit: "Administrasi",
    is_anonymous: true,
    reporter_name: "Harus Diabaikan",
    reporter_email: "harus@diabaikan.test",
    reporter_phone: "081200000003",
    severity: "medium",
  }),
);

const wbs = (
  await db.execute(
    sql`SELECT is_anonymous, reporter_name, reporter_email FROM wbs_reports ORDER BY created_at DESC LIMIT 1`,
  )
)[0];
console.log("WBS tersimpan:", JSON.stringify(wbs));

console.log(
  "survei:",
  await insertSurveyResponse(db, {
    service_unit: "Poliklinic Umum",
    respondent_name: "Responden Uji",
    respondent_email: "responden@contoh.test",
    answers: { kecepatan: 4, keramahan: 5 },
    overall_score: 5,
    comment: "Pelayanan baik.",
  }),
);

await closeDb();
