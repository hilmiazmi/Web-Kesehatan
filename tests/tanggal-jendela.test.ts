import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Errors,
  dateWithinDays,
  parseIsoDate,
} from "@/server/validation";
import { resetConfigCache } from "@/server/config";

/**
 * `dateWithinDays` menolak tanggal yang terlalu dekat atau terlalu jauh dari
 * hari ini, jadi aturan ini menentukan tanggal berapa yang bisa dipilih
 * pengunjung.
 *
 * Fungsi ini membandingkan "hari ini" dengan tanggal UTC. WIB tujuh jam di
 * depan UTC, jadi antara pukul 00.00 dan 06.59 waktu setempat tanggal UTC
 * masih kemarin. Kalau satu sisi memakai waktu lokal dan sisi lain UTC,
 * selisih tujuh jam itu muncul sebagai permintaan yang ditolak tanpa alasan
 * yang benar, dan hanya di jam-jam itu.
 *
 * Karena itu semua tes di sini mengunci jam dengan `vi.setSystemTime`. Tes
 * yang memakai jam sebenarnya terlihat benar selama berbulan-bulan, lalu
 * meledak sendiri di jendela tujuh jam pertama pagi.
 */

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
  ADMIN_ORIGIN: "http://localhost:3000",
  MIN_LEAD_DAYS: "0",
  MAX_LEAD_DAYS: "90",
} as const;

const ASLI = { ...process.env };

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN);
  resetConfigCache();
});

afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ASLI };
  resetConfigCache();
});

/** Kunci jam pada waktu tertentu, lalu jalankan satu pemeriksaan. */
function cek(
  sekarangIso: string,
  tanggal: string,
  min: number,
  maks: number,
): { diterima: boolean; pesan: string | undefined } {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(sekarangIso));

  const errors = new Errors();
  const hasil = dateWithinDays(
    errors,
    "visit_date",
    parseIsoDate(tanggal)!,
    min,
    maks,
  );

  return {
    diterima: hasil !== null,
    pesan: errors.toObject()["visit_date"],
  };
}

