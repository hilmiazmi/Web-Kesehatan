import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Skema Drizzle dan SQL migrasi harus saling cocok.
 *
 * Komentar di puncak `src/server/db/schema.ts` dulu menyebut dua tempat yang
 * tidak pernah ada: `src/server/db/migration-kustom.sql` dan
 * `tests/schema.test.ts`. Tidak ada berkas SQL kustom terpisah, dan tidak ada
 * tes yang menjaga daftar constraint. Yang benar: tujuh CHECK regex hidup di
 * `drizzle/`, dan seluruh indeks punya padanan di kedua sisi.
 *
 * Tes ini menjadikan klaim di komentar itu benar, bukan menghapus informasinya.
 * Dua hal yang dikunci:
 *
 * 1. Nama indeks di `drizzle/*.sql` dan di `schema.ts` harus sama persis, dua
 *    arah. `drizzle-kit generate` hanya tahu apa yang ditulis di `schema.ts`,
 *    jadi indeks yang hanya hidup di SQL akan hilang saat generate berikutnya
 *    tanpa ada yang menyadari.
 * 2. Tujuh CHECK regex hanya hidup di SQL. Drizzle tidak bisa menulisnya lewat
 *    `check(nama, sql...)` dengan bentuk yang sama, jadi jangan dipindahkan ke
 *    `schema.ts` dengan cara menambah `check()` yang tidak terbukti: yang
 *    dikunci di sini adalah keberadaan mereka di SQL.
 *
 * Tes ketiga menjaga seluruh repo: komentar tidak boleh menyebut path berkas
 * yang tidak ada. Itu kelas kesalahan yang sama seperti dua rujukan usang di
 * atas, dan yang membuatnya berbahaya adalah tidak ada yang gagal saat salah
 * path itu ditulis.
 */

const akar = path.resolve(import.meta.dirname, "..");

/** Direktori tingkat-atas repo ini, dipakai untuk membedakan path repo. */
const DIREKTORI_AKAR = new Set(
  readdirSync(akar).filter((nama) => {
    try {
      return statSync(path.join(akar, nama)).isDirectory();
    } catch {
      return false;
    }
  }),
);

/** Nama paket di `node_modules`, supaya `next/image` tidak disangka path repo. */
const NAMA_PAKET = new Set(readdirSync(path.join(akar, "node_modules")));

function berkasDrizzle(): { nama: string; isi: string }[] {
  const dir = path.join(akar, "drizzle");
  return readdirSync(dir)
    .filter((nama) => nama.endsWith(".sql"))
    .sort()
    .map((nama) => ({ nama, isi: readFileSync(path.join(dir, nama), "utf8") }));
}

const SEMUA_SQL = berkasDrizzle()
  .map((b) => b.isi)
  .join("\n");

const SCHEMA = readFileSync(
  path.join(akar, "src/server/db/schema.ts"),
  "utf8",
);

