import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { QUICK_ACTIONS } from "@/data/quick-action";
import { CONTACT, HEADER_CTAS } from "@/data/navigation";
import { hasOwnRoute, collectNavPaths } from "@/lib/nav-path";

/**
 * Penjaga bilah aksi cepat dan tombol kembali ke atas.
 *
 * Keduanya adalah bagian dari layout global yang PRD sebutkan tapi belum ada
 * (PRD bagian 8 butir 1 dan 8.4). Bentuk visualnya tidak bisa diuji di sini
 * karena tidak ada jsdom, jadi yang diperiksa adalah dua hal yang bisa:
 *
 * - Isi bilah aksi cepat. Semuanya harus menunjuk tujuan yang benar-benar
 *   ada, karena PRD tidak menyebut isi apa pun dan isinya diambil dari
 *   komponen yang sudah ada. Isi yang menunjuk halaman yang tidak ada akan
 *   menjadi tautan mati tanpa satu pun build yang gagal.
 * - Atribut `hidden` pada tombol kembali ke atas, supaya tombol yang
 *   tidak terlihat masih bisa difokuskan lewat Tab.
 */

const AKAR = path.resolve(import.meta.dirname, "..");

const sumberQuickActionBar = readFileSync(
  path.join(AKAR, "src/components/layout/QuickActionBar.tsx"),
  "utf8",
);
const sumberBackToTop = readFileSync(
  path.join(AKAR, "src/components/layout/BackToTop.tsx"),
  "utf8",
);

describe("isi bilah aksi cepat", () => {
  it("mengambil dua tombol header dan satu WhatsApp", () => {
    expect(QUICK_ACTIONS).toHaveLength(HEADER_CTAS.length + 1);

    for (const [i, cta] of HEADER_CTAS.entries()) {
      expect(QUICK_ACTIONS[i].label).toBe(cta.label);
      expect(QUICK_ACTIONS[i].href).toBe(cta.href);
      expect(QUICK_ACTIONS[i].external).toBe(false);
    }

    const wa = QUICK_ACTIONS[QUICK_ACTIONS.length - 1];
    expect(wa.label).toBe("WhatsApp");
    expect(wa.href).toBe(CONTACT.whatsappHref);
    expect(wa.external).toBe(true);
  });

  it("setiap butir punya label, ikon, dan kelas yang tidak kosong", () => {
    for (const aksi of QUICK_ACTIONS) {
      expect(aksi.label.trim(), aksi.href).not.toBe("");
      // `bi-` adalah awalan yang wajib ada, kalau tidak ikonnya tidak muncul.
      expect(aksi.icon, aksi.label).toMatch(/^bi-[a-z0-9-]+$/);
      expect(aksi.className.trim(), aksi.label).not.toBe("");
    }
  });

  it("tidak ada butir yang sama dua kali", () => {
    const kunci = QUICK_ACTIONS.map((a) => `${a.label}|${a.href}`);
    expect(new Set(kunci).size).toBe(kunci.length);
  });

  it("tujuan internalnya benar-benar punya halaman", () => {
    const mati = QUICK_ACTIONS.filter(
      (a) =>
        !a.external &&
        !hasOwnRoute(a.href) &&
        !collectNavPaths().some((e) => `/${e.slug.join("/")}` === a.href),
    ).map((a) => `${a.label} -> ${a.href}`);

    expect(mati, `tujuan tanpa halaman:\n${mati.join("\n")}`).toEqual([]);
  });

  it("tujuannya ke luar ditandai external", () => {
    for (const aksi of QUICK_ACTIONS) {
      const keLuar = aksi.href.startsWith("http");
      expect(aksi.external, aksi.href).toBe(keLuar);
    }
  });
});

describe("bentuk markup bilah aksi cepat", () => {
  it("membaca daftar dari data, bukan menulis tautannya sendiri", () => {
    // Kalau ada `href` literal di komponen, isinya bisa melenceng dari
    // `HEADER_CTAS` tanpa tes ini gagal.
    expect(sumberQuickActionBar).toContain('from "@/data/quick-action"');
    expect(sumberQuickActionBar).not.toMatch(/href="\/[^"]*"/);
  });

  it("memakai tautan luar dengan rel aman", () => {
    expect(sumberQuickActionBar).toContain('rel="noopener noreferrer"');
    expect(sumberQuickActionBar).toContain('target="_blank"');
  });

  it("punya label yang bisa dibaca pembaca layar", () => {
    // `aria-label` pada `<nav>` memberi nama untuk landmark itu sendiri.
    expect(sumberQuickActionBar).toContain("aria-label=");
  });
});

describe("tombol kembali ke atas", () => {
  it("hilang dari urutan Tab saat tidak ditampilkan", () => {
    // `hidden` yang hilang, atau `opacity: 0`, membuat tombol yang tidak
    // terlihat masih bisa difokuskan. Itu lebih buruk daripada tidak ada
    // tombolnya, karena pembaca layar akan membacakan tombol yang tak terlihat.
    expect(sumberBackToTop).toContain("hidden={!muncul}");
    expect(sumberBackToTop).not.toMatch(/opacity/);
    expect(sumberBackToTop).not.toMatch(/visibility/);
  });

  it("punya nama yang terbaca pembaca layar", () => {
    expect(sumberBackToTop).toContain('aria-label="Kembali ke atas halaman"');
    // Ikonnya harus disembunyikan, kalau tidak nama tombol jadi dua kali.
    expect(sumberBackToTop).toContain('aria-hidden="true"');
  });

  it("mendengar peristiwa scroll dan membersihkannya", () => {
    expect(sumberBackToTop).toContain('addEventListener("scroll"');
    expect(sumberBackToTop).toContain("removeEventListener(\"scroll\"");
    // `passive` supaya `scroll` tidak memblokir lukisan di layar.
    expect(sumberBackToTop).toContain("passive: true");
  });

  it("dipasang di layout global", () => {
    const layout = readFileSync(path.join(AKAR, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("<QuickActionBar />");
    expect(layout).toContain("<BackToTop />");
  });
});