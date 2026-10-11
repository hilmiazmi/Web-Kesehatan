import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SECRET_MIN, resetConfigCache } from "@/server/config";

/**
 * Yang diuji di sini adalah keputusan "cookie sesi boleh bertanda `Secure` atau
 * tidak", yang dulu dihitung dari `ADMIN_ORIGIN` saja dan ternyata salah di
 * produksi: di belakang proksi TLS, aplikasi menerima `http` dari proksi
 * sedangkan pengunjung memakai `https`, jadi cookie terbit tanpa `Secure` dan
 * ikut terkirim pada koneksi yang tidak dienkripsi.
 *
 * Yang dikunci di sini:
 *
 * - `x-forwarded-proto` benar-benar ikut menentukan, bukan hanya `ADMIN_ORIGIN`.
 * - header bernilai ganda tidak jatuh ke nilai pertama, karena nilai itu bisa
 *   berasal dari klien.
 *
 * `next/headers` di-mock karena modul tersebut hanya bisa dipakai di dalam
 * konteks permintaan Next.js; di sini tidak ada permintaan.
 */

/** Isi `x-forwarded-proto` yang akan dikembalikan mock; `null` = header absen. */
const keadaan = vi.hoisted(() => ({
  proto: null as string | null,
  /** Kalau true, `headers()` melempar seperti dipanggil di luar permintaan. */
  lempar: false,
}));

vi.mock("next/headers", () => ({
  headers: async () => {
    if (keadaan.lempar) throw new Error("di luar konteks permintaan");
    return {
      get: (nama: string) =>
        nama === "x-forwarded-proto" ? keadaan.proto : null,
    };
  },
}));

const { koneksiTerenskripsi } = await import("@/lib/koneksi-aman");

const ASLI = { ...process.env };

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: AUTH_SECRET_MIN >= 32 ? "kunci-uji-lokal-minimal-32-karakter" : "kunci-uji",
  ADMIN_ORIGIN: "http://localhost:3000",
} as const;

/** Pasang environment lalu kosongkan cache, karena `config()` membaca sekali. */
function denganEnv(nilai: Record<string, string | undefined>): void {
  for (const [key, isi] of Object.entries(nilai)) {
    if (isi === undefined) delete process.env[key];
    else process.env[key] = isi;
  }
  resetConfigCache();
}

beforeEach(() => {
  Object.assign(process.env, ASLI);
  denganEnv({ ...LINGKUNGAN });
  keadaan.proto = null;
  keadaan.lempar = false;
});

afterEach(() => {
  Object.assign(process.env, ASLI);
  resetConfigCache();
});

describe("koneksiTerenskripsi", () => {
  it("memakai ADMIN_ORIGIN https tanpa membaca header", async () => {
    denganEnv({ ...LINGKUNGAN, ADMIN_ORIGIN: "https://rsud.example.test" });
    keadaan.proto = "http";

    // Nilai header sengaja `http`: kalau header dibaca lebih dulu, hasilnya
    // akan salah. Yang benar tetap `true` karena operator menyetel https.
    expect(await koneksiTerenskripsi()).toBe(true);
  });

  it("menganggap aman ketika header menyebut https", async () => {
    keadaan.proto = "https";
    expect(await koneksiTerenskripsi()).toBe(true);
  });

  /**
   * Kasus yang membuat perbaikan ini ada. Proksi yang MENAMBAH pada header
   * yang dikirim klien menghasilkan `http, https`, dan nilai pertama berasal
   * dari klien. Kalau nilai pertama yang dipakai, siapa pun bisa mengirim
   * `x-forwarded-proto: http` pada permintaan login dan membuat cookie sesi
   * terbit tanpa atribut `Secure` padahal kunjungannya HTTPS.
   */
  it("tetap aman ketika nilai https ada di belakang nilai http kiriman klien", async () => {
    keadaan.proto = "http, https";
    expect(await koneksiTerenskripsi()).toBe(true);
  });

  it("tidak aman ketika header menyebut http", async () => {
    keadaan.proto = "http";
    expect(await koneksiTerenskripsi()).toBe(false);
  });

  it("tidak aman ketika header absen", async () => {
    // Deployment tanpa proksi: tidak ada yang bisa dipercaya selain
    // konfigurasi, dan konfigurasi sudah diperiksa lebih dulu.
    keadaan.proto = null;
    expect(await koneksiTerenskripsi()).toBe(false);
  });

  it("menerima tulisan https dengan huruf besar", async () => {
    // Skema URL tidak peka huruf besar-kecil; header juga tidak seharusnya.
    keadaan.proto = "HTTPS";
    expect(await koneksiTerenskripsi()).toBe(true);
  });

  it("tidak melempar kalau dipanggil di luar konteks permintaan", async () => {
    // `headers()` melempar di luar permintaan. Alur login tidak boleh gagal
    // hanya karena itu; jatuh ke konfigurasi saja.
    keadaan.lempar = true;
    expect(await koneksiTerenskripsi()).toBe(false);
  });

  it("protoPilihan tidak pernah memakai nilai pertama saja", async () => {
    const { protoPilihan } = await import("@/lib/koneksi-aman");

    expect(protoPilihan("http, https")).toBe("https");
    expect(protoPilihan("https, http")).toBe("https");
    expect(protoPilihan("http")).toBe("http");
    expect(protoPilihan(null)).toBe("http");
    expect(protoPilihan("")).toBe("http");
    expect(protoPilihan("  HTTPS  ")).toBe("https");
  });
});

describe("protoPilihan", () => {
  it("kembali ke http ketika header hanya berisi spasi", async () => {
    const { protoPilihan } = await import("@/lib/koneksi-aman");
    expect(protoPilihan("   ")).toBe("http");
  });
});
