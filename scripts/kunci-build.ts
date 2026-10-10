import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
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
 * Protokolnya memakai dua penanda, dipasang di `package.json`:
 *
 * - `tandai` (di `prebuild`): menunggu sampai tidak ada E2E dan tidak ada
 *   build lain, baru menulis penanda build. Menunggu, bukan langsung jalan,
 *   supaya dua build berurutan rapi dan build tidak menimpa E2E yang sedang
 *   membaca `.next`. `prebuild` berjalan otomatis setiap `bun run build`.
 * - `lepas` (di `postbuild`): hapus penanda build setelah build selesai.
 * - `tunggu-tandai` (di depan `test:e2e`): tunggu sampai tidak ada build
 *   lain, pastikan `.next/BUILD_ID` ada, lalu MENAHAN kunci E2E bertoken
 *   selama tes berjalan dan mencetak tokennya ke stdout. Selain penanda,
 *   `tunggu` juga memeriksa proses `next-build` yang hidup, karena sesi
 *   yang menjalankan `next build` mentah tidak pernah menandai.
 *
 * Kunci E2E dilepas oleh `globalTeardown` Playwright (`e2e/global-teardown.ts`),
 * bukan oleh hook `post` bun. Alasannya terukur: bun tidak menjalankan hook
 * `post` kalau skripnya gagal, jadi pelepasan lewat sana akan tertinggal
 * tepat saat E2E benar-benar merah dan memblokir semua build 20 menit.
 * `globalTeardown` tetap jalan saat tes gagal. Token (`KUNCI_E2E`) memastikan
 * teardown hanya melepas kunci miliknya sendiri, bukan milik sesi lain.
 *
 * Penanda yang lebih tua dari `BEDA_BASI_MENIT` dianggap sisa proses yang
 * mati (penandanya tidak sempat dilepas), bukan proses yang sedang jalan,
 * lalu dihapus dan jalan diteruskan. Tanpa kedaluwarsa ini, satu proses yang
 * mati di tengah akan memblokir semua build dan semua E2E selamanya.
 *
 * Masih ada satu jendela kecil: build yang mulai persis di antara pemeriksaan
 * dan penandaan kunci E2E. Jendela ini selebar milidetik, dan E2E memeriksanya
 * ulang tepat setelah menandai (kalau build muncul, kunci E2E dilepas lagi
 * dan menunggu diulang dengan batas waktu yang sama). Jauh lebih kecil dari
 * tanpa kunci, yang jendelanya sepanjang jalan E2E.
 */

const AKAR = join(import.meta.dirname, "..");
const PENANDA = join(AKAR, ".next-build-lock");
const PENANDA_E2E = join(AKAR, ".next-e2e-lock");
const ID_BUILD = join(AKAR, ".next", "BUILD_ID");

/** Penanda lebih tua dari ini dianggap basi, bukan proses yang jalan. */
export const BEDA_BASI_MENIT = 20;
/** Menunggu proses lain paling lama selama ini. */
const TUNGGU_MAKS_MENIT = 10;
const SELANG_DETIK = 5;

/**
 * Apakah penanda ini berarti ada proses lain yang sedang jalan.
 *
 * Diekspor supaya bisa diuji tanpa menyentuh filesystem
 * (`tests/kunci-build.test.ts`).
 */
export function terkunci(buatanMs: number, sekarangMs: number): boolean {
  return sekarangMs - buatanMs < BEDA_BASI_MENIT * 60_000;
}

/**
 * Apakah berkas kunci boleh dihapus dengan token ini.
 *
 * Aturannya satu baris supaya cerminannya di `e2e/global-teardown.ts` tidak
 * bisa meleset jauh: isi harus sama persis dengan token, dan token kosong
 * tidak boleh melepas apa pun (teardown yang jalan tanpa lewat `test:e2e`
 * tidak punya token, jadi tidak boleh menyentuh kunci sesi lain).
 * Diekspor supaya bisa diuji (`tests/kunci-build.test.ts`).
 */
export function bolehLepas(isi: string | null, token: string): boolean {
  return token !== "" && isi !== null && isi.trim() === token;
}

function buatanPenanda(penanda: string): number | null {
  if (!existsSync(penanda)) return null;
  return statSync(penanda).mtimeMs;
}

/**
 * Tunggu sampai `bebas()` benar, lalu kembali. Kalau lewat batas, berhenti
 * dengan pesan yang menyebut penunggunya. Batas dipakai bersama supaya
 * pengulangan (misalnya mundur setelah jendela kecil di atas) tetap
 * berbatas, bukan menunggu selamanya.
 */
