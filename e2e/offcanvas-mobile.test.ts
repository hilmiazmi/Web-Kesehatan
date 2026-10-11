import { expect, test, type Page } from "@playwright/test";

/**
 * Panel navigasi off-canvas di viewport mobile.
 *
 * Berjalan dalam `API_MODE=snapshot` seperti `publik.test.ts`: yang diuji
 * murni interaksi DOM panel, tidak menyentuh database. Ini menutup salah satu
 * dari dua hal yang memang tidak bisa diuji oleh Vitest (tanpa jsdom) —
 * `visibility`, `overflow`, dan fokus nyata hanya bisa dipastikan di peramban.
 *
 * Tiga cara menutup panel diuji satu per satu karena tidak ada satu pun yang
 * cukup sendiri: backdrop, tombol X, dan Escape. Kalau salah satu mati,
 * pengguna HP terjebak di panel yang menutupi seluruh layar.
 */

test.describe("panel navigasi off-canvas", () => {
  // Bawah 1200px: batas desktop yang sama dengan media query `.navmenu` di
  // site.css. Di atas batas itu tidak ada hamburger sama sekali, jadi tes
  // ini wajib memakai viewport sempit.
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Tunggu hidrasi: tombol hamburger baru berfungsi setelah React memasang
    // handler. Sebelum itu klik-nya tidak membuka apa pun.
    await page.locator(".mobile-nav-toggle").waitFor();
  });

  async function buka(page: Page) {
    await page.locator(".mobile-nav-toggle").click();
    const panel = page.locator("#navmenu");
    await expect(panel).toHaveClass(/navmenu-open/);
    return panel;
  }

  test("panel tertutup tidak bisa difokus dan tidak terlihat", async ({ page }) => {
    const panel = page.locator("#navmenu");

    // `visibility: hidden`, bukan hanya `translateX(100%)`. Tanpa itu 74
    // tautan di dalam panel tetap masuk alur Tab padahal tak kelihatan.
    await expect(panel).toHaveCSS("visibility", "hidden");

    // Jumlah tautan sengaja diperiksa sebagai bukti panel memang berisi
    // navigasi: kalau selektornya salah, tes di bawah hijau karena alasan
    // yang keliru.
    const jumlah = await panel.locator("a").count();
    expect(jumlah).toBeGreaterThan(20);
  });

  test("membuka panel: terlihat, body tak bisa digulir, backdrop muncul", async ({
    page,
  }) => {
    const panel = await buka(page);

    await expect(panel).toHaveCSS("visibility", "visible");
    await expect(page.locator("body")).toHaveClass(/navmenu-terbuka/);
    await expect(page.locator(".navmenu-backdrop")).toBeVisible();

    // Halaman di belakang tidak boleh ikut bergulir selama panel terbuka.
    const overflow = await page.evaluate(
      () => getComputedStyle(document.body).overflow,
    );
    expect(overflow).toBe("hidden");

    // Panel tidak boleh memicu gulir horizontal dokumen: panel fixed 340px
    // di layar 390px berarti konten di belakang hanya sisa 50px, tapi lebar
    // dokumen sendiri tidak boleh melampaui viewport.
    const ukur = await page.evaluate(() => ({
      dokumen: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(ukur.dokumen).toBeLessThanOrEqual(ukur.viewport);
  });

  test("backdrop menutup panel dan fokus kembali ke hamburger", async ({
    page,
  }) => {
    await buka(page);

    // Panel 340px dari kanan pada layar 390px berarti backdrop hanya
    // benar-benar bisa diketuk di pita kiri (~50px). Klik di tengah viewport
    // justru menabrak panel, dan itu benar: `click` biasa menargetkan tengah
    // elemen, jadi posisinya harus disebut eksplisit.
    await page.locator(".navmenu-backdrop").click({
      position: { x: 20, y: 300 },
    });

    const panel = page.locator("#navmenu");
    await expect(panel).not.toHaveClass(/navmenu-open/);
    await expect(panel).toHaveCSS("visibility", "hidden");
    await expect(page.locator(".navmenu-backdrop")).toHaveCount(0);

    // Fokus wajib kembali; tanpa itu pengguna keyboard berada di tempat
    // tak tentu setelah panel menghilang.
    const fokus = await page.evaluate(
      () => document.activeElement?.className ?? "",
    );
    expect(fokus).toContain("mobile-nav-toggle");

    const overflow = await page.evaluate(
      () => document.body.style.overflow,
    );
    expect(overflow).not.toBe("hidden");
  });

  test("tombol X menutup panel", async ({ page }) => {
    await buka(page);
    await page.locator(".navmenu-close").click();

    await expect(page.locator("#navmenu")).not.toHaveClass(/navmenu-open/);
    await expect(page.locator("body")).not.toHaveClass(/navmenu-terbuka/);
  });

  test("Escape menutup panel", async ({ page }) => {
    await buka(page);
    await page.keyboard.press("Escape");

    await expect(page.locator("#navmenu")).not.toHaveClass(/navmenu-open/);
    await expect(page.locator("body")).not.toHaveClass(/navmenu-terbuka/);
  });

  test("mengklik tautan di panel menutupnya", async ({ page }) => {
    await buka(page);

    // Navigasi client-side menutup panel: tanpa itu panel tetap terbuka di
    // atas konten halaman baru.
    await page.locator("#navmenu a").first().click();

    await expect(page.locator("#navmenu")).not.toHaveClass(/navmenu-open/);
    await expect(page.locator("body")).not.toHaveClass(/navmenu-terbuka/);
  });
});
