import { describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * `sitemap()` sekarang async karena daftar beritanya dibaca lewat loader, bukan
 * dari modul statis. Tanpa mock di bawah, setiap pemanggilan di berkas ini akan
 * mencoba membuka soket PostgreSQL yang memang tidak ada di lingkungan test.
 * `null` berarti mode snapshot, jadi loader mengembalikan data statis dan
 * hasilnya persis sama seperti sebelumnya modul statis dibaca langsung.
 */
vi.mock("@/server/db/client", () => ({
  dbOrNull: () => null,
}));

const { default: sitemap } = await import("@/app/sitemap");
import { collectSitemapPaths } from "@/lib/sitemap";
import { collectNavPaths, hasOwnRoute } from "@/lib/nav-path";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";
import { MANAGEMENT } from "@/data/manajemen";

/**
 * Penjaga `sitemap.xml`.
 *
 * Yang dijaga di sini bukan tampilannya, tapi cakupan dan kebenarannya.
 * Dua kelas kesalahan yang pernah terjadi dan tidak terlihat dari mata:
 *
 * - Halaman hilang dari sitemap. `collectNavPaths()` melewati path yang punya
 *   folder sendiri, jadi `/ppid` dan `/tentang-kami/manajemen` beserta
 *   seluruh subtree-nya tidak pernah ikut. Sitemap yang hanya ikut fungsi itu
 *   kehilangan 18 halaman tanpa satu galat pun.
 * - URL yang salah bentuk. `metadataBase` tidak berlaku di sitemap, jadi
 *   menulis path biasa menghasilkan `<loc>/tentang-kami</loc>`. Format itu
 *   ditolak mesin pencari dan tetap lolos build.
 *
 * Berkas `src/app/sitemap.ts` diimpor langsung, bukan hanya aturannya di
 * `src/lib/sitemap.ts`, supaya jaminan URL absolut ikut diperiksa.
 */

const AKAR = path.resolve(import.meta.dirname, "..");
const semua = collectSitemapPaths().map((e) => e.path);

/**
 * Folder `[slug]` di `src/app`, ditulis sebagai awalan URL.
 *
 * Dibaca dari filesystem supaya route dinamis baru ikut diperiksa begitu
 * foldernya dibuat, tanpa perlu mendaftarkannya di tes ini.
 */
function folderSlug(): string[] {
  const appDir = path.join(AKAR, "src/app");
  const out: string[] = [];

  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const segments = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const full = path.join(dir, entry.name);

      if (entry.name === "[slug]" && existsSync(path.join(full, "page.tsx"))) {
        out.push(`/${segments.replace(/\/\[slug\]$/, "")}`);
      }
      walk(full, segments);
    }
  };

  walk(appDir, "");
  return out.sort();
}

