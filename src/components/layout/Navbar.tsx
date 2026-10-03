"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HEADER_CTAS, NAV_ITEMS, SITE, type NavChild, type NavItem } from "@/data/navigation";

/**
 * Navbar multi-level.
 *
 * Di desktop dropdown terbuka dengan hover, di mobile berubah jadi accordion
 * yang dikendalikan state `open`. Struktur menu (11 item level-1, dropdown
 * sampai 3 tingkat) mengikuti DOM situs referensi yang sudah diverifikasi.
 *
 * Komponen ini client karena butuh interaksi; sisanya tetap Server Component.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Tutup menu mobile setiap kali pindah halaman, kalau tidak menu tetap
  // terbuka di atas konten baru. Penyesuaian dilakukan saat render, bukan di
  // useEffect, supaya tidak memicu render berantai.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="branding d-flex align-items-center">
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
          type="button"
          className="mobile-nav-toggle bi bi-list"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
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
 * Batas navigasi desktop, dalam piksel.
 *
 * Nilainya harus sama dengan media query `.navmenu`, `.mobile-nav-toggle`,
 * dan `.nav-mobile` di `site.css`. Semuanya 1550px.
 *
 * Angka ini hasil hitung, bukan tebakan. Delapan item navigasi memakai 767px
 * yang tidak bisa menyusut, logo 237px, dan dua tombol CTA 353px termasuk
 * margin kirinya. Totalnya 1357px, ditambah padding wadah 24px menjadi
 * 1381px. Dengan batas lama 1200px, pita 1200 sampai 1499px tidak cukup ruang:
 * "Kapasitas Bed" terlempar ke baris kedua, logo ikut terjejit, dan tombol
 * kedua terpotong di tepi layar.
 */
const BATAS_NAV_DESKTOP = 1550;

/**
 * True kalau navigasi sedang dalam mode desktop.
 *
 * Di desktop submenu memakai hover sehingga tautan induk harus bisa diklik.
 * Di tablet dan mobile tidak ada hover, jadi klik diubah jadi pembuka accordion.
 */
function isDesktopNav(): boolean {
  return window.matchMedia(`(min-width: ${BATAS_NAV_DESKTOP}px)`).matches;
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