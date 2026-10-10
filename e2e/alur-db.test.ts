import { expect, request, test } from "@playwright/test";

/**
 * Alur ber-database (mode live + basis data uji).
 *
 * Berbeda dari `publik.test.ts` yang berjalan snapshot: berkas ini BUTUH
 * server live dengan basis data uji plus akun admin sementara. Kalau kredensial
 * tidak ada di lingkungan, seluruh describe dilewati supaya jalan e2e bawaan
 * (snapshot, tanpa DB) tidak ikut gagal.
 *
 * Menyiapkan sebelum jalan (di luar berkas ini):
 *   1. `bun scripts/.siapkan-admin-uji.ts` menulis E2E_UJI_EMAIL/SANDI
 *   2. server live: API_MODE=live + DATABASE_URL basis uji + AUTH_SECRET acak
 *   3. BASE_URL=<server live> bunx playwright test e2e/alur-db.test.ts
 *   4. hapus akun + baris uji, hentikan server, hapus berkas env
 *
 * Semua lewat HTTP API (tanpa klik browser) supaya stabil dan cepat. Yang
 * dibuktikan: sesi terbit dan dipakai, putaran tulis-baca pengaturan kembali
 * ke nilai awal, dan kiriman kritik bisa dilacak lalu terlihat di inbox.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3401";
const EMAIL = process.env.E2E_UJI_EMAIL ?? "";
const SANDI = process.env.E2E_UJI_SANDI ?? "";

test.describe("alur ber-database", () => {
  test.skip(!EMAIL || !SANDI, "butuh E2E_UJI_EMAIL dan E2E_UJI_SANDI");

  test("login, panel, putaran pengaturan, kritik terlacak", async () => {
    const ctx = await request.newContext({ baseURL: BASE });

    // 1. Kata sandi salah ditolak tanpa sesi.
    const salah = await ctx.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: "jelas-salah" },
    });
    expect(salah.status()).not.toBe(200);

    // 2. Login benar menerbitkan sesi (cookie disimpan otomatis oleh context).
    const masuk = await ctx.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: SANDI },
    });
    expect(masuk.status()).toBe(200);

    // 3. Panel terbuka dengan sesi: gate lolos tanpa redirect.
    // maxRedirects 0 supaya 307 (tanpa sesi) tidak diam-diam jadi 200.
    const panel = await ctx.get("/admin", { maxRedirects: 0 });
    expect(panel.status()).toBe(200);

    // 4. Putaran pengaturan: baca -> tulis -> cocok -> kembalikan.
    const sebelum = await ctx.get("/api/v1/admin/settings");
    expect(sebelum.status()).toBe(200);
    const asli =
      ((await sebelum.json()) as { data?: { tagline?: string } }).data
        ?.tagline ?? "";
    const uji = `Uji E2E ${Date.now()}`;
    const simpan = await ctx.put("/api/v1/admin/settings", {
      data: { tagline: uji },
    });
    expect(simpan.status()).toBe(200);
    const sesudah = await ctx.get("/api/v1/admin/settings");
    expect(JSON.stringify(await sesudah.json())).toContain(uji);
    const kembali = await ctx.put("/api/v1/admin/settings", {
      data: { tagline: asli },
    });
    expect(kembali.status()).toBe(200);

    // 5. Kritik publik menghasilkan tiket yang bisa dilacak.
    // findByTicket hanya mengembalikan ticket_code/status/waktu, jadi yang
    // diverifikasi adalah kodenya, bukan isi pesannya.
    const kirim = await ctx.post("/api/v1/feedbacks", {
      data: { message: `Pesan uji E2E ${Date.now()} untuk alur kritik.` },
    });
    // Pembuatan sumber daya baru menjawab 201, bukan 200.
    expect(kirim.status()).toBe(201);
    const badan = (await kirim.json()) as {
      data?: { ticket_code?: string };
      ticket_code?: string;
    };
    const tiket = (badan.data?.ticket_code ?? badan.ticket_code ?? "").toUpperCase();
    expect(tiket.length).toBeGreaterThan(0);

    const lacak = await ctx.get(`/api/v1/tickets/feedbacks/${tiket}`);
    expect(lacak.status()).toBe(200);
    expect(await lacak.text()).toContain(tiket);

    // 6. Kiriman itu muncul di inbox admin.
    const inbox = await ctx.get("/api/v1/admin/inbox/feedbacks?page=1");
    expect(inbox.status()).toBe(200);
    expect(await inbox.text()).toContain(tiket);

    await ctx.dispose();
  });

  test("formulir kritik terkirim lewat peramban sampai tersimpan", async ({
    page,
  }) => {
    // Yang ini memakai peramban sungguhan, bukan API langsung: mengisi
    // formulir di /kontak, menekan Kirim, dan membaca kode tiket dari dialog
    // SweetAlert2. Baris API-nya sudah dibuktikan tes di atas; yang
    // dibuktikan di sini adalah seluruh rantai dari klik sampai tersimpan.
    //
    // Pesan diawali "Pesan uji E2E" supaya ikut terhapus oleh
    // `scripts/bersihkan-admin-uji.ts` seperti baris uji API.
    const pesan = `Pesan uji E2E ${Date.now()} lewat peramban di /kontak.`;
    await page.goto("/kontak");
    await page.locator("#fb-pesan").fill(pesan);
    await page.getByRole("button", { name: "Kirim Pesan" }).click();

    // Sukses ditampilkan lewat dialog SweetAlert2, bukan navigasi.
    await expect(page.locator(".swal2-popup")).toBeVisible({ timeout: 15000 });
    const html = await page.locator(".swal2-html-container").innerHTML();
    const cocok = html.match(/Kode tiket:\s*<b>([^<]+)<\/b>/);
    const tiket = (cocok?.[1] ?? "").trim().toUpperCase();
    expect(tiket.length).toBeGreaterThan(0);

    // Tiketnya terlacak publik dan muncul di inbox admin (lewat sesi API,
    // supaya yang diuji peramban hanya alur formulirnya).
    const ctx = await request.newContext({ baseURL: BASE });
    const masuk = await ctx.post("/api/v1/auth/login", {
      data: { email: EMAIL, password: SANDI },
    });
    expect(masuk.status()).toBe(200);
    const lacak = await ctx.get(`/api/v1/tickets/feedbacks/${tiket}`);
    expect(lacak.status()).toBe(200);
    expect(await lacak.text()).toContain(tiket);
    const inbox = await ctx.get("/api/v1/admin/inbox/feedbacks?page=1");
    expect(inbox.status()).toBe(200);
    expect(await inbox.text()).toContain(tiket);
    await ctx.dispose();
  });

  test("daftar online terkirim lewat peramban sampai dapat antrean", async ({
    page,
  }) => {
    // Transaksi inti lewat peramban sungguhan: poli, dokter, tanggal, jam,
    // data diri, kirim, lalu nomor antrean + tiket dari dialog SweetAlert2.
    // Opsi setiap dropdown dimuat async, jadi setiap langkah menunggu lewat
    // `expect.poll` (pola yang sama dengan tes "pilih poli" yang dulu flaky).
    //
    // Telepon unik per jalan (`0812` + 9 digit) supaya tidak menabrak
    // constraint anti-ganda `(phone, schedule_id)`. Baris yang tersimpan
    // TIDAK ikut terhapus `bersihkan-admin-uji` (skrip itu hanya menghapus
    // feedback); hapus manual lewat teleponnya setelah jalan. Basis uji
    // sekali pakai (di-drop setelah verifikasi) tidak butuh langkah ini.
    const unik = Date.now().toString().slice(-9);
    const telepon = `0812${unik}`;
    await page.goto("/daftar-online");

    // 1. Poliklinik, lalu dokter: daftar dokter disaring per poliklinik.
    const poli = page.locator("#poliklinik");
    await expect
      .poll(async () => poli.locator("option").count(), { timeout: 15000 })
      .toBeGreaterThan(1);
    await poli.selectOption({ index: 1 });
    const dokter = page.locator("#dokter");
    await expect
      .poll(async () => dokter.locator("option").count(), { timeout: 15000 })
      .toBeGreaterThan(1);

    // 2. Dokter pertama belum tentu praktik dalam waktu dekat, jadi coba
    // beberapa dokter pertama sampai ketemu tanggal yang bisa diklik (maksimal
    // 3 kali pindah bulan per dokter). Kalau tidak satu pun bisa, berarti
    // data seed tidak mencakup — itu temuan, bukan tes yang salah.
    const nilaiDokter: string[] = await dokter.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((o) => o.value).filter((v) => v !== "").slice(0, 6),
    );
    expect(nilaiDokter.length).toBeGreaterThan(0);
    let tanggalTerisi = false;
    for (const nilai of nilaiDokter) {
      await dokter.selectOption(nilai);
      await page.locator("#tanggal").click();
      for (let b = 0; b < 3; b++) {
        const hari = page.locator(
          "#tanggal-kalender button.tanggal-kalender-sel:not([disabled])",
        );
        if ((await hari.count()) > 0) {
          await hari.first().click();
          tanggalTerisi = true;
          break;
        }
        const maju = page.getByRole("button", { name: "Bulan berikutnya" });
        if (!(await maju.isEnabled())) break;
        await maju.click();
      }
      if (tanggalTerisi) break;
    }
    expect(tanggalTerisi).toBe(true);

    // 3. Jam: pilih opsi pertama yang tidak dinonaktifkan (penuh).
    const slot = page.locator("#slot");
    await expect
      .poll(
        async () =>
          slot.evaluate((el: HTMLSelectElement) =>
            [...el.options].filter((o) => o.value !== "" && !o.disabled).length,
          ),
        { timeout: 15000 },
      )
      .toBeGreaterThan(0);
    const jam = await slot.evaluate(
      (el: HTMLSelectElement) =>
        [...el.options].find((o) => o.value !== "" && !o.disabled)?.value ?? "",
    );
    await slot.selectOption(jam);

    // 4. Data diri + persetujuan, lalu kirim.
    await page.locator("#nama").fill("Pasien Uji E2E");
    await page.locator("#nik").fill(`317405${unik.slice(-10).padStart(10, "0")}`);
    await page.locator("#telepon").fill(telepon);
    await page.locator("#email").fill("pasien-uji@example.com");
    await page.locator("#setuju").check();
    await page.getByRole("button", { name: "Kirim Pendaftaran" }).click();

    // 5. Sukses: dialog SweetAlert2 memuat nomor antrean dan kode tiket.
    await expect(page.locator(".swal2-popup")).toBeVisible({ timeout: 20000 });
    const html = await page.locator(".swal2-html-container").innerHTML();
    const antrean = html.match(/Nomor antrean[^<]*<b>([^<]+)<\/b>/);
    const cocok = html.match(/Kode tiket:\s*<b>([^<]+)<\/b>/);
    expect(antrean?.[1]?.trim().length).toBeGreaterThan(0);
    const tiket = (cocok?.[1] ?? "").trim().toUpperCase();
    expect(tiket.length).toBeGreaterThan(0);

    // 6. Tiketnya terlacak lewat endpoint publik.
    const ctx = await request.newContext({ baseURL: BASE });
    const lacak = await ctx.get(`/api/v1/tickets/appointments/${tiket}`);
    expect(lacak.status()).toBe(200);
    expect(await lacak.text()).toContain(tiket);
    await ctx.dispose();
  });
});
