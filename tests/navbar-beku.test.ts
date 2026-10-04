import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER_CTAS, NAV_ITEMS } from "@/data/navigation";

/**
 * Navbar dibekukan.
 *
 *Pemilik repo sudah beberapa kali mengubah navbar lalu meminta
 * dikembalikan. Permintaan terakhirnya: biarkan saja seperti aslinya, dan
 * jangan diubah lagi.
 *
 * Tes ini adalah penjaga agar permintaan itu tidak dilanggar diam-diam di
 * sesi berikutnya. Tes membaca berkas sumber apa adanya, bukan hasil render,
 * karena yang dikunci justru angka batas dan urutan elemen di markup.
 *
 * Tanya dulu pemilik repo, karena mengubah navbar berarti mengubah
 * permintaan yang sudah dibakukan di sini.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

const navbar = sumber("src/components/layout/Navbar.tsx");
const siteCss = sumber("src/styles/site.css");
const tokensCss = sumber("src/styles/tokens.css");

describe("navbar dibekukan: batas desktop 1200px", () => {
  it("batas panel off-canvas dan hamburger tetap 1200px", () => {
    expect(siteCss).toContain("@media (max-width: 1199.98px) {");
    expect(siteCss).toContain("@media (min-width: 1200px) {");
  });

  it("percabangan hover dan accordion di Navbar.tsx ikut 1200px", () => {
    // Versi asal memakai matchMedia langsung, bukan konstanta
    // BATAS_NAV_DESKTOP. Konstanta itu baru ada di commit yang sudah dibatalkan.
    expect(navbar).toContain('window.matchMedia("(min-width: 1200px)").matches');
    expect(navbar).toContain("function isDesktopNav(): boolean {");
    expect(navbar).not.toContain("BATAS_NAV_DESKTOP");
  });

  it("tidak ada batas nav lain yang masih tersisa", () => {
    // 1360px, 1460px, dan 1520px pernah dipakai lalu dibatalkan. Kalau salah
    // satu muncul lagi, berarti navbar diubah tanpa sepengetahuan pemilik.
    const batasLain = siteCss.match(/@media \((?:max|min)-width: 1(?:3[0-9]{2}|4[0-9]{2}|5[0-9]{2})px/g);
    expect(batasLain).toBeNull();
    expect(navbar).not.toMatch(/matchMedia\("\(min-width: 1(?:3|4|5)\d\dpx\)"\)/);
  });
});

describe("navbar dibekukan: tombol dan panel", () => {
  it("tombol hamburger masih ada dan berada di luar .navmenu", () => {
    expect(navbar).toContain('className="mobile-nav-toggle d-xl-none bi bi-list"');

    // Kalau tombolnya masuk ke dalam <nav className="navmenu">, isinya ikut
    // tergeser ke kanan bersama panel off-canvas sehingga tidak bisa diklik.
    const nav = navbar.slice(navbar.indexOf("<nav"), navbar.indexOf("</nav>"));
    expect(nav).not.toContain("mobile-nav-toggle");
  });

  it("panel off-canvas masih geser ke kanan, bukan disembunyikan", () => {
    const blok = siteCss.slice(
      siteCss.indexOf("@media (max-width: 1199.98px) {"),
      siteCss.indexOf("@media (min-width: 1200px) {"),
    );
    expect(blok).toContain(".navmenu.navmenu-open");
    expect(blok).toContain("translateX(100%)");
    expect(blok).toContain(".navmobile");
  });

  it("dua CTA header masih punya salinan di dalam panel", () => {
    expect(navbar).toContain('className="nav-mobile"');
    // Salinannya dirender dari HEADER_CTAS, jadi yang dikunci adalah bahwa
    // pemetaannya masih ada, bukan teks labelnya.
    expect(navbar).toContain("HEADER_CTAS.map((cta) => (");
    expect(HEADER_CTAS.length).toBeGreaterThan(0);
  });

  it("submenu tetap memakai aturan :not(.show)", () => {
    // Tanpa :not(.show) aturan hover menimpa .show dan submenu yang baru
    // diklik di panel langsung tertutup lagi.
    expect(siteCss).toContain(".navmenu .dropdown > a:hover + ul:not(.show)");
  });
});

describe("navbar dibekukan: nav desktop tidak pernah membungkus", () => {
  it("ul dan logo dikunci agar tidak menyusut atau membungkus", () => {
    // logo 237 + nav 894 + CTA 341 + padding 24 = 1496px. Dengan wrap, satu
    // butir nav bisa turun ke baris kedua tepat seperti bug yang pernah
    // dilaporkan. Dengan shrink, logo menyusut sampai teksnya pecah.
    //
    // `.navmenu > ul` tidak menulis `flex-wrap` sama sekali, jadi yang berlaku
    // adalah nilai awal flex, yaitu nowrap. Yang dikunci di sini adalah
    // ketiadaan `wrap`, bukan penulisan `nowrap`.
    expect(siteCss).toMatch(/\.navmenu > ul \{[^}]*\}/);
    expect(siteCss).not.toMatch(/\.navmenu > ul \{[^}]*flex-wrap: wrap;/);
    expect(siteCss).toMatch(/\.navmenu \{[^}]*flex-shrink: 0;/);
    expect(siteCss).toMatch(/\.logo \{[^}]*flex-shrink: 0;/);
  });

  it("font nav tetap 15px untuk desktop, submenu, dan panel", () => {
    // Pernah dirapatkan ke 14px supaya muat sejak 1360px. Jarak antar butir
    // jadi 0px dan nav sulit dibaca.
    expect(tokensCss).toContain("--rs-fs-nav: 15px;");
    expect(tokensCss).toContain("--rs-lh-nav: 22.5px;");
    expect(siteCss).not.toContain(".navmenu > ul > li > a");
  });
});

describe("navbar dibekukan: isi menu", () => {
  it("delapan butir navigasi dan dua CTA", () => {
    expect(NAV_ITEMS).toHaveLength(8);
    expect(HEADER_CTAS).toHaveLength(2);
    expect(navbar).toContain("{NAV_ITEMS.map((item) => (");
  });
});

/**
 * Panel off-canvas yang tertutup harus keluar dari urutan Tab.
 *
 * Ini satu-satunya bagian navbar yang boleh berubah tanpa izin pemilik repo,
 * dan izin itu diberikan khusus untuk perbaikan ini. Angka batas, ukuran font,
 * dan urutan elemen tetap dikunci di describe di atas.
 *
 * Alasannya: `.navmenu` digeser dengan `translateX(100%)`, dan menggeser
 * bukan menyembunyikan. Tanpa `inert`, seluruh tautan di panel tetap bisa
 * dicapai tombol Tab, jadi pengunjung keyboard bisa mendarat di menu yang
 * tidak terlihat dan tidak tahu itu terjadi.
 */
