import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COOKIE_NAME,
  ROLES,
  canEditContent,
  canManageUsers,
  isRole,
  newClaims,
  sessionCookie,
  clearedSessionCookie,
  signSession,
  verifySession,
  type SessionClaims,
} from "@/server/auth/session";
import { resetConfigCache } from "@/server/config";

/**
 * Token sesi ditandatangani, tidak disimpan di mana pun, dan sekarang ikut di
 * dalam setiap cookie yang deserialize. Yang diuji di sini adalah empat hal
 * yang kalau bocor memberi akses admin tanpa kata sandi:
 *
 * 1. Tanda tangan diverifikasi sebelum isi token dibaca.
 * 2. Signature yang panjangnya berbeda tidak pernah dianggap cocok.
 * 3. Klaim yang kedaluwarsa ditolak.
 * 4. Peran yang tidak dikenal ditolak, bukan dianggap paling berkuasa.
 */

const RAHASIA = "kunci-uji-lokal-minimal-32-karakter";

/**
 * `newClaims` dan pembuat cookie membaca konfigurasi, jadi test di sini memasang
 * environment minimal yang dianggap sah. Nilai-nilai ini bukan rahasia: hanya
 * nama variabel dan angka yang tidak pernah dipakai di luar test.
 */
const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: RAHASIA,
  ADMIN_ORIGIN: "http://localhost:3000",
} as const;

const ASLI = { ...process.env };

function klaim(ubah: Partial<SessionClaims> = {}): SessionClaims {
  const sekarang = Math.floor(Date.now() / 1000);
  return {
    sub: "8a21b750-ab52-4c3b-94ce-ad623031c75b",
    email: "admin@contoh.test",
    name: "Admin Uji",
    role: "super_admin",
    iat: sekarang,
    exp: sekarang + 3600,
    sv: 0,
    v: 2,
    ...ubah,
  };
}

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN);
  resetConfigCache();
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
});

describe("signSession dan verifySession", () => {
  it("membaca kembali klaim yang ditandatangani", () => {
    const asli = klaim();
    const hasil = verifySession(signSession(asli, RAHASIA), RAHASIA);

    expect(hasil).not.toBeNull();
    expect(hasil?.sub).toBe(asli.sub);
    expect(hasil?.role).toBe("super_admin");
    expect(hasil?.exp).toBe(asli.exp);
  });

  it("menolak tanda tangan dengan kunci yang berbeda", () => {
    const token = signSession(klaim(), RAHASIA);
    expect(verifySession(token, "kunci-lain-yang-cukup-panjang-juga")).toBeNull();
  });

  it("menolak isi token yang diubah setelah ditandatangani", () => {
    // Serangan ini mengubah peran dari editor menjadi super_admin.
    const token = signSession(klaim({ role: "editor" }), RAHASIA);
    const [payload, signature] = token.split(".");
    const dimuat = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionClaims;

    dimuat.role = "super_admin";
    const dipalsukan = `${Buffer.from(JSON.stringify(dimuat), "utf8").toString("base64url")}.${signature}`;

    expect(verifySession(dipalsukan, RAHASIA)).toBeNull();
  });

  it("menolak signature dengan panjang berbeda", () => {
    // timingSafeEqual melempar untuk panjang berbeda, jadi perbandingan harus
    // memeriksa panjang lebih dulu. Kalau tidak, satu byte acak akan
    // menghasilkan galat 500 alih-alih 401.
    const token = signSession(klaim(), RAHASIA);
    const [payload] = token.split(".");

    expect(verifySession(`${payload}.a`, RAHASIA)).toBeNull();
    expect(verifySession(`${payload}.`, RAHASIA)).toBeNull();
    expect(verifySession(`${payload}.${"a".repeat(500)}`, RAHASIA)).toBeNull();
  });

  it("menolak token yang tidak punya tanda tangan", () => {
    const payload = Buffer.from(JSON.stringify(klaim()), "utf8").toString("base64url");

    expect(verifySession(payload, RAHASIA)).toBeNull();
    expect(verifySession("", RAHASIA)).toBeNull();
    expect(verifySession("bukan-token", RAHASIA)).toBeNull();
  });

  it("menolak isi token yang rusak", () => {
    const rusak = `${Buffer.from("{bukan json", "utf8").toString("base64url")}.tersesat`;
    expect(verifySession(rusak, RAHASIA)).toBeNull();
  });

  it("menolak klaim yang kedaluwarsa", () => {
    const sekarang = Math.floor(Date.now() / 1000);
    const token = signSession(klaim({ exp: sekarang - 1 }), RAHASIA);

    expect(verifySession(token, RAHASIA, sekarang)).toBeNull();
  });

  it("menerima klaim tepat sebelum kedaluwarsa dan menolak tepat setelahnya", () => {
    const sekarang = Math.floor(Date.now() / 1000);
    const token = signSession(klaim({ exp: sekarang + 10 }), RAHASIA);

    expect(verifySession(token, RAHASIA, sekarang + 9)).not.toBeNull();
    expect(verifySession(token, RAHASIA, sekarang + 10)).toBeNull();
  });

  it("menolak versi token yang tidak dikenal", () => {
    // Versi dinaikkan kalau skema klaim berubah. Token versi lama harus
    // berhenti berlaku, bukan dibaca dengan asumsi field hilang.
    const token = signSession(klaim({ v: 3 }), RAHASIA);
    expect(verifySession(token, RAHASIA)).toBeNull();
  });

  it("menolak token versi lama yang tidak punya angka pencabutan", () => {
    // Token yang terbit sebelum klaim `sv` ada tidak menyimpan salinan
    // `users.session_version`, jadi tidak ada yang bisa dicabut darinya.
    // Semuanya ditolak dan pemasuk harus login ulang.
    const { sv: _buang, ...tanpaSv } = klaim();
    const token = signSession(
      { ...tanpaSv, v: 1 } as SessionClaims,
      RAHASIA,
    );
    expect(verifySession(token, RAHASIA)).toBeNull();
  });

  it("menolak klaim yang kehilangan angka pencabutan", () => {
    // Tanpa `sv`, `readSession()` tidak punya yang dibandingkan dengan
    // database, sehingga pencabutan akan lolos tanpa disadari.
    const { sv: _buang, ...tanpaSv } = klaim();
    const token = signSession(tanpaSv as SessionClaims, RAHASIA);
    expect(verifySession(token, RAHASIA)).toBeNull();
  });

  it("menolak peran yang tidak dikenal", () => {
    const token = signSession(klaim({ role: "root" as SessionClaims["role"] }), RAHASIA);
    expect(verifySession(token, RAHASIA)).toBeNull();
  });

  it("menolak exp yang bukan angka", () => {
    const token = signSession(
      klaim({ exp: "nanti" as unknown as number }),
      RAHASIA,
    );
    expect(verifySession(token, RAHASIA)).toBeNull();
  });

  it("mengembalikan null, bukan galat, untuk semua kegagalan", () => {
    // Semua kegagalan sengaja tidak dibedakan supaya penyerang tidak bisa
    // memakai pesan yang berbeda untuk menebak mana yang membuat token hampir
    // benar.
    const inputs = ["", "x", "a.b", "....", `${RAHASIA}.${RAHASIA}`];
    for (const token of inputs) {
      expect(() => verifySession(token, RAHASIA)).not.toThrow();
      expect(verifySession(token, RAHASIA)).toBeNull();
    }
  });
});

