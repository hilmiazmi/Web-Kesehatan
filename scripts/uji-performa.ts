import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

/**
 * Ukur performa halaman kunci lewat CDP, bukan lewat Lighthouse CLI.
 *
 * Alasannya Lighthouse perlu dependensi baru, dan AGENTS.md melarang menambah
 * dependensi tanpa diminta. Yang dibutuhkan sebenarnya adalah tiga metrik inti
 * — LCP, CLS, dan bobot sumber — dan ketiganya bisa diambil langsung dari
 * Chromium yang sudah dipakai Playwright, lewat protokol DevTools.
 *
 * Skrip ini bukan pengganti Lighthouse: tidak ada penilaian aksesibilitas,
 * SEO, atau best practice. Yang diukur cuma metrik muat, dan itu yang jadi
 * alasan halaman beranda dioptimasi sebelumnya.
 *
 * Jalankan: `bun run uji:performa`
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3395";
const ATURAN_BAYANGAN = { LCP: 2500, CLS: 0.1 };

const HALAMAN = [
  { nama: "beranda", jalur: "/" },
  { nama: "daftar-online", jalur: "/daftar-online" },
  { nama: "login-admin", jalur: "/admin/login" },
  { nama: "berita", jalur: "/berita" },
  { nama: "pelayanan-poliklinik", jalur: "/pelayanan/poliklinik" },
];

const CHROMIUM_SISTEM = "/usr/bin/chromium";

const browser = await chromium.launch({
  // Chromium sistem kalau ada, kalau tidak browser bawaan Playwright.
  ...(existsSync(CHROMIUM_SISTEM) ? { executablePath: CHROMIUM_SISTEM } : {}),
  args: ["--no-sandbox"],
});

let gagal = 0;

console.log(`target: ${BASE}`);
console.log(`aturan bayangan: LCP <= ${ATURAN_BAYANGAN.LCP} ms, CLS <= ${ATURAN_BAYANGAN.CLS}\n`);
console.log("halaman                 LCP        CLS      transfer   permintaan  status");

for (const h of HALAMAN) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Catat transfer dan jumlah permintaan dari network, bukan dari tebakan.
  let transfer = 0;
  let permintaan = 0;
  page.on("response", async (res) => {
    permintaan += 1;
    try {
      const hdr = res.headers();
      if (hdr["content-length"] && res.request().resourceType() !== "document") {
        transfer += Number(hdr["content-length"]);
      } else {
        const body = await res.body().catch(() => null);
        if (body) transfer += body.length;
      }
    } catch {
      // Body yang sudah terlewat tidak dihitung. Kurang sedikit lebih baik
      // daripada menggagalkan skrip gara-gara satu respons.
    }
  });

  await page.goto(`${BASE}${h.jalur}`, { waitUntil: "load" });

  // LCP dan CLS harus diukur setelah halaman berhenti bergerak. Diukur terlalu
  // cepat akan memberi angka bagus yang tidak berarti.
  await page.waitForTimeout(2500);

  const metrik = await page.evaluate(() => {
    const lcp = new Promise<number>((selesai) => {
      let nilai = 0;
      const pengamat = new PerformanceObserver((daftar) => {
        for (const entri of daftar.getEntries()) nilai = Math.max(nilai, entri.startTime);
      });
      pengamat.observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => selesai(nilai), 300);
    });
    return lcp;
  });

  // CLS dari PerformanceObserver, bukan dari hitungan manual per elemen.
  const cls = await page.evaluate(
    () =>
      new Promise<number>((selesai) => {
        let total = 0;
        const pengamat = new PerformanceObserver((daftar) => {
          for (const entri of daftar.getEntries()) {
            if (!(entri as { hadRecentInput?: boolean }).hadRecentInput) {
              total += (entri as unknown as { value: number }).value;
            }
          }
        });
        pengamat.observe({ type: "layout-shift", buffered: true });
        setTimeout(() => selesai(total), 300);
      }),
  );

  const lulus = metrik <= ATURAN_BAYANGAN.LCP && cls <= ATURAN_BAYANGAN.CLS;
  if (!lulus) gagal += 1;

  console.log(
    `${h.nama.padEnd(20)} ${String(Math.round(metrik)).padStart(6)} ms  ` +
      `${cls.toFixed(4).padStart(7)}  ` +
      `${String(Math.round(transfer / 1024)).padStart(6)} KB ${String(permintaan).padStart(10)}    ` +
      `${lulus ? "lulus" : "PERIKSA"}`,
  );

  await ctx.close();
}

console.log("");
if (gagal === 0) {
  console.log("Semua halaman masuk aturan bayangan.");
} else {
  console.log(`${gagal} halaman melewati aturan bayangan. Angkanya acuan, bukan penilaian Lighthouse.`);
}

await browser.close();