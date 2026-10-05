import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HEADER_CTAS } from "@/data/navigation";
import { QUICK_ACTIONS } from "@/data/quick-action";

/**
 * Header desktop harus dua baris, dan tidak boleh ada yang terpotong.
 *
 * Satu baris header butuh 1496px (logo 237 + nav 894 + CTA 341 + padding 24),
 * hasil pengukuran `getBoundingClientRect()` di peramban. Kelonggarannya sedikit:
 * viewport 1200px tidak muat, dan memaksa satu baris menghasilkan dua cacat
 * sekaligus — nav terdorong ke tepi kanan sampai menempel, dan CTA harus
 * disembunyikan supaya tidak terpotong.
 *
 * Perbaikannya: di desktop nav mendapat baris penuh sendiri. Baris pertama
 * logo dan CTA, baris kedua nav. Jadi tidak ada yang disembunyikan pada lebar
 * desktop mana pun, dan lebar minimum untuk nav naik dari 1161px menjadi
 * 894px saja.
 *
 * Semua angka di bawah diukur ulang di peramban lewat CDP pada lebar 1200,
 * 1280, 1366, 1440, 1496, 1920, dan 2560px: tinggi `.branding` 100px, nav
 * tetap 894px di semua lebar itu, `scrollWidth` sama dengan `clientWidth`
 * (tanpa gulir horizontal), dan CTA `display: flex` di semua lebar itu.
 *
 * Tes membaca berkas sumber apa adanya, bukan hasil render, karena yang
 * dikunci adalah aturan yang menghasilkan angka di atas.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

/**
 * Buang komentar baris dan blok.
 *
 * Alasannya teknis, bukan soal kebersihan. `site.css` menyebut
 * `@media (min-width: 1200px)` di dalam komentar, di baris yang lebih tinggi
 * daripada blok `@media` yang sebenarnya. Tanpa komentar dibuang, `indexOf`
 * mengembalikan posisi di dalam komentar itu, dan `slice` dari posisi blok
 * mobile ke posisi blok desktop menjadi rentang terbalik yang hasilnya string
 * kosong. Tes lalu melaporkan aturan yang benar-benar ada sebagai hilang.
 *
 * Cara yang sama dipakai `tests/panel-nav-mobile.test.ts` dan
 * `tests/kembali-ke-atas.test.ts` untuk alasan yang sama.
 */