async function tungguSampai(
  pesan: string,
  batas: number,
  bebas: () => boolean,
): Promise<void> {
  for (;;) {
    if (bebas()) return;
    if (Date.now() > batas) {
      console.error(pesan);
      process.exit(1);
    }
    await Bun.sleep(SELANG_DETIK * 1000);
  }
}

/** Hapus penanda yang sudah basi; kembalikan true kalau bebas. */
function bebasKalauBasi(penanda: string): boolean {
  const buatan = buatanPenanda(penanda);
  if (buatan === null) return true;
  if (terkunci(buatan, Date.now())) return false;
  unlinkSync(penanda);
  return true;
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

function pesanTunggu(nama: string): string {
  return (
    `Masih ada ${nama} setelah ${TUNGGU_MAKS_MENIT} menit. ` +
    `Kalau proses itu sudah mati, hapus penandanya lalu ulangi.`
  );
}

async function tandai(): Promise<void> {
  const batas = Date.now() + TUNGGU_MAKS_MENIT * 60_000;
  await tungguSampai(pesanTunggu("E2E atau build lain"), batas, () => {
    if (!bebasKalauBasi(PENANDA_E2E)) return false;
    if (!bebasKalauBasi(PENANDA)) return false;
    return true;
  });
  writeFileSync(PENANDA, `${new Date().toISOString()}\n`);
}

function lepas(penanda: string): void {
  if (existsSync(penanda)) unlinkSync(penanda);
}

function bebasUntukE2E(): boolean {
  if (!bebasKalauBasi(PENANDA)) return false;
  // Penanda sudah tidak ada, tapi build mentah (`next build` langsung,
  // tanpa lewat `bun run build`) tidak pernah menandai. Periksa prosesnya
  // juga sebelum menyimpulkan bebas.
  if (adaBuildBerjalan()) return false;
  if (!bebasKalauBasi(PENANDA_E2E)) return false;
  return true;
}

async function tungguTandai(): Promise<void> {
  const batas = Date.now() + TUNGGU_MAKS_MENIT * 60_000;
  for (;;) {
    await tungguSampai(pesanTunggu("build atau E2E lain"), batas, bebasUntukE2E);

    if (!existsSync(ID_BUILD)) {
      console.error(
        "Tidak ada .next/BUILD_ID: belum pernah build utuh di mesin ini, atau " +
          ".next sedang ditimpa build lain. Jalankan `bun run build` dulu " +
          "sampai selesai, lalu ulangi E2E.",
      );
      process.exit(1);
    }

    // Kunci E2E ditahan selama tes berjalan; tokennya dicetak ke stdout
    // supaya `test:e2e` bisa meneruskannya ke `globalTeardown` lewat
    // environment. Baris lain (pesan tunggu, galat) memakai stderr, jadi
    // stdout hanya berisi token.
    const token = `${process.pid}-${Date.now()}`;
    writeFileSync(PENANDA_E2E, `${token}\n`);

    // Jendela kecil: build yang mulai persis setelah pemeriksaan. Kalau
    // muncul, lepas lagi dan ulangi menunggu dengan batas yang sama.
    const buatan = buatanPenanda(PENANDA);
    if (
      (buatan !== null && terkunci(buatan, Date.now())) ||
      adaBuildBerjalan()
    ) {
      unlinkSync(PENANDA_E2E);
      continue;
    }

    console.log(token);
    return;
  }
}

const mode = process.argv[2];
// Hanya jalan sebagai CLI (`bun run scripts/kunci-build.ts ...`). Saat
// diimpor oleh tes, baris di bawah tidak boleh berjalan: `process.argv[2]`
// di Vitest bukan salah satu mode, dan `process.exit(1)` akan membunuh worker.
if (import.meta.main) {
  if (mode === "tandai") {
    await tandai();
  } else if (mode === "lepas") {
    lepas(PENANDA);
  } else if (mode === "tunggu-tandai") {
    await tungguTandai();
  } else if (mode === "lepas-e2e") {
    // Untuk bersih-bersih manual. Tanpa token yang cocok tidak ada yang
    // dihapus, supaya tidak sengaja melepas kunci sesi lain.
    const token = process.argv[3] ?? "";
    let isi: string | null = null;
    try {
      isi = readFileSync(PENANDA_E2E, "utf8");
    } catch {
      isi = null;
    }
    if (!bolehLepas(isi, token)) {
      console.error("Token tidak cocok atau tidak ada kunci E2E; tidak ada yang dilepas.");
      process.exit(1);
    }
    unlinkSync(PENANDA_E2E);
  } else {
    console.error("Pakai: kunci-build.ts tandai|lepas|tunggu-tandai|lepas-e2e <token>");
    process.exit(1);
  }
}
