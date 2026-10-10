import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Integrasi handler admin yang sebelumnya belum punya pengaman test.
 *
 * `tests/peran-admin.test.ts` sudah menjaga bahwa SETIAP route admin memanggil
 * `requireSession()` sebelum menyentuh database, dan itu dibaca dari sumber.
 * Berkas ini menutup sisi yang tidak bisa dibaca sumber: apa yang route BENAR-
 * BENAR balas untuk tiap kombinasi sesi dan peran.
 *
 * Sesi diuji sungguhan, bukan dimock: token dibuat dengan `signSession` lalu
 * dibaca `verifySession` milik server, dan `readSession` tetap memeriksa
 * `session_version` serta `is_active` ke database. Yang dimock hanya `cookies()`
 * dari Next dan koneksi database. Kalau aturan peran atau verifikasi token
 * rusak, test ini ikut gagal.
 *
 * Peran desolate punya matriks berbeda, jadi diuji terpisah: `GET
 * /admin/beds` sengaja hanya butuh sesi (petugas front office boleh melihat
 * ketersediaan kamar), sedangkan `PATCH`-nya butuh izin ubah.
 */

vi.mock("@/server/db/client", () => ({ dbOrNull: vi.fn() }));

vi.mock("@/server/config", () => ({ config: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const RAHASIA = "kunci-uji-lokal-minimal-32-karakter-panjang";
const COOKIE = "rsud_session";

const client = await import("@/server/db/client");
const serverConfig = await import("@/server/config");
const nextHeaders = await import("next/headers");
const auth = await import("@/server/auth/session");

const beds = await import("@/app/api/v1/admin/beds/route");
const tabel = await import("@/app/api/v1/admin/tables/route");
const perHari = await import("@/app/api/v1/admin/appointments-per-day/route");
const surveiUnit = await import("@/app/api/v1/admin/survey-by-unit/route");
const pengguna = await import("@/app/api/v1/admin/users/route");
const penggunaId = await import("@/app/api/v1/admin/users/[id]/route");
const routeSandi = await import("@/app/api/v1/admin/users/[id]/password/route");
const routeReset = await import("@/app/api/v1/admin/users/[id]/reset-password/route");

const ASLI_ENV = { ...process.env };

const UUID = "1d0f0e3a-0000-4000-8000-0000000000aa";
const SUB = "a0000000-0000-4000-8000-000000000001";

type Peran = "super_admin" | "editor" | "front_office";

/**
 * Database palsu.
 *
 * `execute` recognizing SQL sesi menjawab `session_version` dan `is_active`
 * supaya `readSession` meneruskan klaim. Kueri lain juga lewat sini; pemanggil
 * `dbPalsu` mengembalikan daftar panggilan supaya test bisa membuktikan tidak
 * ada query yang jalan ketika sesi ditolak.
 */
function dbPalsu() {
  const panggilan: string[] = [];

  /** Satu baris akun, dipakai findAccount dan penjaga peran. */
  const barisAkun = {
    id: UUID,
    email: "baru@contoh.test",
    name: "Akun Baru",
    role: "editor",
    is_active: true,
    session_version: 0,
  };

  const chain: Record<string, unknown> = {};
  const method = () => chain;
  for (const nama of [
    "values",
    "returning",
    "set",
    "where",
    "limit",
    "offset",
    "orderBy",
    "groupBy",
    "from",
    "innerJoin",
    "leftJoin",
  ]) {
    chain[nama] = method;
  }
  // Rantai harus bisa di-`await`; repository memakai `await db.select(...)`.
  chain.then = (fn: (v: unknown) => unknown) => Promise.resolve([]).then(fn);

  const db = {
    /**
     * Menjawab per jenis SQL yang dipakai repository, supaya handler bisa
     * membentuk respons tanpa database sungguhan.
     */
    execute: async (kueri: unknown) => {
      const teks = JSON.stringify(kueri, (_k, v) => (v === undefined ? null : v));
      panggilan.push(teks.slice(0, 60));

      if (teks.includes("session_version") && teks.includes("is_active FROM users")) {
        return [{ session_version: 0, is_active: true }];
      }
      if (teks.includes("INSERT INTO users")) return [{ id: UUID }];
      if (teks.includes("UPDATE users")) return [{ id: UUID }];
      // Penjaga "sisakan minimal satu super admin aktif".
      if (teks.includes("count(")) return [{ n: 3 }];
      if (teks.includes("FROM users")) return [barisAkun];
      return [];
    },
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db, panggilan };
}

/** Pasang cookie sesi asli untuk peran tertentu. */
function pasangSesi(role: Peran): void {
  const klaim = auth.newClaims({
    id: SUB,
    email: "petugas@contoh.test",
    name: "Petugas Uji",
    role,
    sessionVersion: 0,
  });
  const token = auth.signSession(klaim, RAHASIA);
  vi.mocked(nextHeaders.cookies).mockResolvedValue({
    get: (nama: string) => (nama === COOKIE ? { name: COOKIE, value: token } : undefined),
  } as never);
}

/** Kosongkan cookie: tidak ada sesi sama sekali. */
function tanpaSesi(): void {
  vi.mocked(nextHeaders.cookies).mockResolvedValue({
    get: () => undefined,
  } as never);
}

beforeEach(() => {
  Object.assign(process.env, {
    API_MODE: "live",
    DATABASE_URL: "postgres://postgres@127.0.0.1:5433/rsud_uji",
    AUTH_SECRET: RAHASIA,
    RATE_LIMIT_MAX_REQUESTS: "50",
    RATE_LIMIT_WINDOW_SECONDS: "60",
  });
  vi.mocked(client.dbOrNull).mockReset();
  vi.mocked(serverConfig.config).mockReset();
  vi.mocked(serverConfig.config).mockReturnValue({
    apiMode: "live",
    authSecret: RAHASIA,
    sessionMaxAgeSeconds: 28800,
    rateLimitWindowSeconds: 60,
    rateLimitMax: 50,
  } as ReturnType<typeof serverConfig.config>);
  vi.mocked(nextHeaders.cookies).mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ASLI_ENV };
  vi.restoreAllMocks();
});

function pakaiDbPalsu() {
  const palsu = dbPalsu();
  vi.mocked(client.dbOrNull).mockReturnValue(palsu.db as never);
  return palsu;
}

function req(url: string, method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function fields(res: Response): Promise<string[]> {
  const badan = (await res.json()) as {
    error?: { fields?: Record<string, string> };
  };
  return Object.keys(badan.error?.fields ?? {}).sort();
}

describe("verifikasi sesi di route admin", () => {
  it("token ditandatangani dengan rahasia lain ditolak 401", async () => {
    pakaiDbPalsu();
    // Token benar bentuknya, tapi ditandatangani dengan kunci berbeda.
    const klaim = auth.newClaims({
      id: SUB,
      email: "x@contoh.test",
      name: "X",
      role: "super_admin",
      sessionVersion: 0,
    });
    const token = auth.signSession(klaim, "kunci-lain-yang-panjangnya-cukup-panjang");
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: () => ({ name: COOKIE, value: token }),
    } as never);
    const res = await tabel.GET(req("/api/v1/admin/tables"));
    expect(res.status).toBe(401);
  });

  it("akun yang session_version-nya berubah ditolak 401", async () => {
    const palsu = pakaiDbPalsu();
    pasangSesi("super_admin");
    const asal = palsu.db.execute;
    palsu.db.execute = async (kueri: unknown) => {
      const teks = JSON.stringify(kueri);
      if (teks.includes("session_version")) {
        palsu.panggilan.push("sesi");
        return [{ session_version: 9, is_active: true }];
      }
      return asal(kueri);
    };
    vi.mocked(client.dbOrNull).mockReturnValue(palsu.db as never);
    const res = await tabel.GET(req("/api/v1/admin/tables"));
    expect(res.status).toBe(401);
  });

  it("akun nonaktif ditolak 401", async () => {
    const palsu = pakaiDbPalsu();
    pasangSesi("super_admin");
    const asal = palsu.db.execute;
    palsu.db.execute = async (kueri: unknown) => {
      const teks = JSON.stringify(kueri);
      if (teks.includes("session_version")) return [{ session_version: 0, is_active: false }];
      return asal(kueri);
    };
    vi.mocked(client.dbOrNull).mockReturnValue(palsu.db as never);
    const res = await tabel.GET(req("/api/v1/admin/tables"));
    expect(res.status).toBe(401);
  });
});

describe("admin/tables", () => {
  it("butuh sesi, dan tidak membuka koneksi database", async () => {
    const palsu = pakaiDbPalsu();
    pasangSesi("editor");
    const res = await tabel.GET(req("/api/v1/admin/tables"));
    expect(res.status).toBe(200);
    // Hanya kueri verifikasi sesi, tidak ada query isi tabel.
    expect(palsu.panggilan).toHaveLength(1);
  });

  it("tanpa sesi membalas 401", async () => {
    pakaiDbPalsu();
    tanpaSesi();
    expect((await tabel.GET(req("/api/v1/admin/tables"))).status).toBe(401);
  });
});

describe("admin/beds", () => {
  it("GET hanya butuh sesi: front office boleh melihat ketersediaan", async () => {
    pakaiDbPalsu();
    pasangSesi("front_office");
    expect((await beds.GET()).status).toBe(200);
  });

  it("GET tanpa sesi membalas 401 dan tidak menjalankan query isi", async () => {
    const palsu = pakaiDbPalsu();
    tanpaSesi();
    expect((await beds.GET()).status).toBe(401);
    expect(palsu.panggilan).toHaveLength(0);
  });

  it("PATCH menolak peran tanpa izin ubah dengan 403", async () => {
    pakaiDbPalsu();
    pasangSesi("front_office");
    const res = await beds.PATCH(req("/api/v1/admin/beds", "PATCH", { items: [] }));
    expect(res.status).toBe(403);
  });

  it("PATCH menolak daftar kosong dengan 400 dan bukan-daftar dengan 422", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    expect(
      (await beds.PATCH(req("/api/v1/admin/beds", "PATCH", { items: [] }))).status,
    ).toBe(400);
    expect(
      (await beds.PATCH(req("/api/v1/admin/beds", "PATCH", { items: "bukan" }))).status,
    ).toBe(422);
  });

  it("PATCHeditor boleh: editor punya izin ubah konten", async () => {
    pakaiDbPalsu();
    pasangSesi("editor");
    const res = await beds.PATCH(
      req("/api/v1/admin/beds", "PATCH", {
        items: [
          {
            ward_name: "Anggrek",
            class_name: "Utama",
            total_beds: 4,
            occupied_beds: 1,
            reserved_beds: 0,
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("admin/appointments-per-day dan admin/survey-by-unit", () => {
  it("keduanya membalas 200 dengan sesi sah", async () => {
    pakaiDbPalsu();
    pasangSesi("editor");
    expect((await perHari.GET(req("/api/v1/admin/appointments-per-day"))).status).toBe(200);
    expect((await surveiUnit.GET(req("/api/v1/admin/survey-by-unit"))).status).toBe(200);
  });

  it("keduanya membalas 401 tanpa sesi dan tidak menjalankan query", async () => {
    const palsu = pakaiDbPalsu();
    tanpaSesi();
    expect((await perHari.GET(req("/api/v1/admin/appointments-per-day"))).status).toBe(401);
    expect((await surveiUnit.GET(req("/api/v1/admin/survey-by-unit"))).status).toBe(401);
    expect(palsu.panggilan).toHaveLength(0);
  });
});

describe("admin/users", () => {
  const badanBaru = {
    email: "baru@contoh.test",
    name: "Akun Baru",
    role: "editor",
    password: "sandi-uji-yang-panjang",
  };

  it("GET dan POST menolak editor dan front office dengan 403", async () => {
    pakaiDbPalsu();
    for (const role of ["editor", "front_office"] as const) {
      pasangSesi(role);
      expect((await pengguna.GET(req("/api/v1/admin/users"))).status, role).toBe(403);
      expect(
        (await pengguna.POST(req("/api/v1/admin/users", "POST", badanBaru))).status,
        role,
      ).toBe(403);
    }
  });

  it("tanpa sesi membalas 401", async () => {
    pakaiDbPalsu();
    tanpaSesi();
    expect((await pengguna.GET(req("/api/v1/admin/users"))).status).toBe(401);
  });

  it("POST super_admin menjawab 201", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    expect(
      (await pengguna.POST(req("/api/v1/admin/users", "POST", badanBaru))).status,
    ).toBe(201);
  });

  it("POST menyebut seluruh field yang salah sekaligus", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await pengguna.POST(
      req("/api/v1/admin/users", "POST", {
        email: "bukan-surel",
        name: "A",
        role: "super-admin",
        password: "pendek",
      }),
    );
    expect(res.status).toBe(422);
    // Surel, nama, peran, dan sandi semuanya harus disebut, bukan satu saja:
    // panel menampilkan galat per kolom, jadi-butuh-yang-sebagian bikin
    // pengunjung mengira kolom lain sudah benar.
    expect(await fields(res)).toEqual(["email", "name", "password", "role"]);
  });
});

describe("admin/users/[id]", () => {
  const konteks = { params: Promise.resolve({ id: UUID }) };

  it("PATCH dan DELETE menolak peran selain super admin dengan 403", async () => {
    pakaiDbPalsu();
    for (const role of ["editor", "front_office"] as const) {
      pasangSesi(role);
      expect(
        (await penggunaId.PATCH(req(`/api/v1/admin/users/${UUID}`, "PATCH", { name: "X" }), konteks))
          .status,
        role,
      ).toBe(403);
      expect(
        (await penggunaId.DELETE(req(`/api/v1/admin/users/${UUID}`, "DELETE"), konteks)).status,
        role,
      ).toBe(403);
    }
  });

  it("id yang bukan UUID ditolak 422 tanpa menjalankan query isi", async () => {
    const palsu = pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await penggunaId.DELETE(req("/api/v1/admin/users/bukan-uuid", "DELETE"), {
      params: Promise.resolve({ id: "bukan-uuid" }),
    });
    // 422 (validasi), bukan 400: id salah bentuk adalah kesalahan parameter, dan
    // bentuk responsnya perlu membedakannya dari id yang formatnya benar tapi
    // barisnya tidak ada (yang jawabannya 404).
    expect(res.status).toBe(422);
    expect(await fields(res)).toEqual(["id"]);
    // Hanya kueri verifikasi sesi; tidak ada query yang menyentuh akun.
    expect(palsu.panggilan).toHaveLength(1);
  });

  it("peran asing diabaikan, field sah tetap tersimpan, dan dicatat ke log", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await penggunaId.PATCH(
      req(`/api/v1/admin/users/${UUID}`, "PATCH", { name: "Nama Baru", role: "super-admin" }),
      konteks,
    );
    // Sengaja 200: panel yang mengirim peran tidak dikenal harus melihat
    // perubahan lain tetap tersimpan, bukan 422 yang menutup semuanya.
    expect(res.status).toBe(200);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("admin/users/[id]/password dan reset-password", () => {
  const konteks = { params: Promise.resolve({ id: UUID }) };

  it("menolak editor dan front office mengganti sandi akun lain dengan 403", async () => {
    pakaiDbPalsu();
    for (const role of ["editor", "front_office"] as const) {
      pasangSesi(role);
      const ganti = await routeSandi.POST(
        req(`/api/v1/admin/users/${UUID}/password`, "POST", {
          current_password: "lama-yang-panjang",
          new_password: "baru-yang-panjang",
        }),
        konteks,
      );
      const hasilReset = await routeReset.POST(
        req(`/api/v1/admin/users/${UUID}/reset-password`, "POST", {
          new_password: "baru-yang-panjang",
        }),
        konteks,
      );
      expect(ganti.status, role).toBe(403);
      expect(hasilReset.status, role).toBe(403);
    }
  });

  it("mengizinkan editor dan front office mengganti sandinya sendiri", async () => {
    // SUB adalah sub sesi yang dipasang `pasangSesi`, jadi konteks ini adalah
    // akun sendiri. Sandi baru yang pendek ditolak 422 — itu membuktikan
    // penjaga peran lolos (penjaga berjalan sebelum validasi), tanpa perlu
    // database sungguhan. Reset tetap 403 karena hanya untuk super_admin.
    pakaiDbPalsu();
    const diri = { params: Promise.resolve({ id: SUB }) };
    for (const role of ["editor", "front_office"] as const) {
      pasangSesi(role);
      const ganti = await routeSandi.POST(
        req(`/api/v1/admin/users/${SUB}/password`, "POST", {
          current_password: "lama-yang-panjang",
          new_password: "pendek",
        }),
        diri,
      );
      const hasilReset = await routeReset.POST(
        req(`/api/v1/admin/users/${SUB}/reset-password`, "POST", {
          new_password: "baru-yang-panjang",
        }),
        diri,
      );
      expect(ganti.status, role).toBe(422);
      expect(await fields(ganti), role).toEqual(["new_password"]);
      expect(hasilReset.status, role).toBe(403);
    }
  });

  it("ganti sandi menolak sandi baru pendek dengan 422", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await routeSandi.POST(
      req(`/api/v1/admin/users/${UUID}/password`, "POST", {
        current_password: "lama-yang-panjang",
        new_password: "pendek",
      }),
      konteks,
    );
    expect(res.status).toBe(422);
    // Galat harus menempel ke "new_password" yang memang dikirim formulir.
    // Kalau namanya "password", panel tidak punya kolom itu dan galatnya
    // hilang dari layar.
    expect(await fields(res)).toEqual(["new_password"]);
  });

  it("ganti sandi menolak current_password kosong dengan 422", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await routeSandi.POST(
      req(`/api/v1/admin/users/${UUID}/password`, "POST", {
        current_password: "   ",
        new_password: "baru-yang-panjang",
      }),
      konteks,
    );
    expect(res.status).toBe(422);
    expect(await fields(res)).toEqual(["current_password"]);
  });

  it("reset sandi menolak sandi baru pendek dengan 422", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await routeReset.POST(
      req(`/api/v1/admin/users/${UUID}/reset-password`, "POST", { new_password: "pendek" }),
      konteks,
    );
    expect(res.status).toBe(422);
    // Galat harus menempel ke "new_password" yang memang dikirim formulir.
    // Kalau namanya "password", panel tidak punya kolom itu dan galatnya
    // hilang dari layar.
    expect(await fields(res)).toEqual(["new_password"]);
  });

  it("reset sandi menolak sandi kosong; field yang disebut tetap satu kolom", async () => {
    pakaiDbPalsu();
    pasangSesi("super_admin");
    const res = await routeReset.POST(
      req(`/api/v1/admin/users/${UUID}/reset-password`, "POST", { new_password: "" }),
      konteks,
    );
    expect(res.status).toBe(422);
    // Galat harus menempel ke "new_password" yang memang dikirim formulir.
    // Kalau namanya "password", panel tidak punya kolom itu dan galatnya
    // hilang dari layar.
    expect(await fields(res)).toEqual(["new_password"]);
  });
});

describe("mode snapshot menolak seluruh tulisan admin", () => {
  it("PATCH beds dan POST users membalas 503 saat database tidak ada", async () => {
    pasangSesi("super_admin");
    vi.mocked(client.dbOrNull).mockReturnValue(null);

    expect(
      (
        await beds.PATCH(
          req("/api/v1/admin/beds", "PATCH", {
            items: [
              { ward_name: "Anggrek", class_name: "Utama", total_beds: 1, occupied_beds: 0, reserved_beds: 0 },
            ],
          }),
        )
      ).status,
    ).toBe(503);

    expect(
      (
        await pengguna.POST(
          req("/api/v1/admin/users", "POST", {
            email: "baru@contoh.test",
            name: "Akun Baru",
            role: "editor",
            password: "sandi-uji-yang-panjang",
          }),
        )
      ).status,
    ).toBe(503);
  });
});