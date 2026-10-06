import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Subset ikon harus selalu sama dengan ikon yang benar-benar dipakai.
 *
 * Ikon di situs ini datang dari satu font: `bootstrap-icons`. Yang dikirim ke
 * peramban bukan font penuh, melainkan subset hasil `bun run subset-ikon`,
 * karena pengukuran menunjukkan situs memakai 72 ikon dari 2078 yang tersedia,
 * sementara font penuh 131 KB dan tidak bisa dikecilkan gzip karena sudah
 * terkompresi.
 *
 * Dua kegagalan yang mungkin terjadi, dan keduanya tidak terlihat dari halaman
 * mana pun tanpa membuka DevTools:
 *
 * - Ikon dipakai di `src/` tapi tidak ada di subset. Ikonnya lalu tidak tampil
 *   sama sekali. Ini yang terjadi pada `bi-stethoscope`, yang memang tidak ada
 *   di bootstrap-icons 1.13.1.
 * - Ikon ada di subset tapi tidak dipakai lagi. Itu hanya boros beberapa ratus
 *   byte dan tidak seburu yang kasus pertama, jadi tidak diuji di sini.
 *
 * Berkas sumber dibaca dari filesystem, bukan dari daftar yang ditulis tangan,
 * jadi ikon baru ikut terk begitu hanya berkas `.tsx`-nya ditulis.
 */

const AKAR = path.resolve(import.meta.dirname, "..");
const CSS_HASIL = path.join(AKAR, "src/styles/icons/bootstrap-icons.css");
const FONT_HASIL = path.join(AKAR, "src/styles/icons/fonts/bootstrap-icons-subset.woff");
const CSS_ASLI = path.join(
  AKAR,
  "node_modules/bootstrap-icons/font/bootstrap-icons.css",
);

/** Semua berkas `.ts` dan `.tsx` di bawah `src/`. */
function berkasSumber(dir: string, keluar: string[] = []): string[] {
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) berkasSumber(penuh, keluar);
    else if (entri.name.endsWith(".ts") || entri.name.endsWith(".tsx")) keluar.push(penuh);
  }
  return keluar;
}

/**
 * Semua kelas ikon yang muncul di `src/`.
 *
 * Pola `\bbi-` dipakai supaya yang ikut terambil hanya kelas ikon, bukan kata
 * yang kebetulan memuat huruf yang sama di tengah.
 */
function ikonDipakai(): Set<string> {
  const pola = /\bbi-[a-z0-9-]+/g;
  const found = new Set<string>();
  for (const berkas of berkasSumber(path.join(AKAR, "src"))) {
    if (berkas.endsWith(path.join("styles", "icons", "bootstrap-icons.css"))) continue;
    for (const cocok of readFileSync(berkas, "utf8").matchAll(pola)) found.add(cocok[0]);
  }
  return found;
}

/** Nama ikon yang punya aturan `::before` di CSS hasil. */
function ikonDiSubset(): Set<string> {
  const css = readFileSync(CSS_HASIL, "utf8");
  return new Set(
    [...css.matchAll(/^\.(bi-[a-z0-9-]+)::before \{ content: "\\[0-9a-fA-F]+"; \}$/gm)].map(
      (m) => m[1],
    ),
  );
}

/** Nama ikon yang punya aturan `::before` di CSS asli dari node_modules. */
function ikonDiPaket(): Set<string> {
  const css = readFileSync(CSS_ASLI, "utf8");
  return new Set(
    [...css.matchAll(/^\.(bi-[a-z0-9-]+)::before \{ content: "\\[0-9a-fA-F]+"; \}$/gm)].map(
      (m) => m[1],
    ),
  );
}

const dipakai = ikonDipakai();
const subset = ikonDiSubset();

