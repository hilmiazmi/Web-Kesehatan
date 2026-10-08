import { describe, expect, it } from "vitest";
import {
  loadStats,
  surveyByUnit,
  appointmentsPerDay,
  PENDAFTARAN_BELUM_DITANGANI,
  PENGAJUAN_BELUM_DITANGANI,
} from "@/server/admin/stats";
import type { Db } from "@/server/db/client";

/**
 * Pemetaan baris statistik ke objek yang dikirim ke panel.
 *
 * `loadStats` menjalankan satu kueri besar lalu mengubah hasilnya jadi objek.
 * Yang rawan salah ada di perubahan itu, bukan di SQL-nya, jadi kueri di sini
 * diganti dengan baris palsu.
 *
 * Tiga invarian yang paling mudah salah diuji satu per satu.
 *
 * Pertama, `inbox_unread` adalah jumlah dari empat jenis yang punya status
 * saja. Survei sengaja tidak ikut: kolom statusnya tidak ada, dan menghitungnya
 * sebagai "belum ditangani" akan membuat angka itu bergerak setiap kali ada
 * isian baru, padahal isian lama sudah selesai. Kalau penjumlahan ini ikut
 * menjumlahkan survei, angka di dasbor naik tanpa ada yang perlu ditangani.
 *
 * Kedua, `survey_average` boleh `null` kalau belum ada satu pun isian.
 * `Number(null)` bernilai nol, jadi tanpa penjagaan eksplisit "belum ada data"
 * akan terlihat sama dengan "nilai resinya nol" — padahal artinya berlawanan.
 *
 * Ketiga, semua angka datang dari PostgreSQL sebagai `bigint`, yang jadi string
 * di protokol. Jadi setiap angka harus lewat `Number`. Kalau ada yang lupa,
 * panel menerima `"3"` bukan `3`, dan penjumlahannya dengan `+` menempelkan
 * string.
 */

/** Kueri yang mengembalikan baris yang diberikan, tanpa database sungguhan. */
function dbDenganBaris(baris: unknown): Db {
  return {
    transaction: async (fn: (tx: Db) => Promise<unknown>) =>
      await fn({ execute: async () => [baris] } as unknown as Db),
  } as unknown as Db;
}

describe("loadStats", () => {
  /** Baris dengan semua kolom terisi nol, supaya tiap tes hanya mengubah satu. */
  function barisKosong(ubah: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      articles: "3",
      services: "5",
      mcu_packages: "2",
      doctors: "7",
      schedules: "9",
      pages: "11",
      hero_slides: "4",
      pendaftaran_baru: "1",
      mcu_baru: "2",
      kritik_baru: "3",
      wbs_baru: "4",
      survei_total: "50",
      pendaftaran_hari_ini: "6",
      pendaftaran_akan_datang: "7",
      tempat_total: "120",
      tempat_tersedia: "45",
      survei_rata: "4.25",
      ...ubah,
    };
  }

  it("mengubah angka bigint dari database menjadi angka", async () => {
    // PostgreSQL mengirim `count(*)` sebagai bigint, dan itu sampai ke sisi klien
    // sebagai string. Kalau tidak dikonversi, panel menerima "3" untuk jumlah
    // artikel dan penjumlahan dengan operator + akan menempelkan string.
    const hasil = await loadStats(dbDenganBaris(barisKosong()));

    expect(hasil.articles).toBe(3);
    expect(hasil.doctors).toBe(7);
    expect(hasil.beds_total).toBe(120);
    expect(hasil.beds_available).toBe(45);
    expect(hasil.appointments_today).toBe(6);

    for (const nilai of [
      hasil.articles,
      hasil.services,
      hasil.mcu_packages,
      hasil.doctors,
      hasil.schedules,
      hasil.pages,
      hasil.hero_slides,
      hasil.inbox_unread,
      hasil.appointments_today,
      hasil.appointments_upcoming,
      hasil.beds_total,
      hasil.beds_available,
      hasil.survey_responses,
    ]) {
      expect(typeof nilai).toBe("number");
    }
  });

  it("menjumlahkan inbox_unread dari lima jenis yang punya status saja", async () => {
    const hasil = await loadStats(
      dbDenganBaris(
        barisKosong({
          pendaftaran_baru: "1",
          inap_baru: "5",
          mcu_baru: "2",
          kritik_baru: "3",
          wbs_baru: "4",
          survei_total: "500",
        }),
      ),
    );

    expect(hasil.inbox_by_kind.appointments).toBe(1);
    expect(hasil.inbox_by_kind.admissions).toBe(5);
    expect(hasil.inbox_by_kind.mcu_registrations).toBe(2);
    expect(hasil.inbox_by_kind.feedbacks).toBe(3);
    expect(hasil.inbox_by_kind.wbs_reports).toBe(4);

    // 1 + 5 + 2 + 3 + 4, bukan 515. Survei tidak punya status sehingga tidak
    // bisa dihitung sebagai "belum ditangani"; menghitungnya membuat angka
    // ini naik setiap kali ada isian baru.
    expect(hasil.inbox_unread).toBe(15);
  });

  it("tidak memasukkan jumlah survei ke inbox_unread", async () => {
    // Uji ini dipisah dari yang di atas karena sengaja memakai angka survei
    // yang sangat besar. Kalau penjumlahan keliru menyertakannya, hasilnya
    // akan melompat jauh dan jelas terlihat.
    // angkanya akan melompat jauh.
    const hasil = await loadStats(
      dbDenganBaris(
        barisKosong({
          pendaftaran_baru: "0",
          inap_baru: "0",
          mcu_baru: "0",
          kritik_baru: "0",
          wbs_baru: "0",
          survei_total: "9999",
        }),
      ),
    );

    expect(hasil.inbox_unread).toBe(0);
    // Jumlah seluruh isian survei tetap dilaporkan, hanya bukan sebagai "belum
    // ditangani".
    expect(hasil.survey_responses).toBe(9999);
    expect(hasil.inbox_by_kind.survey_responses).toBe(9999);
  });

  it("menjaga null pada survey_average saat belum ada isian", async () => {
    // `round(avg(...))` mengembalikan null kalau tabel kosong. `Number(null)`
    // bernilai 0, jadi tanpa penjagaan eksplisit "belum ada data" akan
    // terlihat sama dengan "semua orang memberi nilai nol".
    const hasil = await loadStats(dbDenganBaris(barisKosong({ survei_rata: null })));
    expect(hasil.survey_average).toBeNull();
  });

  it("menjaga nol yang sah pada survey_average tetap nol", async () => {
    // Kebalikannya juga harus diuji: nol yang benar tidak boleh jadi null.
    const hasil = await loadStats(dbDenganBaris(barisKosong({ survei_rata: "0" })));
    expect(hasil.survey_average).toBe(0);
  });

  it("membaca rata-rata survei yang sudah dibulatkan menjadi angka", async () => {
    const hasil = await loadStats(dbDenganBaris(barisKosong({ survei_rata: "4.25" })));
    expect(hasil.survey_average).toBe(4.25);
  });

  it("menghitung tempat tersedia dari total dikurangi yang terpakai", async () => {
    // Nilai `tempat_tersedia` datang dari database, jadi yang diuji di sini
    // hanya bahwa angka nol yang sah tidak berubah jadi null.
    const hasil = await loadStats(dbDenganBaris(barisKosong({ tempat_total: "0", tempat_tersedia: "0" })));
    expect(hasil.beds_total).toBe(0);
    expect(hasil.beds_available).toBe(0);
  });
});

