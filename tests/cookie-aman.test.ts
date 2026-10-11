import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pemanggil `sessionCookie` dan `clearedSessionCookie` wajib mengoper `aman`.
 *
 * Sejak 10 Oktober 2026 kedua fungsi tidak lagi menghitung sendiri apakah
 * koneksi terenkripsi: yang bisa mengetahuinya hanya pemanggil, karena hanya
 * dia yang membaca header permintaan. Default parameternya `false` — pilihan
 * yang gagal-tertutup, aman sebagai bawaan, tapi berbahaya sebagai pelupa:
 * cookie yang terbit tanpa `Secure` di produksi https tidak memunculkan gejala
 * apa pun, dan baru terasa saat seseorang memeriksa cookie di DevTools.
 *
 * Karena itu aturannya dikunci di sini, bukan hanya dikomentari: setiap
 * pemanggil di `src/` harus mengoper argumen kedua. Cara kerjanya meniru
 * `tests/peran-admin.test.ts` — membaca sumber, bukan menjalankan route.
 */

const AKAR = path.resolve(import.meta.dirname, "..");
const SRC = path.join(AKAR, "src");

/** Berkas yang mendefinisikan kedua fungsi itu sendiri, bukan memanggil. */
const DEFINISI = "src/server/auth/session.ts";

const NAMA_FUNGSI = ["sessionCookie", "clearedSessionCookie"] as const;

function berkasKode(dir: string): string[] {
  const keluar: string[] = [];
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) keluar.push(...berkasKode(penuh));
    else if (entri.name.endsWith(".ts") || entri.name.endsWith(".tsx")) keluar.push(penuh);
  }
  return keluar;
}

/** Semua berkas yang benar-benar memanggil salah satu fungsi tersebut. */
function pemanggil(): { rel: string; sumber: string }[] {
  return berkasKode(SRC)
    .filter((f) => path.relative(AKAR, f) !== DEFINISI)
    .map((f) => ({ rel: path.relative(AKAR, f), sumber: readFileSync(f, "utf8") }))
    .filter((f) => NAMA_FUNGSI.some((n) => f.sumber.includes(`${n}(`)));
}

describe("pemanggil cookie sesi", () => {
  it("ada pemanggil yang benar-benar diperiksa", () => {
    // Tanpa jaga ini, tes di bawah bisa lulus karena nol pemanggil — lulus
    // tanpa menguji apa pun, bentuk kegagalan yang sudah pernah terjadi di repo.
    expect(pemanggil().length).toBeGreaterThan(0);
  });

  for (const nama of NAMA_FUNGSI) {
    it(`${nama} selalu dipanggil dengan argumen aman`, () => {
      for (const { rel, sumber } of pemanggil()) {
        for (const m of sumber.matchAll(new RegExp(`\\b${nama}\\(`, "g"))) {
          const sesudah = sumber.slice(m.index! + nama.length + 1);
          const argumen = sesudah.slice(0, sesudah.indexOf(")"));
          // Bentuk nilainya sengaja tidak dipersempit: boleh
          // `await koneksiTerenskripsi()` maupun variabel, yang dilarang hanya
          // argumen kosong.
          expect(argumen.trim(), `${rel}: ${nama} dipanggil tanpa argumen aman`).not.toBe("");
        }
      }
    });
  }

  it("tidak ada yang memanggil lewat alias impor", () => {
    // `import { sessionCookie as buatCookie }` akan lolos dari pemindaian di
    // atas. Ini jaring pengamannya.
    for (const { rel, sumber } of pemanggil()) {
      const alias = /import\s*\{[^}]*\bsessionCookie\s+as\s+\w+[^}]*\}/.test(sumber);
      expect(alias, `${rel} memakai alias impor`).toBe(false);
    }
  });
});
