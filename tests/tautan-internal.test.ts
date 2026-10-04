import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectNavPaths, hasOwnRoute } from "@/lib/nav-path";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";

/**
 * Penjaga tautan internal yang ditulis langsung di komponen.
 *
 * `tests/nav-path.test.ts` sudah menjaga tautan yang ada di
 * `src/data/navigation.ts`. Tapi banyak tautan lain ditulis langsung sebagai
 * literal di dalam `.tsx`, misalnya `<Link href="/daftar-online">`. Literal itu
 * tidak ikut dibaca tes lama, dan `/register` di halaman Radiologi serta
 * Laboratorium sudah bertahan sebagai 404 cukup lama sebelum tes ini ada.
 *
 * Berkas dan nama route-nya dibaca dari filesystem dan dari
 * `collectNavPaths()`, jadi route baru ikut terk begitu foldernya dibuat.
 */

const AKAR = path.resolve(import.meta.dirname, "..");

/**
 * Folder di `src/app` yang punya `page.tsx`, ditulis sebagai path URL.
 *
 * Folder dinamis tidak ikut karena slugnya dari data, bukan nama folder.
 */
function routeFolders(): string[] {
  const appDir = path.join(AKAR, "src/app");
  const out: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(appDir, full).split(path.sep).join("/");
      // Grup route `(nama)` bukan segmen URL: `/admin/(panel)/page.tsx`
      // melayani `/admin`, bukan `/admin/(panel)`. Tanpa penyaringan ini
      // tautan ke `/admin` dilaporkan mati padahal halamannya ada.
      const bersih = rel
        .split("/")
        .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
        .join("/");
      const statis = !entry.name.startsWith("[");
      if (statis && existsSync(path.join(full, "page.tsx"))) {
        out.push(bersih === "" ? "/" : `/${bersih}`);
      }
      walk(full);
    }
  };

  walk(appDir);
  return out;
}

/** Semua berkas `.tsx` di bawah `src`. */
function berkasTsx(): string[] {
  const out: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) out.push(full);
    }
  };

  walk(path.join(AKAR, "src"));
  return out;
}

/**
 * Path literal pada atribut `href`.
 *
 * Hanya literal yang dibaca. `href={`/berita/${slug}`}` memakai backtick dan
 * tidak ikut, karena path-nya baru lengkap saat render.
 */
function literalHref(): { href: string; dari: string }[] {
  const pola = /href="([^"{}]+)"|href='([^'{}+]+)'/g;
  const out: { href: string; dari: string }[] = [];

  for (const berkas of berkasTsx()) {
    const isi = readFileSync(berkas, "utf8");
    const relatif = path.relative(AKAR, berkas);

    for (const cocok of isi.matchAll(pola)) {
      const href = cocok[1] ?? cocok[2];
      if (!href || !href.startsWith("/") || href.startsWith("//")) continue;
      out.push({ href: href.split("#")[0].split("?")[0] || "/", dari: relatif });
    }
  }

  return out;
}

/** Apakah path ini dilayani route mana pun di aplikasi? */
function dilayani(href: string): boolean {
  if (href === "/") return true;
  if (hasOwnRoute(href)) return true;
  if (routeFolders().includes(href)) return true;
  return collectNavPaths().some((e) => `/${e.slug.join("/")}` === href);
}

describe("tautan internal yang ditulis langsung", () => {
  it("penyaringnya benar-benar menemukan tautan", () => {
    // Penjaga untuk penjaga. Kalau regex-nya tidak lagi cocok dengan
    // penulisan di repo, semua tes di bawah ini lulus karena tidak ada
    // yang benar-benar diperiksa.
    const ditemukan = literalHref();
    expect(ditemukan.length).toBeGreaterThan(5);
    expect(new Set(ditemukan.map((d) => d.href)).size).toBeGreaterThan(5);
  });

  it("semuanya punya halaman", () => {
    const mati = literalHref()
      .filter((d) => !dilayani(d.href))
      .map((d) => `${d.href}  <-  ${d.dari}`);

    expect(mati, `tautan mati:\n${mati.join("\n")}`).toEqual([]);
  });

  it("tidak menautkan endpoint API sebagai halaman", () => {
    // Tautan ke `/api/...` di dalam markup membuat peramban menampilkan
    // respons JSON. Endpoint punya handler sendiri di `src/app/api`, jadi
    // tautan seperti itu hampir selalu salah.
    const api = literalHref()
      .filter((d) => d.href.startsWith("/api/"))
      .map((d) => `${d.href}  <-  ${d.dari}`);

    expect(api, `tautan API di markup:\n${api.join("\n")}`).toEqual([]);
  });
});

describe("rute kembar", () => {
  /**
   * Dua halaman diagnostik pernah hidup di dua URL sekaligus: `/laboratorium`
   * dan `/pelayanan/diagnostik/laboratorium`, begitu juga radiologi. Yang datar
   * tidak pernah ditautkan dari mana pun, jadi isinya tidak pernah ditemukan
   * lewat penelusuran tautan. Setelah pemilik repo memutuskan, isinya dipindah
   * ke route berprefix dan folder datar dihapus.
   *
   * Yang dijaga di sini hanya foldernya. Isinya tidak hilang: semua kartu
   * dan daftar dari kedua halaman itu sekarang ada di `DIAGNOSTIC_SERVICES`
   * dan diperiksa `tests/konten-detail.test.ts`.
   */
  it("halaman kembar yang datar tidak ada lagi", () => {
    const folder = routeFolders();

    for (const rute of ["/laboratorium", "/radiologi"]) {
      expect(folder, `${rute} seharusnya sudah dihapus`).not.toContain(rute);
      expect(existsSync(path.join(AKAR, "src/app", rute))).toBe(false);
    }
  });

  it("slug diagnostik hanya dilayani route berprefix", () => {
    // Isinya dipindah ke `DIAGNOSTIC_SERVICES`, jadi slug yang menentukan
    // URL ada di sana, bukan di nama folder.
    expect(DIAGNOSTIC_SERVICES.map((d) => d.slug)).toEqual([
      "laboratorium",
      "radiologi",
    ]);
    expect(
      existsSync(path.join(AKAR, "src/app/pelayanan/diagnostik/[slug]/page.tsx")),
      "route berprefix harus ada",
    ).toBe(true);
  });
});
