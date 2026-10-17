import { describe, expect, it } from "vitest";
import { loginTerakhir } from "@/components/admin/AccountsManager";

/**
 * Waktu login terakhir di daftar akun.
 *
 * Fungsi ini diuji karena nilainya masuk ke layar yang dibaca untuk menilai
 * apakah sebuah akun masih dipakai. Dua kesalahan di sini sama-sama menutupi
 * informasi yang justru dicari: `null` yang dirender sebagai tanggal made up,
 * dan waktu UTC yang ditampilkan seolah-olah waktu WIB sehingga terlihat
 * beberapa jam lebih tua dari kenyataan.
 */
describe("loginTerakhir", () => {
  it("menampilkan tanda hubung kalau belum pernah masuk", () => {
    expect(loginTerakhir(null)).toBe("-");
    expect(loginTerakhir("")).toBe("-");
  });

  it("menampilkan waktu UTC dalam waktu WIB", () => {
    // 02:30 UTC adalah 09.30 WIB pada hari yang sama.
    expect(loginTerakhir("2026-10-08T02:30:00Z")).toBe("8 Okt 2026 09.30 WIB");
  });

  it("tidak menambah hari sendiri", () => {
    // 23:30 UTC tanggal 8 adalah 06.30 WIB tanggal 9. Kalau tanggalnya ikut
    // ditambah, kolom ini terlihat salah sehari.
    expect(loginTerakhir("2026-10-08T23:30:00Z")).toBe("9 Okt 2026 06.30 WIB");
  });

  it("menampilkan tanda hubung untuk teks yang bukan tanggal", () => {
    // Snapshot bisa ditulis tangan, dan satu karakter salah akan tampil
    // sebagai "Invalid Date" di panel.
    expect(loginTerakhir("kemarin")).toBe("-");
  });
});
