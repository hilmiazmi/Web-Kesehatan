import { afterEach, describe, expect, it, vi } from "vitest";
import {
NAMA_BULAN,
NAMA_HARI,
dariIso,
hariDalamBulan,
hariPraktik,
isoHariIni,

kisiKalender,
nomorHari,
tambahHari,
tanggalDekat,
tanggalPanjang,
tanggalPendek,
judulBulan,
} from "@/lib/jadwal";

/**
* Aturan tanggal pendaftaran.
*
* Semua fungsi di sini murni, jadi diuji tanpa merender komponen. Yang paling
* rawan salah adalah konversi hari: kolom `doctor_schedules.day_of_week`
* menyimpan `1` untuk Senin sampai `7` untuk Minggu, sementara
* `Date.prototype.getUTCDay()` mengembalikan `0` untuk Minggu. Salah satu angka
* saja yang bergeser membuat hari praktik dokter terbaca sebagai hari yang
* salah, dan pengguna baru tahu setelahlator menekan "Daftar Online".
*/

afterEach(() => {
vi.useRealTimers();
});

describe("konversi hari", () => {
it("nomor hari ISO mengikuti 1 Senin sampai 7 Minggu", () => {
expect(nomorHari("2026-10-05")).toBe(1); // Senin
expect(nomorHari("2026-10-06")).toBe(2); // Selasa
expect(nomorHari("2026-10-09")).toBe(5); // Jumat
expect(nomorHari("2026-10-10")).toBe(6); // Sabtu
expect(nomorHari("2026-10-11")).toBe(7); // Minggu
});

it("nama hari sesuai nomor ISO", () => {
expect(NAMA_HARI[1]).toBe("Senin");
expect(NAMA_HARI[7]).toBe("Minggu");
});

it("hariPraktik membuang angka di luar 1 sampai 7 dan mengurutkan", () => {
expect(hariPraktik([3, 1, 3, 5])).toEqual([1, 3, 5]);
expect(hariPraktik([0, 8, 7, 1])).toEqual([1, 7]);
expect(hariPraktik([])).toEqual([]);
});
});

describe("tanggal ISO", () => {
it("menolak tanggal yang tidak ada, bukan menggesernya diam-diam", () => {
// `Date.UTC(2026, 1, 31)` sebenarnya 3 Maret. Kalau tidak dibandingkan
// balik, kalender akan menampilkan tanggal yang tidak pernah dipilih.
expect(dariIso("2026-02-31")).toBeNull();
expect(dariIso("2026-13-01")).toBeNull();
expect(dariIso("bukan-tanggal")).toBeNull();
expect(nomorHari("2026-02-31")).toBeNull();
expect(dariIso("2026-02-28")).not.toBeNull();
});

it("tambahHari melewati batas bulan dan tahun", () => {
expect(tambahHari("2026-10-31", 1)).toBe("2026-11-01");
expect(tambahHari("2026-12-31", 1)).toBe("2027-01-01");
expect(tambahHari("2026-01-01", -1)).toBe("2025-12-31");
expect(tambahHari("2028-02-28", 1)).toBe("2028-02-29");
});

it("isoHariIni memakai WIB, bukan waktu mesin", () => {
// 2026-10-06 22.30 UTC masih 07 Oktober di WIB (UTC+7).
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-10-06T22:30:00Z"));
expect(isoHariIni()).toBe("2026-10-07");

// 2026-10-06 17.00 UTC adalah 07 Oktober pukul 00.00 WIB.
vi.setSystemTime(new Date("2026-10-06T17:00:00Z"));
expect(isoHariIni()).toBe("2026-10-07");

// 2026-10-06 16.59 UTC masih 06 Oktober pukul 23.59 WIB.
vi.setSystemTime(new Date("2026-10-06T16:59:00Z"));
expect(isoHariIni()).toBe("2026-10-06");
});

it("tanggalDekat mencari hari terdekat tanpa melewati tanggal awal", () => {
// 07 Oktober 2026 adalah Rabu.
expect(tanggalDekat("2026-10-07", 3)).toBe("2026-10-07"); // Rabu itu sendiri
expect(tanggalDekat("2026-10-07", 5)).toBe("2026-10-09"); // Jumat
expect(tanggalDekat("2026-10-07", 1)).toBe("2026-10-12"); // Senin berikutnya
expect(tanggalDekat("2026-10-09", 5)).toBe("2026-10-09"); // Jumat itu sendiri
expect(tanggalDekat("2026-10-07", 0)).toBeNull();
expect(tanggalDekat("2026-10-07", 8)).toBeNull();
expect(tanggalDekat("salah", 3)).toBeNull();
});
});

describe("format tanggal Indonesia", () => {
it("tanggalPendek memakai dd/MM/yyyy", () => {
expect(tanggalPendek("2026-10-07")).toBe("07/10/2026");
expect(tanggalPendek("2026-01-05")).toBe("05/01/2026");
expect(tanggalPendek("salah")).toBe("");
});

it("tanggalPanjang menyebut hari dan bulan Indonesia", () => {
expect(tanggalPanjang("2026-10-07")).toBe("Rabu, 7 Oktober 2026");
expect(NAMA_BULAN[9]).toBe("Oktober");
});
});

describe("kisi kalender", () => {
it("selalu 42 kotak dengan enam baris tujuh kolom", () => {
// February 2026 mulai hari Minggu, jadi butuh kotak sisipan di depan.
expect(kisiKalender(2026, 2)).toHaveLength(42);
expect(kisiKalender(2026, 2).filter((s) => s.dalamBulan)).toHaveLength(28);
});

it("kisi dimulai hari Senin", () => {
// 1 Oktober 2026 adalah Kamis, jadi baris pertama diisi kotak 29, 30
// September lalu 1 Oktober.
const kisi = kisiKalender(2026, 10);
expect(kisi[0].iso).toBe("2026-09-28");
expect(kisi[3].iso).toBe("2026-10-01");
expect(kisi[3].dalamBulan).toBe(true);
expect(kisi[0].dalamBulan).toBe(false);
});

  it("bulan yang butuh enam baris tidak memotong tanggal", () => {
    // Agustus 2026 mulai hari Sabtu dan punya 31 hari: 5 kotak sisipan di
    // depan + 31 = 36, jadi baris keenam dipakai. Kisi 42 kotak masih punya
    // sisa kotak September, dan itu memang yang terjadi di kalender aslinya
    // juga. Yang tidak boleh terjadi adalah tanggal yang terpotong.
    const kisi = kisiKalender(2026, 8);
    expect(kisi).toHaveLength(42);
    expect(kisi.filter((s) => s.dalamBulan)).toHaveLength(31);
    expect(kisi[5].iso).toBe("2026-08-01");
    expect(kisi[35].iso).toBe("2026-08-31");
    // Sisipan setelah tanggal 31 ditandai bukan bagian bulan ini.
    expect(kisi[36].dalamBulan).toBe(false);
    expect(kisi[36].iso).toBe("2026-09-01");
  });

it("judulBulan dan hariDalamBulan konsisten", () => {
expect(judulBulan(2026, 10)).toBe("Oktober 2026");
expect(hariDalamBulan(2026, 2)).toBe(28);
expect(hariDalamBulan(2028, 2)).toBe(29);
});
});
