import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bentuk dropdown navbar dikunci.
 *
 * Dua aturan di sini berasal dari bug nyata, bukan dari selera.
 *
 * Yang pertama: sudut submenu. Semula `border-radius: var(--rs-radius-card)`
 * (25px), sama dengan `.card`. Radius itu meninggalkan piksel mati tepat di
 * sambungan baris induk dan submenu, dan untuk menutupnya ada jembatan
 * `::before` 10px.
 *
 * Yang kedua, dan ini akibatnya: jembatan itu bocor. Aturan
 * `.navmenu li li > ul::before { left: -10px }` menempel di kiri submenu
 * tingkat ketiga yang berposisi `left: 100%`, jadi pitanya menumpang tindih
 * dengan baris saudara di panel yang sama. Kursor di ujung kanan "Paket Health
 * Meets Holiday" menyalakan submenu "Paket Reguler" juga. Diperbaiki di
 * Chromium 1243 pada 7 Oktober 2026: kedua submenu terlihat bersamaan di
 * `left: 952` dan `top: 262` serta `303`, jadi isinya saling menimpa dan
 * "Paket Dasar 1" (anak Paket Reguler) muncul di sebelah "Paket Anak Sekolah"
 * (anak Health Meets Holiday).
 *
 * Dua aturan itu hanya bisa dijaga lewat tes. Geometri hover tidak terlihat di
 * layar sampai kursor ada di tempat yang tepat, dan ada cara salah membacanya:
 * dengan `hover({ force: true })` Playwright belum memicu `visibility: visible`,
 * sehingga tes ikut lulus padahal menunya tidak pernah terbuka. Tes ini
 * memeriksa CSS-nya, bukan hasil hover-nya.
 *
 * Kalau suatu saat memang perlu sudut membulat lagi, itu keputusan desain, dan
 * jembatan samping harus dibangun ulang dengan cara yang tidak bocor ke baris
 * saudara, bukan hanya menyalin `::before` yang sekarang dihapus.
 */

const akar = path.resolve(import.meta.dirname, "..");

/** CSS tanpa komentar, supaya pencarian tidak tersangkut di dalam penjelasan. */
const siteCss = readFileSync(path.join(akar, "src/styles/site.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Seluruh isi setiap blok berlabel selector itu. */
function semuaBlok(selector: string): string[] {
  const pola = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    "g",
  );
  return [...siteCss.matchAll(pola)].map((m) => m[1]);
}

describe("dropdown navbar - bentuk dikunci", () => {
  it("submenu desktop memakai radius 4px, sama seperti situs acuan", () => {
    // 25px (radius kartu) meninggalkan celah hover di sudut sambungan, dan
    // jembatan sampingan yang dibuat untuk menutup celah itu justru bocor ke
    // baris saudara. 0px aman tapi tidak menyerupai acuan, yang memakai 4px.
    //
    // Hanya blok di luar media query yang diperiksa. Di dalam panel mobile
    // submenu diratakan siku (0) karena jadi daftar indent, bukan kotak
    // melayang — itu memang bentuk yang berbeda, bukan nilai yang lupa
    // diperbarui.
    const nilai = semuaBlok(".navmenu li > ul").filter(
      (blok) => !blok.includes("position: static"),
    );

    expect(nilai.length).toBeGreaterThan(0);
    for (const blok of nilai) {
      expect(blok.match(/border-radius\s*:\s*([^;]+);/)?.[1]?.trim()).toBe("4px");
    }

    expect(siteCss).not.toMatch(
      /\.navmenu li > ul\s*\{[^}]*border-radius\s*:\s*var\(--rs-radius-card\)/,
    );
  });

  it("tidak ada jembatan samping di submenu tingkat kedua ke bawah", () => {
    // Aturan inilah yang membuat dua isi tampil bersamaan.
    expect(siteCss).not.toMatch(/\.navmenu li li > ul::before/);
  });

  it("jembatan 10px hanya ada untuk submenu yang muncul di bawah induknya", () => {
    // Jembatan vertikal ini aman: submenu tingkat pertama menempel di `top: 100%`
    // dan pitanya menutup celah ke atas. Pita itu seluruhnya berada di dalam
    // lebar submenu itu sendiri, jadi tidak menumpang tindih dengan baris saudara.
    expect(siteCss).toMatch(/\.navmenu > ul > li > ul::before/);

    const blok = semuaBlok(".navmenu > ul > li > ul::before")[0] ?? "";
    expect(blok).toMatch(/top\s*:\s*-10px/);
    expect(blok).toMatch(/height\s*:\s*10px/);
  });

  it("submenu tingkat kedua ke bawah tidak digeser ke arah baris induk", () => {
    // `translateX` hanya untuk animasi masuk. Nilai negatif akan mendongkar
    // submenu ke arah induk dan memperbesar daerah tumpang tindihnya.
    for (const blok of semuaBlok(".navmenu li > ul ul")) {
      const transform = blok.match(/transform\s*:\s*translateX\((-?[\d.]+)px\)/)?.[1];
      if (transform === undefined) continue;
      expect(Number(transform)).toBeGreaterThanOrEqual(0);
    }
  });

  it("dropdown desktop ditutup paksa tepat setelah pindah halaman", () => {
    // `:hover` tidak hilang selama kursor diam, jadi tanpa penekanan ini menu
    // tetap terbuka di atas konten baru. Kelas `navigasi-baru` harus menekan
    // ketiga aturan buka: hover pada baris, hover di dalam submenu, dan
    // fokus keyboard.
    for (const selector of [
      ".navmenu.navigasi-baru li:hover > ul",
      ".navmenu.navigasi-baru li > ul:hover",
      ".navmenu.navigasi-baru li:has(:focus-visible) > ul",
    ]) {
      expect(siteCss).toContain(selector);
    }

    const blok = semuaBlok(".navmenu.navigasi-baru li:has(:focus-visible) > ul")[0] ?? "";
    expect(blok).toMatch(/visibility\s*:\s*hidden/);
  });

  it("fokus sisa klik mouse tidak boleh membuka submenu", () => {
    // Klik mouse memberi `:focus` tapi bukan `:focus-visible`, dan fokus itu
    // bertahan melewati navigasi client-side. Kalau aturan bukanya
    // `:focus-within`, submenu milik link yang baru diklik tetap terbuka di
    // halaman baru (terukur di Chromium 1243: rantai "Pelayanan > MCU >
    // Paket Reguler" terlihat bersamaan dengan submenu "Paket Health Meets
    // Holiday" di `left` yang sama). Aturan bukanya wajib `:focus-visible`.
    expect(siteCss).not.toMatch(/\.navmenu li:focus-within\s*>/);
    expect(siteCss).toContain(".navmenu li:has(:focus-visible) > ul");
  });

  it("Navbar memasang dan melepas penekanan buka paksa itu", () => {
    const navbar = readFileSync(
      path.join(akar, "src/components/layout/Navbar.tsx"),
      "utf8",
    );

    // Dipasang setiap pathname berubah, bersamaan dengan penutupan panel mobile.
    expect(navbar).toMatch(/pathname !== lastPath[\s\S]*?setNavigasiBaru\(true\)/);
    // Dilepas saat kursor keluar dari nav, masuk kembali ke nav, atau fokus
    // masuk kembali. Ketiganya perlu: setelah klik isi submenu kursor sudah
    // berada di luar nav (di atas konten), jadi tidak ada leave yang datang.
    expect(navbar).toContain("onPointerLeave");
    expect(navbar).toContain("onPointerEnter");
    expect(navbar).toContain("navigasi-baru");
  });
});