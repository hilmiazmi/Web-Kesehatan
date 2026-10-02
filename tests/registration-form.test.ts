import { describe, expect, it } from "vitest";
import { validate, type Fields } from "@/components/forms/registration-form";

/**
 * Aturan validasi formulir.
 *
 * `validate` sengaja diuji sebagai fungsi murni. Dulu aturan ini pernah
 * ditolak semua waktu karena pemanggilnya lupa memasang hasil ke state, jadi
 * tidak ada satu pun tes yang menyentuh kode ini sebelum ini.
 */

const BESOK = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const SAH: Fields = {
  nama: "Budi Santoso",
  nik: "3201234567890123",
  telepon: "081234567890",
  email: "budi@contoh.id",
  spesialisasi: "Jantung",
  tanggal: BESOK,
  metode: "jkn",
  setuju: true,
};

describe("validate", () => {
  it("menerima data yang lengkap dan benar", () => {
    expect(validate(SAH)).toEqual({});
  });

  it("menolak formulir kosong di seluruh field", () => {
    const kosong: Fields = {
      nama: "",
      nik: "",
      telepon: "",
      email: "",
      spesialisasi: "",
      tanggal: "",
      metode: "jkn",
      setuju: false,
    };
    const e = validate(kosong);
    // Semua field wajib terisi, metode punya nilai bawaan jadi tidak ikut.
    expect(Object.keys(e).sort()).toEqual(
      ["email", "nama", "nik", "setuju", "spesialisasi", "tanggal", "telepon"].sort(),
    );
  });

  it("menolak NIK yang bukan 16 digit", () => {
    expect(validate({ ...SAH, nik: "123" }).nik).toBeTruthy();
    expect(validate({ ...SAH, nik: "32012345678901234" }).nik).toBeTruthy();
    expect(validate({ ...SAH, nik: "32012345678901a" }).nik).toBeTruthy();
  });

  it("menerima NIK 16 digit", () => {
    expect(validate({ ...SAH, nik: "3201234567890123" }).nik).toBeUndefined();
  });

  it("menolak email tanpa tanda @! atau domain", () => {
    expect(validate({ ...SAH, email: "bukan-email" }).email).toBeTruthy();
    expect(validate({ ...SAH, email: "budi@localhost" }).email).toBeTruthy();
    expect(validate({ ...SAH, email: "budi@contoh.id" }).email).toBeUndefined();
  });

  it("menolak nama yang hanya spasi", () => {
    expect(validate({ ...SAH, nama: "   " }).nama).toBeTruthy();
  });

  it("menolak nama di bawah 3 karakter", () => {
    expect(validate({ ...SAH, nama: "Bu" }).nama).toBeTruthy();
  });

  it("menerima nomor telepon Indonesia", () => {
    expect(validate({ ...SAH, telepon: "081234567890" }).telepon).toBeUndefined();
    expect(validate({ ...SAH, telepon: "+6281234567890" }).telepon).toBeUndefined();
    expect(validate({ ...SAH, telepon: "0812 3456-7890" }).telepon).toBeUndefined();
  });

  it("menolak nomor telepon yang tidak masuk akal", () => {
    expect(validate({ ...SAH, telepon: "12345" }).telepon).toBeTruthy();
  });

  it("menolak tanggal yang sudah lewat", () => {
    const kemarin = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    expect(validate({ ...SAH, tanggal: kemarin }).tanggal).toBeTruthy();
  });

  it("menerima tanggal hari ini dan sesudahnya", () => {
    const hariIni = new Date().toISOString().slice(0, 10);
    expect(validate({ ...SAH, tanggal: hariIni }).tanggal).toBeUndefined();
    expect(validate({ ...SAH, tanggal: BESOK }).tanggal).toBeUndefined();
  });

  it("meharuskan persetujuan dicentang", () => {
    expect(validate({ ...SAH, setuju: false }).setuju).toBeTruthy();
  });

  it("mengembalikan pesan dalam bahasa Indonesia", () => {
    const e = validate({ ...SAH, nik: "1" });
    expect(e.nik).toMatch(/NIK/);
  });
});