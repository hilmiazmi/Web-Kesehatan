import { describe, expect, it } from "vitest";
import { sudahTampil } from "@/lib/terungkap";

/**
 * Aturan "sudah masuk viewport" milik komponen `Terungkap`.
 *
 * Yang perlu dijamin bukan perilaku peramban (itu tugas E2E manual), tapi
 * keputusan angkanya: elemen yang belum terlihat tidak boleh dihitung
 * tampil, dan elemen tinggi yang lebih besar dari viewport tetap dianggap
 * tampil karena sebagian besarnya terlihat.
 */

describe("sudahTampil", () => {
  it("false kalau belum bersinggungan", () => {
    expect(sudahTampil([{ isIntersecting: false, intersectionRatio: 0 }])).toBe(false);
  });

  it("false kalau bersinggungan tapi nol piksel", () => {
    // Rasio 0 dengan isIntersecting: keadaan sementara saat elemen tepat di
    // batas. Tidak dihitung tampil supaya tidak memicu sebelum waktanya.
    expect(sudahTampil([{ isIntersecting: true, intersectionRatio: 0 }])).toBe(false);
  });

  it("true untuk satu piksel pun yang terlihat", () => {
    // Kebalikan dari tes di atas: begitu ada bagian yang terlihat, elemen
    // muncul. Lihat catatan `AMBANG` di komponen soal elemen tinggi.
    expect(sudahTampil([{ isIntersecting: true, intersectionRatio: 0.01 }])).toBe(true);
  });

  it("true untuk elemen yang lebih tinggi dari viewport", () => {
    // Kartu tinggi di ponsel pendek: rasio maksimumnya kecil, tapi isinya
    // jelas terlihat. Aturan ambang rasio akan membuat elemen begini tidak
    // pernah muncul sama sekali.
    expect(sudahTampil([{ isIntersecting: true, intersectionRatio: 0.08 }])).toBe(true);
  });

  it("true kalau salah satu pengamatan lolos", () => {
    expect(
      sudahTampil([
        { isIntersecting: false, intersectionRatio: 0 },
        { isIntersecting: true, intersectionRatio: 0.3 },
      ]),
    ).toBe(true);
  });

  it("false untuk daftar kosong", () => {
    expect(sudahTampil([])).toBe(false);
  });
});
