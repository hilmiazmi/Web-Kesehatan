import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/data/navigation";

/**
 * Jaga navbar beku.
 *
 * Permintaan pemilik repo: navbar harus tetap seperti aslinya dan tidak boleh
 * diubah lagi. Keadaan beku tercatat di commit `a9b5fd5`, yang mengembalikan
 * batas desktop ke 1200px, tombol hamburger ke `d-xl-none`, dan nav ke aturan
 * seragam tanpa pengecilan khusus per tingkat.
 *
 * Tes ini mengunci angka dan aturan itu. Sengaja tidak ada toleransi: kalau
 * navbar disentuh, tes ini harus gagal, bukan memberi peringatan.
 *
 * Batas yang dikunci di sini hanya yang bisa dibuktikan dari isi berkas. Lebar
 * nav dalam piksel tidak dikunci, karena mengukurnya butuh peramban dan angka di
 * dokumen sudah pernah tidak cocok satu sama lain.
 */

const CSS = readFileSync(
  path.join(process.cwd(), "src/styles/site.css"),
  "utf8"
);
const NAVBAR = readFileSync(
  path.join(process.cwd(), "src/components/layout/Navbar.tsx"),
  "utf8"
);
const TOKENS = readFileSync(
  path.join(process.cwd(), "src/styles/tokens.css"),
  "utf8"
);

describe("navbar beku", () => {
  it("batas desktop tetap 1200px", () => {
    expect(CSS).toContain("@media (max-width: 1199.98px)");
    expect(CSS).toContain("@media (min-width: 1200px)");
    // Batas lama yang sudah ditolak tidak boleh muncul lagi.
    expect(CSS).not.toContain("1549.98px");
    expect(CSS).not.toContain("1359.98px");
    expect(CSS).not.toContain("min-width: 1550px");
    expect(CSS).not.toContain("min-width: 1360px");
  });

  it("tombol hamburger memakai d-xl-none, bukan class tersembunyi sendiri", () => {
    expect(NAVBAR).toContain('className="mobile-nav-toggle d-xl-none bi bi-list"');
    // Penyesuaian lewat media query pernah dicoba dan ditolak.
    expect(CSS).not.toMatch(/@media \(min-width: 1200px\)[\s\S]{0,400}mobile-nav-toggle[\s\S]{0,200}display:\s*none/);
  });

  it("percabangan hover memakai titik henti yang sama", () => {
    expect(NAVBAR).toContain('window.matchMedia("(min-width: 1200px)")');
  });

  it("nav tidak pernah membungkus", () => {
    const daftarUl = CSS.match(/\.navmenu > ul \{[^}]*\}/g) ?? [];
    expect(daftarUl.length).toBeGreaterThan(0);
    for (const aturan of daftarUl) {
      expect(aturan).not.toContain("flex-wrap");
    }
  });

  it("panel off-canvas bergeser penuh ke kanan dan berada di atas nav", () => {
    const panel = CSS.match(
      /@media \(max-width: 1199\.98px\) \{[\s\S]*?\.navmenu \{[^}]*\}/
    );
    expect(panel).not.toBeNull();
    expect(panel?.[0]).toContain("transform: translateX(100%)");
    expect(panel?.[0]).toContain("position: fixed");
    expect(panel?.[0]).toContain("z-index: 1200");
  });

  it("ukuran font nav seragam dan tidak dikecilkan di desktop", () => {
    expect(TOKENS).toContain("--rs-fs-nav: 15px");
    // Aturan per-tingkat untuk nav desktop pernah dicoba dan ditolak.
    expect(CSS).not.toMatch(/\.navmenu > ul > li > a \{[^}]*font-size/);
  });

  it("delapan butir nav, tidak bertambah dan tidak berkurang", () => {
    expect(NAV_ITEMS).toHaveLength(8);
  });

  it("tidak ada konstanta batas sendiri di navbar", () => {
    // Navbar tidak boleh punya konstanta batas sendiri; batasnya hanya CSS.
    expect(NAVBAR).not.toMatch(/BATAS_NAV_DESKTOP/);
  });
});
