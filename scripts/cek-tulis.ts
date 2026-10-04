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

/**
 * Nomor telepon untuk pendaftaran uji, berbeda tiap kali skrip dijalankan.
 *
 * Wajib berubah per jalannya skrip sejak `drizzle/0003_anti_ganda.sql` menambahkan
 * unique index pada `(phone, schedule_id)`. Dengan nomor tetap, jalannya kedua
 * akan ditolak sebagai pendaftaran ganda dan skrip berhenti di tengah jalan,
 * padahal kegagalannya bukan backend rusak.
 *
 * `akhir` dipakai supaya tiap kasus di bawah memakai nomor sendiri. Kalau satu
 * nomor dipakai dua kasus, kasus kedua bisa ditolak oleh index, bukan oleh
 * aturan yang sedang diuji, dan skrip tetap melaporkan "ditolak" sehingga bukti
 * yang salah lolos sebagai yang benar.
 *
 * Bagian digitnya dihitung sekali, di luar fungsi. Kalau `Date.now()` dipanggil
 * di dalam fungsi, dua pemanggilan yang melintasi milidetik akan menghasilkan
 * nomor berbeda. Kasus "nomor sama dengan jadwal lain harus diterima" memakai
 * `teleponUji(1)` untuk membandingkan diri dengan pendaftaran pertama, jadi
 * nomor yang berbeda akan membuatnya lulus karena alasan yang salah.
 */
const digitUji = Date.now().toString().slice(-8);
const teleponUji = (akhir: number): string => `0812${digitUji}${akhir}`;

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

/**
 * Poliklinik dari satu jadwal.
 *
 * `listSchedules` mengembalikan `polyclinic` berupa nama, sedangkan
 * `createAppointment` butuh `polyclinic_id` berupa uuid. Jadi jadwalnya dibaca
 * lagi di sini.
 */
const polyclinicUntuk = async (scheduleId: string): Promise<string> => {
  const baris = await db.execute(sql`
    SELECT sc.polyclinic_id
      FROM doctor_schedules sc
     WHERE sc.id = ${scheduleId}
  `);
  return (baris[0] as { polyclinic_id: string }).polyclinic_id;
};

const polyclinicId = await polyclinicUntuk(jadwalDoktor[0].id);

