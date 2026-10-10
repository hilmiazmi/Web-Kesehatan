import { expect, test } from "@playwright/test";

/**
 * Pemeriksaan aksesibilitas yang bisa diukur tanpa mata manusia.
 *
 * Bagian F1 dari audit manual (kontras warna, pembaca layar, urutan fokus
 * di seluruh situs) tetap butuh manusia. Yang di sini adalah potongan yang
 * punya jawaban ya/tanya yang tegas, sehingga regresinya ketahuan seketika:
 *
 * 1. Skip-link benar-benar menjadi fokus pertama dan targetnya ada.
 * 2. Tidak ada gambar tanpa `alt`, tidak ada field tanpa label.
 * 3. Panel navigasi mobile tidak bisa difokusi saat tertutup. Ini bukan
 *    detail kecil: panel berisi 74 tautan, dan kalau masih bisa difokusi
 *    maka pembaca layar membacakan isi menu yang tidak terlihat.
 * 4. Panel yang terbuka bisa dimasuki keyboard, dan Escape mengembalikannya
 *    ke tombol hamburger.
 *
 * Semua pemeriksaan memakai API browser, bukan tebakan nilai pada satu momen.
 */

test.describe("skip-link", () => {
  test("fokus pertama menuju konten utama dan targetnya ada", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const pertama = await page.evaluate(() => {
      const el = document.activeElement;
      return { href: el?.getAttribute("href"), teks: (el?.textContent ?? "").trim() };
    });

    expect(pertama.href).toBe("#main-content");
    expect(pertama.teks.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => !!document.getElementById("main-content"))).toBe(true);
  });
});

test.describe("nama elemen", () => {
  test("tidak ada gambar tanpa alt dan field tanpa label", async ({ page }) => {
    await page.goto("/");

    const hasil = await page.evaluate(() => {
      /**
       * Gambar dekoratif harus dinyatakan, bukan disimpulkan.
       *
       * `alt=""` dipakai di repo ini untuk foto yang namanya sudah dibacakan
       * dari tempat lain: galeri (nama unit ada di `caption` di bawah foto) dan
       * Fasilitas (nama fasilitas ada di `<h3>` di samping). Mengosongkannya
       * memang benar, karena mengisinya membuat pembaca layar mengucapkan
       * "Farmasi Farmasi".
       *
       * Masalahnya, `alt=""` yang benar dan `alt=""` karena lupa tampak sama
       * dari luar. Karena itu `Photo` memasang `role="presentation"` dan
       * `aria-hidden="true"` setiap kali `alt` kosong, dan tes ini mewajibkan
       * penanda itu ada.
       *
       * Dengan begitu yang gagal adalah gambar yang benar-benar kehilangan
       * alternatif teks tanpa dinyatakan dekoratif, bukan foto yang sengaja
       * dikosongkan.
       *
       * Sengaja tidak memakai "ada teks di sekitarnya" sebagai syarat: aturan
       * sebegitu luas membebaskan hampir semua gambar, termasuk yang lupa,
       * sehingga tesnya berhenti menangkap apa pun.
       */
      const dekoratif = (g: Element): boolean => {
        const role = g.getAttribute("role");
        if (role === "presentation" || role === "none") return true;
        return g.getAttribute("aria-hidden") === "true";
      };

      const gambar = Array.from(document.querySelectorAll("img"));
      const tanpaAlt = gambar.filter(
        (g) => (!g.alt || g.alt.trim() === "") && !dekoratif(g),
      );

      const field = Array.from(
        document.querySelectorAll("input:not([type=hidden]), select, textarea"),
      );
      const tanpaLabel = field.filter((el) => {
        if (el.getAttribute("aria-label")) return false;
        if (el.getAttribute("aria-labelledby")) return false;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
        return !el.closest("label");
      }).length;

      return {
        gambar: gambar.length,
        tanpaAlt,
        dekoratif: gambar.filter(dekoratif).length,
        field: field.length,
        tanpaLabel,
      };
    });

    // Pesan galatnya mencantumkan gambar yang bermasalah, bukan hanya jumlah.
    // Tanpa daftarnya, yang gagal harus membuka halaman sendiri untuk tahu
    // gambar yang mana yang kehilangan alternatif teks.
    expect(hasil.tanpaAlt.map((g) => g.src || "(tanpa src)")).toEqual([]);
    expect(hasil.tanpaAlt).toHaveLength(0);
    expect(hasil.tanpaLabel).toBe(0);
  });

  test("dokumen menyatakan bahasa", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("id");
  });
});

test.describe("panel navigasi mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("tertutup: tautan di dalam panel tidak bisa difokusi", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Keadaan yang membuatnya mustahil bukan sekadar geser: `visibility`
    // ikut hiding, jadi fokus benar-benar tidak masuk.
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".navmenu")!).visibility)).toBe("hidden");

    let masuk = 0;
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.closest(".navmenu") !== null)) {
        masuk++;
      }
    }
    // 74 tautan ada di panel. Kalau satu saja bisa difokusi, regresi ini
    // muncul sebagai angka di sini, bukan sebagai keluhan pembaca layar.
    expect(masuk).toBe(0);
  });

  test("terbuka: fokus bisa masuk, dan Escape menutup lalu mengembalikan fokus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.locator(".mobile-nav-toggle").click();
    await expect(page.locator(".navmenu")).toHaveCSS("visibility", "visible");

    // Latar halaman di belakang panel tidak boleh bisa digulir.
    expect(await page.evaluate(() => document.body.classList.contains("navmenu-terbuka"))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    await page.locator(".navmenu-close").focus();
    let masuk = 0;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.closest(".navmenu") !== null)) {
        masuk++;
      }
    }
    expect(masuk).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await expect(page.locator(".navmenu")).toHaveCSS("visibility", "hidden");
    expect(await page.evaluate(() => document.body.classList.contains("navmenu-terbuka"))).toBe(false);

    // Fokus kembali ke hamburger, supaya keyboard tidak melompat ke halaman
    // dari awal setelah menutup menu.
    expect(
      await page.evaluate(() => document.activeElement?.classList.contains("mobile-nav-toggle") ?? false),
    ).toBe(true);
  });
});
