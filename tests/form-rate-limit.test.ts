import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/server/api/error";
import { jalankanForm } from "@/server/api/form";
import { clearAll, currentCount } from "@/server/api/rate-limit";
import { resetConfigCache } from "@/server/config";

/**
 * Penghitung rate limit sesudah formulir tersimpan.
 *
 * `resetLimit` sudah ada di modul rate limit, dan komentar di sana sudah
 * menjelaskan bahwa pemanggilnya Hendaknya ada. Tapi tidak ada satu pun
 * berkas yang memanggilnya, jadi batas lima permintaan per menit berlaku
 * juga untuk orang yang sudah berhasil mendaftar.
 *
 * Ini bukan kasus yang jarang di Indonesia: kantor, kampus, dan jaringan
 * seluler berbagi satu alamat IP publik. Lima orang yang mendaftar dari
 * satu jaringan membuat orang berikutnya terkunci tanpa pernah melakukan
 * kesalahan.
 *
 * Yang diuji di sini bukan `resetLimit` itu sendiri, tapi kapan
 * `jalankanForm` memanggilnya. Reset yang terlalu longgar lebih berbahaya
 * daripada tidak ada reset sama sekali: kalau dipanggil pada permintaan
 * yang gagal, penyerang dapat mencoba tanpa batas.
 */

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
  RATE_LIMIT_MAX_REQUESTS: "3",
  RATE_LIMIT_WINDOW_SECONDS: "60",
} as const;

const ASLI = { ...process.env };

/** Satu permintaan POST dengan body JSON, dari satu alamat tertentu. */
function permintaan(ip: string, body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/v1/uji", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function penghitung(ip: string, endpoint: string): number {
  return currentCount(new Headers({ "x-forwarded-for": ip }), endpoint);
}

const ENDPOINT = "uji";

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN);
  resetConfigCache();
  clearAll();
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
  clearAll();
});

describe("jalankanForm dan rate limit", () => {
  it("mengosongkan penghitung setelah pendaftaran tersimpan", async () => {
    const alamat = "10.1.1.1";

    for (let i = 0; i < 3; i += 1) {
      await jalankanForm(
        permintaan(alamat, { nama: "Sah" }),
        ENDPOINT,
        "appointment",
        async () => ({ ok: true }),
      );
    }

    // Empat pendaftaran berturut-turut dari satu alamat. Kalau penghitung
    // tidak dikosongkan, permintaan keempat sudah terlampaui.
    const hasil = await jalankanForm(
      permintaan(alamat, { nama: "Sah" }),
      ENDPOINT,
      "appointment",
      async () => ({ ok: true }),
    );

    expect(hasil).toEqual({ ok: true });
    expect(penghitung(alamat, ENDPOINT)).toBe(0);
  });

  it("tidak mengosongkan penghitung saat pendaftaran ditolak", async () => {
    const alamat = "10.2.2.2";

    // Satu yang berhasil: haknya dikembalikan, penghitung kosong lagi.
    await jalankanForm(
      permintaan(alamat, { nama: "Awal" }),
      ENDPOINT,
      "appointment",
      async () => ({ ok: true }),
    );

    // Dua yang ditolak: keduanya memakai haknya dan tidak dikembalikan.
    for (let i = 0; i < 2; i += 1) {
      await expect(
        jalankanForm(permintaan(alamat, { nama: "Salah" }), ENDPOINT, "appointment", async () => {
          throw ApiError.badRequest("NIK harus 16 digit angka.");
        }),
      ).rejects.toBeInstanceOf(ApiError);
    }

    // Kalau penolakan ikut mengembalikan hak, angka ini akan nol.
    expect(penghitung(alamat, ENDPOINT)).toBe(2);
  });

  it("tidak mengosongkan penghitung untuk permintaan honeypot", async () => {
    const alamat = "10.3.3.3";
    let dipanggil = 0;

    await jalankanForm(
      permintaan(alamat, { website: "https://bot.example" }),
      ENDPOINT,
      "appointment",
      async () => {
        dipanggil += 1;
        return { ok: true };
      },
    );

    // Honeypot dijawab tanpa menyentuh database, jadi tidak ada yang
    // tersimpan dan tidak ada hak yang dikembalikan.
    expect(dipanggil).toBe(0);
    expect(penghitung(alamat, ENDPOINT)).toBe(1);
  });

  it("tetap menahan penyalahgunaan yang tidak pernah berhasil", async () => {
    const alamat = "10.4.4.4";

    for (let i = 0; i < 3; i += 1) {
      await jalankanForm(permintaan(alamat, { website: "x" }), ENDPOINT, "appointment", async () => ({
        ok: true,
      })).catch(() => undefined);
    }

    await expect(
      jalankanForm(permintaan(alamat, { website: "x" }), ENDPOINT, "appointment", async () => ({
        ok: true,
      })),
    ).rejects.toBeInstanceOf(ApiError);

    // Batas tetap berlaku untuk penyerang yang tidak pernah berhasil
    // menyimpan apa pun, jadi mengosongkan penghitung setelah berhasil
    // tidak membuka jalan percobaan tanpa batas.
  });
});
