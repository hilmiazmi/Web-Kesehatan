import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Panel navigasi mobile harus bisa ditutup.
 *
 * Panelnya off-canvas selebar 340px dari kanan, dan tombol hamburger juga ada
 * di kanan. Saat panel terbuka keduanya menempati koordinat yang sama, sehingga
 * mengetuk hamburger tidak menutup apa pun. Ditambah panel itu menutupi isi
 * halaman, jadi mengetuk area di luarnya juga tidak menutup apa pun. Akibatnya
 * satu-satunya cara menutup adalah Tab lalu Enter, atau memilih salah satu
 * tautan di dalam panel.
 *
 * Tes di sini membaca sumber apa adanya, bukan hasil render, karena yang
 * dikunci adalah keberadaan aturan dan urutan elemen di markup. Perilaku
 * sebenarnya dibuktikan di peramban pada lebar 390px.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

const navbar = sumber("src/components/layout/Navbar.tsx");
const siteCss = sumber("src/styles/site.css");

/**
 * Buang komentar baris dan blok.
 *
 * Alasannya teknis, bukan soal kebersihan. Aturan pembacaan properti di bawah
 * hanya menerima `^`, `{`, atau `;` tepat sebelum nama propertinya, supaya
 * tidak salah membaca properti lain yang namanya mirip. Kalau komentar belum
 * dibuang, `visibility: hidden` yang didahului penutup komentar tidak akan cocok,
 * dan aturan yang benar-benar ada di berkas akan terbaca tidak ada.
 *
 * `tests/kembali-ke-atas.test.ts` memakai cara yang sama untuk alasan yang sama.
 */
