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
});
