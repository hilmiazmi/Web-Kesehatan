import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOKIE_NAME,
  newClaims,
  readSession,
  requireSession,
  signSession,
  type SessionClaims,
} from "@/server/auth/session";
import { resetConfigCache } from "@/server/config";
import { ApiError } from "@/server/api/error";

/**
 * `readSession()` adalah satu-satunya tempat yang membatalkan sesi yang sudah
 * dicuri, jadi logikanya diuji langsung terhadap database yang disimulasikan:
 *
 * 1. Angka pencabutan di token dibandingkan dengan `users.session_version`.
 * 2. Akun yang dinonaktifkan atau sudah dihapus ditolak meski tokennya sah.
 * 3. Token yang tanda tangannya rusak ditolak sebelum database disinggung.
 *
 * Tanpa tes ini, penghapusan satu baris perbandingan cukup membuat seluruh
 * akun yang kredensialnya berubah tetap punya akses sampai tokennya kedaluwarsa,
 * dan seluruh tes lain tetap hijau karena semuanya menguji `verifySession` saja.
 */

/**
 * Keadaan simulasi untuk `next/headers` dan `dbOrNull`.
 *
 * `vi.hoisted` dipakai karena fungsi mock harus sudah ada saat modul diimpor.
 */
const keadaan = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  /** `undefined` berarti baris akunnya tidak ada. */
  akun: undefined as { session_version: number; is_active: boolean } | undefined,
  /** `null` berarti mode snapshot, jadi tidak ada database sama sekali. */
  database: true as unknown,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nama: string) =>
      nama === "rsud_session" && keadaan.cookie !== undefined
        ? { value: keadaan.cookie }
        : undefined,
  }),
}));

vi.mock("@/server/db/client", () => ({
  dbOrNull: () => (keadaan.database === null ? null : { execute: async () => [keadaan.akun] }),
}));

const RAHASIA = "kunci-uji-lokal-minimal-32-karakter";

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: RAHASIA,
  ADMIN_ORIGIN: "http://localhost:3000",
} as const;

const ASLI = { ...process.env };

const SUB = "8a21b750-ab52-4c3b-94ce-ad623031c75b";

function token({ sv, role }: { sv: number; role?: SessionClaims["role"] }): string {
  return signSession(
    newClaims({
      id: SUB,
      email: "admin@contoh.test",
      name: "Admin Uji",
      role: role ?? "super_admin",
      sessionVersion: sv,
    }),
    RAHASIA,
  );
}

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN);
  resetConfigCache();
  keadaan.cookie = token({ sv: 3 });
  keadaan.akun = { session_version: 3, is_active: true };
  keadaan.database = true;
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
  keadaan.cookie = undefined;
  keadaan.akun = undefined;
  keadaan.database = true;
});

describe("readSession", () => {
  it("memakai nama cookie yang sama dengan yang dibaca server", () => {
    // Mock di atas menulis nama cookie secara harfiah, karena `vi.mock` berjalan
    // sebelum impor selesai. Kalau nama itu melenceng dari `COOKIE_NAME`, semua
    // tes di berkas ini akan menguji token pada cookie yang tidak pernah dibaca
    // server, dan semuanya tetap hijau.
    expect(COOKIE_NAME).toBe("rsud_session");
  });

  it("mengembalikan klaim saat tanda tangan dan angka pencabutan cocok", async () => {
    const klaim = await readSession();
    expect(klaim?.sub).toBe(SUB);
    expect(klaim?.role).toBe("super_admin");
  });

  it("menolak sesi saat session_version di database sudah naik", async () => {
    // Password, peran, atau status aktif berubah setelah token diterbitkan.
    keadaan.akun = { session_version: 4, is_active: true };
    expect(await readSession()).toBeNull();
  });

  it("menolak sesi saat session_version di database turun", async () => {
    // Angka yang lebih kecil sama saja tidak cocok; ini bukan "selalu benar".
    keadaan.akun = { session_version: 2, is_active: true };
    expect(await readSession()).toBeNull();
  });

  it("menolak sesi untuk akun yang dinonaktifkan", async () => {
    keadaan.akun = { session_version: 3, is_active: false };
    expect(await readSession()).toBeNull();
  });

  it("menolak sesi untuk akun yang sudah dihapus", async () => {
    keadaan.akun = undefined;
    expect(await readSession()).toBeNull();
  });

  it("menolak sesi saat cookie tidak ada", async () => {
    keadaan.cookie = undefined;
    expect(await readSession()).toBeNull();
  });

  it("menolak token dengan tanda tangan rusak tanpa menyentuh database", async () => {
    keadaan.cookie = `${token({ sv: 3 })}x`;
    let ditanya = 0;
    keadaan.database = {
      execute: async () => {
        ditanya += 1;
        return [keadaan.akun];
      },
    };
    expect(await readSession()).toBeNull();
    expect(ditanya).toBe(0);
  });

  it("menerima klaim tanpa pengecekan saat mode snapshot tidak punya database", async () => {
    // Login ditolak di mode snapshot, jadi tidak ada token yang bisa terbit di
    // sana. Yang diuji hanya agar cabang ini tetap disengaja dan tidak berubah.
    keadaan.database = null;
    expect((await readSession())?.sub).toBe(SUB);
  });
});

describe("requireSession", () => {
  it("mengembalikan klaim saat sesi dan peran memenuhi", async () => {
    expect((await requireSession((peran) => peran === "super_admin")).sub).toBe(SUB);
  });

  it("melempar unauthorized saat sesi sudah dicabut", async () => {
    keadaan.akun = { session_version: 9, is_active: true };
    await expect(requireSession()).rejects.toThrow(ApiError);
  });

  it("melempar forbidden saat peran tidak memenuhi", async () => {
    keadaan.cookie = token({ sv: 3, role: "front_office" });
    await expect(requireSession((peran) => peran === "super_admin")).rejects.toThrow(ApiError);
  });
});
