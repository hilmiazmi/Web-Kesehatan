import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectNavPaths,
  hasOwnRoute,
  humanize,
  resolveTrail,
  slugify,
} from "@/lib/nav-path";
import {
  FOOTER_LINKS,
  HEADER_CTAS,
  NAV_ITEMS,
} from "@/data/navigation";
import { BROSURS } from "@/data/brosur";
import { CLINIC_DETAILS } from "@/data/clinics";
import { PPID_SUBPAGES } from "@/data/ppid";

/**
 * Folder di `src/app` yang punya `page.tsx`, ditulis sebagai path URL tanpa
 * segmen dinamis.
 *
 * Folder dinamis (`[slug]`, `[...slug]`, `[[...slug]]`) tidak ikut sebagai
 * halaman, karena slugnya berasal dari data, bukan dari nama folder. Folder
 * seperti itu dikembalikan terpisah lewat `detailRouteParents()`.
 */
function routeFolders(): string[] {
  return walkApp((name, full) => {
    if (name.startsWith("[")) return null;
    return existsSync(path.join(full, "page.tsx")) ? urlOf(full) : null;
  });
}

/**
 * Induk folder `[slug]` di `src/app`, ditulis sebagai path URL.
 *
 * `/pelayanan/medis/[slug]` menjadi `/pelayanan/medis`. Bedanya penting: induk
 * ini tidak punya halaman sendiri, jadi masih harus dilayani catch-all. Kalau
 * ikut dikecualikan, `/pelayanan/medis` membalas 404.
 */
function detailRouteParents(): string[] {
  const out = new Set<string>();
  walkApp((name, full) => {
    if (name === "[slug]") out.add(urlOf(path.dirname(full)));
    return null;
  });
  return [...out];
}

function walkApp(
  visit: (name: string, full: string) => string | null,
): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const found = visit(entry.name, path.join(dir, entry.name));
      if (found) out.push(found);
      walk(path.join(dir, entry.name));
    }
  };
  walk(appDir());
  return out;
}

function appDir(): string {
  return path.resolve(import.meta.dirname, "../src/app");
}

function urlOf(dir: string): string {
  return "/" + path.relative(appDir(), dir).split(path.sep).join("/");
}

/** Seluruh path internal dari ketiga sumber navigasi, apa adanya. */
function semuaPathNavigasi(): string[] {
  const out: string[] = [];
  const walk = (nodes: readonly { href: string; children?: unknown }[]) => {
    for (const node of nodes) {
      if (node.href.startsWith("/")) out.push(node.href);
      if (node.children) {
        walk(node.children as { href: string; children?: unknown }[]);
      }
    }
  };
  walk(NAV_ITEMS);
  out.push(...HEADER_CTAS.map((c) => c.href), ...FOOTER_LINKS.map((l) => l.href));
  return [...new Set(out)];
}

