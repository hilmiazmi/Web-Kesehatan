import { afterEach, describe, expect, it, vi } from "vitest";
import { validate, type Fields } from "@/components/forms/registration-form";

/**
 * Aturan validasi formulir.
 *
 * `validate` sengaja diuji sebagai fungsi murni. Dulu aturan ini pernah
 * ditolak semua waktu karena pemanggilnya lupa memasang hasil ke state, jadi
 * tidak ada satu pun tes yang menyentuh kode ini sebelum ini.
 */

/** Tanggal dalam waktu setempat, bukan UTC. Lihat catatan di bawah. */
function tanggalSetempat(offsetHari = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetHari);
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

const BESOK = tanggalSetempat(1);

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

afterEach(() => {
  vi.useRealTimers();
});

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
    expect(validate({ ...SAH, tanggal: tanggalSetempat(-1) }).tanggal).toBeTruthy();
  });

  it("menerima tanggal hari ini dan sesudahnya", () => {
    expect(validate({ ...SAH, tanggal: tanggalSetempat(0) }).tanggal).toBeUndefined();
    expect(validate({ ...SAH, tanggal: BESOK }).tanggal).toBeUndefined();
  });

  /*
   * Dua tes di bawah dikunci ke jam palsu karena bug-nya cuma muncul di
   * jendela tujuh jam. WIB tujuh jam di depan UTC, jadi antara 00:00 dan 06:59
   * waktu setempat, `toISOString()` masih memberi tanggal kemarin. Dengan
   * implementasi lamanya, booking kemarin lolos di jam-jam itu saja, jadi tes
   * yang memakai jam sebenarnya bisa lulus selama bertahun-tahun tanpa pernah
   * menyentuh jalurnya.
   */
  it("menolak kemarin antara pukul 00.00 dan 06.59 waktu setempat", () => {
    // 2026-03-10T21:30:00Z = 2026-03-11 04:30 WIB. Tanggal UTC masih 10 Maret.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T21:30:00Z"));

    expect(validate({ ...SAH, tanggal: "2026-03-10" }).tanggal).toBeTruthy();
    expect(validate({ ...SAH, tanggal: "2026-03-11" }).tanggal).toBeUndefined();
  });

  it("tetap memakai tanggal setempat, bukan UTC, di detik pertama hari", () => {
    // 2026-03-10T17:00:00Z = 2026-03-11 00:00 WIB, detik pertama hari baru.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T17:00:00Z"));

    expect(validate({ ...SAH, tanggal: "2026-03-11" }).tanggal).toBeUndefined();
    expect(validate({ ...SAH, tanggal: "2026-03-10" }).tanggal).toBeTruthy();
  });

  it("meharuskan persetujuan dicentang", () => {
    expect(validate({ ...SAH, setuju: false }).setuju).toBeTruthy();
  });

  it("mengembalikan pesan dalam bahasa Indonesia", () => {
    const e = validate({ ...SAH, nik: "1" });
    expect(e.nik).toMatch(/NIK/);
  });
});