describe("newClaims", () => {
  it("memberi kedaluwarsa dari konfigurasi", () => {
    const dibuat = newClaims({
      id: "8a21b750-ab52-4c3b-94ce-ad623031c75b",
      email: "admin@contoh.test",
      name: "Admin Uji",
      role: "editor",
      sessionVersion: 0,
    });

    const sekarang = Math.floor(Date.now() / 1000);
    expect(dibuat.exp - dibuat.iat).toBeGreaterThan(0);
    expect(dibuat.exp).toBeGreaterThan(sekarang);
    expect(dibuat.v).toBe(2);
  });

  it("menyalin angka pencabutan ke klaim", () => {
    // Angka ini yang dibandingkan `readSession()` dengan baris di database.
    // Kalau tidak ikut tersalin, pencabutan tidak pernah berlaku.
    const dibuat = newClaims({
      id: "8a21b750-ab52-4c3b-94ce-ad623031c75b",
      email: "admin@contoh.test",
      name: "Admin Uji",
      role: "editor",
      sessionVersion: 7,
    });

    expect(dibuat.sv).toBe(7);
  });
});

describe("peran", () => {
  it("mengenali peran yang ada dan menolak yang lain", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);

    expect(isRole("root")).toBe(false);
    expect(isRole("Super_Admin")).toBe(false);
    expect(isRole("")).toBe(false);
  });

  it("menolak super_admin untuk super_admin saat lowercase", () => {
    // Peran dibandingkan persis. Menormalkan di sini justru berbahaya:
    // nilai enum di database huruf besar-kecilnya sudah ditentukan.
    expect(isRole("SUPER_ADMIN")).toBe(false);
  });

  it("memberi hak ubah konten kepada super_admin dan editor saja", () => {
    expect(canEditContent("super_admin")).toBe(true);
    expect(canEditContent("editor")).toBe(true);

    // front_office menangani pasien, bukan menjaga isi situs.
    expect(canEditContent("front_office")).toBe(false);
  });

  it("menyerahkan hak kelola akun hanya kepada super_admin", () => {
    expect(canManageUsers("super_admin")).toBe(true);
    expect(canManageUsers("editor")).toBe(false);
    expect(canManageUsers("front_office")).toBe(false);
  });
});

describe("cookie sesi", () => {
  it("menandai cookie agar tidak bisa dibaca JavaScript dan hanya ikut pada navigasi tingkat atas", () => {
    // Atribut `httpOnly` menutup jalan paling umum mencuri sesi lewat
    // JavaScript. `sameSite` menahan cookie dari situs lain pada permintaan
    // lintas situs.
    const cookie = sessionCookie("token-uji");

    expect(cookie.name).toBe(COOKIE_NAME);
    expect(cookie.value).toBe("token-uji");
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe("lax");
    expect(cookie.options.path).toBe("/");
  });

  it("tidak memakai prefix __Host-", () => {
    // Prefix itu menolak cookie tanpa Secure, dan situs ini diakses lewat HTTP
    // lokal saat pengembangan.
    expect(COOKIE_NAME.startsWith("__Host-")).toBe(false);
  });

  it("menghapus cookie lama dengan masa berlaku nol", () => {
    const cookie = clearedSessionCookie();

    expect(cookie.value).toBe("");
    expect(cookie.options.maxAge).toBe(0);
    expect(cookie.options.httpOnly).toBe(true);
  });
});
