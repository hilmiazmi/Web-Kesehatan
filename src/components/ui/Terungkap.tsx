"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { sudahTampil } from "@/lib/terungkap";

/**
 * Munculkan isi saat masuk viewport.
 *
 * Situs rujukan statis: setiap seksi langsung tampil. Efek di sini bukan
 * meniru rujukan, melainkan lapisan "hidup" yang sangat kecil — blok naik
 * 12px sambil memudar, sekali jalan per elemen. Tidak ada yang bergerak
 * tanpa sebab: yang memicu memang posisi scroll, bukan timer.
 *
 * Aturan "sudah masuk viewport" tinggal di `src/lib/terungkap.ts` supaya
 * bisa diuji tanpa peramban.
 */

/**
 * Dukungan IntersectionObserver, diperiksa sekali saat modul dimuat.
 *
 * Sengaja bukan saat render: nilai itu berbeda antara server (tidak ada) dan
 * klien (ada), dan membacanya saat render akan membuat markup server dan
 * klien berbeda — hydration mismatch. Di efek nilainya aman.
 */
const ADA_OBSERVER = typeof IntersectionObserver !== "undefined";

export default function Terungkap({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const wadah = useRef<HTMLDivElement>(null);

  // Dua state, dan urutannya penting:
  //
  // `sudahSiap` penanda bahwa JS hidup. Ia dipasang saat render lewat pola
  // repo (`Navbar` memakai pasangan lastX/setLastX), bukan di dalam efek —
  // aturan eslint `react-hooks/set-state-in-effect` melarang yang kedua.
  // Baru saat penanda ini ada elemen boleh disembunyikan; tanpa itu markup
  // yang dikirim server sudah tersembunyi, dan kalau JS mati isinya tidak
  // pernah muncul. Jadi yang hilang tanpa JS hanya animasinya, bukan konten.
  const [sudahSiap, setSudahSiap] = useState(false);
  const [sudahMasuk, setSudahMasuk] = useState(false);

  if (!sudahSiap) setSudahSiap(true);

  useEffect(() => {
    const el = wadah.current;
    if (el === null) return;

    if (!ADA_OBSERVER) {
      // Peramban tanpa IntersectionObserver: isi langsung tampil. Dilewatkan
      // lewat timeout, bukan setState langsung, karena aturan eslint melarang
      // setState sinkron di dalam efek; callback observer di bawah sah karena
      // memang dipanggil peramban, bukan oleh efek ini.
      const t = setTimeout(() => setSudahMasuk(true), 0);
      return () => clearTimeout(t);
    }

    const pengamat = new IntersectionObserver(
      (entries) => {
        if (sudahTampil(entries)) {
          setSudahMasuk(true);
          pengamat.disconnect();
        }
      },
      { threshold: [0, 0.5] },
    );
    pengamat.observe(el);

    return () => pengamat.disconnect();
  }, []);

  const kelas = [
    "rs-terungkap",
    sudahSiap && !sudahMasuk ? "rs-terungkap-sembunyi" : "",
    sudahMasuk ? "rs-terungkap-tampil" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wadah} className={kelas}>
      {children}
    </div>
  );
}
