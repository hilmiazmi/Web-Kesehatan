import { describe, expect, it } from "vitest";
import { saring, satuHalaman } from "@/server/api/snapshot-query";

/**
 * Fungsi di sini menutup celah yang tidak terlihat dari luar: pada mode
 * `API_MODE=snapshot`, kueri SQL tidak pernah jalan, sehingga filter dan
 * pemotongan halaman yang biasanya dikerjakan `WHERE` dan `LIMIT` tidak ada
 * siapa yang kerjakan. Tanpa fungsi ini, `?category=kerjasama` dijawab 200
 * dengan seluruh isi tabel dan tidak ada yang bisa membedakan jawaban benar
 * dari jawaban salah.
 *
 * Karena itu yang diuji bukan hanya "saring menyaring", tapi juga kesamaan
 * nilai harus persis, sama seperti `=` di SQL. Pencocokan sebagian atau
 * pencocokan longgar akan terlihat benar di mode pratinjau dan salah di
 * produksi, dan itu arah kesalahan yang paling mahal.
 */

/** Dua bentuk yang ada di `snapshot/`: satu daftar polos, satu amplop. */
const DAFTAR = [
  { slug: "a", category: "kegiatan", published_at: "2026-10-01" },
  { slug: "b", category: "pelayanan", published_at: "2026-09-28" },
  { slug: "c", category: "kerjasama", published_at: "2026-09-25" },
  { slug: "d", category: "kerjasama", published_at: "2026-09-20" },
];

const AMPLOP = { items: DAFTAR, total: 4, page: 1, page_size: 100, pages: 1 };

describe("saring", () => {
  it("membaca daftar polos dan amplop{items} tanpa dibedakan", () => {
    expect(saring(DAFTAR, {})).toHaveLength(4);
    expect(saring(AMPLOP, {})).toHaveLength(4);
  });

  it("tanpa syarat aktif, semua baris dikembalikan", () => {
    // `null` berarti "jangan saring kolom ini", dan itu harus benar-benar
    // melewati penyaringan, bukan mencocokkan baris dengan null.
    expect(saring(DAFTAR, { category: null })).toHaveLength(4);
  });

  it("menyaring dengan kesamaan nilai persis", () => {
    const hasil = saring<{ slug: string }>(DAFTAR, { category: "kerjasama" });
    expect(hasil.map((b) => b.slug)).toEqual(["c", "d"]);
  });

  it("tidak cocok sebagian", () => {
    // SQL memakai `=`, bukan `ILIKE`. Kalau ini berubah jadi mencocokkan
    // sebagian, filter di produksi ikut berubah dan keduanya harus diubah
    // bersamaan.
    expect(saring(DAFTAR, { category: "kerja" })).toEqual([]);
    expect(saring(DAFTAR, { category: "KERJASAMA" })).toEqual([]);
  });

  it("tidak melonggarkan tipe nilai", () => {
    expect(saring([{ tahun: 2026 }], { tahun: "2026" })).toEqual([]);
  });

  it("hasil kosong adalah jawaban benar, bukan tabel penuh", () => {
    // Ini yang paling merusak kalau salah: kategori yang memang tidak ada
    // harus mengembalikan nol, bukan seluruh isi tabel.
    expect(saring(DAFTAR, { category: "tidak-ada" })).toEqual([]);
  });

  it("muatan yang bukan daftar tidak membuat galat", () => {
    expect(saring(null, {})).toEqual([]);
    expect(saring("teks", {})).toEqual([]);
    expect(saring({ items: "bukan-daftar" }, {})).toEqual([]);
  });
});

describe("satuHalaman", () => {
  it("memotong sesuai limit dan offset", () => {
    const hasil = satuHalaman<{ slug: string }>(DAFTAR, {}, { limit: 2, offset: 0 });
    expect(hasil.items.map((b) => b.slug)).toEqual(["a", "b"]);
    expect(hasil.total).toBe(4);
  });

  it("halaman kedua bukan ulangan halaman pertama", () => {
    // Gejala bug yang sebenarnya: `?page=2` mencytak ulang isi `?page=1`.
    const hasil = satuHalaman<{ slug: string }>(DAFTAR, {}, { limit: 2, offset: 2 });
    expect(hasil.items.map((b) => b.slug)).toEqual(["c", "d"]);
  });

  it("total dihitung setelah penyaringan dan sebelum pemotongan", () => {
    // Kalau total diambil dari `items`, halaman kedua melaporkan total sebesar
    // ukuran halamannya dan jumlah halaman ikut salah.
    const hasil = satuHalaman(DAFTAR, { category: "kerjasama" }, { limit: 1, offset: 0 });
    expect(hasil.total).toBe(2);
    expect(hasil.items).toHaveLength(1);
  });

  it("offset melewati ujung menghasilkan items kosong dengan total benar", () => {
    const hasil = satuHalaman(DAFTAR, {}, { limit: 5, offset: 99 });
    expect(hasil.items).toEqual([]);
    expect(hasil.total).toBe(4);
  });

  it("amplop articles juga terpakai", () => {
    const hasil = satuHalaman(AMPLOP, {}, { limit: 3, offset: 0 });
    expect(hasil.items).toHaveLength(3);
    expect(hasil.total).toBe(4);
  });
});