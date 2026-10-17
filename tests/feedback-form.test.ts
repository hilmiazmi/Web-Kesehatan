import { describe, expect, it } from "vitest";
import {
  buildPayload,
  petakanKolomServer,
  validate,
} from "@/components/forms/feedback-form";

/**
 * Formulir kritik dan saran.
 *
 * `validate` diuji sebagai fungsi murni, sama seperti formulir pendaftaran dan
 * rawat inap: aturannya pernah hilang tanpa ada tes yang gagal karena tidak
 * ada yang memanggilnya.
 *
 * Yang paling penting diuji di sini adalah `buildPayload`. Field opsional
 * yang dikirim sebagai string kosong tidak sama dengan tidak dikirim: server
 * membaca `""` sebagai "tidak diisi" untuk sebagian field, tapi field yang
 * punya nilai bawaan, seperti `feedback_type`, akan memakai nilai bawaan itu
 * kalau isinya tidak ada. Jadi nama field yang tidak dikirim ikut diuji.
 */

const SAH = {
  jenis: "complaint",
  subjek: "Loket pendaftaran",
  pesan: "Antrean di loket pendaftaran terlalu lama dan tidak ada kursi tunggu.",
  unit: "Loket Pendaftaran",
  nama: "",
  surel: "",
  telepon: "",
  website: "",
};

describe("validate formulir kritik", () => {
  it("menerima pesan tanpa nama, surel, maupun telepon", () => {
    // Ketiga isian identitas sengaja opsional. Keluhan yang paling berguna
    // sering datang dari orang yang tidak mau dikethui identified.
    expect(validate(SAH)).toEqual({});
  });

  it("menolak pesan kosong dan terlalu pendek", () => {
    expect(validate({ ...SAH, pesan: "" }).pesan).toBeTruthy();
    expect(validate({ ...SAH, pesan: "buruk" }).pesan).toBeTruthy();
    expect(validate({ ...SAH, pesan: "a".repeat(9) }).pesan).toBeTruthy();
    expect(validate({ ...SAH, pesan: "a".repeat(10) }).pesan).toBeUndefined();
  });

  it("menolak pesan yang melebihi batas server", () => {
    // Batasnya 5000 karakter di server. Kalau formulir tidak menjeganya,
    // orang menemukan penolakan setelah mengetik lima ribu karakter.
    expect(validate({ ...SAH, pesan: "a".repeat(5001) }).pesan).toBeTruthy();
    expect(validate({ ...SAH, pesan: "a".repeat(5000) }).pesan).toBeUndefined();
  });

  it("hanya memeriksa surel kalau diisi", () => {
    expect(validate({ ...SAH, surel: "" }).surel).toBeUndefined();
    expect(validate({ ...SAH, surel: "bukan-surel" }).surel).toBeTruthy();
    expect(validate({ ...SAH, surel: "pelapor@contoh.test" }).surel).toBeUndefined();
  });

  it("hanya memeriksa telepon kalau diisi", () => {
    expect(validate({ ...SAH, telepon: "" }).telepon).toBeUndefined();
    expect(validate({ ...SAH, telepon: "123" }).telepon).toBeTruthy();
    expect(validate({ ...SAH, telepon: "0812 3456-7890" }).telepon).toBeUndefined();
  });
});

describe("buildPayload kritik dan saran", () => {
  it("mengirim jenis pesan dan isi pesan", () => {
    const body = buildPayload(SAH);
    expect(body["feedback_type"]).toBe("complaint");
    expect(body["message"]).toBe(SAH.pesan);
  });

  it("tidak mengirim field opsional yang kosong", () => {
    const body = buildPayload(SAH);
    // Field yang tidak dikirim tidak boleh muncul sama sekali, bukan dikirim
    // sebagai string kosong.
    expect(body).not.toHaveProperty("name");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("phone");
  });

  it("memotong spasi di sekeliling nilai", () => {
    const body = buildPayload({ ...SAH, pesan: "  ada spasi  ", nama: "  Budi  " });
    expect(body["message"]).toBe("ada spasi");
    expect(body["name"]).toBe("Budi");
  });

  it("tetap mengirim kolom perangkap bot", () => {
    // `website` ikut dikirim supaya honeypot di server bekerja. Kalau tidak,
    // kolom perangkap bot berubah jadi isian yang tidak pernah dibaca.
    expect(buildPayload({ ...SAH, website: "" })["website"]).toBe("");
    expect(buildPayload({ ...SAH, website: "https://spam.test" })["website"]).toBe(
      "https://spam.test",
    );
  });
});

describe("petakanKolomServer", () => {
  it("mengubah nama kolom server ke nama field formulir", () => {
    const hasil = petakanKolomServer({ message: "Pesan terlalu pendek.", email: "Format salah." });
    expect(hasil.pesan).toBe("Pesan terlalu pendek.");
    expect(hasil.surel).toBe("Format salah.");
  });

  it("membuang nama kolom yang tidak dikenal", () => {
    // Kolom yang tidak dipetakan harus dibuang, bukan masuk ke hasil dengan
    // nilai `undefined` yang nanti dirender sebagai pesan kosong.
    const hasil = petakanKolomServer({ tidak_dikenal: "Pesan." });
    expect(hasil).toEqual({});
  });
});
