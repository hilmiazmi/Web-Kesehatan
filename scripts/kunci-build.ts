import { existsSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

/**
 * Kunci build paralel.
 *
 * `.next` adalah satu folder untuk semua sesi di mesin ini. Dua `bun run
 * build` yang berjalan bersamaan saling menimpa hasilnya, dan yang lebih
 * parah: `rm -rf .next` di tengah jalan membuat E2E yang sedang berjalan
 * memakai build setengah tulis. Pernah terjadi 10 Oktober 2026: panel mobile
 * gagal total dan tes mutasi lolos padahal mutasi aktif, semata karena
 * `.next/BUILD_ID` hilang di tengah uji.
 *
 * Protokolnya tiga mode, dipasang di `package.json`:
 *
 * - `tandai` (di `prebuild`): tulis penanda sebelum build mulai. `prebuild`
 *   berjalan otomatis setiap `bun run build`, jadi sesi mana pun yang
 *   membangun ikut menandai tanpa perlu ingat.
 * - `lepas` (di `postbuild`): hapus penanda setelah build selesai.
 * - `tunggu` (di depan `test:e2e`): tunggu sampai tidak ada build lain,
 *   lalu pastikan `.next/BUILD_ID` ada sebelum Playwright menyalakan server.
 *   Selain penanda, `tunggu` juga memeriksa proses `next-build` yang hidup,
 *   karena sesi yang menjalankan `next build` mentah tidak pernah menandai.
 *   Tetap ada celah kecil: build yang mulai persis setelah pemeriksaan.
 *   Itu jendela detik, bukan menit, dan jauh lebih kecil dari tanpa kunci.
 *
 * Penanda yang lebih tua dari `BEDA_BASI_MENIT` dianggap sisa build yang
 * gagal (penandanya tidak sempat dilepas), bukan build yang sedang jalan,
 * lalu dihapus dan jalan diteruskan. Tanpa kedaluwarsa ini, satu build yang
 * mati di tengah akan memblokir semua build dan semua E2E selamanya.
 */

const AKAR = join(import.meta.dirname, "..");
const PENANDA = join(AKAR, ".next-build-lock");
const ID_BUILD = join(AKAR, ".next", "BUILD_ID");

/** Penanda lebih tua dari ini dianggap basi, bukan build yang jalan. */
export const BEDA_BASI_MENIT = 20;
/** Menunggu build lain paling lama selama ini. */
const TUNGGU_MAKS_MENIT = 10;
const SELANG_DETIK = 5;

/**
 * Apakah penanda ini berarti ada build lain yang sedang jalan.
 *
 * Diekspor supaya bisa diuji tanpa menyentuh filesystem
 * (`tests/kunci-build.test.ts`).
 */
export function terkunci(buatanMs: number, sekarangMs: number): boolean {
  return sekarangMs - buatanMs < BEDA_BASI_MENIT * 60_000;
}

function buatanPenanda(): number | null {
  if (!existsSync(PENANDA)) return null;
  return statSync(PENANDA).mtimeMs;
}

/**
 * Apakah ada proses build Next di mesin ini, di luar skrip ini.
 *
 * Menutup celah penanda: penanda hanya dibuat oleh `prebuild`, jadi sesi yang
 * menjalankan `next build` mentah tidak menandai apa pun. Pola `[n]ext-build`
 * menghindari cocok dengan baris perintah pencariannya sendiri. `next start`
 * (server E2E) bernama `next-server`, jadi tidak ikut cocok.
 */
export function adaBuildBerjalan(): boolean {
  try {
    const keluar = execSync("ps -eo cmd", { encoding: "utf8" });
    return keluar
      .split("\n")
      .some((baris) => baris.includes("next-build") && !baris.includes("ps -eo"));
  } catch {
    return false;
  }
}

async function tunggu(): Promise<void> {
  const batas = Date.now() + TUNGGU_MAKS_MENIT * 60_000;
  for (;;) {
    const buatan = buatanPenanda();
    if (buatan === null || !terkunci(buatan, Date.now())) {
      if (buatan !== null) unlinkSync(PENANDA);
      // Penanda sudah tidak ada, tapi build mentah (`next build` langsung,
      // tanpa lewat `bun run build`) tidak pernah menandai. Periksa prosesnya
      // juga sebelum menyimpulkan bebas.
      if (!adaBuildBerjalan()) break;
    }
    if (Date.now() > batas) {
      console.error(
        `Masih ada build lain setelah ${TUNGGU_MAKS_MENIT} menit. ` +
          `Kalau build itu sudah mati, hapus ${PENANDA} lalu ulangi.`,
      );
      process.exit(1);
    }
    await Bun.sleep(SELANG_DETIK * 1000);
  }

  if (!existsSync(ID_BUILD)) {
    console.error(
      "Tidak ada .next/BUILD_ID: belum pernah build utuh di mesin ini, atau " +
        ".next sedang ditimpa build lain. Jalankan `bun run build` dulu " +
        "sampai selesai, lalu ulangi E2E.",
    );
    process.exit(1);
  }
}

const mode = process.argv[2];
// Hanya jalan sebagai CLI (`bun run scripts/kunci-build.ts ...`). Saat
// diimpor oleh tes, baris di bawah tidak boleh berjalan: `process.argv[2]`
// di Vitest bukan salah satu mode, dan `process.exit(1)` akan membunuh worker.
if (import.meta.main) {
  if (mode === "tandai") {
    writeFileSync(PENANDA, `${new Date().toISOString()}\n`);
  } else if (mode === "lepas") {
    if (existsSync(PENANDA)) unlinkSync(PENANDA);
  } else if (mode === "tunggu") {
    await tunggu();
  } else {
    console.error("Pakai: kunci-build.ts tandai|lepas|tunggu");
    process.exit(1);
  }
}
