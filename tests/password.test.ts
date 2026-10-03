import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  hashPassword,
  periksaKataSandi,
  verifyPassword,
} from "@/server/auth/password";
import { Errors } from "@/server/validation";

/**
 * Dua fungsi di sini `async` dan hasilnya harus selalu di-`await`.
 *
 * `Promise` selalu bernilai benar, jadi `if (!verifyPassword(a, b))` tidak
 * pernah menolak apa pun: setiap kata sandi diterima. Test di bawah ditulis ulang
 * untuk mengunci kebenarannya, bukan hanya kebenaran hasil hash-nya.
 */

describe("hashPassword dan verifyPassword", () => {
  it("menerima kata sandi yang benar", async () => {
    const hash = await hashPassword("KunciUjiLokal123!");
    expect(await verifyPassword("KunciUjiLokal123!", hash)).toBe(true);
  });

  it("menolak kata sandi yang salah", async () => {
    const hash = await hashPassword("KunciUjiLokal123!");
    expect(await verifyPassword("KunciUjiLokal123", hash)).toBe(false);
    expect(await verifyPassword("kunciujilokal123!", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("menyimpan dua hash berbeda untuk kata sandi yang sama", async () => {
    // Salt acak: dua admin dengan kata sandi yang sama tidak boleh punya hash
    // yang sama, kalau tidak satu hash yang bocor langsung membuka keduanya.
    const a = await hashPassword("KunciUjiLokal123!");
    const b = await hashPassword("KunciUjiLokal123!");

    expect(a).not.toBe(b);
    expect(await verifyPassword("KunciUjiLokal123!", a)).toBe(true);
    expect(await verifyPassword("KunciUjiLokal123!", b)).toBe(true);
  });

  it("tidak pernah menyimpan kata sandi dalam bentuk apa pun", async () => {
    const hash = await hashPassword("KunciUjiLokal123!");
    expect(hash).not.toContain("KunciUjiLokal123!");
  });

  it("memakai bentuk yang memuat parameter biaya", async () => {
    // Parameter ditulis di dalam string supaya bisa dinaikkan tanpa membuat
    // hash lama otomatis tidak terbaca.
    const hash = await hashPassword("KunciUjiLokal123!");
    const bagian = hash.split("$");

    expect(bagian).toHaveLength(6);
    expect(bagian[0]).toBe("scrypt");
    expect(Number(bagian[1])).toBeGreaterThanOrEqual(16_384);
  });

  it("menormalkan bentuk unicode sebelum mem-hash", async () => {
    // Satu orang bisa mengetik kata sandi yang sama dengan dua bentuk ejaan
    // berbeda. Tanpa normalisasi, dia tidak akan bisa masuk dengan kata sandi
    // yang dia buat sendiri.
    const hash = await hashPassword("KunciUjiLokal123!\u0301");
    expect(await verifyPassword("KunciUjiLokal123!\u0301", hash)).toBe(true);
  });

  it("menganggap hash rusak sebagai tidak cocok, bukan melempar galat", async () => {
    // Baris admin bisa dibuat di luar aplikasi. Melempar di sini akan membuat
    // satu baris rusak membuat orang tidak bisa login dengan cara yang
    // tidak bisa dijelaskan.
    for (const rusak of [
      "",
      "bukan-hash",
      "scrypt$1$2$3",
      "argon2id$16384$8$1$c2FsdA$aGFzaA",
      "scrypt$16384$8$1$!!!!$aGFzaA",
    ]) {
      expect(await verifyPassword("apa saja", rusak)).toBe(false);
    }
  });

  it("menolak hash yang panjangnya tidak sesuai", async () => {
    const hash = await hashPassword("KunciUjiLokal123!");
    const bagian = hash.split("$");
    bagian[5] = Buffer.from("terlalu pendek").toString("base64");

    expect(await verifyPassword("KunciUjiLokal123!", bagian.join("$"))).toBe(false);
  });
});

describe("periksaKataSandi", () => {
  it("menerima kata sandi yang cukup panjang", () => {
    const errors = new Errors();
    expect(periksaKataSandi(errors, "KunciUjiLokal123!")).not.toBeNull();
    expect(errors.isEmpty).toBe(true);
  });

  it("menolak kata sandi pendek", () => {
    const errors = new Errors();
    expect(periksaKataSandi(errors, "Pendek")).toBeNull();
    expect(errors.entries().next().value).toEqual([
      "password",
      `Kata sandi minimal ${PASSWORD_MIN} karakter.`,
    ]);
  });

  it("menolak kata sandi yang hanya spasi", () => {
    // Panjangnya cukup, tapi isinya tidak menjalankan apa pun. Mengukur panjang
    // saja akan menerima ini.
    const spasi = "            ";
    const errors = new Errors();

    expect(periksaKataSandi(errors, spasi)).toBeNull();
    expect([...errors.entries()][0][1]).toContain("spasi");
  });

  it("menolak kata sandi yang terlalu panjang", () => {
    const errors = new Errors();
    expect(periksaKataSandi(errors, "a".repeat(PASSWORD_MAX + 1))).toBeNull();
    expect([...errors.entries()][0][1]).toContain(String(PASSWORD_MAX));
  });

  it("menghitung panjang dalam karakter, bukan byte", () => {
    // Huruf seperti "é" dua byte. Menghitung byte membuat kata sandi non-Latin
    // dengan bentuk yang wajar ditolak.
    const errors = new Errors();
    const cukup = "é".repeat(PASSWORD_MIN);

    expect(periksaKataSandi(errors, cukup)).not.toBeNull();
    expect(errors.isEmpty).toBe(true);
  });

  it("mengumpulkan galat, bukan melempar", () => {
    // Pemanggil menggabungkan pesan dari beberapa field ke satu respons.
    // Melempar di tengah pemeriksaan lain membuat panel menampilkan satu pesan
    // pada satu waktu.
    const errors = new Errors();
    expect(() => periksaKataSandi(errors, "")).not.toThrow();
    expect(errors.isEmpty).toBe(false);
  });
});
