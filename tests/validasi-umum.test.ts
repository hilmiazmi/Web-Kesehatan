import { describe, expect, it } from "vitest";
import {
  surelValid,
  teleponBersih,
  teleponFormValid,
  teleponServerValid,
} from "@/lib/validasi-umum";

/**
 * Aturan validasi yang dipakai bersama.
 *
 * Sebelum berkas ini ada, setiap formulir menulis polanya sendiri. Dua di
 * antaranya berbeda dari server pada kasus yang sama, dan itu menghasilkan
 * keluhan yang paling sulit dilacak: formulir menerima isian, tombol kirim
 * jalan, baru server menolaknya. Yang salah tidak pernah bisa ditemukan dari
 * layar karena penjelasannya ada di sisi lain.
 *
 * Yang dikunci di sini adalah hubungan antar aturan, bukan hanya kasus
 * tunggal. Yang penting bukan "email sah diterima", tapi "apa yang diterima
 * formulir tidak bisa ditolak server".
 */

describe("surelValid", () => {
  it("menerima alamat biasa", () => {
    expect(surelValid("budi@contoh.test")).toBe(true);
    expect(surelValid("budi.santoso+tag@sub.contoh.go.id")).toBe(true);
    expect(surelValid("a-b@c-d.test")).toBe(true);
  });

  it("menolak bentuk yang bentuknya salah", () => {
    // Semua kasus ini berbeda: ada yang lolos regex lama di formulir lalu
    // ditolak server, jadi pengguna baru tahu setelah menunggu.
    expect(surelValid("budi..@contoh.test")).toBe(false);
    expect(surelValid("budi@-contoh.test")).toBe(false);
    expect(surelValid("budi@contoh-.test")).toBe(false);
    expect(surelValid("budi@contoh.test.")).toBe(false);
    expect(surelValid("dua@@at.test")).toBe(false);
    expect(surelValid("tanpa-at.test")).toBe(false);
    expect(surelValid("tanpa-titik@contoh")).toBe(false);
  });

  it("menolak isian yang mengandung spasi", () => {
    expect(surelValid("budi @contoh.test")).toBe(false);
    expect(surelValid("budi@con toh.test")).toBe(false);
  });

  it("menolak bagian lokal yang terlalu panjang", () => {
    expect(surelValid(`${"a".repeat(64)}@contoh.test`)).toBe(true);
    expect(surelValid(`${"a".repeat(65)}@contoh.test`)).toBe(false);
  });

  it("menolak bagian lokal yang lebih panjang dari batas", () => {
    // Batas lokal 64 karakter mengikuti aturan yang dipakai server. Angka ini
    // diukur dari panjang lokal saja, bukan dari panjang seluruh alamat.
    expect(surelValid(`${"a".repeat(64)}@contoh.test`)).toBe(true);
    expect(surelValid(`${"a".repeat(65)}@contoh.test`)).toBe(false);
  });

  it("menolak domain yang lebih panjang dari batas", () => {
    // Batas domain sama dengan batas panjang seluruh alamat, 255 karakter.
    expect(surelValid(`budi@cont${"o".repeat(50)}.test`)).toBe(true);
    expect(surelValid(`budi@cont${"o".repeat(260)}.test`)).toBe(false);
  });

  it("tidak menerima label domain kosong", () => {
    // `contoh..test` punya label kosong di tengah. Regex lama di formulir
    // menerimanya karena `[.]@]` boleh cocok ke bagian manapun.
    expect(surelValid("budi@contoh..test")).toBe(false);
  });
});

describe("teleponFormValid dan teleponServerValid", () => {
  it("sisi formulir menerima nomor Indonesia", () => {
    expect(teleponFormValid("081234567890")).toBe(true);
    expect(teleponFormValid("+6281234567890")).toBe(true);
    expect(teleponFormValid("628123456789")).toBe(true);
    expect(teleponFormValid("0812 3456-7890")).toBe(true);
  });

  it("sisi formulir menolak nomor yang tidak berawalan benar", () => {
    expect(teleponFormValid("9912345678")).toBe(false);
    expect(teleponFormValid("1234")).toBe(false);
  });

  it("sisi server menerima nomor yang bentuknya kurang wajar", () => {
    // Ini sengaja longgar: nomor yang sudah tersimpan seharusnya tetap bisa
    // dibaca daripada tertolak setiap kali direkap.
    expect(teleponServerValid("9912345678")).toBe(true);
  });

  it("apa pun yang lolos formulir juga lolos server", () => {
    // Ini batas yang benar-benar dijaga. Kalau server mengetatkan bentuk
    // awalan, kasus di bawah jangan sampai berubah menjadi tolakan.
    const sekala = [
      "081234567890",
      "+6281234567890",
      "628123456789",
      "0812 3456-7890",
      "0812345678901",
    ];
    for (const n of sekala) {
      if (teleponFormValid(n)) expect(teleponServerValid(n), n).toBe(true);
    }
  });

  it("teleponBersih membuat dua penulisan nomor sama cocok", () => {
    expect(teleponBersih("0812 3456-7890")).toBe("081234567890");
    // Tanda `+` ikut hilang karena yang dibersihkan adalah untuk pemeriksaan
    // bentuk, bukan untuk disimpan. Nomor yang tersimpan tetap apa adanya.
    expect(teleponBersih("+62 (812) 3456-7890")).toBe("6281234567890");
    expect(teleponServerValid("0812 3456-7890")).toBe(true);
  });
});
