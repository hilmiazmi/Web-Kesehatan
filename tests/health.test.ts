import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Bentuk respons `GET /api/v1/health`.
 *
 * Endpoint ini terbuka tanpa sesi, jadi apa pun yang ada di responsnya terbaca
 * oleh siapa pun yang bisa menjangkau portnya. Yang paling penting diuji di sini
 * adalah hal yang tidak boleh ada.
 *
 * RESPONS pernah mengembalikan hasil `SELECT version()` apa adanya, yaitu versi
 * PostgreSQL lengkap beserta kompilasi dan sistem operasi. Nomor versi itu justru
 * yang dipakai penyerang untuk mencocokkan kerentanan yang sudah diketahui, jadi
 * nilai spesifiknya tidak perlu keluar. Yang perlu hanya jawaban database
 * menjawab atau tidak, dan itu sudah dibuktikan oleh `checkDb()`.
 */

vi.mock("@/server/db/client", () => ({
  dbOrNull: vi.fn(),
  checkDb: vi.fn(),
}));

vi.mock("@/server/config", () => ({
  config: vi.fn(),
}));

const client = await import("@/server/db/client");
const serverConfig = await import("@/server/config");
const { GET } = await import("@/app/api/v1/health/route");

type DbPalsu = { execute: (sql: unknown) => Promise<unknown> };

/** Rahasia yang meniru pesan driver saat koneksi gagal. */
const RAHASIA = "postgres://rsud:rahasia@10.0.0.5:5432/rsud";

function request(): Request {
  return new Request("http://localhost/api/v1/health");
}

/**
 * Ekstrak isi dari dalam amplop respons.
 *
 * Semua handler memakai `ok()` dari `src/server/api/respond.ts`, yang membungkus
 * isi di dalam `{ data: ... }`. Membaca respons tanpa membuka amplopnya membuat
 * setiap pemeriksaan gagal dengan `undefined`, bukan dengan nilai yang salah.
 */