/** Tanpa komentar, supaya nama yang disebut di komentar tidak ikut terhitung. */
function kodeSaja(sumber: string): string {
  return sumber
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const SCHEMA_KODE = kodeSaja(SCHEMA);

function indeksDiSql(): Set<string> {
  return new Set(
    [...SEMUA_SQL.matchAll(/CREATE (?:UNIQUE )?INDEX "([a-z0-9_]+)"/g)].map(
      (m) => m[1],
    ),
  );
}

function indeksDiSchema(): Set<string> {
  return new Set(
    [
      ...SCHEMA_KODE.matchAll(/\b(?:uniqueIndex|index)\("([a-z0-9_]+)"\)/g),
    ].map((m) => m[1]),
  );
}

/** Nama CHECK yang memakai operator regex PostgreSQL (`~` atau `~*`). */
function checkRegexDiSql(): string[] {
  return [
    ...SEMUA_SQL.matchAll(/CONSTRAINT "([a-z0-9_]+)" CHECK \([^)]*~\*?/g),
  ].map((m) => m[1]);
}

describe("skema drizzle — indeks simetris dengan SQL", () => {
  it("setiap indeks di SQL punya padanan di schema.ts, dan sebaliknya", () => {
    const diSql = indeksDiSql();
    const diSchema = indeksDiSchema();

    // Dua arah diperiksa terpisah supaya pesan gagalnya menyebut nama indeks
    // yang sebenarnya hilang, bukan hanya "jumlahnya beda".
    const hanyaDiSql = [...diSql].filter((n) => !diSchema.has(n));
    const hanyaDiSchema = [...diSchema].filter((n) => !diSql.has(n));

    expect(hanyaDiSql).toEqual([]);
    expect(hanyaDiSchema).toEqual([]);
  });

  it("jumlah indeksnya bukan nol, supaya regex yang salah tidak diam-diam lulus", () => {
    // Kalau pola `CREATE ... INDEX` atau `index("...")` berubah bentuk, tes di
    // atas akan lulus dengan dua himpunan kosong. Angka ini menutup kemungkinan
    // itu.
    expect(indeksDiSql().size).toBeGreaterThan(40);
    expect(indeksDiSchema().size).toBe(indeksDiSql().size);
  });
});

describe("skema drizzle — CHECK regex yang hanya hidup di SQL", () => {
  it("tujuh constraint regex tetap ada di berkas migrasi", () => {
    // Tujuh ini tidak punya `check()` di `schema.ts`, dan itu memang yang
    // dimaksud. Kalau salah satunya hilang dari SQL, validasi surel atau
    // tautan internal berhenti berlaku tanpa ada tes lain yang gagal.
    const diSql = new Set(checkRegexDiSql());
    for (const nama of [
      "appointments_email_format",
      "feedbacks_email_format",
      "hero_slides_link_internal",
      "mcu_registrations_email_format",
      "survey_responses_email_format",
      "wbs_reports_email_format",
      "admissions_email_format",
    ]) {
      expect(diSql).toContain(nama);
    }
  });

  it("kedua CHECK nik simulasi justru ditulis di schema.ts", () => {
    // Pasangan ini memakai regex juga, tapi Drizzle bisa menulisnya, jadi
    // keduanya ada di `schema.ts`. Diperiksa supaya batas "apa yang bisa
    // ditulis di sini" tidak bergeser tanpa ada yang sadar.
    expect(SCHEMA_KODE).toContain('check("appointments_nik_simulasi"');
    expect(SCHEMA_KODE).toContain('check("admissions_nik_simulasi"');
  });

  it("admissions_email_format ikut di migrasi tabelnya, bukan di baseline", () => {
    // Tabel `admissions` lahir di `0004_slimy_vector.sql`, jadi constraint-nya
    // ada di sana. Kalau dipindah ke `0000`, urutan migrasi pecah.
    const migrasi = berkasDrizzle();
    const baseline = migrasi.find((b) => b.nama === "0000_baseline.sql")!;
    const slimy = migrasi.find((b) => b.nama === "0004_slimy_vector.sql")!;

    expect(baseline.isi).not.toContain("admissions_email_format");
    expect(slimy.isi).toContain('CONSTRAINT "admissions_email_format"');
  });
});

describe("komentar tidak menyebut berkas yang tidak ada", () => {
  /**
   * Semua token yang mirip path repo di dalam backtick, dari berkas sumber.
   *
   * Hanya token yang mulai dengan direktori tingkat-atas repo ini yang
   * diperiksa. Sisanya dilewati karena itu nama paket npm (`next/image`,
   * `swiper/css/...`) atau potongan rute (`users/[id]/password`, `dd/MM/yyyy`)
   * yang memang bukan path berkas.
   */
  function kumpulkanToken(): { berkas: string; token: string }[] {
    const hasil: { berkas: string; token: string }[] = [];
    const direktori = ["src", "tests", "e2e", "scripts"];

    function jalan(dir: string, out: string[] = []): string[] {
      for (const entri of readdirSync(dir)) {
        if (["node_modules", ".next", ".git"].includes(entri)) continue;
        const penuh = path.join(dir, entri);
        if (statSync(penuh).isDirectory()) jalan(penuh, out);
        else out.push(penuh);
      }
      return out;
    }

    for (const dir of direktori) {
      for (const berkas of jalan(path.join(akar, dir))) {
        // Berkas ini sendiri dilewati: ia menyebut nama path yang salah untuk
        // membuktikan path itu tertangkap. Tanpa pengecualian, tes gagal karena
        // komentarnya sendiri.
        if (path.resolve(berkas) === path.resolve(__filename)) continue;
        if (!/\.(ts|tsx)$/.test(berkas)) continue;
        const teks = readFileSync(berkas, "utf8");
        for (const cocok of teks.matchAll(/`([^`\n]+)`/g)) {
          let token = cocok[1].trim();
          if (!token.includes("/")) continue;
          // Lewati URL, path relatif, alias, dan template literal.
          if (/^(?:\.|\/|@|\$)/.test(token)) continue;
          token = token.split(/\s/)[0].replace(/[.,;:)]+$/, "");
          const segmen = token.split("/");
          if (segmen.length < 2) continue;
          if (segmen.some((s) => s === "")) continue;
          if (NAMA_PAKET.has(segmen[0])) continue;
          if (/\$\{/.test(token)) continue;

          const berEkstensi =
            /\.(ts|tsx|css|scss|json|sql|md|py|sh|mjs|woff|woff2|ico)$/.test(
              token,
            );
          if (!berEkstensi && !token.endsWith("/")) continue;
          if (!DIREKTORI_AKAR.has(segmen[0])) {
            // Segmen pertama bukan direktori repo ini. Token tanpa tanda kurung
            // rute dan minimal tiga segmen tetap diperiksa, supaya rujukan ke
            // direktori yang belum pernah ada tertangkap juga.
            if (segmen.length < 3 || /[(\[]/.test(token)) continue;
          }
          hasil.push({
            berkas: path.relative(akar, berkas),
            token,
          });
        }
      }
    }
    return hasil;
  }

  it("setiap rujukan path di komentar menunjuk ke berkas atau direktori nyata", () => {
    const hilang = kumpulkanToken().filter(({ token }) => {
      const penuh = path.join(akar, token);
      const wildcard = token.includes("*");
      const target = wildcard ? path.dirname(penuh) : penuh;
      if (!existsSync(target)) return true;
      if (wildcard) return !statSync(target).isDirectory();
      return !statSync(target).isFile();
    });

    expect(
      hilang.map((h) => `${h.berkas} -> ${h.token}`),
    ).toEqual([]);
  });

  it("pemindai menemukan cukup token untuk dipercaya", () => {
    // Tanpa angka ini, pola yang salah bisa membuat tes di lulus dengan
    // himpunan kosong, dan rujukan usang lolos lagi seperti dulu.
    expect(kumpulkanToken().length).toBeGreaterThan(80);
  });

  it("komentar schema.ts tidak lagi menyebut berkas yang sudah dihapus", () => {
    // Tiga nama ini pernah tertulis di `schema.ts` dan menyesatkan: tidak ada
    // `migration-kustom.sql`, tidak ada `tests/schema.test.ts`, dan folder
    // `src/server/repo/` sudah pindah ke `src/server/db/repo/`. Dikunci
    // terpisah karena ketiganya tidak punya tiga segmen, sehingga pemindai
    // umum di atas melewatinya.
    expect(SCHEMA).not.toContain("migration-kustom");
    expect(SCHEMA).not.toContain("tests/schema.test");
    expect(SCHEMA).not.toContain("src/server/repo/");
    // Sebagai gantinya, rujukan yang benar harus ada.
    expect(SCHEMA).toContain("src/server/db/repo/appointments.ts");
    expect(SCHEMA).toContain("src/server/db/repo/content.ts");
    expect(SCHEMA).toContain("drizzle/0000_baseline.sql");
    expect(SCHEMA).toContain("tests/schema-vs-sql.test.ts");
  });
});
