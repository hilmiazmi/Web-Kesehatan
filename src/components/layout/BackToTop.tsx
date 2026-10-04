"use client";

import { useEffect, useRef } from "react";

/**
 * Tombol kembali ke atas halaman.
 *
 * Bentuk, warna, ukuran, dan ambang kemunculannya diukur dari
 * `rsudpasarminggu.jakarta.go.id` pada 4 Oktober 2026, bukan dikira. Rinciannya
 * ada di blok `.scroll-top` pada `src/styles/site.css`.
 *
 * Dua hal sengaja berbeda dari situs acuan, dan keduanya soal cara kerja, bukan
 * tampilan:
 *
 * 1. `href` menunjuk `#main-content`, bukan `#`. Di situs acuan `href="#"`
 *   .preventDefault()` di JS, jadi tanpa JavaScript tombolnya hanya menambah
 *    tanda pagar di URL dan tidak melakukan apa pun. Menunjuk `#main-content`
 *    membuat tombol tetap berguna tanpa JS, dan `id` itu sudah ada di
 *    `src/app/layout.tsx` untuk tautan lewati navigasi. Tampilannya tidak
 *    berubah sama sekali karena yang bergerak tetap `scrollTo`.
 *
 * 2. Status "sudah menggulir" disimpan di class elemen, bukan di state React.
 *    `useEffect` yang memanggil `setState` dilarang oleh aturan eslint
 *    `react-hooks/set-state-in-effect`, dan setiap gulir mouse akan memanggilnya
 *    terus-menerus. Menulis class secara langsung ke elemen yang sama persis
 *    dengan cara kerja tombol ini di situs acuan, tanpa memaksa React
 *    menggambar ulang pohon pada setiap peristiwa gulir.
 *
 * Karena class ditambahkan dari JavaScript, hasil server selalu dalam keadaan
 * tersembunyi. Tombol baru muncul setelah halaman dimuat dan digulir, persis
 * seperti di situs acuan.
 */
export default function BackToTop() {
  const tombol = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const elemen = tombol.current;
    if (!elemen) return;

    /** Ambang 100px diukur dari skrip situs acuan, bukan dipilih. */
    const perbarui = (): void => {
      elemen.classList.toggle("active", window.scrollY > 100);
    };

    // Dipanggil sekali saat dipasang, supaya tombol langsung benar kalau
    // browser membuka halaman dengan posisi gulir yang sudah di tengah, misalnya
    // lewat history restoration.
    perbarui();

    window.addEventListener("scroll", perbarui, { passive: true });
    return () => window.removeEventListener("scroll", perbarui);
  }, []);

  return (
    <a
      href="#main-content"
      ref={tombol}
      className="scroll-top d-flex align-items-center justify-content-center"
      onClick={(event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Fokus dikembalikan ke awal isi halaman supaya pengguna keyboard
        // tidak melewati isi yang baru saja dilompati.
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }}
    >
      <i className="bi bi-arrow-up-short" aria-hidden="true" />
      {/* Ikon saja tidak pernah menjelaskan bentuknya, jadi teks yang
          terbaca oleh pembaca layar tetap dibutuhkan. */}
      <span className="visually-hidden">Kembali ke atas halaman</span>
    </a>
  );
}
