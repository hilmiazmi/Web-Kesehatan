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

const seluruhCss = ["site.css", "tokens.css", "pages.css"]
  .map((berkas) => readFileSync(path.join(AKAR, "src/styles", berkas), "utf8"))
  .join("\n");

/**
 * Ambil isi satu blok aturan CSS.
 *
 * Dipakai untuk memeriksa posisi dan visibilitas, karena keduanya benar-benar
 * menentukan apakah tombol kembali ke atas bisa diklik dan apakah tombol yang
 * tak terlihat masih masuk urutan Tab. Mengambil teks satu blok aturan lewat
 * pencarian `}` pertama setelah selector, supaya tidak ikut menelan aturan
 * berikutnya.
 */
function bacaCss(selector: string): string {
  const mulai = seluruhCss.indexOf(`\n${selector} {`);
  if (mulai === -1) {
    // Selector bisa berada di awal berkas, di mana `\n` di depannya tidak ada.
    const awal = seluruhCss.startsWith(`${selector} {`)
      ? 0
      : seluruhCss.indexOf(`${selector} {`);
    if (awal === -1) throw new Error(`blok ${selector} tidak ada di CSS`);
    return seluruhCss.slice(awal, seluruhCss.indexOf("}", awal));
  }
  return seluruhCss.slice(mulai, seluruhCss.indexOf("}", mulai));
}

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
    // `opacity: 0` saja tidak cukup: elemen yang hanya transparan masih bisa
    // difokuskan, jadi pembaca layar akan membacakan tombol yang tak terlihat.
    // Yang benar `visibility: hidden`, dan aturan itu ada di CSS karena status
    // gulir disimpan di class elemen, bukan di state React.
    const css = bacaCss(".scroll-top");
    expect(css).toMatch(/visibility:\s*hidden/);
    expect(css).toMatch(/opacity:\s*0/);
    // Hanya keadaan awal yang boleh tersembunyi. Class `.active` wajib
    // membalikannya, kalau tidak tombolnya tidak pernah muncul sama sekali.
    const cssAktif = bacaCss(".scroll-top.active");
    expect(cssAktif).toMatch(/visibility:\s*visible/);
  });

  it("tidak berebut ruang dengan bilah aksi cepat", () => {
    // Keduanya melayang di pojok bawah dan z-index tombol kembali ke atas lebih
    // tinggi. Kalau tombol itu tetap di tepi kanan, dia menutupi butir paling
    // bawah bilah aksi cepat dan memblokir kliknya. Tepi kiri dipakai bilah
    // aksi cepat, tepi kanan dipakai tombol ini.
    const tombol = bacaCss(".scroll-top");
    expect(tombol).toMatch(/left:\s*15px/);
    expect(tombol).not.toMatch(/right:/);

    const bilah = bacaCss(".quick-action");
    expect(bilah).toMatch(/right:/);
    expect(bilah).not.toMatch(/left:/);
  });

  it("punya nama yang terbaca pembaca layar", () => {
    // Namanya lewat teks tersembunyi, bukan `aria-label`, supaya tetap ada
    // ketika teknologinya hanya membaca isi elemen.
    expect(sumberBackToTop).toContain("visually-hidden");
    expect(sumberBackToTop).toMatch(/<span className="visually-hidden">/);
    // Ikonnya harus disembunyikan, kalau tidak nama tombol jadi dua kali.
    expect(sumberBackToTop).toContain('aria-hidden="true"');
  });

  it("tetap berguna tanpa JavaScript", () => {
    // `href` harus menunjuk elemen yang benar-benar ada di server. Kalau
    // `#`, tombolnya hanya menambah tanda pagar di URL dan tidak melakukan apa
    // apa tanpa JS.
    expect(sumberBackToTop).toContain('href="#main-content"');
    const layout = readFileSync(path.join(AKAR, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('id="main-content"');
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