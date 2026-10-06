"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QUICK_ACTIONS } from "@/data/quick-action";

/**
 * Bilah aksi cepat: satu tombol plus yang membuka menu, bukan tiga tombol
 * yang selalu tampil.
 *
 * Bentuk ini mengikuti situs acuan (`#toggle-btn` + `#toggle-menu`): tombol
 * bundar 40px di kanan bawah yang mengembang menjadi menu saat diketuk.
 * Tiga tombol yang selalu tampil menutupi isi halaman di layar kecil dan
 * terlihat berantakan di tangkapan layar; menu yang tertutup hanya
 * menempati satu tombol.
 *
 * Isinya tetap diambil dari `src/data/quick-action.ts` (dua CTA header +
 * WhatsApp), bukan dikarang di sini. Tautan internal memakai `Link` dari
 * Next.js, tautan luar memakai `rel="noopener noreferrer"`.
 *
 * Menu yang tertutup disembunyikan dengan `display: none` lewat kelas (bukan
 * `visibility`), sehingga tautannya hilang dari urutan Tab sekaligus dari
 * tampilan. Escape menutup menu dan mengembalikan fokus ke tombol, mengikuti
 * pola yang sama dengan panel navigasi di `Navbar`.
 */
export default function QuickActionBar() {
  const [terbuka, setTerbuka] = useState(false);
  const tombolRef = useRef<HTMLButtonElement>(null);

  // Escape menutup menu. Listener dipasang-hapus lewat effect karena menyentuh
  // `document` yang tidak ada saat server merender; `setTerbuka` di dalam
  // callback bukan di badan effect, jadi tidak melanggar
  // `react-hooks/set-state-in-effect` (pola yang sama dipakai `Navbar`).
  useEffect(() => {
    if (!terbuka) return;
    const tutup = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setTerbuka(false);
      tombolRef.current?.focus();
    };
    document.addEventListener("keydown", tutup);
    return () => document.removeEventListener("keydown", tutup);
  }, [terbuka]);

  // Memilih butir menu berarti pindah halaman (atau tab baru untuk WhatsApp),
  // jadi menu tidak perlu tetap terbuka di atas konten baru.
  const pilih = (): void => setTerbuka(false);

  return (
    <nav className="quick-action" aria-label="Aksi cepat">
      <ul
        id="menu-aksi-cepat"
        className={`quick-action-list${terbuka ? " quick-action-terbuka" : ""}`}
      >
        {QUICK_ACTIONS.map((aksi) => (
          <li key={aksi.href}>
            {aksi.external ? (
              <a
                href={aksi.href}
                className="quick-action-item quick-action-wa"
                target="_blank"
                rel="noopener noreferrer"
                onClick={pilih}
              >
                <i className={`bi ${aksi.icon}`} aria-hidden="true" />
                <span>{aksi.label}</span>
              </a>
            ) : (
              <Link
                href={aksi.href}
                className={`quick-action-item ${aksi.className ?? "btn-primary"}`}
                onClick={pilih}
              >
                <i className={`bi ${aksi.icon}`} aria-hidden="true" />
                <span>{aksi.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <button
        ref={tombolRef}
        type="button"
        className="quick-action-fab"
        aria-expanded={terbuka}
        aria-controls="menu-aksi-cepat"
        aria-label={terbuka ? "Tutup menu aksi cepat" : "Buka menu aksi cepat"}
        onClick={() => setTerbuka((v) => !v)}
      >
        <i
          className={`bi ${terbuka ? "bi-x-lg" : "bi-plus-lg"}`}
          aria-hidden="true"
        />
      </button>
    </nav>
  );
}