function kodeSaja(teks: string): string {
  return teks.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const navbar = sumber("src/components/layout/Navbar.tsx");
const siteCss = sumber("src/styles/site.css");
const css = kodeSaja(siteCss);

/**
 * Isi satu blok CSS, dari `{` pembuka sampai `}` penutupnya.
 *
 * Berhenti di `}` yang seimbang, bukan di akhir berkas. Alasannya teknis:
 * blok `@media (min-width: 1200px)` diikuti aturan footer yang juga memakai
 * `order`. Kalau blok tidak dibatasi, pembacaan `order` ikut menghitung
 * aturan footer, dan tes urutannya gagal tanpa sebab yang ada di header.
 */
function isiBlok(teks: string, mulai: number): string {
  const buka = teks.indexOf("{", mulai);
  if (buka === -1) throw new Error("pembuka blok CSS tidak ditemukan");
  let kedalaman = 0;
  for (let i = buka; i < teks.length; i += 1) {
    if (teks[i] === "{") kedalaman += 1;
    else if (teks[i] === "}") {
      kedalaman -= 1;
      if (kedalaman === 0) return teks.slice(buka + 1, i);
    }
  }
  throw new Error("blok CSS tidak ditutup");
}

/** Isi blok media query desktop, dari batas 1200px ke bawah. */
function blokDesktop(): string {
  const mulai = css.indexOf("@media (min-width: 1200px) {");
  if (mulai === -1) throw new Error("blok desktop 1200px tidak ada di site.css");
  return isiBlok(css, mulai);
}

/**
 * Isi blok media query mobile, yaitu blok yang menyembunyikan CTA sekaligus
 * mengubah `.navmenu` menjadi panel off-canvas.
 *
 * `site.css` hanya punya satu blok `@media (max-width: 1199.98px)`. Dulu CTA
 * punya bloknya sendiri dengan batas yang sama; keduanya digabung supaya
 * batas panel dan batas penyembunyian CTA tidak mungkin melenceng satu sama
 * lain.
 */
function blokMobile(): string {
  const mulai = css.indexOf("@media (max-width: 1199.98px) {");
  if (mulai === -1) throw new Error("blok mobile 1199.98px tidak ada di site.css");
  return isiBlok(css, mulai);
}

describe("header desktop dua baris", () => {
  it("baris header boleh membungkus supaya nav bisa turun ke baris sendiri", () => {
    // Tanpa `wrap`, `order` hanya menukar urutan di dalam satu baris flex dan
    // nav tetap memperebutkan ruang satu baris yang memang tidak cukup.
    expect(blokDesktop()).toMatch(/\.header-nav-menu \{[^}]*flex-wrap:\s*wrap/);
  });

  it("nav mengisi baris penuh, dan urutannya logo, CTA, nav", () => {
    const blok = blokDesktop();
    // `flex-basis: 100%` itulah yang memaksa nav ke baris baru.
    expect(blok).toMatch(/\.header-nav-menu > \.navmenu \{[^}]*flex:\s*1 0 100%/);

    const order = blok.match(/order:\s*(\d)/g) ?? [];
    expect(order).toEqual(["order: 1", "order: 2", "order: 3"]);
  });

  it("nav dipusatkan di baris kedua", () => {
    // Kalau menempel kiri, baris kedua terlihat berantakan dibanding logo
    // yang menempel kiri di baris pertama.
    expect(blokDesktop()).toMatch(
      /\.header-nav-menu > \.navmenu \{[^}]*justify-content:\s*center/,
    );
  });
});

describe("CTA header tidak disembunyikan di desktop", () => {
  it("hanya disembunyikan di bawah 1200px", () => {
    // Di bawah 1200px logo + dua CTA + hamburger tidak muat berdampingan, dan
    // yang disembunyikan hanya CTA, bukan nav. Batasnya 1199.98px mengikuti
    // konvensi Bootstrap `.98` supaya tidak bentrok tepat di titik batas.
    const blok = blokMobile();
    expect(blok).toContain(".header-ctas");
    // `!important` wajib: markup memakai `d-sm-flex` Bootstrap yang menulis
    // `display: flex !important`, jadi `display: none` biasa kalah.
    expect(blok).toMatch(/display:\s*none\s*!important/);

    // Batasnya harus mobile, bukan desktop. `isiBlok` mengembalikan isi blok
    // tanpa `@media`-nya, jadi teks batasnya tidak ikut di dalam `blok`.
    // Yang diuji di sini posisinya: aturan penyembunyi harus muncul sebelum
    // blok desktop dimulai. Kalau tidak, aturan itu berlaku di desktop juga.
    const posisiAturan = css.indexOf(
      "display: none !important",
      css.indexOf(".header-ctas {"),
    );
    const posisiDesktop = css.indexOf("@media (min-width: 1200px)");
    expect(posisiAturan).toBeGreaterThan(-1);
    expect(posisiAturan).toBeLessThan(posisiDesktop);
  });

  it("tidak ada aturan global yang menyembunyikan CTA", () => {
    // Aturan dasar `.header-ctas` tidak boleh menyentuh `display`. Kalau ia
    // menyembunyikan tombol, tombol hilang di semua lebar termasuk desktop.
    const dasar = css.match(/(?:^|})\s*\.header-ctas \{([^}]*)\}/);
    expect(dasar, "aturan dasar .header-ctas tidak ditemukan").not.toBeNull();
    expect(
      dasar?.[1],
      "aturan dasar .header-ctas tidak boleh menyentuh display",
    ).not.toMatch(/display\s*:/);

    // Dan hanya boleh ada satu aturan `.header-ctas` yang menyentuh
    // `display`, yaitu yang di blok mobile.
    //
    // Yang dihitung adalah aturan yang benar-benar menyebut `.header-ctas`
    // sebagai selector dan punya properti `display`, bukan sekadar berapa kali
    // teks `.header-ctas {` muncul. Menghitung kemunculan teks rapuh:
    // `.header-nav-menu > .header-ctas {` juga cocok pola yang sama, hanya
    // saja itu aturan `order`, bukan aturan penyembunyi.
    const menyembunyikan = [
      ...css.matchAll(/\.header-ctas \{([^}]*)\}/g),
    ].filter((m) => /display\s*:/.test(m[1]));
    expect(
      menyembunyikan,
      "hanya blok mobile yang boleh menyembunyikan CTA",
    ).toHaveLength(1);
    expect(menyembunyikan[0][1]).toMatch(/display:\s*none\s*!important/);
  });

  it("nav desktop tidak pernah menyusut atau membungkus", () => {
    // Nav harus tetap satu baris penuh 894px di semua lebar desktop. Kalau
    // ia boleh membungkus, butir terakhir turun ke baris ketiga dan tinggi
    // header berubah-ubah mengikuti isi setiap halaman.
    const dasar = siteCss.slice(
      siteCss.indexOf(".navmenu > ul {"),
      siteCss.indexOf("}", siteCss.indexOf(".navmenu > ul {")),
    );
    expect(dasar).not.toMatch(/flex-wrap/);
    expect(siteCss).toMatch(/\.navmenu \{[^}]*flex-shrink: 0;/);
    expect(siteCss).toMatch(/\.logo \{[^}]*flex-shrink: 0;/);
  });
});

describe("CTA tetap terjangkau walau disembunyikan di mobile", () => {
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

describe("desktop tanpa hamburger, mobile dengan hamburger", () => {
  it("hamburger ada di markup dan disembunyikan di desktop", () => {
    expect(navbar).toContain('className="mobile-nav-toggle d-xl-none bi bi-list"');
    // Kalau hamburger ikut masuk ke dalam `<nav>`, ia ikut tergeser ke kanan
    // bersama panel off-canvas sehingga tidak bisa diklik.
    const nav = navbar.slice(navbar.indexOf("<nav"), navbar.indexOf("</nav>"));
    expect(nav).not.toContain("mobile-nav-toggle");
  });
});
