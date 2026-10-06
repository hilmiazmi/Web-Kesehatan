import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as sass from "sass";

/**
 * Setiap kelas Bootstrap yang dipakai harus ada di CSS hasil subset.
 *
 * `src/styles/bootstrap-subset.scss` hanya mengimpor modul Bootstrap yang
 * dipakai (lihat komentar di berkas itu). Kalau suatu hari sebuah halaman
 * memakai modul yang dibuang — mis. modal untuk dialog baru — tanpa
 * menambahkannya kembali, halaman itu rusak tanpa satu pun test yang gagal:
 * kelasnya tetap tertulis di markup, hanya saja tidak ada aturannya.
 *
 * Tes ini menutup lubang itu: semua token kelas di `src/` harus terdefinisi
 * sebagai selector di CSS hasil kompilasi subset, di salah satu CSS milik
 * sendiri, atau di daftar izin yang didokumentasikan di bawah.
 *
 * SCSS dikompilasi di dalam tes memakai paket `sass` (devDependency), jadi
 * yang diperiksa adalah hasil yang sama persis dengan yang dipakai build
 * produksi, bukan tebakan dari daftar `@import`.
 */

const AKAR = path.resolve(import.meta.dirname, "..");

/** Semua berkas `.ts` dan `.tsx` di bawah `src/`. */
function berkasSumber(dir: string, keluar: string[] = []): string[] {
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) berkasSumber(penuh, keluar);
    else if (penuh.endsWith(".ts") || penuh.endsWith(".tsx")) keluar.push(penuh);
  }
  return keluar;
}

/**
 * Semua token kelas di `src/`.
 *
 * Diambil dari literal `className="..."` dan `class="..."`, plus bagian statis
 * template literal (`className={`...${v ? "active show" : ""}`}`).
 * String lain (teks tampilan, aria-label, placeholder) sengaja tidak dibaca:
 * pemindaian lama yang membaca string ber ready-to-use apa pun menangkap kata
 * bahasa Indonesia biasa seperti "tentang kami" sebagai kelas.
 */
