import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { collectNavPaths } from "@/lib/nav-path";
import { ARTICLES } from "@/data/home";
import { CLINIC_DETAILS } from "@/data/clinics";

/**
 * Pengawal peta situs XML dan aturan perayap.
 *
 * `/sitemap.xml` pernah jatuh ke halaman 404 karena tidak ada route yang
 * menanganinya. Tanpa tes, berkas `sitemap.ts` bisa terhapus atau daftar
 * URL-nya menyusut diam-diam dan tidak ada yang tahu sampai perayap
 * kehabisan halaman.
 */
describe("sitemap.xml", () => {
  const entri = sitemap();
  const url = entri.map((e) => e.url);

  it("semua URL absolut, path tanpa garis miring ganda atau akhiran", () => {
    expect(entri.length).toBeGreaterThan(0);
    for (const u of url) {
      expect(u).toMatch(/^https?:\/\//);
      const p = new URL(u).pathname;
      expect(p).not.toContain("//");
      if (p !== "/") {
        expect(p.endsWith("/")).toBe(false);
      }
    }
  });

  it("tidak ada URL ganda", () => {
    expect(new Set(url).size).toBe(url.length);
  });

  it("memuat beranda dan semua path navigasi", () => {
    const path = new Set(url.map((u) => new URL(u).pathname));
    expect(path.has("/")).toBe(true);
    for (const { slug } of collectNavPaths()) {
      expect(path.has("/" + slug.join("/"))).toBe(true);
    }
  });

  it("memuat URL detail dari tiap keluarga halaman", () => {
    const path = new Set(url.map((u) => new URL(u).pathname));
    expect(path.has(`/berita/${ARTICLES[0].slug}`)).toBe(true);
    expect(path.has(`/pelayanan/poliklinik/${CLINIC_DETAILS[0].slug}`)).toBe(
      true,
    );
  });

  it("beranda diprioritaskan dan diperiksa harian", () => {
    const dasar = entri.find((e) => new URL(e.url).pathname === "/");
    expect(dasar?.priority).toBe(1);
    expect(dasar?.changeFrequency).toBe("daily");
  });
});

describe("robots.txt", () => {
  it("mengizinkan semua perayap dan menunjuk peta situs", () => {
    const r = robots();
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(String(r.sitemap)).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});
