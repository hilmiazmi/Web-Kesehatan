"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HEADER_CTAS, NAV_ITEMS, SITE, type NavChild, type NavItem } from "@/data/navigation";

/**
 * Navbar multi-level.
 *
 * Di desktop dropdown terbuka dengan hover, di mobile berubah jadi accordion
 * yang dikendalikan state `open`. Struktur menu (11 item level-1, dropdown
 * sampai 3 tingkat) mengikuti DOM situs referensi yang sudah diverifikasi.
 *
 * Panel off-canvas di mobile punya tiga cara menutup, dan ketiganya dipakai
 * karena tidak ada satu pun yang cukup sendiri. Panelnya 340px dari kanan,
 * sementara tombol hamburger juga berada di kanan. Saat panel terbuka, keduanya
 * menempati area yang sama, sehingga mengetuk hamburger justru mengetuk tautan di
 * dalam panel. Ditambah panel itu menutupi isi halaman, jadi mengetuk area di
 * luarnya tidak menutup apa pun.
 *
 * - Mengetuk area di luar panel, lewat `.navmenu-backdrop`.
 * - Tombol tutup di dalam panel.
 * - Tombol Escape.
 *
 * Tata letak desktop tampil penuh tanpa hamburger: delapan butir nav selalu
 * terlihat; dua CTA header terlihat di 1520px ke atas dan dalam pita kompak
 * 1360-1519px. Semua aturan panel hanya ada di dalam
 * `@media (max-width: 1199.98px)`; aturan dua baris dan kompak bersarang di
 * dalam blok desktop `@media (min-width: 1200px)`.
 *
 * Komponen ini client karena butuh interaksi; sisanya tetap Server Component.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Dipakai untuk mengembalikan fokus ke tombol hamburger setelah panel
  // ditutup. Tanpa ini, fokus tinggal di dalam panel yang sudah `hidden`, dan
  // pengguna keyboard kehilangan tempat fokusnya.
  const tombolRef = useRef<HTMLButtonElement>(null);

  // Tutup menu mobile setiap kali pindah halaman, kalau tidak menu tetap
  // terbuka di atas konten baru. Penyesuaian dilakukan saat render, bukan di
  // useEffect, supaya tidak memicu render berantai.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  // Escape menutup panel, dan halaman berhenti bisa digulir selama panel
  // terbuka. Keduanya lewat effect, bukan saat render: keduanya menyentuh
  // `document`, yang tidak ada saat server merender, dan aturan eslint
  // `react-hooks/set-state-in-effect` melarang setState di dalam effect.
  //
  // Penahanan gulir penting karena panelnya `position: fixed` selebar 340px
  // di kanan. Di layar 390px hanya 50px konten yang tersisa, jadi tanpa
  // penahanan halaman di bawahnya masih bisa bergulir di belakang panel dan
  // membuat orang mengira panelnya yang bergerak.
  useEffect(() => {
    if (!mobileOpen) return;

    const body = document.body;
    body.classList.add("navmenu-terbuka");
    const gulirAsli = body.style.overflow;
    body.style.overflow = "hidden";

    const tutup = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
    };
    document.addEventListener("keydown", tutup);

    return () => {
      document.removeEventListener("keydown", tutup);
      body.classList.remove("navmenu-terbuka");
      body.style.overflow = gulirAsli;
    };
  }, [mobileOpen]);

  // Fokus dikembalikan ke tombol hamburger setelah panel ditutup.
  //
  // `pernahTerbuka` gunanya supaya fokus tidak ikut pindah ke hamburger saat
  // halaman baru dimuat. Tanpa penjaga itu, `useEffect` di bawah berjalan
  // sekali pada render pertama dengan `mobileOpen` masih `false`, dan fokus
  // langsung melompat ke tombol menu. Di mobile itu berarti pembaca layar
  // tidak membacakan isi halaman, hanya mengumumkan "Buka menu".
  const pernahTerbuka = useRef(false);
  useEffect(() => {
    if (pernahTerbuka.current && !mobileOpen) tombolRef.current?.focus();
    pernahTerbuka.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <div className="branding d-flex align-items-center">
      {/* Latar penutup. Ada di luar `.navmenu` karena panelnya menutupi
          hamburger, jadi satu-satunya area yang bisa diketuk untuk menutup
          adalah bagian layar yang tidak tertutup panel. */}
      {mobileOpen && (
        <button
          type="button"
          className="navmenu-backdrop"
          aria-label="Tutup menu navigasi"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="container-fluid position-relative d-flex align-items-center justify-content-between header-nav-menu">
        <Link
          href="/"
          className="logo d-flex align-items-center me-auto"
          aria-label={`${SITE.name} - kembali ke halaman utama`}
        >
          <span className="logo-mark" aria-hidden="true">
            <i className="bi bi-plus-lg" />
          </span>
          <span className="logo-text">
            <strong>{SITE.name}</strong>
            <small>{SITE.tagline}</small>
          </span>
        </Link>

        <nav
          id="navmenu"
          className={`navmenu ${mobileOpen ? "navmenu-open" : ""}`}
          aria-label="Navigasi utama"
        >
          {/* Tombol tutup.

              Namanya sengaja tidak memakai kelas tombol hamburger. Kalau
              hamburger ikut masuk ke sini ia ikut tergeser bersama panel dan
              tidak bisa diklik.
              Sekalian, kelas hamburger disembunyikan di desktop dengan
              `d-xl-none`; tombol ini juga perlu disembunyikan, dan itu
              ditangani aturan `.navmenu-close` di media query 1200px. */}
          <button
            type="button"
            className="navmenu-close bi bi-x-lg"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          />

          <ul>
            {NAV_ITEMS.map((item) => (
              <NavListItem key={item.label} item={item} depth={0} />
            ))}

            {/* Dua tombol CTA ini disembunyikan di desktop karena sudah tampil
                sebagai tombol di kanan header. */}
            {HEADER_CTAS.map((cta) => (
              <li key={cta.label} className="nav-mobile">
                <Link href={cta.href}>{cta.label}</Link>
              </li>
            ))}
          </ul>

          </nav>

        {/* Tombol hamburger harus DI LUAR .navmenu: di mobile .navmenu
            menjadi panel off-canvas yang digeser ke kanan, sehingga apa pun
            isinya otomatis tidak bisa diklik. */}
        <button
          ref={tombolRef}
          type="button"
          className="mobile-nav-toggle d-xl-none bi bi-list"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          aria-controls="navmenu"
          onClick={() => setMobileOpen((v) => !v)}
        />

        <div className="header-ctas d-none d-sm-flex">
          {HEADER_CTAS.map((cta) => (
            <Link
              key={cta.label}
              href={cta.href}
              className={`cta-btn btn ${cta.className}`}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * True kalau navigasi sedang dalam mode desktop.
 *
 * Batasnya harus sama dengan media query `.navmenu` di `site.css`
 * (max-width: 1199.98px). Di desktop submenu memakai hover sehingga tautan
 * induk harus bisa diklik; di mobile tidak ada hover, jadi klik diubah jadi
 * pembuka accordion.
 */
function isDesktopNav(): boolean {
  return window.matchMedia("(min-width: 1200px)").matches;
}

/** Satu item menu beserta turunannya, rekursif sampai kedalaman berapa pun. */
function NavListItem({ item, depth }: { item: NavItem | NavChild; depth: number }) {
  const pathname = usePathname();
  const hasChildren = Boolean(item.children?.length);
  const [expanded, setExpanded] = useState(false);
  const isActive = pathname === item.href;

  // Submenu ditulis sebagai <ul> di dalam <li>; tanpa class="dropdown" pada
  // level pertama, CSS decides hover vs accordion.
  const childListClass =
    depth === 0 ? undefined : depth === 1 ? "sub-three" : "sub-three";

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href}
          className={isActive ? "active" : ""}
          aria-current={isActive ? "page" : undefined}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li className={`dropdown dropdown-depth-${depth}`}>
      {/* Di desktop submenu terbuka dengan hover, jadi tautan ini tetap
          dinavigasi ke halaman induk. Di mobile tidak ada hover, sehingga klik
          akan mengubah state accordion. */}
      <Link
        href={item.href}
        className={isActive ? "active" : ""}
        aria-current={isActive ? "page" : undefined}
        onClick={(e) => {
          // Desktop: biarkan tautan dinavigasi (submenu sudah terbuka via hover).
          if (isDesktopNav()) return;
          e.preventDefault();
          setExpanded((v) => !v);
        }}
      >
        <span>{item.label}</span>
        <i
          className={`bi ${
            depth === 0 ? "bi-chevron-down" : "bi-chevron-right"
          } toggle-dropdown`}
          aria-hidden="true"
        />
      </Link>

      <ul className={`${childListClass ?? ""} ${expanded ? "show" : ""}`.trim()}>
        {item.children!.map((child) => (
          <NavListItem key={child.label} item={child} depth={depth + 1} />
        ))}
      </ul>
    </li>
  );
}