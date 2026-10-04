import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER_CTAS } from "@/data/navigation";
import { QUICK_ACTIONS } from "@/data/quick-action";

/**
 * CTA header tidak boleh terpotong di rentang sempit.
 *
 * Satu baris header butuh 1496px. Tanpa aturan di bawah, di rentang
 * 1200-1495px (misalnya saat sidebar kanan Zen/Helium aktif) tombol
 * "Administrasi Pasien" terpotong di tepi kanan, dan di bawah 768px logo +
 * dua CTA + hamburger tidak muat berdampingan. Aturannya menyembunyikan dua
 * tombol header; nav desktopnya sendiri tidak diubah (batas 1200px, font
 * 15px, lebar 894px nowrap).
 *
 * Tes membaca berkas sumber apa adanya, bukan hasil render, karena yang
 * dikunci adalah keberadaan aturan dan salinan CTA di tempat lain.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

const navbar = sumber("src/components/layout/Navbar.tsx");
const siteCss = sumber("src/styles/site.css");

describe("CTA header disembunyikan saat tidak muat", () => {
  it("disembunyikan di bawah 1496px dengan !important", () => {
    // `!important` wajib ada: markup memakai `d-sm-flex` Bootstrap yang
    // menulis `display: flex !important`, jadi `display: none` biasa kalah.
    expect(siteCss).toContain("@media (max-width: 1495.98px)");
    const blok = siteCss.slice(siteCss.indexOf("@media (max-width: 1495.98px)"));
    expect(blok).toContain(".header-ctas");
    expect(blok).toMatch(/display:\s*none\s*!important/);
  });

  it("tetap tampil di 1496px ke atas", () => {
    // Aturan global `.header-ctas { display: none }` akan menghilangkan tombol
    // di semua lebar termasuk yang justru muat.
    const kemunculan = siteCss.match(/\.header-ctas \{/g) ?? [];
    expect(kemunculan).toHaveLength(2);
    const aturanDasar = siteCss.slice(
      siteCss.indexOf(".header-ctas {"),
      siteCss.indexOf("}", siteCss.indexOf(".header-ctas {")),
    );
    expect(aturanDasar).not.toMatch(/display\s*:/);
  });
});

describe("CTA tetap terjangkau walau tombol header disembunyikan", () => {
  it("punya salinan di panel mobile", () => {
    expect(navbar).toContain("HEADER_CTAS.map((cta) => (");
    expect(navbar).toContain('className="nav-mobile"');
  });

  it("ada di bilah aksi cepat", () => {
    for (const cta of HEADER_CTAS) {
      expect(
        QUICK_ACTIONS.some((a) => a.href === cta.href),
        cta.label,
      ).toBe(true);
    }
  });
});

describe("desktop tanpa hamburger", () => {
  it("tombol hamburger disembunyikan di desktop", () => {
    // Hamburger hanya untuk mobile; di desktop nav selalu tampil penuh.
    expect(navbar).toContain('className="mobile-nav-toggle d-xl-none bi bi-list"');
    const nav = navbar.slice(navbar.indexOf("<nav"), navbar.indexOf("</nav>"));
    expect(nav).not.toContain("mobile-nav-toggle");
  });
});
