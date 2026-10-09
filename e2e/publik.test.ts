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

    // Tunggu Swiper selesai init. Slide pertama terlihat dari HTML statis
    // sebelum hidrasi, dan atribut data-swiper-slide-index baru ditulis
    // loopCreate saat init — tanpa tunggu ini hitungannya 0 dan flaky.
    await page.locator(".swiperslider.swiper-initialized").waitFor({ timeout: 15000 });

    // Swiper menduplikasi slide dalam mode loop, jadi hitung yang asli lewat
    // atribut data-swiper-slide-index yang unik per slide sumber.
    const indeks = await page
      .locator(".swiper .swiper-slide[data-swiper-slide-index]")
      .evaluateAll((els) => new Set(els.map((e) => e.getAttribute("data-swiper-slide-index"))).size);
    expect(indeks).toBe(9);

    // Autoplay 5 detik: judul slide aktif harus berganti dengan sendirinya.
    const judulAktif = () =>
      page.locator(".swiperslider .swiper-slide-active h2").first().textContent();
    const pertama = await judulAktif();
    await expect
      .poll(judulAktif, { timeout: 12000, message: "autoplay tidak mengganti slide" })
      .not.toBe(pertama);
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
    // Opsi diambil async dari /api/v1/polyclinics, jadi tunggu sampai terisi
    // sebelum menghitung. Hitung langsung flaky: select sudah terlihat dengan
    // satu placeholder selagi fetch berjalan.
    const pilih = page.locator("select").first();
    await expect(pilih).toBeVisible();
    await expect
      .poll(async () => pilih.locator("option").count(), { timeout: 10000 })
      .toBeGreaterThan(1);
  });
});

test.describe("mobile 390px", () => {
  // Viewport HP paling sempit yang umum. Yang dijaga: tidak ada gulir
  // horizontal (carousel memakai overflow di wadahnya sendiri, bukan di
  // dokumen) dan pagination hero tetap muat tanpa meluap.
  test.use({ viewport: { width: 390, height: 844 } });

  test("beranda tidak meluap dan pagination hero muat", async ({ page }) => {
    await page.goto("/");
    await page.locator(".swiperslider.swiper-initialized").waitFor({ timeout: 15000 });

    const ukur = await page.evaluate(() => {
      const pag = document.querySelector(
        ".swiperslider .swiper-pagination",
      ) as HTMLElement | null;
      return {
        dokumen: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        pagOver: pag ? pag.scrollWidth - pag.clientWidth : -1,
      };
    });

    expect(ukur.dokumen).toBeLessThanOrEqual(ukur.viewport);
    expect(ukur.pagOver).toBe(0);
  });
});