const sebelum = await countTaken(db, doktorId, visitDate);
const sesudah = await createAppointment(db, {
  ticket_code: `EP-UJIKONTEN${suntik}`,
  doctor_id: doktorId,
  polyclinic_id: polyclinicId,
  patient_name: "Pasien Uji",
  birth_date: "1990-05-05",
  phone: teleponUji(1),
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
//
// Nomor teleponnya sengaja berbeda dari pendaftaran di atas, supaya penolakan
// ini datang dari pemeriksaan hari praktik, bukan dari index anti-ganda. Kalau
// nomornya sama, kasus ini tetap akan tercetak "ditolak" walaupun pemeriksaan
// hari praktiknya dihapus, jadi buktinya jadi tidak berguna.
const salahHari = new Date(target);
salahHari.setUTCDate(salahHari.getUTCDate() + 1);
try {
  await createAppointment(db, {
    ticket_code: `EP-UJISALAH${suntik}`,
    doctor_id: doktorId,
    polyclinic_id: polyclinicId,
    patient_name: "Pasien Uji",
    birth_date: "1990-05-05",
    phone: teleponUji(2),
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

// Pendaftaran ganda untuk slot yang sama harus ditolak, dan penolakannya tidak
// boleh memakan kuota.
//
// Yang diuji di sini bukan hanya "ditolak", tapi dua hal yang lebih halus:
//
//   1. Pesannya harus pesan pasien, bukan 500 dari `mapDbError`. Di lapisan
//      admin, pelanggaran `23505` memang bug dan dipetakan jadi 500. Kalau
//      pemetaan di `createAppointment` hilang, kasus ini tetap ditolak, tapi
//      sebagai 500, dan pasien melihat "Terjadi kesalahan di server".
//   2. `taken` harus kembali ke angka semula. Pendaftaran di dalam transaksi
//      menambah `taken` lebih dulu, lalu menyimpan baris. Kalau baris gagal,
//      seluruh transaksi batal, termasuk penambahan `taken`. Kalau tidak, satu
//      pendaftaran yang ditolak tetap memakan satu daya tampang.
//
// Dan satu kasus yang harus tetap DITERIMA, supaya index tidak terlalu lebar:
// satu nomor boleh daftar lagi di jadwal lain pada hari yang sama. Tanpa kasus
// ini, index `(phone, schedule_id)` bisa diperluas tanpa ada yang menyadarinya.
const takenSebelumGanda = await countTaken(db, doktorId, visitDate);
try {
  await createAppointment(db, {
    ticket_code: `EP-UJIGANDA${suntik}`,
    doctor_id: doktorId,
    polyclinic_id: polyclinicId,
    patient_name: "Pasien Uji",
    birth_date: "1990-05-05",
    phone: teleponUji(1),
    email: null,
    address: null,
    complaint: null,
    visit_date: visitDate,
    schedule_id: jadwalDoktor[0].id,
    payment_type: "general",
  });
  console.log("BOCOR: pendaftaran ganda untuk slot yang sama diterima");
} catch (err) {
  console.log("pendaftaran ganda ditolak:", (err as Error).message);
}
const takenSesudahGanda = await countTaken(db, doktorId, visitDate);
console.log(
  `kuota setelah pendaftaran ganda ditolak: ${takenSebelumGanda} -> ${takenSesudahGanda}` +
    (takenSesudahGanda === takenSebelumGanda ? " (tidak berkurang, benar)" : " (BAHAYA: berkurang)"),
);

// Batas lebar index juga harus diuji, bukan hanya batas sempitnya.
//
// Index-nya `(phone, schedule_id)`. Kalau tidak sengaja menjadi
// `(phone, visit_date)` atau `(phone, doctor_id, visit_date)`, satu orang tidak
// lagi bisa mengambil antrean di dua poliklinik pada hari yang sama, dan itu
// kegiatan yang sah. Kasus di bawah memakai nomor yang sama dengan pendaftaran
// pertama, tapi jadwal yang berbeda, jadi harus DITERIMA.
//
// Kalau dokter yang kebetulan dipilih hanya punya satu jadwal aktif, kasus ini
// tidak bisa dijalankan dan dilewati dengan terang-terangan. Lewat diam-diam
// lebih berbahaya, karena nanti terbaca seolah sudah diuji.
const jadwalLain = jadwalDoktor.find((s) => s.id !== jadwalDoktor[0].id);
if (!jadwalLain) {
  console.log(
    `dilewati: dokter uji hanya punya satu jadwal aktif, jadi index yang terlalu ` +
      `lebar tidak bisa dibuktikan di sini`,
  );
} else {
  const tanggalLain = new Date(target);
  while (isoWeekday(tanggalLain) !== jadwalLain.day_of_week) {
    tanggalLain.setUTCDate(tanggalLain.getUTCDate() + 1);
  }
  try {
    const ok = await createAppointment(db, {
      ticket_code: `EP-UJISLAIN${suntik}`,
      doctor_id: doktorId,
      polyclinic_id: await polyclinicUntuk(jadwalLain.id),
      patient_name: "Pasien Uji",
      birth_date: "1990-05-05",
      phone: teleponUji(1),
      email: null,
      address: null,
      complaint: null,
      visit_date: tanggalLain.toISOString().slice(0, 10),
      schedule_id: jadwalLain.id,
      payment_type: "general",
    });
    console.log(
      `nomor sama, jadwal lain: diterima, antrean ${ok.queue_number} (benar, index tidak kelewat lebar)`,
    );
  } catch (err) {
    console.log(
      "BAHAYA: nomor sama dan jadwal lain ditolak, index kelewat luas:",
      (err as Error).message,
    );
  }
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
