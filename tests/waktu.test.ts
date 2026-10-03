import { describe, expect, it } from "vitest";
import { iso } from "@/server/db/repo/iso";
import { isoWeekday, weekdayName } from "@/server/db/repo/appointments";

/**
 * Empat fungsi di sini menentukan dua hal yang mustahil dilihat mata.
 *
 * `iso` menentukan bentuk tanggal yang keluar dari API. Bawaan driver adalah
 * objek `Date`, sedangkan driver lain memberi teks PostgreSQL. Tanpa penyamaan
 * ini, satu perubahan driver akan mengganti format tanggal di seluruh API dan
 * merusak `new Date(...)` di sisi klien.
 *
 * `isoWeekday` dan `weekdayName` menentukan apakah tanggal kunjungan cocok
 * dengan hari praktik dokter. Salah di sini berarti pasien ditolak tanpa alasan
 * yang benar, atau lolos padahal praktiknya tidak ada.
 */

/** Tanggal acuan: 2026-10-05 Senin sampai 2026-10-11 Minggu. */
function tanggalIso(hari: number): Date {
  return new Date(`2026-10-${String(hari).padStart(2, "0")}T00:00:00Z`);
}

describe("iso", () => {
  it("mengubah objek Date menjadi ISO dengan Z", () => {
    expect(iso(new Date("2026-10-05T08:00:00Z"))).toBe("2026-10-05T08:00:00.000Z");
  });

  it("mengubah teks ISO menjadi bentuk yang sama", () => {
    // Driver yang memberi teks harus menghasilkan keluaran yang sama dengan
    // driver yang memberi objek Date. Kalau tidak, bentuk respons API
    // bergantung pada driver yang kebetulan terpasang.
    expect(iso("2026-10-05T08:00:00Z")).toBe(iso(new Date("2026-10-05T08:00:00Z")));
  });

  it("menyamakan jumlah digit milidetik", () => {
    // `toISOString()` selalu tiga digit. Tanpa itu, tanggal yang jatuh tepat di
    // detik berubah bentuknya setiap detik.
    expect(iso(new Date("2026-10-05T08:00:00.500Z"))).toBe("2026-10-05T08:00:00.500Z");
  });

  it("mengembalikan teks kosong untuk nilai yang tidak ada", () => {
    // Kolom yang boleh null sering tidak bisa dibedakan dari kosong di sisi
    // klien kalau sampai `null` mentah.
    expect(iso(null)).toBe("");
    expect(iso(undefined)).toBe("");
  });

  it("mengembalikan teks kosong untuk Date yang tidak sah", () => {
    expect(iso(new Date("bukan tanggal"))).toBe("");
  });

  it("mengembalikan teks aslinya kalau tidak bisa diurai", () => {
    // Data rusak lebih baik terlihat daripada hilang diam-diam. Yang penting
    // nilai ini tidak pernah sampai jadi `Invalid Date` di respons JSON.
    expect(iso("bukan tanggal")).toBe("bukan tanggal");
  });
});

describe("isoWeekday", () => {
  it("memberi nomor hari ISO satu sampai tujuh", () => {
    // ISO 8601 dimulai dari Senin, bukan Minggu seperti `getDay` bawaan.
    expect(isoWeekday(tanggalIso(5))).toBe(1); // Senin
    expect(isoWeekday(tanggalIso(6))).toBe(2); // Selasa
    expect(isoWeekday(tanggalIso(9))).toBe(5); // Jumat
    expect(isoWeekday(tanggalIso(10))).toBe(6); // Sabtu
  });

  it("memberi nomor tujuh untuk Minggu, bukan nol", () => {
    // `getUTCDay()` mengembalikan nol untuk Minggu. Kalau diteruskan apa adanya,
    // Minggu tidak akan cocok dengan hari praktik mana pun yang ditulis satu
    // sampai tujuh.
    expect(isoWeekday(tanggalIso(11))).toBe(7);
  });

  it("menggunakan UTC, bukan zona waktu mesin", () => {
    // Tanggal dijaga sebagai tanggal saja, tanpa jam. Kalau dihitung dengan jam
    // lokal, satu hari bisa bergeser nomor di dekat tengah malam.
    expect(isoWeekday(new Date("2026-10-05T23:30:00Z"))).toBe(1);
    expect(isoWeekday(new Date("2026-10-05T00:30:00Z"))).toBe(1);
  });
});

describe("weekdayName", () => {
  const NAMA = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  it("memberi nama bahasa Indonesia untuk satu sampai tujuh", () => {
    for (let hari = 1; hari <= 7; hari += 1) {
      expect(weekdayName(hari)).toBe(NAMA[hari - 1]);
    }
  });

  it("memberi tanda hubung untuk nomor di luar satu sampai tujuh", () => {
    // Nomor di luar rentang berarti data jadwal sudah salah. `"-"` membuat itu
    // terlihat di layar, sementara string kosong akan membuat halaman tampak
    // seperti gagal memuat.
    expect(weekdayName(8)).toBe("-");
    expect(weekdayName(-1)).toBe("-");
    expect(weekdayName(99)).toBe("-");
  });

  it("tidak pernah mengembalikan undefined", () => {
    // Nilai ini langsung masuk ke respons JSON. `undefined` akan membuat
    // `JSON.stringify` membuang kunci itu, jadi pemanggil tidak tahu isinya
    // pernah ada.
    for (let hari = -5; hari <= 15; hari += 1) {
      expect(typeof weekdayName(hari)).toBe("string");
    }
  });

  it("pasangan isoWeekday dan weekdayName selalu menghasilkan nama", () => {
    // Inilah yang sebenarnya dipakai route: nomor dari `isoWeekday` langsung
    // jadi nama. Kalau dua fungsi ini tidak sepakat, halaman jadwal menampilkan
    // hari yang salah tanpa galat apa pun.
    for (let hari = 5; hari <= 11; hari += 1) {
      const nama = weekdayName(isoWeekday(tanggalIso(hari)));
      expect(nama).not.toBe("-");
      expect(nama.length).toBeGreaterThan(0);
    }
  });
});