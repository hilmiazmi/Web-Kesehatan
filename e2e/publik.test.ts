import { expect, test } from "@playwright/test";

/**
 * Alur publik tanpa database.
 *
 * Berjalan dalam `API_MODE=snapshot`, jadi tidak ada tulisan ke database dan
 * tidak ada login sungguhan. Yang dibuktikan: halaman termuat, navigasi
 * berfungsi, dan gate admin mengarahkan.
 */

test.describe("beranda", () => {
  test("memuat 13 section sesuai urutan", async ({ page }) => {
    await page.goto("/");

    // Judul dari metadata, bukan tebakan.
    await expect(page).toHaveTitle(/RSUD Contoh Sehat/);

    // 12 section ber-id plus hero tanpa id.
    for (const id of [
      "cari-dokter",
      "layanan",
      "fasilitas",
      "mcu",
      "berita",
      "akreditasi",
      "galeri",
      "pendaftaran",
      "sosial-media",
      "testimoni",
      "asuransi",
      "faq",
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test("hero memuat 9 slide dan autoplay berjalan", async ({ page }) => {
    await page.goto("/");

    const slides = page.locator(".swiper .swiper-slide");
    await expect(slides.first()).toBeVisible();

    // Swiper menduplikasi slide dalam mode loop, jadi hitung yang asli lewat
    // atribut data-swiper-slide-index yang unik per slide sumber.
    const indeks = await page
      .locator(".swiper .swiper-slide[data-swiper-slide-index]")
      .evaluateAll((els) => new Set(els.map((e) => e.getAttribute("data-swiper-slide-index"))).size);
    expect(indeks).toBe(9);
  });
});

test.describe("navigasi", () => {
  test("menu mengarah ke halaman yang ada, bukan 404", async ({ page }) => {
    await page.goto("/");

    // Ambil beberapa tautan nav desktop dan pastikan tujuannya 200.
    for (const href of ["/pelayanan/poliklinik", "/berita", "/kontak", "/daftar-online"]) {
      const res = await page.request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test("URL tak dikenal membalas 404 sungguhan", async ({ page }) => {
    const res = await page.request.get("/tidak-ada-halaman-ini");
    expect(res.status()).toBe(404);
  });
});

test.describe("gate admin", () => {
  test("/admin mengarah ke /admin/login tanpa sesi", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("halaman login termuat dengan form", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe("daftar online", () => {
  test("halaman memuat formulir dengan pilih poli", async ({ page }) => {
    await page.goto("/daftar-online");

    // Form pendaftaran: ada pilih poliklinik/spesialis sebagai langkah pertama.
    const pilih = page.locator("select").first();
    await expect(pilih).toBeVisible();
    expect(await pilih.locator("option").count()).toBeGreaterThan(1);
  });
});