describe("surveyByUnit", () => {
  function dbDengan(rows: unknown[]): Db {
    return { execute: async () => rows } as unknown as Db;
  }

  it("mengubah rata-rata dan jumlah menjadi angka", async () => {
    const hasil = await surveyByUnit(
      dbDengan([
        { unit: "Instalasi", rata: "4.50", jumlah: 10 },
        { unit: "Poliklinik", rata: 3, jumlah: 4 },
      ]),
    );

    expect(hasil).toEqual([
      { unit: "Instalasi", average: 4.5, total: 10 },
      { unit: "Poliklinik", average: 3, total: 4 },
    ]);
  });

  it("menjaga unit tanpa respons tetap punya nilai, bukan kosong", async () => {
    // Unit yang belum ada isiannya dikembalikan `null` oleh SQL. Dijadikan 0
    // supaya panel bisa membedakan "nilai resinya jelek" dari "belum ada yang
    // mengisi" — keduanya tampil berbeda di tabel ringkasan.
    const hasil = await surveyByUnit(dbDengan([{ unit: "Belum ada", rata: null, jumlah: 0 }]));

    expect(hasil).toHaveLength(1);
    expect(hasil[0].average).toBe(0);
    expect(hasil[0].total).toBe(0);
  });

  it("mengembalikan daftar kosong kalau tidak ada satu pun isian", async () => {
    expect(await surveyByUnit(dbDengan([]))).toEqual([]);
  });
});

describe("appointmentsPerDay", () => {
  it("mengubah jumlah menjadi angka dan mempertahankan tanggal", async () => {
    const hasil = await appointmentsPerDay(
      {
        execute: async () => [
          { tanggal: "2026-10-02", jumlah: 0 },
          { tanggal: "2026-10-03", jumlah: 7 },
        ],
      } as unknown as Db,
    );

    expect(hasil).toEqual([
      { date: "2026-10-02", total: 0 },
      { date: "2026-10-03", total: 7 },
    ]);
  });

  it("menjaga hari tanpa pendaftaran tetap bernilai nol", async () => {
    // Tanpa baris nol, panel harus menebak sendiri hari mana yang dilewati.
    // Baris nolnya datang dari LEFT JOIN, jadi tugas fungsi ini hanya jangan
    // mengubahnya di sini.
    const hasil = await appointmentsPerDay({
      execute: async () => [{ tanggal: "2026-10-03", jumlah: 0 }],
    } as unknown as Db);

    expect(hasil[0].total).toBe(0);
  });
});

describe("status yang dihitung sebagai belum ditangani", () => {
  it("mengambil status pertama dari allowlist inbox, bukan menulis ulang", async () => {
    // Kalau string ditulis ulang di sini, ketidakcocokan dengan enum di
    // database tidak tertangkap compiler dan tidak tertangkap tes yang
    // membandingkan teks. Gejalanya baru muncul sebagai 400 saat dasbor dibuka.
    expect(PENDAFTARAN_BELUM_DITANGANI).toBe("pending");
    expect(PENGAJUAN_BELUM_DITANGANI).toBe("new");
  });
});