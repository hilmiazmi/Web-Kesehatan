import { test, expect } from "@playwright/test";

/**
 * Dua hal yang selama ini hanya diperiksa mata: panel navigasi off-canvas di
 * layar sempit, dan dialog SweetAlert2 pada formulir.
 *
 * Keduanya bagian dari sebabnya AGENTS.md menyebut "yang tidak bisa diuji di
 * sini": keduanya butuh peramban sungguhan. Server E2E berjalan tanpa database
 * (`API_MODE=snapshot`), dan dua alur di bawah memang tidak membutuhkannya.
 */

test.describe("panel navigasi off-canvas di bawah 1200px", () => {
  // Lebar ini di bawah batas 1200px, jadi navbar memakai hamburger dan panel
  // yang digeser keluar layar — bukan deretan menu horizontal.
  test.use({ viewport: { width: 390, height: 844 } });

  test("panel tertutup tidak terlihat dan tidak bisa difokus dengan Tab", async ({ page }) => {
    await page.goto("/");

    const hamburger = page.locator(".mobile-nav-toggle");
    await expect(hamburger).toBeVisible();

    const panel = page.locator(".navmenu");
    // `visibility: hidden`, bukan hanya digeser keluar. Tanpa itu tautan di
    // dalam panel tetap masuk urutan Tab padahal tidak terlihat.
    await expect(panel).toBeHidden();

    const tautanPertama = panel.locator("a").first();
    await tautanPertama.focus().catch(() => {});
    expect(
      await tautanPertama.evaluate((el) => el === document.activeElement),
    ).toBe(false);
  });

  test("hamburger membuka panel, mengunci gulir latar, lalu menutup lewat tombol tutup", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator(".mobile-nav-toggle").click();

    const panel = page.locator(".navmenu");
    await expect(panel).toBeVisible();

    // Latar belakang tidak boleh ikut bergulir; tanpa itu halaman di belakang
    // panel ter seperti ikut bergerak.
    await expect(page.locator("body")).toHaveClass(/navmenu-terbuka/);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    // Di dalam panel benar-benar ada tautan, bukan panel kosong.
    expect(await panel.locator("a").count()).toBeGreaterThan(5);

    await page.locator(".navmenu-close").click();

    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => document.body.classList.contains("navmenu-terbuka"))).toBe(
      false,
    );
  });

  test("fokus kembali ke hamburger setelah panel ditutup", async ({ page }) => {
    // Fokus yang tidak kembali membuat pengguna keyboard tersesat di ujung
    // halaman setiap kali menutup menu.
    await page.goto("/");
    await page.locator(".mobile-nav-toggle").click();
    await expect(page.locator(".navmenu")).toBeVisible();

    await page.locator(".navmenu-close").click();
    await expect(page.locator(".navmenu")).toBeHidden();

    expect(
      await page.evaluate(() => document.activeElement?.classList.contains("mobile-nav-toggle")),
    ).toBe(true);
  });

  test("panel ditutup oleh tombol Escape", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mobile-nav-toggle").click();
    await expect(page.locator(".navmenu")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator(".navmenu")).toBeHidden();
  });

  test("panel ditutup dengan mengetuk area di luar panel", async ({ page }) => {
    await page.goto("/");
    await page.locator(".mobile-nav-toggle").click();
    await expect(page.locator(".navmenu")).toBeVisible();

    await page.locator(".navmenu-backdrop").click({ position: { x: 10, y: 10 } });

    await expect(page.locator(".navmenu")).toBeHidden();
  });

  test("tautan di dalam panel menuju halaman yang benar dan panel menutup sendiri", async ({
    page,
  }) => {
    // Panel yang hanya bisa dibuka tapi tidak menavigasi ke mana pun akan
    // lolos dari semua tes di atas.
    //
    // Tautan dipilih dengan syarat keras, bukan "yang pertama":
    // - href-nya bukan "/" agar kliknya benar-benar berpindah halaman;
    // - induknya tidak punya submenu, karena item bersubmenu di mobile adalah
    //   tombol accordion, bukan tautan.
    // Memakai locator pertama tanpa syarat itu adalah kesalahan yang sudah
    // pernah terjadi: locator-nya kena "Home", URL tidak berubah, dan tes gagal
    // padahal kodenya benar.
    await page.goto("/");
    await page.locator(".mobile-nav-toggle").click();
    await expect(page.locator(".navmenu")).toBeVisible();

    const tautan = page
      .locator('.navmenu a[href^="/"]')
      .filter({ hasNot: page.locator("xpath=ancestor::li[ul]") })
      .filter({ hasNotText: /^Home$/ })
      .first();
    const tujuan = await tautan.getAttribute("href");
    expect(tujuan).toBeTruthy();
    expect(tujuan).not.toBe("/");

    await tautan.click();
    await expect(page).toHaveURL(new RegExp(`${tujuan}$`));
    await expect(page.locator("h1")).toBeVisible();

    // Panel menutup sendiri setelah pindah halaman: `navmenu-open` lepas dan
    // `aria-expanded` ikut turun. Kedua pemeriksaan ini auto-retry, dan itu
    // memang diperlukan: `visibility` baru bernilai `hidden` di AKHIR transisi
    // 0,3 detik (lihat komentar di `site.css`), jadi mengukur satu titik waktu
    // akan membaca `visible` walau panel sedang menutup.
    await expect(page.locator(".navmenu")).not.toHaveClass(/navmenu-open/);
    await expect(page.locator(".navmenu")).toBeHidden();
    await expect(page.locator(".mobile-nav-toggle")).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("dialog SweetAlert2 pada formulir", () => {
  // Dialog dipakai untuk tiga hal: pesan validasi, penolakan server, dan
  // kode tiket setelah berhasil. Dua yang pertama tidak butuh database.
  test("formulir kosong memunculkan dialog, bukan diam saja", async ({ page }) => {
    await page.goto("/kontak");

    await page.locator('button[type="submit"]').first().click();

    const dialog = page.locator(".swal2-popup");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Pesan belum lengkap");

    // Dialog bisa ditutup, dan halaman tetap bisa dipakai sesudahnya.
    await page.locator(".swal2-confirm").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("#fb-subjek")).toBeVisible();
  });

  test("formulir lengkap di mode baca-saja menyatakan sebabnya, bukan gagal generik", async ({
    page,
  }) => {
    // Server E2E berjalan tanpa database, jadi kiriman ditolak 503. Yang perlu
    // dijaga: pesannya menyebut mode baca-saja, bukan "terjadi kesalahan".
    await page.goto("/kontak");

    await page.locator("#fb-jenis").selectOption("suggestion");
    await page.locator("#fb-subjek").fill("Uji dialog E2E");
    await page.locator("#fb-pesan").fill("Isi pesan uji untuk memeriksa dialog.");
    await page.locator('button[type="submit"]').first().click();

    const dialog = page.locator(".swal2-popup");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog).toContainText("Pesan ditolak");
    await expect(dialog).toContainText(/baca-saja|belum bisa dikirim/i);
  });

  test("dialog punya peran yang benar untuk pembaca layar", async ({ page }) => {
    // SweetAlert2 menaruh role="dialog" dan aria-labelledby; kalau suatu saat
    // versinya berubah, dialog jadi tak bernama bagi pembaca layar.
    await page.goto("/kontak");
    await page.locator('button[type="submit"]').first().click();

    const dialog = page.locator(".swal2-popup");
    await expect(dialog).toBeVisible();

    expect(await dialog.getAttribute("role")).toBe("dialog");
    expect(await dialog.getAttribute("aria-labelledby")).toBeTruthy();

    // Judul dialog benar-benar punya teks, bukan id yang menunjuk ke elemen kosong.
    const idJudul = await dialog.getAttribute("aria-labelledby");
    await expect(page.locator(`#${idJudul}`)).not.toBeEmpty();
  });
});
