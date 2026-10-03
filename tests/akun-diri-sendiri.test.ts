import { describe, expect, it } from "vitest";
import { hakAksesDiriSendiri, type AccountPatch } from "@/server/admin/accounts";

/**
 * Penjaga perubahan hak akses pada akun sendiri.
 *
 * Fungsi ini murni dan diuji langsung, bukan lewat `updateAccount`, karena
 * pemanggilannya butuh database sementara aturan yang dilindunginya justru
 * aturan sederhana: kalau target adalah pemanggil sendiri, `role` dan
 * `is_active` tidak boleh ikut.
 *
 * Ujinya penting karena aturan ini menutup jalan keluar yang tidak terlihat.
 * Menonaktifkan akun sendiri menaikkan `session_version`, jadi sesi ikut mati
 * pada saat yang sama, dan `credentialsByEmail` menyaring `AND is_active`
 * sehingga login berikutnya mustahil. Perbaikannya juga lewat route yang sama,
 * jadi tidak ada jalan kembali.
 */

// Huruf heksadesimal yang benar-benar berubah saat huruf besarnya diubah.
// UUID yang hanya berisi angka akan lolos dari uji huruf besar tanpa alasan.
const SAYA = "a1b2c3d4-1111-4111-8111-abcdefabcdef";
const LAIN = "f0e1d2c3-2222-4222-8222-fedcbafedcba";

function patch(sebagian: AccountPatch): AccountPatch {
  return sebagian;
}

describe("hakAksesDiriSendiri", () => {
  it("menolak perubahan peran pada akun sendiri", () => {
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), SAYA, SAYA)).toBe(true);
    expect(hakAksesDiriSendiri(patch({ role: "super_admin" }), SAYA, SAYA)).toBe(true);
  });

  it("menolak perubahan status aktif pada akun sendiri", () => {
    expect(hakAksesDiriSendiri(patch({ is_active: false }), SAYA, SAYA)).toBe(true);
    expect(hakAksesDiriSendiri(patch({ is_active: true }), SAYA, SAYA)).toBe(true);
  });

  it("membolehkan perubahan nama sendiri", () => {
    // Nama tidak menyentuh hak akses, jadi tidak memutus sesi dan tidak bisa
    // mengunci diri sendiri.
    expect(hakAksesDiriSendiri(patch({ name: "Nama Baru" }), SAYA, SAYA)).toBe(false);
  });

  it("membolehkan perubahan surel sendiri", () => {
    expect(hakAksesDiriSendiri(patch({ email: "baru@contoh.id" }), SAYA, SAYA)).toBe(false);
  });

  it("membolehkan patch kosong pada akun sendiri", () => {
    expect(hakAksesDiriSendiri(patch({}), SAYA, SAYA)).toBe(false);
  });

  it("membolehkan semua perubahan pada akun orang lain", () => {
    // Inilah yang ditolak kalau target sama dengan pemanggil. Mengubah peran
    // atau status aktif orang lain memang tugas panel; penjaga super admin
    // ada di tempat lain dan tidak berkaitan dengan ini.
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), LAIN, SAYA)).toBe(false);
    expect(hakAksesDiriSendiri(patch({ is_active: false }), LAIN, SAYA)).toBe(false);
    expect(
      hakAksesDiriSendiri(patch({ role: "front_office", is_active: false }), LAIN, SAYA),
    ).toBe(false);
  });

  it("membedakan patch yang tidak mengirim peran dari yang mengirimnya", () => {
    // `null` berarti panel tidak mengirim field itu sama sekali, jadi bukan
    // permintaan perubahan peran. Menganggapnya sebagai perubahan akan
    // menolak patch yang sah tanpa alasan.
    expect(hakAksesDiriSendiri(patch({ role: null }), SAYA, SAYA)).toBe(false);
    expect(hakAksesDiriSendiri(patch({ is_active: null }), SAYA, SAYA)).toBe(false);
  });

  it("menangkap akun sendiri yang ditulis dengan huruf besar", () => {
    // Ini lubang nyata, bukan kasus tepi. `uuid()` mengembalikan string dari
    // URL apa adanya, sedangkan `sub` pada token berasal dari database yang
    // selalu huruf kecil. Tanpa perbandingan huruf-kecil semua, panel yang
    // mengirim UUID huruf besar akan melewati penjaga ini lalu tetap mengenai
    // baris yang sama, karena PostgreSQL tidak membedakan huruf besar dan kecil
    // pada uuid.
    expect(hakAksesDiriSendiri(patch({ is_active: false }), SAYA.toUpperCase(), SAYA)).toBe(
      true,
    );
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), SAYA, SAYA.toUpperCase())).toBe(
      true,
    );
  });

  it("tetap membedakan akun yang berbeda meski hurufnya mirip", () => {
    // Normalisasi huruf besar tidak boleh membuat dua id berbeda dianggap sama.
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), LAIN, SAYA)).toBe(false);
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), LAIN.toUpperCase(), SAYA)).toBe(
      false,
    );
    // Spasi di awal atau di akhir juga membuat id itu berbeda; `uuid()` sudah
    // memangkas, jadi ini hanya memastikan perbandingan tidak ceroboh.
    expect(hakAksesDiriSendiri(patch({ role: "front_office" }), `${SAYA} `, SAYA)).toBe(
      false,
    );
  });
});