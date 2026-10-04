import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSTRAINT_DAFTAR_GANDA,
  PESAN_DAFTAR_GANDA,
  createAppointment,
  kePesanDaftarGanda,
} from "@/server/db/repo/appointments";

/**
 * Satu nomor telepon, satu jadwal, satu baris pendaftaran.
 *
 * Endpoint sebelumnya menerima pendaftaran yang sama dua kali, jadi satu orang
 * yang menekan kirim dua kali atau menyimpan halaman lalu mengirim ulang
 * dan mendapat dua nomor antrean untuk slot yang sama. Bentuk yang ditegakkan di
 * sini adalah yang paling sempit di antara tiga pilihan yang dipetakan di
 * `docs/roadmap.md` bagian 3.13, karena itu persis kerusakannya yang teridentifikasi
 * dan tidak sedang menolak kegiatan yang sah.
 *
 * Yang tidak bisa diuji di berkas ini adalah perilaku databasenya: pelanggaran index
 * hanya terjadi kalau ada database sungguhan. `scripts/cek-tulis.ts` yang
 * membuktikannya, termasuk bahwa penolakan tidak memakan kuota dan bahwa jadwal
 * berbeda tetap diterima.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

const schema = sumber("src/server/db/schema.ts");
const repo = sumber("src/server/db/repo/appointments.ts");
const migration = sumber("drizzle/0003_anti_ganda.sql");

describe("kePesanDaftarGanda", () => {
  it("mengubah pelanggaran index anti-ganda jadi galat 400 yang bisa dibaca", () => {
    const err = kePesanDaftarGanda({
      code: "23505",
      constraint: CONSTRAINT_DAFTAR_GANDA,
    });

    expect(err).not.toBeNull();
    expect(err!.status).toBe(400);
    expect(err!.code).toBe("BAD_REQUEST");
    expect(err!.message).toBe(PESAN_DAFTAR_GANDA);
  });

  it("membaca nama constraint dari kunci postgres.js, bukan cuma node-postgres", () => {
    // Driver yang dipakai di sini adalah postgres.js, yang menaruh nama constraint
    // di `constraint_name`. Kalau hanya `constraint` yang dibaca, pemetaan ini
    // selalu mengembalikan null di produksi, padahal tesnya sendiri lulus.
    const err = kePesanDaftarGanda({
      code: "23505",
      constraint_name: CONSTRAINT_DAFTAR_GANDA,
    });

    expect(err?.message).toBe(PESAN_DAFTAR_GANDA);
  });

  it("membuka bungkus galat yang dibungkus Drizzle", () => {
    // Drizzle melempar `DrizzleQueryError`, yang menaruh galat asli di `cause`.
    // Galat yang dibungkus dua lapis seperti ini yang benar-benar terjadi, jadi
    // bentuk bersarangnya ikut diuji, bukan cuma objek datar.
    const err = kePesanDaftarGanda({
      cause: {
        cause: { code: "23505", constraint_name: CONSTRAINT_DAFTAR_GANDA },
      },
    });

    expect(err?.message).toBe(PESAN_DAFTAR_GANDA);
  });

  it("melempar apa adanya untuk unique lain, supaya bug di kode tidak jadi 400", () => {
    // Bentrok kode tiket dan bentrok nomor antrean keduanya hal yang tidak
    // boleh terjadi, dan keduanya bug pada program ini. Kalau ikut dipetakan jadi
    // galat pasien, bug-nya disembunyikan sampai dilaporkan sebagai "pasien salah
    // isi".
    for (const constraint of [
      "appointments_ticket_code_unique",
      "appointments_queue_unique",
      "users_email_key",
    ]) {
      expect(kePesanDaftarGanda({ code: "23505", constraint })).toBeNull();
    }
  });

  it("melempar apa adanya untuk galat yang bukan pelanggaran unique", () => {
    for (const code of ["23503", "23514", "22P02", "ECONNRESET"]) {
      expect(
        kePesanDaftarGanda({ code, constraint: CONSTRAINT_DAFTAR_GANDA }),
      ).toBeNull();
    }
  });

  it("melempar apa adanya untuk galat tanpa kode, termasuk galat milik sendiri", () => {
    // `throw undefined` adalah kegagalan nyata yang terjadi, dan pembaca `.code`
    // di bawahnya ikut melempar kalau tidak ditangani. Bentuknya harus diuji.
    for (const err of [undefined, null, 0, "", new Error("biasa")]) {
      expect(kePesanDaftarGanda(err)).toBeNull();
    }
  });

  it("tidak membocorkan nama constraint atau pesan PostgreSQL ke klien", () => {
    const err = kePesanDaftarGanda({
      code: "23505",
      constraint: CONSTRAINT_DAFTAR_GANDA,
      detail: "duplicate key value violates unique constraint",
    });

    expect(err!.message).not.toContain(CONSTRAINT_DAFTAR_GANDA);
    expect(err!.message).not.toContain("duplicate key");
    expect(err!.detail).toBeUndefined();
  });
});

describe("nama constraint sama di tiga tempat", () => {
  // Ini yang menjaga pemetaan di atas tetap hidup. Kalau salah satu dari tiga nama
  // ini berubah sendiri-sendiri, `kePesanDaftarGanda` akan mengembalikan null
  // tanpa error apa pun, dan pasien akan melihat "Terjadi kesalahan di server"
  // untuk hal yang sebenarnya cuma pendaftaran ganda.
  it("skema, migration, dan repo memakai nama yang sama", () => {
    expect(schema).toContain(`uniqueIndex("${CONSTRAINT_DAFTAR_GANDA}")`);
    expect(migration).toContain(`"${CONSTRAINT_DAFTAR_GANDA}"`);
    expect(repo).toContain(`= "${CONSTRAINT_DAFTAR_GANDA}"`);
  });

  it("kolomnya persis nomor telepon lalu jadwal, tidak lebih", () => {
    // Kolom yang terbalik atau ditambah akan mengubah bentuk aturannya diam-diam.
    // `(phone, doctor_id, visit_date)` akan menolak satu orang mengambil antrean
    // di dua poliklinik pada hari yang sama, dan itu kegiatan yang sah.
    expect(schema).toContain(
      `uniqueIndex("${CONSTRAINT_DAFTAR_GANDA}").on(t.phone, t.scheduleId)`,
    );
    expect(migration).toMatch(/USING btree \(\s*"phone",\s*"schedule_id"\s*\)/);
  });

  it("dibuat sebagai unique index, bukan index biasa", () => {
    // Index biasa tidak menolak apa pun. `CREATE INDEX` di migration akan lolos
    // migrasi dan diam-diam membiarkan pendaftaran ganda masuk.
    expect(migration).toContain("CREATE UNIQUE INDEX");
    expect(migration).not.toMatch(/^CREATE INDEX /m);
  });
});

describe("createAppointment memetakan galatnya di dalam transaksi", () => {
  // Pemetaan harus ada di dalam `db.transaction`, bukan di luar. Kalau ada di
  // luar,-more atau_after, rollback-nya sudah terjadi dan `taken` yang sudah
  // dinaikkan tidak ikut kembali. Satu pendaftaran yang ditolak akan memakan satu
  // daya tampang yang tidak pernah terpakai.
  const badan = repo.slice(
    repo.indexOf("export async function createAppointment"),
    repo.indexOf("export async function countTaken"),
  );

  it("panggilan pemetaan ada di dalam badan fungsi", () => {
    expect(badan).toContain("kePesanDaftarGanda(err)");
    expect(badan).toContain("db.transaction");
  });

  it("try pembungkus menempel pada insert, bukan pada seluruh transaksi", () => {
    // Kalau try-nya membungkus seluruh `db.transaction`, pemetaan tetap benar tapi
    // galat lain di dalam transaksi ikut lewat fungsi yang sama. Batasnya
    // sengaja: hanya INSERT yang bisa melanggar index ini.
    const posisiTry = badan.indexOf("try {");
    const posisiInsert = badan.indexOf("tx.insert(appointments)");
    const posisiTutup = badan.indexOf("} catch (err) {");

    expect(posisiTry).toBeGreaterThan(-1);
    expect(posisiTry).toBeLessThan(posisiInsert);
    expect(posisiTutup).toBeGreaterThan(posisiInsert);
  });

  it("galat yang bukan anti-ganda dilempar aslinya", () => {
    // Kalau galat lain ikut dibungkus jadi pesan pendaftaran ganda, semua bug di
    // jalur ini akan muncul sebagai "sudah terdaftar" dan tidak pernah ditelusuri.
    expect(badan).toContain("if (ganda) throw ganda;");
    expect(badan).toContain("throw err;");
  });
});

describe("pesan yang dilihat pasien", () => {
  it("menyebutkan nomor dan jadwal, bukan kode galat", () => {
    expect(PESAN_DAFTAR_GANDA).toContain("sudah terdaftar");
    expect(PESAN_DAFTAR_GANDA).not.toMatch(/23505|UNIQUE|postgres/i);
  });

  it("berkata satu nomor satu antrean per jadwal, sesuai batas indexnya", () => {
    // Kalimat kedua mencegah orang salah paham bahwa satu nomor hanya boleh
    // daftar sekali sehari. Yang dilarang adalah per jadwal, bukan per hari.
    expect(PESAN_DAFTAR_GANDA).toContain("per jadwal");
    expect(PESAN_DAFTAR_GANDA).not.toContain("per hari");
  });
});

describe("createAppointment tetap ada dan bisa dipanggil", () => {
  // Penjaga yang murah: kalau nama fungsi atau urutannya berubah, berkas ini ikut
  // gagal di typecheck, bukan diam-diam menguji fungsi yang sudah tidak dipakai.
  it("diekspor sebagai async yang mengembalikan konfirmasi", () => {
    expect(typeof createAppointment).toBe("function");
    expect(createAppointment.constructor.name).toBe("AsyncFunction");
  });
});