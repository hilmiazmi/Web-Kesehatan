import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Melepas kunci E2E (`scripts/kunci-build.ts`) setelah Playwright selesai.
 *
 * Dilepas di sini, bukan di hook `post` bun: bun tidak menjalankan hook
 * `post` kalau skripnya gagal, jadi pelepasan lewat sana tertinggal tepat
 * saat E2E benar-benar merah. `globalTeardown` tetap jalan saat tes gagal.
 *
 * Hanya kunci milik sendiri yang dilepas. Tokennya datang dari `test:e2e`
 * lewat environment (`KUNCI_E2E`), dicocokkan dengan isi berkas kunci —
 * cermin dari `bolehLepas()` di `scripts/kunci-build.ts`, ubah keduanya
 * bersama. Tanpa token (misalnya `playwright test` langsung) atau token
 * beda (kunci milik sesi lain), tidak ada yang disentuh dan keluar diam-diam:
 * teardown yang berisik justru menutupi hasil tes yang sebenarnya.
 *
 * Berkas ini `.mjs`, bukan `.ts`, dengan sengaja. Paket ini tidak menulis
 * `"type": "module"`, dan Playwright memuat `globalTeardown` lewat `import`
 * bawaan Node (bukan lewat transform-nya seperti berkas tes), sehingga
 * `.ts` ditolak dengan `Cannot use 'import.meta' outside a module`.
 * Logikanya hanya baca-banding-hapus, jadi JavaScript polos cukup.
 */

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalTeardown() {
  const token = process.env.KUNCI_E2E ?? "";
  if (token === "") return;
  const penanda = join(AKAR, ".next-e2e-lock");
  if (!existsSync(penanda)) return;
  let isi;
  try {
    isi = readFileSync(penanda, "utf8");
  } catch {
    return;
  }
  if (isi.trim() !== token) return;
  try {
    unlinkSync(penanda);
  } catch {
    // Sudah hilang lebih dulu (misalnya dibersihkan manual); bukan galat.
  }
}