describe("panel off-canvas yang tertutup", () => {
  it("navmenu memakai inert dan aria-hidden", () => {
    const nav = navbar.slice(navbar.indexOf("<nav"), navbar.indexOf("</nav>"));
    expect(nav).toContain("inert={panelTertutup}");
    expect(nav).toContain("aria-hidden={panelTertutup}");
  });

  it("hanya berlaku di mode off-canvas yang belum dibuka", () => {
    // `inert` yang selalu hidup akan membuat menu tidak bisa diklik di desktop.
    // Syaratnya harus involve dua hal: mode off-canvas, dan belum dibuka.
    expect(navbar).toContain(
      "const panelTertutup = !desktopNav && !mobileOpen;",
    );
  });

  it("memakai useSyncExternalStore, bukan setState dari useEffect", () => {
    // `setState` di dalam `useEffect` dilarang oleh aturan eslint
    // `react-hooks/set-state-in-effect`. `useSyncExternalStore` adalah cara
    // resmi membaca sumber daya di luar React seperti `matchMedia`, dan
    // snapshot servernya mencegah ketidaksesuaian hidrasi.
    expect(navbar).toContain("useSyncExternalStore");
    expect(navbar).toContain("dengarLebarDesktop");
    expect(navbar).toContain("bacaLebarDesktop");
    // Yang dicek adalah pemanggilan dan impornya, bukan penyebutannya di
    // dalam komentar.
    expect(navbar).not.toMatch(/useEffect\s*\(/);
    expect(navbar).not.toMatch(/import \{[^}]*useEffect/);
  });

  it("batas 1200px dipakai bersama, tidak ada batas kedua", () => {
    // `bacaLebarDesktop` dan `isDesktopNav` harus sepakat, kalau tidak panel
    // akan menutup sendiri di layar lebar atau tidak pernah menutup di
    // layar sempit.
    const batas = navbar.match(/matchMedia\("\(min-width: \d+px\)"\)/g) ?? [];
    expect(new Set(batas).size).toBe(1);
    expect(batas[0]).toBe('matchMedia("(min-width: 1200px)")');
  });

  it("listener perubahan lebar dibongkar", () => {
    // Tanpa pembongkaran, setiap selesai render menambah satu listener baru
    // pada `MediaQueryList` yang sama.
    expect(navbar).toContain('mql.addEventListener("change", callback)');
    expect(navbar).toContain('mql.removeEventListener("change", callback)');
  });
});
