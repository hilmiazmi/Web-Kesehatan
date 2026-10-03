/**
 * Bentuk isi halaman generik.
 *
 * Tiga puluh tautan navbar dan footer dilayani `src/app/[...slug]/page.tsx`
 * karena tidak punya folder sendiri di `src/app`. Sebelumnya catch-all itu
 * menulis satu kalimat "belum dilengkapi isi pada versi demo ini" untuk
 * semuanya, jadi semua tautan itu menuju halaman kosong.
 *
 * Blok sengaja dibuat kecil supaya `pages.css` cukup punya beberapa kelas baru,
 * bukan satu sistem tata letak per halaman. Kalau suatu hari sebuah halaman
 * butuh bentuk yang benar-benar lain, lebih baik halaman itu punya folder
 * sendiri daripada bentuk blok terus bertambah.
 */

/** Satu unit isi. Dirender berurutan oleh `PageBlocks`. */
export type BlokHalaman =
  /** Paragraf biasa. */
  | { jenis: "paragraf"; teks: string }
  /** Subjudul tingkat dua. */
  | { jenis: "sub"; teks: string }
  /** Subjudul tingkat tiga. */
  | { jenis: "sub-kecil"; teks: string }
  /** Daftar butir. `ikon` dipakai untuk membulatkan butir per jenis halaman. */
  | { jenis: "daftar"; judul?: string; ikon?: string; butir: string[] }
  /**
   * Daftar dengan penekanan di awal butir.
   *
   * Bentuk yang dipakai halaman Aula di situs referensi: tiap butir diawali
   * istilah yang dicetak tebal, lalu penjelasannya. Bentuk `daftar` biasa
   * tidak bisa meniruinya, dan menambah gaya `tebal-di-awal` ke `daftar` akan
   * membuat setiap pemanggil yang tidak memakainya.
   */
  | {
      jenis: "daftar-tebal";
      judul?: string;
      butir: { tebal: string; isi: string }[];
    }
  /** Langkah bernomor, untuk alur dan prosedur. */
  | { jenis: "langkah"; judul?: string; butir: string[] }
  /** Tabel. Dipakai untuk kapasitas bed, daftar standar, dan jadwal. */
  | { jenis: "tabel"; judul?: string; kolom: string[]; baris: string[][]; catatan?: string }
  /** Kartu bergambar ikon, dengan tautan opsional. */
  | {
      jenis: "kartu";
      judul?: string;
      butir: { ikon: string; judul: string; isi: string; href?: string }[];
    }
  /** Kotak angka ringkasan. */
  | {
      jenis: "statistik";
      judul?: string;
      butir: { label: string; nilai: string; ket?: string }[];
      catatan: string;
    }
  /** Tautan ke anak halaman, diambil dari pohon navigasi. */
  | { jenis: "tautan-anak"; judul?: string; ket?: string }
  /** Satu tautan yang menonjol, untuk formulir atau dokumen. */
  | { jenis: "tautan"; judul?: string; label: string; href: string; ket: string }
  /** Deretan foto. */
  | { jenis: "galeri"; judul?: string; foto: { src: string; alt: string }[]; ket?: string }
  /**
   * Kotak catatan.
   *
   * Dipakai untuk hal yang harus dibaca padahal bukan bagian dari alur,
   * misalnya pernyataan bahwa angka pada halaman tersebut adalah data demo.
   */
  | { jenis: "catatan"; judul?: string; teks: string };

/** Isi satu halaman generik. */
export type IsiHalaman = {
  /** Kalimat pembuka, ditampilkan sendiri di bawah remah roti. */
  ringkas: string;
  blok: BlokHalaman[];
};