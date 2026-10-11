import { test, expect } from "@playwright/test";

/**
 * Dialog SweetAlert2 pada formulir.
 *
 * `AGENTS.md` menyebut interaksi SweetAlert2 sebagai salah satu hal yang
 * tidak bisa diuji Vitest: butuh peramban sungguhan, dan hasil dialognya
 * tidak ada di DOM sampai popup-nya muncul. Server E2E berjalan tanpa
 * database (`API_MODE=snapshot`), dan ketiga alur di bawah memang tidak
 * membutuhkannya.
 *
 * Awalnya blok ini menyatu dengan tes panel off-canvas dalam satu berkas.
 * Panel itu sudah punya berkasnya sendiri (`e2e/offcanvas-mobile.test.ts`),
 * jadi yang di sini hanya bagian dialog.
 */

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
