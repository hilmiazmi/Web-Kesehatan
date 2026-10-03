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
import { PPID_SUBPAGES } from "@/data/ppid";

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
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));
    for (const cta of HEADER_CTAS) {
      expect(slugs.has(cta.href.replace(/^\//, ""))).toBe(true);
    }
    for (const link of FOOTER_LINKS) {
      expect(slugs.has(link.href.replace(/^\//, ""))).toBe(true);
    }
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

  it("path yang punya route khusus benar-benar dikecualikan dari catch-all", () => {
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));

    // Brosur dan PPID keduanya punya folder sendiri di src/app, jadi
    // tidak boleh didaftarkan ulang oleh catch-all.
    expect(slugs.has("informasi-publik/brosur")).toBe(false);
    expect(slugs.has("ppid")).toBe(false);

    for (const b of BROSURS) {
      expect(hasOwnRoute(`/informasi-publik/brosur/${b.slug}`)).toBe(true);
    }
    for (const p of PPID_SUBPAGES) {
      expect(hasOwnRoute(`/ppid/${p.slug}`)).toBe(true);
    }
  });

  it("menyelesaikan path anak relatif terhadap induknya", () => {
    const slugs = new Set(collectNavPaths().map((e) => e.slug.join("/")));
    // Menu anak pada situs rujukan memakai href relatif seperti
    // "prioritas", sehingga harus digabung dengan path induknya.
    expect(slugs.has("pelayanan/prioritas")).toBe(true);
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