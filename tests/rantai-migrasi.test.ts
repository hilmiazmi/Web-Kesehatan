import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Rantai migrasi drizzle: jurnal, berkas SQL, dan snapshot harus sejalan.
 *
 * Yang dikunci di sini tiga hal yang sama-sama tidak terlihat sampai
 * menggigit, dan salah satunya memang sudah menggigit:
 *
 * 1. Setiap entri jurnal punya berkas SQL-nya. Kalau tidak, `db:migrate`
 *    berhenti di migrasi itu dan pesan galatnya menunjuk jurnal, bukan
 *    berkas yang hilang.
 * 2. Setiap entri jurnal punya snapshot-nya. Tanpa snapshot, `drizzle-kit
 *    generate` tidak punya pembanding dan akan membuat ulang migrasi yang
 *    sudah ada — misalnya `CREATE TABLE "admin_audit"` kedua yang gagal
 *    di database mana pun yang sudah menerapkan yang pertama.
 * 3. Id snapshot unik dan `prevId` mengarah ke snapshot sebelumnya. Dua
 *    snapshot dengan id sama membuat `generate` menolak jalan dengan
 *    "collision", dan itu terjadi di repo ini sejak 8 Oktober 2026 karena
 *    `0005_snapshot.json` disalin sebagai salinan `0004`.
 *
 * Snapshot terakhir juga harus mengenali setiap tabel di `src/server/db/schema.ts`.
 * Kalau ada tabel di skema yang tidak ada di snapshot, `generate` akan
 * menganggapnya tabel baru — itu tepat gejala yang ditutup poin 2.
 */

const AKAR = path.resolve(import.meta.dirname, "..");
const META = path.join(AKAR, "drizzle/meta");

interface Entri {
  idx: number;
  tag: string;
  when: number;
}

const jurnal = JSON.parse(readFileSync(path.join(META, "_journal.json"), "utf8")) as {
  entries: Entri[];
};

const berkasMeta = readdirSync(META).filter((f) => f.endsWith("_snapshot.json"));

/**
 * Snapshot yang sama, tapi urutannya mengikuti jurnal, bukan nama berkas.
 *
 * Nomor dalam nama berkas tidak lagi sama dengan urutan migrasi. Jurnal punya
 * idx 7 untuk `0007_perbaiki_teks_rusak` lalu idx 8 untuk `0006_audit_admin`,
 * jadi `0006_snapshot.json` justru yang terakhir di rantai — dan hanya snapshot
 * itu yang sudah memuat tabel `admin_audit`. Kalau urutannya diambil dari nama
 * berkas, `0007_snapshot.json` dianggap yang terakhir, dan `admin_audit`
 * dilaporkan hilang dari snapshot padahal rantai snapshot-nya benar.
 *
 * `berkasMeta` di atas tetap dipakai untuk pemeriksaan rantai, karena
 * pemeriksaan itu tidak bergantung urutan, dan snapshot yatim ikut terlihat
 * di sana. Yang butuh urutan jelas hanya "snapshot terakhir".
 *
 * Migrasi `--custom` sengaja tidak menghasilkan snapshot, jadi entri tanpa
 * berkas dilewati.
 */
const snapshotUrut = jurnal.entries
  .map((e) => `${e.tag.slice(0, 4)}_snapshot.json`)
  .filter((f) => berkasMeta.includes(f));

function bacaSnapshot(nama: string): { id: string; prevId: string; tables: Record<string, unknown> } {
  return JSON.parse(readFileSync(path.join(META, nama), "utf8"));
}

/** Nama tabel dari skema drizzle, misalnya `pgTable("articles"` → `articles`. */
function tabelSkema(): string[] {
  const sumber = readFileSync(path.join(AKAR, "src/server/db/schema.ts"), "utf8");
  return [...sumber.matchAll(/pgTable\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

describe("jurnal migrasi", () => {
  it("idx naik dan tidak ada yang dobel", () => {
    // Menurun, bukan "satu per satu": migrasi `--custom` (misalnya 0001 yang
    // memasang trigger) memang tidak punya snapshot, dan "satu per satu" akan
    // salah menuduhnya melompat.
    const idx = jurnal.entries.map((e) => e.idx);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(new Set(idx).size).toBe(idx.length);
  });

  it("setiap entri punya berkas SQL", () => {
    for (const e of jurnal.entries) {
      const berkas = path.join(AKAR, "drizzle", `${e.tag}.sql`);
      expect(
        () => readFileSync(berkas, "utf8"),
        `berkas migrasi untuk ${e.tag} tidak ada`,
      ).not.toThrow();
    }
  });

  it("entri terakhir punya snapshot, sebab generate membandingkan dari situ", () => {
    // Bukan "setiap entri": migrasi `--custom` (trigger, fungsi) sengaja tidak
    // menghasilkan snapshot, dan itu perilaku drizzle-kit yang benar. Yang wajib
    // ada justru snapshot entri TERAKHIR — di situ `generate` mengambil pembanding.
    const terakhir = jurnal.entries[jurnal.entries.length - 1];
    const nomor = terakhir.tag.slice(0, 4);
    expect(berkasMeta, `snapshot untuk ${terakhir.tag} tidak ada`).toContain(
      `${nomor}_snapshot.json`,
    );
  });

  it("waktu entri tidak turun", () => {
    // `when` tidak harus searah nomor berkas, tapi tidak boleh mundur:
    // drizzle-kit menerapkan migrasi yang `when`-nya lebih besar dari yang
    // sudah tercatat, jadi urutan mundur berarti migrasi yang dilewati.
    for (let i = 1; i < jurnal.entries.length; i++) {
      expect(jurnal.entries[i].when).toBeGreaterThanOrEqual(jurnal.entries[i - 1].when);
    }
  });
});

describe("rantai snapshot", () => {
  it("id snapshot unik", () => {
    const id = berkasMeta.map((f) => bacaSnapshot(f).id);
    expect(new Set(id).size, `id ganda: ${id.filter((v, i) => id.indexOf(v) !== i)}`).toBe(
      id.length,
    );
  });

  it("prevId menunjuk snapshot yang benar-benar ada", () => {
    const semua = new Set(berkasMeta.flatMap((f) => [bacaSnapshot(f).id]));
    for (const f of berkasMeta) {
      const { prevId } = bacaSnapshot(f);
      if (prevId.startsWith("00000000")) continue;
      expect(semua, `${f} menunjuk prevId yang tidak ada`).toContain(prevId);
    }
  });

  it("tidak ada dua snapshot berbagi satu prevId", () => {
    // Cabang dalam rantai: penyebab galat "collision" yang membuat
    // `drizzle-kit generate` menolak jalan.
    const prev = berkasMeta.map((f) => bacaSnapshot(f).prevId);
    const ganda = prev.filter((v, i) => prev.indexOf(v) !== i && !v.startsWith("00000000"));
    expect(ganda).toEqual([]);
  });

  it("snapshot terakhir mengenali setiap tabel di skema", () => {
    const terakhir = bacaSnapshot(snapshotUrut[snapshotUrut.length - 1]);
    const diSnapshot = new Set(Object.keys(terakhir.tables).map((k) => k.split(".").pop() ?? k));
    const hilang = tabelSkema().filter((t) => !diSnapshot.has(t));
    expect(hilang, "tabel di skema tidak ada di snapshot terakhir").toEqual([]);
  });
});
