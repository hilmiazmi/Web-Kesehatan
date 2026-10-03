import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_SECRET_MIN, config, resetConfigCache } from "@/server/config";

/**
 * Yang diuji di sini adalah keputusan "mulai atau jangan mulai", bukan
 * pembacaan environment.
 *
 * `config()` sengaja berhenti cepat kalau ada yang tidak lengkap. Aplikasi yang
 * start dengan `AUTH_SECRET` kosong lebih berbahaya daripada yang tidak start,
 * karena ia menerima sesi apa pun tanpa bisa diverifikasi. Kalau aturan itu
 * longgar, satu deployment dengan environment yang salah diam-diam terbuka.
 */

const ASLI = { ...process.env };

/** Tulis environment tanpa menyentuh cache konfigurasi. */
function pasangEnv(nilai: Record<string, string | undefined>): void {
  for (const [key, isi] of Object.entries(nilai)) {
    if (isi === undefined) delete process.env[key];
    else process.env[key] = isi;
  }
}

/**
 * Pasang environment untuk satu test, lalu kosongkan cache konfigurasi.
 *
 * Mengosongkan cache selalu wajib di sini: `config()` membaca environment satu
 * kali seumur proses, jadi test berikutnya akan menerima objek dari test
 * sebelumnya kalau cache tidak dibersihkan.
 */
function denganEnv(nilai: Record<string, string | undefined>): void {
  pasangEnv(nilai);
  resetConfigCache();
}

/** Environment minimum yang dianggap sah. */
const SAH = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
} as const;

beforeEach(() => {
  Object.assign(process.env, ASLI);
  denganEnv(SAH);
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
});

describe("config", () => {
  it("membaca nilai dari environment", () => {
    denganEnv({ ...SAH, ADMIN_ORIGIN: "https://contoh.test", DB_MAX_CONNECTIONS: "4" });

    const c = config();
    expect(c.adminOrigin).toBe("https://contoh.test");
    expect(c.dbMaxConnections).toBe(4);
  });

  it("memberi nilai bawaan yang wajar untuk variabel yang tidak diisi", () => {
    denganEnv({ ...SAH, SESSION_MAX_AGE_SECONDS: undefined, RATE_LIMIT_MAX_REQUESTS: undefined });

    const c = config();
    expect(c.sessionMaxAgeSeconds).toBe(28800);
    expect(c.rateLimitMax).toBe(5);
    expect(c.apiMode).toBe("live");
  });

  it("menolak AUTH_SECRET kosong di mode live", () => {
    denganEnv({ ...SAH, AUTH_SECRET: "" });
    expect(() => config()).toThrow(/AUTH_SECRET/);
  });

  it("menolak AUTH_SECRET yang terlalu pendek", () => {
    denganEnv({ ...SAH, AUTH_SECRET: "pendek" });
    expect(() => config()).toThrow(new RegExp(String(AUTH_SECRET_MIN)));
  });

  it("menerima AUTH_SECRET kosong di mode snapshot", () => {
    // Mode snapshot tidak memverifikasi sesi apa pun, jadi tidak ada kunci yang
    // perlu ada. Menolaknya di sini akan membuat build pratinjau di Vercel
    // mustahil tanpa memberikan satu pun keuntungan keamanan.
    denganEnv({ ...SAH, API_MODE: "snapshot", AUTH_SECRET: "", DATABASE_URL: "" });

    const c = config();
    expect(c.apiMode).toBe("snapshot");
    expect(c.databaseUrl).toBe("");
  });

  it("menolak nilai angka yang bukan bilangan", () => {
    denganEnv({ ...SAH, DB_MAX_CONNECTIONS: "banyak" });
    expect(() => config()).toThrow();
  });

  it("menolak jumlah koneksi nol", () => {
    // Kumpulan koneksi dengan nol koneksi tidak bisa melayani apa pun, dan
    // gejalanya muncul jauh dari titik di mana salahnya terlihat.
    denganEnv({ ...SAH, DB_MAX_CONNECTIONS: "0" });
    expect(() => config()).toThrow(/DB_MAX_CONNECTIONS/);
  });

  it("menerapkan batas bawah yang berbeda per variabel", () => {
    // Nol sah untuk rentang hari: pendaftaran boleh untuk hari yang sama.
    denganEnv({ ...SAH, MIN_LEAD_DAYS: "0" });
    expect(config().minLeadDays).toBe(0);

    denganEnv({ ...SAH, MIN_LEAD_DAYS: "-1" });
    expect(() => config()).toThrow(/MIN_LEAD_DAYS/);
  });

  it("menyimpan hasil baca sehingga environment yang berubah tidak berpengaruh", () => {
    const pertama = config();

    pasangEnv({ ...SAH, AUTH_SECRET: "kunci-lain-yang-juga-cukup-panjang" });
    const kedua = config();

    // Pertahankan cache: satu proses hanya boleh membaca environment sekali.
    // Menggantinya di tengah permintaan akan membuat token sesi yang sudah
    // dibuat berhenti berlaku tanpa ada yang menyadarinya.
    expect(kedua).toBe(pertama);
  });

  it("membaca ulang setelah cache dikosongkan", () => {
    const pertama = config().adminOrigin;
    pasangEnv({ ...SAH, ADMIN_ORIGIN: "https://lain.test" });

    expect(config().adminOrigin).toBe(pertama);
    resetConfigCache();
    expect(config().adminOrigin).toBe("https://lain.test");
  });

  it("menganggap API_MODE yang tidak dikenal sebagai mode live", () => {
    denganEnv({ ...SAH, API_MODE: "ajaib" });
    expect(config().apiMode).toBe("live");
  });
});