describe("daftar path sitemap", () => {
  it("tidak ada path yang sama dua kali", () => {
    expect(new Set(semua).size).toBe(semua.length);
  });

  it("beranda ada dan tidak ada duplikat dari navigasi", () => {
    expect(semua).toContain("/");
    // `collectNavPaths()` tidak memuat beranda, jadi masuknya beranda berarti
    // ada penambahan manual, bukan dari sumber yang salah.
    expect(semua.filter((p) => p === "/")).toHaveLength(1);
  });

  it("memuat setiap path dari navigasi", () => {
    const hilang = collectNavPaths()
      .map((e) => `/${e.slug.join("/")}`)
      .filter((p) => !semua.includes(p));

    expect(hilang, `path navigasi yang hilang dari sitemap:\n${hilang.join("\n")}`).toEqual([]);
  });

  it("memuat subtree yang dilewati collectNavPaths", () => {
    // `/ppid` dan `/tentang-kami/manajemen` punya folder sendiri, jadi
    // `collectNavPaths()` melewati seluruh cabangnya. Inilah yang pernah
    // membuat 18 halaman hilang dari sitemap.
    const hilang = [
      ...NAV_PPID_CHILDREN.map((c) => c.href),
      ...MANAGEMENT.map((m) => `/tentang-kami/manajemen/${m.slug}`),
    ].filter((p) => !semua.includes(p));

    expect(
      hilang,
      `subtree yang hilang dari sitemap:\n${hilang.join("\n")}`,
    ).toEqual([]);
  });

  it("memuat minimal satu halaman untuk tiap route [slug]", () => {
    // Ini penjaga anti-drift untuk route dinamis yang baru ditambahkan.
    // Kalau ada folder `[slug]` tanpa isinya di sitemap, tes ini gagal dan
    // menyebut foldernya.
    const kosong = folderSlug().filter(
      (prefix) => !semua.some((p) => p.startsWith(`${prefix}/`)),
    );

    expect(
      kosong,
      `route [slug] tanpa isi di sitemap:\n${kosong.join("\n")}`,
    ).toEqual([]);
  });

  it("semua path-nya dilayani route sungguhan", () => {
    const appDir = path.join(AKAR, "src/app");
    const statis: string[] = [];
    const walk = (dir: string, prefix: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("[")) continue;
        const segments = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
        const full = path.join(dir, entry.name);
        if (existsSync(path.join(full, "page.tsx"))) statis.push(`/${segments}`);
        walk(full, segments);
      }
    };
    walk(appDir, "");

    const takAda = semua.filter(
      (p) =>
        p !== "/" &&
        !statis.includes(p) &&
        !hasOwnRoute(p) &&
        !collectNavPaths().some((e) => `/${e.slug.join("/")}` === p) &&
        !folderSlug().some((prefix) => p.startsWith(`${prefix}/`)),
    );

    expect(takAda, `path di sitemap tanpa route:\n${takAda.join("\n")}`).toEqual([]);
  });

  it("tidak mengindeks halaman yang isinya per pengunjung", () => {
    // `/daftar-online` menampilkan formulir dan hasil pencarian jadwal, jadi
    // isinya berbeda tiap orang. Mengindeksnya tidak berguna.
    expect(semua).not.toContain("/daftar-online");
  });

  it("hanya mendaftarkan URL kanonik untuk layanan diagnostik", () => {
    // `/laboratorium` dan `/radiologi` pernah hidup berdampingan dengan
    // `/pelayanan/diagnostik/<slug>` dan isinya menduplikasi. Folder datar
    // sudah dihapus, jadi kedua alias itu sekarang menjawab 404 dan tidak
    // mungkin lagi masuk peta. Yang dijaga tes ini adalah sisi yang tersisa:
    // URL kanonik tetap terdaftar, sehingga pelletakan tidak ikut hilang
    // bersama folder yang dihapus.
    expect(semua).not.toContain("/laboratorium");
    expect(semua).not.toContain("/radiologi");

    expect(semua).toContain("/pelayanan/diagnostik/laboratorium");
    expect(semua).toContain("/pelayanan/diagnostik/radiologi");
  });
});

describe("bentuk sitemap.xml", () => {
  it("URL-nya absolut lengkap dengan domain", async () => {
    // `metadataBase` tidak berlaku di sitemap, jadi ini harus dibentuk sendiri.
    const isi = await sitemap();
    expect(isi.length).toBe(semua.length);

    for (const entri of isi) {
      expect(entri.url, entri.url).toMatch(
        /^https?:\/\/[^/]+(\/[^?]*)?$/,
      );
    }
  });

  it("menghormati NEXT_PUBLIC_SITE_URL", async () => {
    const lama = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://contoh.example/";

    try {
      const isi = await sitemap();
      expect(isi[0].url).toMatch(/^https:\/\/contoh\.example\//);
      // Garis miring akhir pada variabel tidak boleh menggandakan separator.
      expect(isi[0].url).not.toContain("//beranda");
      expect(isi.every((e) => !e.url.includes(".example//"))).toBe(true);
    } finally {
      if (lama === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = lama;
    }
  });

  it("tidak ada segmen grup route atau dinamis", () => {
    // Folder `(grup)` dan `[slug]` bukan segmen URL. Kalau lolos ke sini,
    // sitemap memuat URL yang tidak pernah bisa dibuka, misalnya
    // `/admin/(panel)` yang balas 404.
    for (const p of semua) {
      expect(p, p).not.toMatch(/[()[\]]/);
    }
  });

  it("prioritas di dalam rentang 0 sampai 1", () => {
    for (const entri of collectSitemapPaths()) {
      expect(entri.priority, entri.path).toBeGreaterThan(0);
      expect(entri.priority, entri.path).toBeLessThanOrEqual(1);
      expect(
        ["daily", "weekly", "monthly", "yearly"],
        entri.path,
      ).toContain(entri.changeFrequency);
    }
  });
});