async function badan(respons: Response): Promise<Record<string, unknown>> {
  const amplop = (await respons.json()) as Record<string, unknown>;
  const isi = amplop.data;
  return (isi ?? amplop) as Record<string, unknown>;
}

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    vi.mocked(client.dbOrNull).mockReset();
    vi.mocked(client.checkDb).mockReset();
    vi.mocked(serverConfig.config).mockReset();
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "live",
    } as ReturnType<typeof serverConfig.config>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tidak mengirim nomor versi PostgreSQL", async () => {
    // Nilai versi yang mencolok sengaja diberikan ke database palsu, sehingga
    // kalau masih ada di respons, mata langsung menangkap.
    const versi =
      "PostgreSQL 14.11 (Debian 14.11-1.pgdg110+1) on x86_64-pc-linux-gnu, compiled by gcc, 64-bit";
    const db: DbPalsu = { execute: vi.fn().mockResolvedValue([{ v: versi }]) };

    vi.mocked(client.dbOrNull).mockReturnValue(db as never);
    vi.mocked(client.checkDb).mockResolvedValue({ ok: true, detail: "database menjawab" } as never);

    const respons = await GET(request() as never);
    const isi = await badan(respons);

    expect(respons.status).toBe(200);
    expect(isi.database).toBe("PostgreSQL");

    // Tidak ada bagian versi yang boleh lolos, dalam bentuk apa pun.
    const teks = JSON.stringify(isi);
    expect(teks).not.toContain("14.11");
    expect(teks).not.toContain("PostgreSQL 1");
    expect(teks).not.toContain("pgdg");
    expect(teks).not.toContain("x86_64");
    expect(teks).not.toContain("compiled");

    // Pola `angka.angka` diperiksa pada tiap nilai kecuali `time`, karena waktu
    // ISO selalu punya bagian pecahan seperti `12.56.22.701`. Tanpa
    // pengecualian itu, setiap timestamp dianggap nomor versi yang bocor.
    //
    // Kunci yang bermasalah dikumpulkan lebih dulu, lalu diperiksa sekaligus.
    // `expect` di Vitest tidak menerima pesan tambahan seperti yang dilakukan
    // Jest, jadi tanpa pengumpulan ini kegagalan tidak menyebut nilai mana yang
    // jadi penyebabnya.
    const bocor = Object.entries(isi)
      .filter(([kunci, nilai]) => kunci !== "time" && typeof nilai === "string")
      .filter(([, nilai]) => /\d+\.\d+/.test(nilai as string))
      .map(([kunci, nilai]) => `${kunci}=${nilai as string}`);

    expect(bocor).toEqual([]);
  });

  it("tidak menjalankan kueri kedua ke database", async () => {
    // `checkDb()` sudah menjalankan `SELECT 1` pada koneksi yang sama. Menjalankan
    // kueri kedua hanya menambah satu bolak-balik pada health check yang dibaca
    // platform secara otomatis, jadi pemeriksaan kesehatan jadi lebih lambat
    // tanpa menambah informasi apa pun.
    const db: DbPalsu = { execute: vi.fn().mockResolvedValue([]) };

    vi.mocked(client.dbOrNull).mockReturnValue(db as never);
    vi.mocked(client.checkDb).mockResolvedValue({ ok: true, detail: "database menjawab" } as never);

    const respons = await GET(request() as never);

    expect(respons.status).toBe(200);
    expect(db.execute).not.toHaveBeenCalled();
    // Pemeriksaan database tetap harus benar-benar terjadi, lewat `checkDb`.
    expect(client.checkDb).toHaveBeenCalledTimes(1);
  });

  it("memberi tahu mode dan versi api", async () => {
    const db: DbPalsu = { execute: vi.fn().mockResolvedValue([]) };

    vi.mocked(client.dbOrNull).mockReturnValue(db as never);
    vi.mocked(client.checkDb).mockResolvedValue({ ok: true, detail: "database menjawab" } as never);

    const isi = await badan(await GET(request() as never));

    expect(isi.status).toBe("ok");
    expect(isi.mode).toBe("live");
    expect(isi.api_prefix).toBe("/api/v1");
    expect(typeof isi.version).toBe("string");
    expect(typeof isi.time).toBe("string");
  });

  it("membalas 500 tanpa menyebut nama host saat database mati", async () => {
    // `checkDb()` mengembalikan pesan driver apa adanya di `detail`, yang memuat
    // nama host, nama pengguna, dan potongan kredensial. Endpoint ini dibaca
    // siapa pun, jadi `detail` itu tidak boleh ikut naik.
    vi.mocked(client.dbOrNull).mockReturnValue({} as never);
    vi.mocked(client.checkDb).mockResolvedValue({
      ok: false,
      detail: `connection refused: ${RAHASIA}`,
    } as never);

    const respons = await GET(request() as never);
    const amplop = (await respons.json()) as Record<string, unknown>;
    const teks = JSON.stringify(amplop);

    expect(respons.status).toBe(500);
    expect(teks).not.toContain("rahasia");
    expect(teks).not.toContain("10.0.0.5");
    expect(teks).not.toContain("postgres://");
    expect(teks).not.toContain("connection refused");
  });

  it("tetap menjawab di mode snapshot tanpa database", async () => {
    // Build pratinjau dibaca health check platform secara otomatis. Membalas 500
    // di mode snapshot akan membuat pratinjau ditandai tidak sehat lalu dibunuh,
    // padahal tidak ada yang rusak: snapshot memang tidak punya database.
    vi.mocked(client.dbOrNull).mockReturnValue(null);
    vi.mocked(client.checkDb).mockResolvedValue({
      ok: true,
      detail: "mode snapshot, database tidak disentuh",
    } as never);
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "snapshot",
    } as ReturnType<typeof serverConfig.config>);

    const respons = await GET(request() as never);
    const isi = await badan(respons);

    expect(respons.status).toBe(200);
    expect(isi.mode).toBe("snapshot");
    expect(isi.database).toBe("tidak terhubung");
  });
});
