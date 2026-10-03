import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAll,
  clientAddress,
  currentCount,
  limitRequest,
  resetLimit,
} from "@/server/api/rate-limit";
import { ApiError } from "@/server/api/error";
import { resetConfigCache } from "@/server/config";

/**
 * Rate limit in-memory adalah satu-satunya lapisan yang menahan penyalahgunaan
 * endpoint formulir di VPS ini, jadi dua hal diuji di sini:
 *
 * 1. Penghitung dipisah per endpoint. Satu IP yang menyalahgunakan satu
 *    endpoint tidak boleh memblokir endpoint lain, karena formulir pendaftaran
 *    yang gagal bukan berarti formulir pengaduan juga tidak boleh dikirim.
 * 2. Batas dihitung per alamat, dan alamat diambil dari header proxy.
 */

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
  RATE_LIMIT_MAX_REQUESTS: "3",
  RATE_LIMIT_WINDOW_SECONDS: "60",
} as const;

const ASLI = { ...process.env };

function headers(ip: string): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

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

describe("limitRequest", () => {
  it("melewatkan permintaan sampai batas terlampaui", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(() => limitRequest(headers("10.0.0.1"), "feedbacks")).not.toThrow();
    }
    expect(() => limitRequest(headers("10.0.0.1"), "feedbacks")).toThrow(ApiError);
  });

  it("memberi kode dan status yang benar saat terlampaui", () => {
    for (let i = 0; i < 3; i += 1) limitRequest(headers("10.0.0.1"), "feedbacks");

    try {
      limitRequest(headers("10.0.0.1"), "feedbacks");
      expect.unreachable("tidak seharusnya melempar");
    } catch (err) {
      const api = err as ApiError;
      expect(api.code).toBe("RATE_LIMITED");
      expect(api.status).toBe(429);
      expect(api.retryAfterSeconds).toBeGreaterThan(0);
      expect(api.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("memisahkan penghitung tiap endpoint", () => {
    for (let i = 0; i < 3; i += 1) limitRequest(headers("10.0.0.1"), "feedbacks");

    // Endpoint lain tidak boleh ikut terkunci.
    expect(() => limitRequest(headers("10.0.0.1"), "appointments")).not.toThrow();
    expect(() => limitRequest(headers("10.0.0.1"), "wbs-reports")).not.toThrow();
  });

  it("memisahkan penghitung tiap alamat", () => {
    for (let i = 0; i < 3; i += 1) limitRequest(headers("10.0.0.1"), "feedbacks");

    expect(() => limitRequest(headers("10.0.0.2"), "feedbacks")).not.toThrow();
  });

  it("memulai penghitung dari awal setelah jendela berlalu", () => {
    Object.assign(process.env, { RATE_LIMIT_WINDOW_SECONDS: "0" });
    resetConfigCache();

    for (let i = 0; i < 3; i += 1) limitRequest(headers("10.0.0.1"), "feedbacks");

    // Jendela nol berarti jendela yang langsung kedaluwarsa. Kalau penghitung
    // tidak menghormati itu, rate limit akan menolak semua permintaan selamanya
    // setelah dipakai sekali saja.
    expect(() => limitRequest(headers("10.0.0.1"), "feedbacks")).not.toThrow();
  });
});

describe("clientAddress", () => {
  it("mengambil alamat pertama dari daftar proxy", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(clientAddress(h)).toBe("203.0.113.7");
  });

  it("memakai x-real-ip saat x-forwarded-for tidak ada", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.4" });
    expect(clientAddress(h)).toBe("198.51.100.4");
  });

  it("mengembalikan penanda saat tidak ada header sama sekali", () => {
    // Bukan address kosong: address kosong akan menggabungkan semua klien yang
    // tidak mengirim header ke satu penghitung, jadi satu klien bisa membuat
    // semua orang terkunci.
    expect(clientAddress(new Headers())).toBe("tidak-diketahui");
  });
});

describe("resetLimit", () => {
  it("mengosongkan penghitung satu endpoint", () => {
    for (let i = 0; i < 3; i += 1) limitRequest(headers("10.0.0.1"), "feedbacks");
    resetLimit(headers("10.0.0.1"), "feedbacks");

    expect(currentCount(headers("10.0.0.1"), "feedbacks")).toBe(0);
    expect(() => limitRequest(headers("10.0.0.1"), "feedbacks")).not.toThrow();
  });
});
