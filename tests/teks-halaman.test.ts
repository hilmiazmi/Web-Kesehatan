import { describe, expect, it } from "vitest";
import { gabungTeks, teksBlok } from "@/data/halaman";
import type { BlokHalaman } from "@/data/halaman";

/**
 * Tes pengekstrak teks baca-nyaring halaman generik.
 *
 * Yang dikunci di sini bukan tata bahasa, melainkan isi yang boleh dan tidak
 * boleh terdengar: teks yang tampak dibacakan, sedangkan ikon, tautan, dan
 * alamat berkas foto tidak. Semua jenis blok di `types.ts` punya wakilnya;
 * kalau ada jenis baru yang lupa ditangani, hasilnya akan terlihat di sini.
 */
describe("teksBlok", () => {
  it("menggabungkan paragraf dan subjudul sesuai urutan", () => {
    const blok: BlokHalaman[] = [
      { jenis: "sub", teks: "Judul Bagian" },
      { jenis: "paragraf", teks: "Paragraf pertama." },
      { jenis: "sub-kecil", teks: "Judul Kecil" },
    ];
    expect(teksBlok(blok)).toBe(
      "Judul Bagian\nParagraf pertama.\nJudul Kecil",
    );
  });

  it("membaca judul dan seluruh butir daftar serta langkah", () => {
    expect(
      teksBlok([
        { jenis: "daftar", judul: "Syarat", butir: ["KTP", "Kartu peserta"] },
        { jenis: "langkah", butir: ["Daftar", "Verifikasi"] },
      ]),
    ).toBe("Syarat\nKTP\nKartu peserta\nDaftar\nVerifikasi");
  });

  it("menggabungkan istilah dan penjelasan daftar tebal", () => {
    expect(
      teksBlok([
        {
          jenis: "daftar-tebal",
          butir: [{ tebal: "Poli Anak", isi: "Melayani usia 0-18 tahun." }],
        },
      ]),
    ).toBe("Poli Anak. Melayani usia 0-18 tahun.");
  });

  it("membaca judul, kolom, isi, dan catatan tabel", () => {
    expect(
      teksBlok([
        {
          jenis: "tabel",
          judul: "Jam Besuk",
          kolom: ["Hari", "Jam"],
          baris: [
            ["Senin", "10.00"],
            ["Rabu", "10.00"],
          ],
          catatan: "Diperbarui setiap bulan.",
        },
      ]),
    ).toBe(
      "Jam Besuk\nHari, Jam\nSenin, 10.00\nRabu, 10.00\nDiperbarui setiap bulan.",
    );
  });

  it("tidak membacakan ikon dan tautan pada blok kartu", () => {
    const hasil = teksBlok([
      {
        jenis: "kartu",
        butir: [
          {
            ikon: "bi-heart-pulse",
            judul: "Jantung",
            isi: "Layanan jantung.",
            href: "/pelayanan/medis/jantung",
          },
        ],
      },
    ]);
    expect(hasil).toBe("Jantung. Layanan jantung.");
    expect(hasil).not.toContain("bi-heart-pulse");
    expect(hasil).not.toContain("/pelayanan/medis/jantung");
  });

  it("membaca nilai statistik beserta catatannya", () => {
    expect(
      teksBlok([
        {
          jenis: "statistik",
          butir: [{ label: "Ruang rawat", nilai: "42" }],
          catatan: "Data demo.",
        },
      ]),
    ).toBe("42 Ruang rawat\nData demo.");
  });

  it("tidak membacakan alamat berkas foto pada galeri", () => {
    const hasil = teksBlok([
      {
        jenis: "galeri",
        judul: "Galeri",
        foto: [{ src: "/foto/gedung.jpg", alt: "Gedung utama" }],
        ket: "Foto kegiatan.",
      },
    ]);
    expect(hasil).toBe("Galeri\nFoto kegiatan.");
    expect(hasil).not.toContain("gedung.jpg");
  });

  it("membaca judul, keterangan, dan label blok tautan tanpa href", () => {
    const hasil = teksBlok([
      {
        jenis: "tautan",
        judul: "Formulir",
        label: "Unduh Formulir",
        href: "/dokumen/formulir.ppd",
        ket: "Berkas PDF, 120 KB.",
      },
    ]);
    expect(hasil).toBe("Formulir\nBerkas PDF, 120 KB.\nUnduh Formulir");
    expect(hasil).not.toContain("/dokumen/formulir.ppd");
  });

  it("membaca judul dan keterangan tautan anak serta catatan", () => {
    expect(
      teksBlok([
        {
          jenis: "tautan-anak",
          judul: "Halaman Terkait",
          ket: "Pilih salah satu.",
        },
        { jenis: "catatan", judul: "Catatan:", teks: "Angka bersifat demo." },
      ]),
    ).toBe(
      "Halaman Terkait\nPilih salah satu.\nCatatan:\nAngka bersifat demo.",
    );
  });

  it("menghasilkan string kosong untuk blok kosong atau fragmen spasi", () => {
    expect(teksBlok([])).toBe("");
    expect(teksBlok([{ jenis: "tautan-anak" }])).toBe("");
    expect(teksBlok([{ jenis: "galeri", foto: [] }])).toBe("");
    expect(teksBlok([{ jenis: "paragraf", teks: "   " }])).toBe("");
  });
});

describe("gabungTeks", () => {
  it("menggabungkan fragmen dengan baris baru per fragmen", () => {
    expect(gabungTeks(["Satu butir.", "Dua butir."])).toBe(
      "Satu butir.\nDua butir.",
    );
  });

  it("membuang fragmen kosong atau isinya hanya spasi", () => {
    expect(gabungTeks(["", "   ", "Fragmen. "])).toBe("Fragmen.");
  });
});
