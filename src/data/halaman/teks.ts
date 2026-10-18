import type { BlokHalaman } from "./types";

/**
 * Gabung fragmen teks baca-nyaring dengan satu aturan.
 *
 * Satu fragmen per baris, spasi di tepi dibuang, fragmen kosong dibuang.
 * Dipakai bersama oleh `teksBlok` dan halaman yang menyusun teks
 * baca-nyaringnya sendiri, supaya jeda antar-baris tidak bisa berbeda-beda
 * karena penulisnya lupa memfilter baris kosong.
 */
export function gabungTeks(fragmen: string[]): string {
  return fragmen
    .map((f) => f.trim())
    .filter((f) => f !== "")
    .join("\n");
}

/**
 * Teks yang dibacakan baca-nyaring dari blok halaman generik.
 *
 * Hanya teks yang benar-benar terlihat di layar yang diambil: judul, isi
 * butir, sel tabel, dan catatan. Hal dekoratif atau teknis — `ikon`, `href`,
 * `src`, `alt` foto — sengaja dilewati supaya mesin suara tidak membacakan
 * nama kelas ikon atau alamat tautan.
 *
 * Fragmen digabung dengan baris baru; mesin suara memperlakukannya sebagai
 * jeda, dan tiap fragmen tetap mempertahankan tanda bacanya sendiri.
 */
export function teksBlok(blok: BlokHalaman[]): string {
  const fragmen: string[] = [];

  for (const b of blok) {
    switch (b.jenis) {
      case "paragraf":
      case "sub":
      case "sub-kecil":
        fragmen.push(b.teks);
        break;
      case "daftar":
      case "langkah":
        if (b.judul) fragmen.push(b.judul);
        fragmen.push(...b.butir);
        break;
      case "daftar-tebal":
        if (b.judul) fragmen.push(b.judul);
        for (const t of b.butir) fragmen.push(`${t.tebal}. ${t.isi}`);
        break;
      case "tabel":
        if (b.judul) fragmen.push(b.judul);
        fragmen.push(b.kolom.join(", "));
        for (const baris of b.baris) fragmen.push(baris.join(", "));
        if (b.catatan) fragmen.push(b.catatan);
        break;
      case "kartu":
        if (b.judul) fragmen.push(b.judul);
        for (const k of b.butir) fragmen.push(`${k.judul}. ${k.isi}`);
        break;
      case "statistik":
        if (b.judul) fragmen.push(b.judul);
        for (const s of b.butir) fragmen.push(`${s.nilai} ${s.label}`);
        fragmen.push(b.catatan);
        break;
      case "tautan-anak":
        if (b.judul) fragmen.push(b.judul);
        if (b.ket) fragmen.push(b.ket);
        break;
      case "tautan":
        if (b.judul) fragmen.push(b.judul);
        fragmen.push(b.ket, b.label);
        break;
      case "galeri":
        if (b.judul) fragmen.push(b.judul);
        if (b.ket) fragmen.push(b.ket);
        break;
      case "catatan":
        if (b.judul) fragmen.push(b.judul);
        fragmen.push(b.teks);
        break;
    }
  }

  return gabungTeks(fragmen);
}
