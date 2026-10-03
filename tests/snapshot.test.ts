import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { denganSnapshot, snapshotKey } from "@/server/api/snapshot";
import { resetConfigCache } from "@/server/config";

/**
 * `snapshotKey()` menentukan nama berkas yang dibaca saat database tidak
 * answering, dan `denganSnapshot()` memutuskan apakah sebuah kegagalan memang
 * boleh dialihkan ke snapshot.
 *
 * Dua aturan di sini yang kalau rusak tidak kelihatan dari mata:
 *
 * 1. Kunci harus sama persis dengan yang dipakai `scripts/db-snapshot.ts`.
 *    Berbeda satu karakter, fallback diam-diam selalu gagal dan mode pratinjau
 *    menjawab 404 tanpa jejak di log.
 * 2. Hanya galat koneksi yang boleh dialihkan. Kalau galat permintaan ikut
 *    dialihkan, satu nilai enum yang salah ketik membuat kueri gagal, database
 *    dituduh tidak hidup, lalu snapshot membalikkan seluruh daftar tanpa filter.
 *    Hasilnya 200 dengan isi yang salah.
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
} as const;

const ASLI = { ...process.env };

beforeEach(() => {
  process.env = { ...LINGKUNGAN, API_MODE: "snapshot" };
  resetConfigCache();
  keadaan.database = null;
});

afterEach(() => {
  process.env = { ...ASLI };
  resetConfigCache();
  keadaan.database = { execute: async () => [] };
});

/** Galat basis data dengan kode PostgreSQL tertentu. */
function dbGalat(kode: string): Error & { code: string } {
  return Object.assign(new Error(`galat db ${kode}`), { code: kode });
}

describe("snapshotKey", () => {
  it("menyambung segmen dengan dua garis bawah", () => {
    expect(snapshotKey("/mcu/packages/paket-dasar-1")).toBe("mcu__packages__paket-dasar-1");
  });

  it("tidak memakai awalan garis miring dan garis miring ganda", () => {
    expect(snapshotKey("/a/b")).toBe(snapshotKey("a/b"));
    expect(snapshotKey("//a//b//")).toBe("a__b");
  });

  it("mengganti karakter di luar huruf, angka, tanda hubung, dan garis bawah", () => {
    // `..` dan `/` tidak boleh masuk nama berkas.
    // Tiap titik di luar huruf, angka, tanda hubung, atau garis bawah, jadi tiap
    // titik diganti. Hasilnya tidak mungkin keluar dari direktori snapshot.
    expect(snapshotKey("/pages/../../etc/passwd")).toBe("pages__--__--__etc__passwd");
    expect(snapshotKey("/pages/a b")).toBe("pages__a-b");
  });

  it("memotong segmen yang terlalu panjang", () => {
    expect(snapshotKey(`/${"x".repeat(300)}`)).toHaveLength(120);
  });
});

describe("denganSnapshot di mode snapshot", () => {
  it("membaca isi berkas snapshot yang ada", async () => {
    const hasil = await denganSnapshot(
      async () => {
        throw new Error("tidak boleh menyentuh database");
      },
      "/articles",
    );
    expect(hasil).toBeTypeOf("object");
    expect((hasil as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it("menjawab not found untuk rute yang tidak ada di snapshot", async () => {
    await expect(
      denganSnapshot(async () => ({ harus: "tidak dipanggil" }), "/rute-yang-tidak-ada"),
    ).rejects.toThrow(/tidak ditemukan/i);
  });
});

describe("denganSnapshot saat database gagal", () => {
  const sumberGagal = (galat: unknown) => async () => {
    throw galat;
  };

  it("mengalihkan ke snapshot untuk galat koneksi", async () => {
    process.env = { ...LINGKUNGAN, API_MODE: "live" };
    resetConfigCache();
    keadaan.database = { execute: async () => [] };

    const hasil = await denganSnapshot(sumberGagal(dbGalat("08006")), "/articles");
    expect((hasil as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it("tidak mengalihkan untuk galat permintaan", async () => {
    // `22P02` adalah invalid_text_representation, misal nilai enum di luar
    // daftar. Ini kesalahan permintaan, dan menjawabnya dari snapshot akan
    // menyembunyikan kesalahan itu dengan daftar yang tidak difilter.
    process.env = { ...LINGKUNGAN, API_MODE: "live" };
    resetConfigCache();
    keadaan.database = { execute: async () => [] };

    await expect(denganSnapshot(sumberGagal(dbGalat("22P02")), "/articles")).rejects.toThrow(
      /22P02/,
    );
  });

  it("tidak mengalihkan untuk galat tanpa kode PostgreSQL", async () => {
    process.env = { ...LINGKUNGAN, API_MODE: "live" };
    resetConfigCache();
    keadaan.database = { execute: async () => [] };

    await expect(
      denganSnapshot(sumberGagal(new Error("bug di kode kita")), "/articles"),
    ).rejects.toThrow(/bug di kode kita/);
  });
});