function tokenKelas(): Set<string> {
  const found = new Set<string>();
  const simpan = (teks: string): void => {
    for (const t of teks.split(/\s+/)) {
      if (/^[a-z][a-z0-9-]*$/.test(t)) found.add(t);
    }
  };

  for (const berkas of berkasSumber(path.join(AKAR, "src"))) {
    const teks = readFileSync(berkas, "utf8");
    for (const m of teks.matchAll(/class(?:Name)?="([^"]+)"/g)) simpan(m[1]);
    for (const m of teks.matchAll(/class(?:Name)?=\{`([^`]+)`\}/g)) {
      simpan(m[1].replace(/\$\{[^}]*\}/g, " "));
    }
  }
  return found;
}

/**
 * Kelas yang tidak perlu ada aturannya, beserta alasannya.
 *
 * `TEPAT`: token utuh yang memang tidak punya aturan di mana pun — termasuk di
 * Bootstrap penuh, jadi subset tidak merusak apa pun. `quick-action-wa`
 * misalnya hanya penanda di data (`src/data/quick-action.ts`) dan wajib tidak
 * kosong menurut `tests/quick-action.test.ts`, jadi tidak bisa dibuang.
 *
 * `AWALAN`: awalan token dinamis yang bentuk penuhnya dibuat saat runtime.
 * `dropdown-depth-${depth}` di Navbar menghasilkan `dropdown-depth-0/1/2`
 * sesuai kedalaman menu. Bentuk yang dipakai harus ada aturannya.
 */
const IZIN_TEPAT: Record<string, string> = {
  "quick-action-wa": "penanda di data quick-action, wajib tidak kosong",
};

const IZIN_AWALAN: Record<string, string> = {
  "dropdown-depth-": "kedalaman dropdown dihitung saat render",
};

/** Hasil kompilasi subset, dihitung sekali untuk semua tes. */
function cssSubset(): string {
  return sass.compile(path.join(AKAR, "src/styles/bootstrap-subset.scss"), {
    style: "expanded",
    // Next.js mengisi ini otomatis saat build; kompilasi manual harus
    // menyebutkannya sendiri supaya `@import "bootstrap/scss/..."` resolve.
    loadPaths: [path.join(AKAR, "node_modules")],
    silenceDeprecations: ["import", "global-builtin", "color-functions"],
  }).css;
}

/** CSS milik sendiri yang juga mendefinisikan kelas. */
function cssSendiri(): string {
  return [
    "src/styles/tokens.css",
    "src/styles/site.css",
    "src/styles/pages.css",
    "src/styles/home.css",
    "src/styles/admin.css",
    "src/styles/icons/bootstrap-icons.css",
  ]
    .map((rel) => readFileSync(path.join(AKAR, rel), "utf8"))
    .join("\n");
}

const SUBSET = cssSubset();
const SENDIRI = cssSendiri();

/** Benar kalau `.nama` muncul sebagai selector di CSS (bukan substring). */
function terdefinisi(css: string, token: string): boolean {
  const aman = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${aman}(?![\\w-])`).test(css);
}

describe("cakupan kelas Bootstrap subset", () => {
  it("setiap token kelas dipakai terdefinisi di suatu tempat", () => {
    const hilang: string[] = [];

    for (const token of [...tokenKelas()].sort()) {
      if (IZIN_TEPAT[token]) continue;
      if (Object.keys(IZIN_AWALAN).some((awalan) => token.startsWith(awalan))) {
        continue;
      }
      if (terdefinisi(SUBSET, token)) continue;
      if (terdefinisi(SENDIRI, token)) continue;
      hilang.push(token);
    }

    expect(
      hilang,
      `Kelas dipakai tapi tidak ada aturannya. Kalau kelas Bootstrap, tambahkan modulnya ke bootstrap-subset.scss.\n${hilang.join("\n")}`,
    ).toEqual([]);
  });

  it("daftar izin tidak memuat kelas yang sebenarnya sudah terdefinisi", () => {
    // Kalau suatu kelas di IZIN ternyata sudah ada aturannya, entrinya
    // kedaluwarsa dan harus dihapus supaya daftar tetap jujur.
    const basi = Object.keys(IZIN_TEPAT).filter(
      (token) => terdefinisi(SUBSET, token) || terdefinisi(SENDIRI, token),
    );
    expect(basi).toEqual([]);
  });

  it("setiap awalan izin punya bentuk penuh yang terdefinisi", () => {
    // `dropdown-depth-${depth}` di Navbar menghasilkan depth-0/1/2/3 saat
    // render. Dari semuanya, hanya depth-0 yang punya aturan
    // (`.dropdown-depth-0 > a .toggle-dropdown` di site.css); kedalaman lain
    // sengaja mewarisi tanpa aturan tambahan, sama seperti sebelum subset
    // dibuat. Yang dikunci di sini adalah bentuk yang memang beraturan itu
    // tetap ada — kalau aturannya dihapus, chevron desktop ikut hilang.
    expect(terdefinisi(SENDIRI, "dropdown-depth-0")).toBe(true);
  });

  it("modul berat yang dibuang tetap tidak terpakai", () => {
    // Penjaga arah sebaliknya: kalau suatu hari modal/carousel/toast dipakai
    // tanpa modulnya dikembalikan, tes cakupan di atas gagal — tapi pesannya
    // tidak menyebut modul mana. Tes ini menyebutkannya langsung.
    //
    // Dicocokkan sebagai token utuh, bukan substring: pencocokan substring
    // pernah menuduh `placeholder` (atribut HTML `placeholder="..."`) dan
    // `alert` (kelas custom `admin-alert-*`) sebagai pemakaian modul.
    const token = new Set<string>();
    for (const berkas of berkasSumber(path.join(AKAR, "src"))) {
      const teks = readFileSync(berkas, "utf8");
      for (const m of teks.matchAll(/class(?:Name)?="([^"]+)"/g)) {
        for (const t of m[1].split(/\s+/)) if (t) token.add(t);
      }
      for (const m of teks.matchAll(/class(?:Name)?=\{`([^`]+)`\}/g)) {
        for (const t of m[1].replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) {
          if (/^[a-z][a-z0-9-]*$/.test(t)) token.add(t);
        }
      }
      if (/data-bs-toggle="(modal|tooltip|popover|collapse|dropdown|tab|offcanvas|carousel)"/.test(teks)) {
        token.add(`data-bs:${RegExp.$1}`);
      }
    }

    const ada = (...nama: string[]): boolean => nama.some((n) => token.has(n));
    const dipakai: string[] = [];
    if (ada("modal", "modal-dialog", "modal-content", "data-bs:modal")) dipakai.push("modal");
    if (ada("carousel", "carousel-item", "carousel-control-prev", "carousel-indicators", "data-bs:carousel")) {
      dipakai.push("carousel");
    }
    if (ada("toast", "toast-container", "toast-header")) dipakai.push("toast");
    if (ada("tooltip", "data-bs:tooltip")) dipakai.push("tooltip");
    if (ada("popover", "data-bs:popover")) dipakai.push("popover");
    if (ada("accordion", "accordion-item", "accordion-button", "data-bs:collapse")) {
      dipakai.push("accordion");
    }
    if (ada("offcanvas", "data-bs:offcanvas")) dipakai.push("offcanvas");
    if (ada("alert", "alert-dismissible", "alert-link")) dipakai.push("alert");
    if (ada("badge")) dipakai.push("badge");
    if (ada("list-group", "list-group-item")) dipakai.push("list-group");
    if (ada("progress", "progress-bar")) dipakai.push("progress");
    if (ada("spinner-border", "spinner-grow")) dipakai.push("spinner");
    if (ada("placeholder", "placeholder-glow", "placeholder-wave")) dipakai.push("placeholder");
    if (ada("pagination", "page-link", "page-item")) dipakai.push("pagination");
    if (ada("btn-close")) dipakai.push("close");
    if (ada("dropdown-menu", "dropdown-item", "dropdown-toggle", "data-bs:dropdown", "data-bs:tab")) {
      dipakai.push("dropdown");
    }
    if (ada("navbar-expand", "navbar-toggler", "navbar-collapse")) dipakai.push("navbar");
    if (ada("btn-group", "btn-toolbar", "btn-check")) dipakai.push("button-group");
    if (ada("collapse", "collapsing", "fade")) dipakai.push("transitions");

    expect(
      dipakai,
      `Modul ini dipakai tapi tidak diimpor di bootstrap-subset.scss: ${dipakai.join(", ")}`,
    ).toEqual([]);
  });
});
