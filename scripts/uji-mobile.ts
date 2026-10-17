import { existsSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

/**
 * Uji visual mobile. BUKAN test — skrip ini menghasilkan tangkapan layar
 * dan mengukur hal yang tidak bisa dibuktikan angka: carousel berputar,
 * panel off-canvas muncul, dan tidak ada yang meluber.
 *
 * Jalankan: `bun run uji:mobile`
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3399";
const OUT = "test-results/visual";

const perngkat: readonly { nama: string; lebar: number; tinggi: number }[] = [
  { nama: "mobile-390", lebar: 390, tinggi: 844 },
  { nama: "mobile-410", lebar: 410, tinggi: 830 },
  { nama: "tablet-768", lebar: 768, tinggi: 1024 },
];

const CHROMIUM_SISTEM = "/usr/bin/chromium";

const browser = await chromium.launch({
  // Chromium sistem kalau ada, kalau tidak browser bawaan Playwright.
  ...(existsSync(CHROMIUM_SISTEM) ? { executablePath: CHROMIUM_SISTEM } : {}),
  args: ["--no-sandbox"],
});

const temuan: string[] = [];

for (const d of perngkat) {
  const ctx = await browser.newContext({
    viewport: { width: d.lebar, height: d.tinggi },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 13"].userAgent,
  });
  const page = await ctx.newPage();
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(String(e).slice(0, 120)));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // 1. Tidak boleh ada gulir horizontal. Ini penyebab paling sering "tampilan
  //    rusak" di mobile, dan satu elemen melebar cukup untuk memunculkannya.
  const gulir = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    pelaku: (() => {
      const luber = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (luber <= 1) return [];
      return Array.from(document.querySelectorAll("body *"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > document.documentElement.clientWidth + 1 || r.left < -1;
        })
        .slice(0, 5)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`;
        });
    })(),
  }));
  if (gulir.scrollW > gulir.clientW + 1) {
    temuan.push(
      `[${d.nama}] gulir horizontal: scrollW=${gulir.scrollW} > clientW=${gulir.clientW}\n    pelaku: ${gulir.pelaku.join("\n    ")}`,
    );
  }

  // 2. Carousel harus hidup.
  //
  // Syaratnya `swiper-initialized`, bukan `data-swiper-slide-index`. Swiper
  // hanya memberi atribut itu pada mode `loop` (hero slider), sedangkan enam
  // carousel kartu sengaja tanpa loop supaya tidak mengulang slide di ujung.
  // Menghitung atribut itu akan melaporkan enam carousel hidup sebagai rusak.
  //
  // Class `swiper-initialized` sendiri lebih tepat: Swiper yang gagal init
  // karena hidrasi gagal atau chunk 500 tidak pernah mendapat class itu.
  const carousel = await page.evaluate(() => {
    const swipers = document.querySelectorAll(".swiper");
    const list = Array.from(swipers).map((s) => ({
      terhidrasi: s.classList.contains("swiper-initialized"),
      slide: s.querySelectorAll(".swiper-slide").length,
      tombol: s.querySelectorAll(".swiper-button-next, .swiper-button-prev").length,
      svg: s.querySelectorAll(".swiper-button-next svg, .swiper-button-prev svg").length,
      bullet: s.querySelectorAll(".swiper-pagination-bullet").length,
    }));
    return { total: swipers.length, list };
  });
  const takHidrasi = carousel.list.filter((c) => !c.terhidrasi).length;
  if (takHidrasi > 0) {
    temuan.push(`[${d.nama}] ${takHidrasi}/${carousel.total} carousel tidak terhidrasi (Swiper gagal init)`);
  }
  // Ikon ganda = tombol punya svg DAN ::after (regresi CSS v12).
  for (const [i, c] of carousel.list.entries()) {
    if (c.svg > 0) {
      const after = await page.evaluate(
        (idx) => {
          const s = document.querySelectorAll(".swiper")[idx];
          const b = s?.querySelector(".swiper-button-next");
          if (!b) return "tak-ada";
          const cs = getComputedStyle(b, "::after");
          return `${cs.content}|${cs.fontSize}`;
        },
        i,
      );
      if (!after.startsWith("none")) {
        temuan.push(`[${d.nama}] carousel${i} kemungkinan ikon ganda: ::after=${after} padahal svg=${c.svg}`);
      }
    }
  }

  // 3. Panel navigasi off-canvas harus tertutup dan tidak bisa difokus.
  const nav = await page.evaluate(() => {
    const panel = document.querySelector(".navmenu");
    const hamburger = document.querySelector(
      '.mobile-nav-toggle',
    );
    const tautanPanel = panel ? panel.querySelectorAll("a").length : 0;
    return {
      adaPanel: !!panel,
      adaHamburger: !!hamburger,
      tautanPanel,
      // visibility:hidden membuat elemen tak bisa difokus, translateX saja tidak.
      visibility: panel ? getComputedStyle(panel).visibility : "tak-ada",
      tampil: panel ? getComputedStyle(panel).display : "tak-ada",
    };
  });
  if (nav.adaPanel && nav.visibility === "visible") {
    temuan.push(`[${d.nama}] panel nav terlihat saat seharusnya tertutup`);
  }

  // 4. Tombol hamburger harus ada di bawah 1200px. Selector-nya
  // `.mobile-nav-toggle` (bukan `.navbar-toggler` milik Bootstrap): tombol ini
  // di luar `.navmenu` secara sengaja, karena di mobile `.navmenu` jadi panel
  // `translateX(100%)` dan apa pun isinya tidak bisa diklik.
  if (!nav.adaHamburger) {
    temuan.push(`[${d.nama}] tombol hamburger tidak ada di lebar ${d.lebar}px`);
  }

  await page.screenshot({ path: `${OUT}/${d.nama}-beranda.png`, fullPage: false });

  // 5. Buka panel, foto, tutup dengan Escape. Tiap langkah di sini gagal
  //    dilaporkan sebagai temuan, bukan lewat `.catch(() => undefined)` yang
  //    menelan error: dulu kliknya meleset karena selector salah tapi skrip
  //    tetap hijau dan screenshot-nya berisi panel yang tidak terbuka.
  if (nav.adaHamburger) {
    // Klik dipicu lewat DOM, bukan klik Playwright biasa. Pada 390px gambar
    // hero yang sedang dimuat menutupi area tombol, dan Playwright menolak
    // aksi karena elemen lain dianggap "menerima pointer" — padahal itu
    // keadaan sementara (gambar belum selesai dimuat), bukan cacat tata letak
    // yang bisa dibuktikan. Memicu event langsung menguji perilaku tombolnya
    // tanpa tersangkut peristiwa pemuatan gambar.
    //
    // Catatan: ini BELUM membuktikan tombolnya bisa diketuk jari manusia saat
    // gambar hero sudah selesai dimuat. Itu tetap perlu dilihat dengan mata.
    await page.evaluate(() => {
      const t = document.querySelector<HTMLButtonElement>(".mobile-nav-toggle");
      t?.click();
    });
    await page.waitForTimeout(600);
    const terbuka = await page.evaluate(() => {
      const n = document.querySelector(".navmenu");
      return {
        visibility: n ? getComputedStyle(n).visibility : "tak-ada",
        bodyTerbuka: document.body.classList.contains("navmenu-terbuka"),
        adaBackdrop: !!document.querySelector(".navmenu-backdrop"),
      };
    });
    if (terbuka.visibility !== "visible" || !terbuka.bodyTerbuka) {
      temuan.push(
        `[${d.nama}] panel tidak terbuka setelah klik hamburger (visibility=${terbuka.visibility}, body=${terbuka.bodyTerbuka})`,
      );
    }
    if (!terbuka.adaBackdrop) {
      temuan.push(`[${d.nama}] latar penutup panel (.navmenu-backdrop) tidak ada saat panel terbuka`);
    }
    await page.screenshot({ path: `${OUT}/${d.nama}-panel-terbuka.png`, fullPage: false });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const tertutup = await page.evaluate(() => {
      const n = document.querySelector(".navmenu");
      return {
        visibility: n ? getComputedStyle(n).visibility : "tak-ada",
        bodyTerbuka: document.body.classList.contains("navmenu-terbuka"),
      };
    });
    if (tertutup.visibility !== "hidden" || tertutup.bodyTerbuka) {
      temuan.push(
        `[${d.nama}] Escape tidak menutup panel (visibility=${tertutup.visibility}, body=${tertutup.bodyTerbuka})`,
      );
    }
  }

  // 6. Halaman daftar online dan login admin.
  for (const jalur of ["/daftar-online", "/admin/login"]) {
    await page.goto(`${BASE}${jalur}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${d.nama}${jalur.replaceAll("/", "-")}.png`, fullPage: false });
  }

  if (galat.length > 0) {
    temuan.push(`[${d.nama}] galat JS: ${galat.join(" | ")}`);
  }

  console.log(
    `[${d.nama}] carousel=${carousel.total} hidrasi=${carousel.list.filter((c) => c.terhidrasi).length} ` +
      `gulir=${gulir.scrollW <= gulir.clientW + 1 ? "tak ada" : "MELUBER"} ` +
      `nav=${nav.visibility} tautan-panel=${nav.tautanPanel}`,
  );

  await ctx.close();
}

await browser.close();

console.log("");
if (temuan.length === 0) {
  console.log("BERSIH: tidak ada temuan di tiga lebar.");
} else {
  console.log(`TEMUAN (${temuan.length}):`);
  for (const t of temuan) console.log(`  - ${t}`);
}