import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jalankanForm } from "@/server/api/form";
import { ApiError } from "@/server/api/error";
import type { TicketKind } from "@/server/ticket";
import { resetConfigCache } from "@/server/config";

/**
 * Mode snapshot harus menolak **setiap** permintaan yang mengubah data.
 *
 * Ini syarat yang diminta TAHAP D, dan sifatnya tidak bisa dijamin dari mata.
 * Mode snapshot dipakai build pratinjau, jadi ia sering dijalankan dengan
 * `DATABASE_URL` yang sengaja tidak diarahkan ke mana pun. Kalau satu endpoint
 * tulis berhasil menembus, ia akan menulis ke database yang salah, atau lebih
 * buruk: menulis ke produksi karena `DATABASE_URL` masih terisi di environment
 * pratinjau. Kegagalan itu tidak muncul sebagai halaman rusak, tapi sebagai
 * data yang hilang di tempat lain.
 *
 * Yang diuji di sini adalah **urutannya**: `langkah` adalah fungsi yang
 * menulis, dan pengujian ini memastikan `langkah` tidak pernah terpanggil.
 * Menguji status 503 saja tidak cukup, karena 503 juga bisa datang dari
 * validasi atau dari rate limit, dan keduanya tidak membuktikan apa pun tentang
 * mode baca-saja.
 */

const keadaan = vi.hoisted(() => ({
  /** `null` berarti mode snapshot: tidak ada database. */
  database: { execute: async () => [] } as unknown,
}));

vi.mock("@/server/db/client", () => ({
  dbOrNull: () => (keadaan.database === null ? null : keadaan.database),
}));

const LINGKUNGAN = {
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
  ADMIN_ORIGIN: "http://localhost:3000",
  RATE_LIMIT_MAX_REQUESTS: "1000",
  RATE_LIMIT_WINDOW_SECONDS: "60",
} as const;

const ASLI = { ...process.env };

/** Fungsi tulis yang harus tidak pernah terpanggil di mode snapshot. */
const langkah = vi.fn(async () => ({ tersimpan: true }));

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN, { API_MODE: "snapshot" });
  resetConfigCache();
  keadaan.database = null;
  langkah.mockClear();
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
  keadaan.database = { execute: async () => [] };
});

function permintaan(jenis: string): Request {
  return new Request("http://localhost/api/v1/uji", {
    method: jenis,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nama: "Uji", pesan: "Isi uji." }),
  });
}

/** Enam endpoint tulis publik beserta jenis tiketnya. */
const ENDPOINT_TULIS: readonly { nama: string; kind: TicketKind }[] = [
  { nama: "pendaftaran rawat jalan", kind: "appointment" },
  { nama: "rawat inap", kind: "admission" },
  { nama: "registrasi MCU", kind: "mcu" },
  { nama: "kritik dan saran", kind: "feedback" },
  { nama: "WBS", kind: "wbs" },
  { nama: "survei kepuasan", kind: "survey" },
];

describe("mode snapshot menolak setiap endpoint tulis publik", () => {
  for (const { nama, kind } of ENDPOINT_TULIS) {
    it(`menolak ${nama} dengan 503 tanpa menjalankan langkah tulis`, async () => {
      await expect(
        jalankanForm(permintaan("POST"), `uji-${kind}`, kind, langkah),
      ).rejects.toMatchObject({ status: 503, code: "READ_ONLY_MODE" });

      // Inilah yang benar-benar dikunci. Status 503 saja bisa datang dari
      // validasi; `langkah` yang tidak terpanggil tidak bisa datang dari mana
      // lain kecuali mode baca-saja.
      expect(langkah).not.toHaveBeenCalled();
    });
  }

  it("menolak juga untuk method selain POST", async () => {
    for (const jenis of ["PATCH", "PUT", "DELETE"]) {
      await expect(
        jalankanForm(permintaan(jenis), "uji-method", "feedback", langkah),
      ).rejects.toMatchObject({ status: 503, code: "READ_ONLY_MODE" });
    }
    expect(langkah).not.toHaveBeenCalled();
  });

  it("pesan penolakan dibaca petugas, bukan laporan teknis", async () => {
    const galat = await jalankanForm(
      permintaan("POST"),
      "uji-pesan",
      "feedback",
      langkah,
    ).catch((err: unknown) => err);

    expect(galat).toBeInstanceOf(ApiError);
    const pesan = (galat as ApiError).message;
    expect(pesan).toMatch(/mode baca-saja/i);
    // "503" atau nama driver tidak membantu petugas, dan membuat mereka mengira
    // servernya rusak.
    expect(pesan).not.toMatch(/postgres|ECONNREFUSED|503/);
  });

  it("honeypot tetap dijawab dengan kode palsu, bukan 503", async () => {
    // Bot harus tetap melihat jawaban yang meyakinkan berhasil. Kalau honeypot
    // ikut kena 503, bot akan belajar bahwa endpoint sedang rusak dan pindah
    // menyerang yang lain. Urutannya karena honeypot diperiksa sebelum
    // `dbOrNull()`.
    const req = new Request("http://localhost/api/v1/uji", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nama: "Bot", pesan: "Isi.", website: "https://spam.test" }),
    });

    const hasil = await jalankanForm(req, "uji-honeypot", "feedback", langkah);

    expect(hasil).toMatchObject({ status: "received" });
    expect(langkah).not.toHaveBeenCalled();
  });
});

describe("mode live tetap mencoba menulis", () => {
  beforeEach(() => {
    // Bukti lawannya, supaya test di atas tidak bisa lulus karena `jalankanForm`
    // menolak semua hal tanpa syarat. Mode live butuh `dbOrNull()` yang
    // mengembalikan objek; kalau tidak, penolakan di `form.ts:59` tetap terjadi
    // dan test ini mengukur hal yang sama dua kali.
    Object.assign(process.env, { API_MODE: "live" });
    resetConfigCache();
    keadaan.database = { execute: async () => [] };
  });

  it("memanggil langkah tulis dan bukan menolak dengan readOnly", async () => {
    const hasil = await jalankanForm(
      permintaan("POST"),
      "uji-live",
      "feedback",
      langkah,
    );

    expect(langkah).toHaveBeenCalledTimes(1);
    expect(hasil).toEqual({ tersimpan: true });
  });
});