describe("berkas hasil ada", () => {
  it("CSS dan font subset sudah ada di repository", () => {
    // Keduanya ikut dik-commit supaya build produksi tidak bergantung pada
    // pyftsubset, yang hanya ada di mesin pengembangan.
    expect(existsSync(CSS_HASIL)).toBe(true);
    expect(existsSync(FONT_HASIL)).toBe(true);
  });

  it("CSS subset menunjuk font subset, bukan font penuh", () => {
    const css = readFileSync(CSS_HASIL, "utf8");
    expect(css).toContain("./fonts/bootstrap-icons-subset.woff");
    // URL dari node_modules tidak akan resolve kalau berkas disalin ke src/.
    expect(css).not.toContain("bootstrap-icons.woff2?");
    expect(css).not.toMatch(/src:\s*url\("\.\/fonts\/bootstrap-icons\.woff2"\)/);
  });

  it("hanya ada satu @font-face, dan kurung kurawalnya seimbang", () => {
    // Dua @font-face pernah terjadi karena generator mengambil blok dari
    // sumber dan menambahkan @font-face sendiri. Dua blok dengan nama font
    // yang sama membuat peramban memakai yang terakhir, dan urutannya
    // bergantung pada sumber.
    const css = readFileSync(CSS_HASIL, "utf8");
    expect((css.match(/@font-face/g) ?? [])).toHaveLength(1);
    expect((css.match(/\{/g) ?? [])).toHaveLength((css.match(/\}/g) ?? []).length);
  });

  it("reset .bi ikut terbawa, tanpa itu ikon tidak tampil", () => {
    const css = readFileSync(CSS_HASIL, "utf8");
    // Tanpa reset ini, glifnya ada tapi tidak ada kotak yang menggambar
    // font-family, jadi ikon tidak terlihat sama sekali.
    expect(css).toContain('[class^="bi-"]::before');
    expect(css).toMatch(/font-family:\s*bootstrap-icons\s*!important/);
  });
});

describe("subset benar-benar memuat semua ikon yang dipakai", () => {
  it("tidak ada ikon yang dipakai tapi hilang dari subset", () => {
    const hilang = [...dipakai].filter((nama) => !subset.has(nama)).sort();
    expect(
      hilang,
      `Ikon dipakai tapi tidak ada di subset. Jalankan: bun run subset-ikon\n${hilang.join("\n")}`,
    ).toEqual([]);
  });

  it("tidak ada ikon yang tidak ada di paket aslinya", () => {
    // Ikon yang tidak ada di bootstrap-icons merender kotak kosong, dan itu
    // sempat terjadi: bi-stethoscope dipakai untuk butir Poliklinik padahal
    // ikon itu tidak ada di versi 1.13.1.
    const paket = ikonDiPaket();
    const palsu = [...dipakai].filter((nama) => !paket.has(nama)).sort();
    expect(
      palsu,
      `Ikon ini tidak ada di bootstrap-icons sama sekali:\n${palsu.join("\n")}`,
    ).toEqual([]);
  });

  it("jumlah ikon yang dipakai masuk akal", () => {
    // Kalau lewat 200, subset sudah kehilangan gunanya dan subset penuh
    // lebih sederhana. Kalau nol, pemindaiannya rusak.
    expect(dipakai.size).toBeGreaterThan(20);
    expect(dipakai.size).toBeLessThanOrEqual(200);
  });
});

describe("hematannya nyata, bukan di kertas saja", () => {
  it("font subset jauh lebih kecil dari font paket", () => {
    const kecil = statSync(FONT_HASIL).size;
    const penuh = statSync(
      path.join(AKAR, "node_modules/bootstrap-icons/font/fonts/bootstrap-icons.woff"),
    ).size;
    // diukkit 7,9 KB dari 176,1 KB. Ambang 80% dipilih supaya tes ini gagal
    // kalau subset nanti ikut rusak dan diam-diam kembali ke isi penuh.
    expect(kecil).toBeLessThan(penuh * 0.2);
  });

  it("CSS subset jauh lebih kecil dari CSS paket", () => {
    const kecil = statSync(CSS_HASIL).size;
    const penuh = statSync(CSS_ASLI).size;
    expect(kecil).toBeLessThan(penuh * 0.2);
  });
});