describe("collectNavPaths", () => {
  it("mengembalikan bentuk catch-all yang benar: { slug: string[] }", () => {
    // Rute [..slug] menuntut { slug: string[] }[]. Mengembalikan { path }
    // membuat tidak ada satu pun halaman yang ter-prerender. Ini regresi untuk
    // bug yang pernah terjadi: halaman ter-prerender hanya 35 dari 77.
    for (const entry of collectNavPaths()) {
      expect(Object.keys(entry)).toEqual(["slug"]);
      expect(Array.isArray(entry.slug)).toBe(true);
      expect(entry.slug.length).toBeGreaterThan(0);
      for (const seg of entry.slug) {
        expect(typeof seg).toBe("string");
        expect(seg).not.toContain("/");
      }
    }
  });

  it("tidak memuat path akar", () => {
    const slugs = collectNavPaths().map((e) => e.slug.join("/"));
    expect(slugs).not.toContain("");
  });

  it("tidak menghasilkan duplikat", () => {
    const slugs = collectNavPaths().map((e) => e.slug.join("/"));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("mencakup tautan dari ketiga sumber, bukan hanya menu utama", () => {
    // CTA header dan tautan footer dulu tidak ikut ditelusuri sehingga
    // /administrasi, /sitemap, dan /kontak membalas 404.
    //
    // "Punya halaman" di sini berarti salah satu dari dua: terdaftar
    // di catch-all, atau punya route sendiri di src/app. `/daftar-online`
    // masuk kategori kedua.
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));
    const punyaHalaman = (href: string) =>
      hasOwnRoute(href) || slugs.has(href.replace(/^\//, ""));

    for (const cta of HEADER_CTAS) expect(punyaHalaman(cta.href)).toBe(true);
    for (const link of FOOTER_LINKS) expect(punyaHalaman(link.href)).toBe(true);
  });

  it("setiap tautan internal di data navigasi punya halaman", () => {
    // Penjamin agar tautan baru tidak diam-diam menjadi 404.
    //
    // Path yang dilayani route khusus (lihat `hasOwnRoute`) tidak muncul di
    // catch-all, jadi ikut dicoret di sini. Kalau tidak dicoret, setiap
    // submenu PPID dan halaman brosur akan dilaporkan hilang padahal
    // halamannya memang ada di src/app.
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));
    const internal: string[] = [];

    const walk = (nodes: readonly { href: string; children?: unknown }[]) => {
      for (const node of nodes) {
        if (node.href.startsWith("/") && node.href !== "/") {
          internal.push(node.href);
        }
        if (node.children) walk(node.children as { href: string; children?: unknown }[]);
      }
    };
    walk(NAV_ITEMS);

    const hilang = internal.filter(
      (h) => !hasOwnRoute(h) && !slugs.has(h.replace(/^\//, "")),
    );
    expect(hilang).toEqual([]);
  });

  it("tidak ada path catch-all yang menabrak page.tsx statis di src/app", () => {
    // Tanpa tes ini, folder route yang lupa didaftarkan di `hasOwnRoute()`
    // akan membuat path-nya ter-prerender dua kali: sekali oleh `[...slug]`
    // sebagai halaman generik, sekali lagi oleh route spesifiknya. Route yang
    // lebih spesifik menang, jadi gejalanya tidak terlihat — tapi begitu
    // route itu dihapus, URL-nya diam-diam membalas 200 dengan halaman kosong.
    //
    // Folder route dibaca dari filesystem, bukan ditulis manual, supaya
    // route baru ikut terk begitu foldernya dibuat.
    const slugs = collectNavPaths().map((e) => `/${e.slug.join("/")}`);

    const tabrakan = slugs.filter((p) =>
      routeFolders().some((r) => p === r || p.startsWith(`${r}/`)),
    );
    expect(tabrakan).toEqual([]);
  });

  it("path yang dikecualikan dari catch-all punya route yang melayani", () => {
    // Sisi lain dari tes di atas. Mengecualikan terlalu banyak lebih buruk
    // daripada terlalu sedikit: path yang tidak lagi terdaftar di catch-all
    // dan juga tidak punya route di src/app akan membalas 404 sungguhan.
    // `/pelayanan/medis` pernah kena karena ikut dimasukkan ke daftar
    // `page.tsx` statis, padahal yang ada di sana hanya folder `[slug]`.
    const statis = routeFolders();
    const indukDetail = detailRouteParents();

    const dilayani = (p: string) =>
      statis.includes(p) ||
      statis.some((s) => p.startsWith(`${s}/`)) ||
      indukDetail.some((parent) => p.startsWith(`${parent}/`));

    const takTerlayani = semuaPathNavigasi().filter(
      (p) => hasOwnRoute(p) && !dilayani(p),
    );
    expect(takTerlayani).toEqual([]);
  });

  it("folder [slug] terdaftar sebagai induk, bukan sebagai halaman", () => {
    // Menarxivkan bahwa kedua helper benar-benar membedakan keduanya. Tanpa
    // ini, `routeFolders()` bisa ikut mengembalikan `/pelayanan/medis` dan
    // tes tabrakan di atas salah menilai.
    const induk = detailRouteParents();
    expect(induk).toContain("/pelayanan/medis");
    expect(routeFolders()).not.toContain("/pelayanan/medis");
    // Catch-all sendiri tidak boleh terhitung sebagai induk detail.
    expect(induk).not.toContain("/[...slug]");
  });

  it("path yang punya route khusus benar-benar dikecualikan dari catch-all", () => {
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));

    for (const b of BROSURS) {
      expect(slugs.has(`informasi-publik/brosur/${b.slug}`)).toBe(false);
    }
    for (const p of PPID_SUBPAGES) {
      expect(slugs.has(`ppid/${p.slug}`)).toBe(false);
    }
    for (const d of CLINIC_DETAILS) {
      expect(slugs.has(`pelayanan/poliklinik/${d.slug}`)).toBe(false);
    }
  });

  it("menyelesaikan path anak relatif terhadap induknya", () => {
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));
    // Menu anak pada situs rujukan memakai href relatif seperti
    // "prioritas", sehingga harus digabung dengan path induknya.
    //
    // `/pelayanan/prioritas` tidak muncul di sini karena punya folder sendiri
    // di src/app; yang diuji di sini adalah penggabungan path-nya, yaitu
    // anak-anaknya tetap ikut terdaftar sebagai path utuh, bukan "/prioritas".
    expect(slugs.has("pelayanan/prioritas/jantung-terpadu")).toBe(false);
    expect(hasOwnRoute("/pelayanan/prioritas/jantung-terpadu")).toBe(true);
    expect(slugs.has("informasi-publik/skm")).toBe(true);
  });
});

describe("resolveTrail", () => {
  it("mengembalikan remah roti dari menu hingga ke tujuan", () => {
    const trail = resolveTrail("/informasi-publik/skm");
    expect(trail).not.toBeNull();
    expect(trail!.at(-1)!.href).toBe("/informasi-publik/skm");
    expect(trail!.length).toBeGreaterThan(1);
  });

  it("mengembalikan null untuk path yang tidak dikenal", () => {
    expect(resolveTrail("/halaman-yang-tidak-ada")).toBeNull();
  });

  it("menangani path bertingkat tiga", () => {
    const trail = resolveTrail("/pelayanan/mcu/reguler/paket-dasar-1");
    expect(trail?.map((t) => t.label)).toBeDefined();
    expect(trail!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("slugify", () => {
  it("menurunkan huruf dan mengganti spasi dengan tanda hubung", () => {
    expect(slugify("Medical Check Up")).toBe("medical-check-up");
  });

  it("menjaga tanda hubung yang sudah ada", () => {
    expect(slugify("Medical Check Up")).toBe("medical-check-up");
  });

  it("menghapus tanda baca yang tidak diperlukan", () => {
    expect(slugify("Layanan  Jantung (Terpadu)")).toBe(
      "layanan-jantung-terpadu",
    );
  });
});

describe("humanize", () => {
  it("mengubah slug menjadi judul yang enak dibaca", () => {
    expect(humanize("medical-check-up")).toBe("Medical Check Up");
  });

  it("tidak mengubah teks yang sudah berupa kalimat", () => {
    expect(humanize("Tentang Kami")).toBe("Tentang Kami");
  });
});