function kodeSaja(sumber: string): string {
  return sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Escape teks selector supaya aman dipakai di dalam RegExp. */
function pola(selector: string): string {
  return selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Isi blok media query mobile, dari batas 1199.98px sampai blok 1200px. */
function blokMobile(): string {
  return kodeSaja(
    siteCss.slice(
      siteCss.indexOf("@media (max-width: 1199.98px) {"),
      siteCss.indexOf("@media (min-width: 1200px) {"),
    ),
  );
}

/** Isi blok media query desktop, dari batas 1200px ke bawah. */
function blokDesktop(): string {
  return kodeSaja(siteCss.slice(siteCss.indexOf("@media (min-width: 1200px) {")));
}

/**
 * Nilai satu properti di dalam blok pertama yang cocok selector itu.
 *
 * `lingkup` wajib diisi eksplisit karena selector yang sama bisa muncul di
 * beberapa tempat. `.navmenu` misalnya ada dua blok: blok dasar yang berlaku
 * di semua lebar, dan blok kedua di dalam media query mobile. Tanpa lingkup,
 * pembacaan selalu mengambil yang dasar, dan aturan mobile-nya terlihat
 * hilang padahal ada.
 */
function nilai(lingkup: string, selector: string, properti: string): string {
  const blok = lingkup.match(new RegExp(pola(selector) + "\\s*\\{([^}]*)\\}"));
  if (!blok) return "";
  const cocok = blok[1].match(
    new RegExp("(?:^|[{;])\\s*" + properti + "\\s*:\\s*([^;]+)"),
  );
  return cocok ? cocok[1].trim() : "";
}

/** Semua angka satu properti di seluruh blok berlabel selector itu. */
function semuaAngka(lingkup: string, selector: string, properti: string): number[] {
  const hasil: number[] = [];
  const cari = new RegExp("(?:^|[{;])\\s*" + properti + "\\s*:\\s*(-?[\\d.]+)", "g");
  for (const blok of lingkup.matchAll(new RegExp(pola(selector) + "\\s*\\{([^}]*)\\}", "g"))) {
    for (const cocok of blok[1].matchAll(cari)) hasil.push(Number(cocok[1]));
  }
  return hasil;
}

/** Seluruh markup di antara `<nav>` dan `</nav>`. */
function isiNav(): string {
  return navbar.slice(navbar.indexOf("<nav"), navbar.indexOf("</nav>"));
}

describe("panel mobile tertutup: hilang dari keyboard dan pembaca layar", () => {
  it("navmenu yang tertutup visibility hidden, yang terbuka visible", () => {
    // `translateX(100%)` saja tidak cukup. Elemennya memang di luar layar,
    // tapi 74 tautan di dalamnya tetap bisa difokus, jadi Tab masuk ke menu
    // yang tidak terlihat dan pembaca layar membacakan isinya. `visibility`
    // menutup keduanya tanpa JavaScript, jadi benar sejak render pertama dan
    // tidak bergantung pada hydration.
    expect(nilai(blokMobile(), ".navmenu", "visibility")).toBe("hidden");
    expect(nilai(blokMobile(), ".navmenu.navmenu-open", "visibility")).toBe("visible");
  });

  it("panel tetap digeser, bukan disembunyikan dengan display", () => {
    // Kalau diganti `display: none`, transisi geser hilang dan panel akan
    // muncul mendadak. Mempertahankan `translateX` berarti perubahan ini hanya
    // menambah satu properti.
    expect(blokMobile()).toContain("translateX(100%)");
    expect(nilai(blokMobile(), ".navmenu", "display")).toBe("");
  });

  it("visibility ikut bertransisi, supaya panel terlihat selama keluar", () => {
    // `visibility` dianimasikan sebagai langkah diskret. Kalau tidak ikut
    // dalam `transition`, nilainya berubah seketika dan panel menghilang di
    // tengah gerakan, sebelum selesai bergeser ke kanan.
    const transisi = nilai(blokMobile(), ".navmenu", "transition");
    expect(transisi).toContain("transform");
    expect(transisi).toContain("visibility");
  });

  it("halaman yang menutup panel juga ikut punya overflow hidden dari JS", () => {
    // Panelnya `position: fixed` selebar 340px. Di layar 390px hanya 50px
    // konten yang tersisa, jadi tanpa penahanan halaman di bawahnya masih bisa
    // bergulir di belakang panel dan membuat orang mengira panelnya yang
    // bergerak.
    expect(navbar).toContain("navmenu-terbuka");
    expect(navbar).toContain('body.style.overflow = "hidden"');
  });
});

describe("panel mobile: tiga cara menutup", () => {
  it("latar penutup menutupi layar dan ada di bawah panel", () => {
    // Tanpa latar ini, satu-satunya area yang bisa diketuk untuk menutup adalah
    // bagian layar yang tidak tertutup panel, yaitu 50px di kiri pada layar
    // 390px. Jadi latar penutup adalah satu-satunya cara menutup dengan satu
    // ketukan di area kosong.
    expect(nilai(blokMobile(), ".navmenu-backdrop", "position")).toBe("fixed");
    expect(nilai(blokMobile(), ".navmenu-backdrop", "inset")).toBe("0");

    const zLatar = semuaAngka(blokMobile(), ".navmenu-backdrop", "z-index")[0];
    const zPanel = Math.max(...semuaAngka(blokMobile(), ".navmenu", "z-index"));
    expect(zLatar).toBeGreaterThan(0);
    expect(zLatar).toBeLessThan(zPanel);
  });

  it("latar penutup hanya dirender saat panel terbuka", () => {
    // Kalau dirender selalu, elemennya tetap ada di DOM saat panel tertutup dan
    // masih menutupi layar.
    expect(navbar).toMatch(/\{mobileOpen && \(\s*<button[^>]*className="navmenu-backdrop"/);
  });

  it("tombol tutup ada di dalam panel, dan menutup panel", () => {
    // Berada di dalam `<nav>` supaya ikut tersembunyi bersama panelnya.
    // Tombol hamburger wajib di luar `<nav>`: kalau ikut masuk, ia ikut
    // tergeser ke kanan bersama panel off-canvas sehingga tidak bisa diklik.
    expect(isiNav()).toContain("navmenu-close");
    expect(isiNav()).toContain('aria-label="Tutup menu"');
    expect(isiNav()).toContain("onClick={() => setMobileOpen(false)}");
  });

  it("Escape menutup panel, dan listener-nya dilepas lagi", () => {
    expect(navbar).toContain('e.key !== "Escape"');
    expect(navbar).toContain('document.addEventListener("keydown", tutup)');
    // Kalau tidak dilepas, setiap kali panel dibuka akan menambah satu
    // listener, dan Escape akan memicu setState berulang.
    expect(navbar).toContain('document.removeEventListener("keydown", tutup)');
  });
});

describe("panel mobile: fokus kembali setelah ditutup", () => {
  it("fokus kembali ke hamburger, tapi tidak saat halaman baru dimuat", () => {
    // Fokus yang hilang begitu panel tertutup membuat pengguna keyboard
    // kehilangan tempat fokusnya. Tapi memindahkan fokus ke hamburger pada
    // render pertama juga salah: pembaca layar tidak lagi membacakan isi
    // halaman, hanya mengumumkan "Buka menu".
    expect(navbar).toContain("const tombolRef = useRef<HTMLButtonElement>(null)");
    expect(navbar).toMatch(/<button\s+ref=\{tombolRef\}/);
    expect(navbar).toContain("const pernahTerbuka = useRef(false)");
    expect(navbar).toContain("if (pernahTerbuka.current && !mobileOpen)");
  });

  it("tombol kembali ke atas disembunyikan saat panel terbuka", () => {
    // Angkanya tidak diturunkan, karena `tests/kembali-ke-atas.test.ts`
    // mengunci 1199 sebagai satu-satunya nilai `z-index` pada blok itu.
    // `display: none` juga tidak bisa dipakai: `BackToTop` memakai `d-flex`
    // dari Bootstrap yang menulis `display: flex !important`, jadi `display`
    // biasa kalah dan tombolnya tetap bisa diklik di atas latar penutup.
    const aturan = kodeSaja(siteCss).match(
      /body\.navmenu-terbuka \.scroll-top\s*\{([^}]*)\}/,
    );
    expect(aturan).not.toBeNull();
    expect(aturan![1]).toContain("visibility: hidden");
    expect(aturan![1]).not.toContain("z-index");
    expect(blokMobile()).toContain("body.navmenu-terbuka .scroll-top");
  });
});

describe("panel mobile: keadaan desktop tidak tersentuh", () => {
  it("tombol tutup dan latar penutup disembunyikan di desktop", () => {
    // Keduanya hanya berguna untuk panel off-canvas. Di desktop panelnya tidak
    // pernah ada, jadi keduanya harus hilang dan tidak menambah apa pun ke tata
    // letak maupun ke urutan fokus.
    const aturan = blokDesktop().match(
      /\.navmenu-close,\s*\.navmenu-backdrop\s*\{([^}]*)\}/,
    );
    expect(aturan).not.toBeNull();
    expect(aturan![1]).toContain("display: none");
  });

  it("blok dasar .navmenu tidak memakai properti baru", () => {
    // Aturan `visibility` hanya boleh ada di blok mobile. Kalau ditulis di blok
    // dasar, nav desktop ikut hilang di lebar mana pun.
    const dasar = kodeSaja(siteCss).match(/\.navmenu\s*\{([^}]*)\}/)![1];
    expect(dasar).not.toContain("visibility");
    expect(dasar).toContain("flex-shrink: 0");
  });

  it("tidak ada batas lebar baru yang muncul", () => {
    // Batas yang sah: 1495.98px yang hanya menyembunyikan `.header-ctas`
    // (dikunci `tests/header-ctas.test.ts`). Blok itu dikeluarkan dulu supaya
    // tidak menutupi batas liar yang lain.
    const tanpaCta = siteCss.replace(
      /@media \(max-width: 1495\.98px\) \{\s*\.header-ctas \{[^}]*\}\s*\}/,
      "",
    );
    expect(tanpaCta).not.toMatch(/@media \((?:max|min)-width: 1[3-5][0-9]{2}(?:\.\d+)?px/);
  });

  it("batas 1200px tetap sama di CSS dan di logika percabangan", () => {
    // `isDesktopNav()` di Navbar menentukan apakah submenu memakai hover atau
    // accordion. Kalau batasnya berbeda dari media query CSS, submenu akan
    // memakai perilaku yang salah di rentang lebar antara keduanya.
    expect(siteCss).toContain("@media (max-width: 1199.98px) {");
    expect(siteCss).toContain("@media (min-width: 1200px) {");
    expect(navbar).toContain('window.matchMedia("(min-width: 1200px)").matches');
  });
});