describe("dateWithinDays", () => {
  it("menerima hari ini sendiri saat tenggang nol", () => {
    // `2026-10-05` jam 04.30 UTC. Tanggal UTC-nya juga `2026-10-05`, jadi ini
    // hari yang sama menurut hitungan server.
    expect(cek("2026-10-05T04:30:00Z", "2026-10-05", 0, 90).diterima).toBe(true);
  });

  it("menerima besok saat tenggang atas masih longgar", () => {
    // `max` menentukan seberapa jauh ke depan, dan bawaannya 90 hari. Besok
    // masih di dalamnya, jadi tidak boleh ditolak hanya karena bukan hari ini.
    expect(cek("2026-10-05T04:30:00Z", "2026-10-06", 0, 90).diterima).toBe(true);
  });

  it("menolak kemampainya saat tenggang atas nol", () => {
    // Hanya hari ini yang boleh, jadi kemarin dan besok sama-sama ditolak.
    expect(cek("2026-10-05T04:30:00Z", "2026-10-04", 0, 0).diterima).toBe(false);
    expect(cek("2026-10-05T04:30:00Z", "2026-10-06", 0, 0).diterima).toBe(false);
    expect(cek("2026-10-05T04:30:00Z", "2026-10-05", 0, 0).diterima).toBe(true);
  });

  it("menolak hari yang belum cukup masa tunggunya", () => {
    // Tenggang satu hari: besok baru boleh, hari ini belum.
    expect(cek("2026-10-05T04:30:00Z", "2026-10-05", 1, 90).diterima).toBe(false);
    expect(cek("2026-10-05T04:30:00Z", "2026-10-06", 1, 90).diterima).toBe(true);
  });

  it("membatasi tanggal paling jauh ke depan", () => {
    expect(cek("2026-10-05T04:30:00Z", "2026-10-05", 0, 3).diterima).toBe(true);
    expect(cek("2026-10-05T04:30:00Z", "2026-10-08", 0, 3).diterima).toBe(true);
    expect(cek("2026-10-05T04:30:00Z", "2026-10-09", 0, 3).diterima).toBe(false);
  });

  it("memakai UTC, bukan waktu lokal mesin", () => {
    // `2026-10-04` jam 17.30 UTC adalah `2026-10-05` jam 00.30 di WIB. Server
    // sudah menghitung `2026-10-04` sebagai hari ini, dan `2026-10-05` sebagai
    // besok. Inilah yang harus terkunci: kalau suatu saat `awal` disederhanakan
    // menjadi `new Date()` tanpa dipotong ke tengah malam UTC, dua sisi berhenti
    // sepakat dan jendela tujuh jam pertama pagi ini ikut meledak.
    const hasil = cek("2026-10-04T17:30:00Z", "2026-10-05", 1, 90);
    expect(hasil.diterima).toBe(true);

    // Hari yang sama menurut hitungan server harus tetap diterima dengan
    // tenggang nol, walau waktu setempat sudah lewat tengah malam.
    expect(cek("2026-10-04T17:30:00Z", "2026-10-04", 0, 90).diterima).toBe(true);
    expect(cek("2026-10-04T17:30:00Z", "2026-10-03", 0, 90).diterima).toBe(false);
  });

  it("memberi pesan yang berbeda untuk terlalu cepat dan terlalu jauh", () => {
    // Dua kegagalan ini butuh tindakan berbeda dari pengunjung, jadi
    // pesannya tidak boleh sama.
    const cepat = cek("2026-10-05T04:30:00Z", "2026-10-01", 1, 90);
    const jauh = cek("2026-10-05T04:30:00Z", "2026-12-01", 0, 3);

    expect(cepat.diterima).toBe(false);
    expect(jauh.diterima).toBe(false);
    expect(cepat.pesan).toBeTruthy();
    expect(jauh.pesan).toBeTruthy();
    expect(cepat.pesan).not.toBe(jauh.pesan);
  });

  it("tidak menambah pesan galat saat tanggal diterima", () => {
    // Pengunjung yang melihat pesan galat padahal isinya benar akan menebak
    // ulang terus-tenerus.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T04:30:00Z"));

    const errors = new Errors();
    dateWithinDays(errors, "visit_date", parseIsoDate("2026-10-06")!, 1, 90);

    expect(errors.isEmpty).toBe(true);
  });

  it("berpindah batasnya tepat saat tengah malam UTC", () => {
    // Satu milidetik sebelum tengah malam, `2026-10-06` masih besok. Tepat
    // tengah malam, `2026-10-05` sudah menjadi hari ini dan `2026-10-06`
    // mengambil alih sebagai besok.
    expect(cek("2026-10-05T23:59:59.999Z", "2026-10-06", 1, 90).diterima).toBe(true);
    expect(cek("2026-10-06T00:00:00.000Z", "2026-10-06", 1, 90).diterima).toBe(false);
    expect(cek("2026-10-06T00:00:00.000Z", "2026-10-07", 1, 90).diterima).toBe(true);
  });

  it("tidak salah urut di pergantian tahun", () => {
    // Bug yang membandingkan angka bulan dan tahun sebagai teks akan salah
    // di sini, dan salahnya tidak terlihat di tengah tahun.
    expect(cek("2026-12-31T12:00:00Z", "2027-01-01", 1, 90).diterima).toBe(true);
    expect(cek("2026-12-31T12:00:00Z", "2027-01-01", 0, 90).diterima).toBe(true);
    expect(cek("2026-12-31T12:00:00Z", "2026-12-31", 0, 90).diterima).toBe(true);
    expect(cek("2026-12-31T12:00:00Z", "2027-01-02", 1, 1).diterima).toBe(false);
  });
});