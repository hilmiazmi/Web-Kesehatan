"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
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

  /**
   * Panel off-canvas yang tertutup harusnya tidak bisa difokuskan.
   *
   * `.navmenu` digeser ke kanan dengan `translateX(100%)`, jadi isinya secara
   * visual ada di luar layar. Tapi menggeser bukan menyembunyikan: seluruh
   * tautan di dalamnya masih bisa dicapai tombol Tab, jadi pengunjung yang
   * memakai keyboard bisa mendarat di menu yang tidak terlihat.
   *
   * Atribut `inert` yang menutup masalah ini, karena dia membuat seluruh
   * isi panel keluar dari urutan Tab sekaligus dari pohon aksesibilitas.
   * `aria-hidden` ditulis juga untuk pembaca layar yang belum mengenal
   * `inert`.
   *
   * Syaratnya penting: `inert` hanya berlaku ketika panel benar-benar
   * off-canvas, yaitu di bawah 1200px dan belum dibuka. Di desktop panelnya
   * terlihat, jadi atribut ini harus selalu kosong di sana.
   */
  const desktopNav = useSyncExternalStore(
    dengarLebarDesktop,
    bacaLebarDesktop,
    // Snapshot server selalu dianggap desktop. Panel di desktop memang
    // terlihat, jadi HTML hasil server tidak pernah menandai `inert`. Kalau
    // layar ternyata sempit, React melakukan render ulang setelah hidrasi.
    () => true,
  );
  const panelTertutup = !desktopNav && !mobileOpen;

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
          inert={panelTertutup}
          aria-hidden={panelTertutup}
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
          className="mobile-nav-toggle d-xl-none bi bi-list"
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

/**
 * Daftar perubahan lebar viewport untuk `useSyncExternalStore`.
 *
 * Dipakai supaya komponen tahu sedang dalam mode off-canvas atau bukan,
 * tanpa memanggil `setState` dari dalam `useEffect`. Callback yang
 * diteruskan ke `addEventListener` adalah milik React, dan itulah yang
 * membuat komponen di-render ulang.
 *
 * Batasnya sengaja ditulis inline dan sama persis dengan `isDesktopNav()`
 * di atas. Kalau keduanya berbeda, panel akan menutup sendiri di layar lebar
 * atau tidak pernah menutup di layar sempit.
 */
function dengarLebarDesktop(callback: () => void): () => void {
  const mql = window.matchMedia("(min-width: 1200px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** Snapshot untuk `useSyncExternalStore`, dibaca saat render. */
function bacaLebarDesktop(): boolean {
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