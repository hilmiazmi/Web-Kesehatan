import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COVER_BERITA } from "../src/data/cover-berita";

/**
 * Ubah sampul berita dari picsum yang tak berkaitan menjadi Unsplash yang
 * sesuai konteksnya.
 *
 * Sampul berita dulu memakai `picsum.photos/seed/<slug>`. Alamat itu memberi
 * gambar konsisten, tapi isinya tidak ada hubungannya dengan beritanya:
 * "Skrining Kanker Wanita" misalnya memakai foto landscape acak. Pemetaan dan
 * alasannya ada di `src/data/cover-berita.ts`.
 *
 * Yang disentuh tiga tempat, karena cuma satu saja tidak cukup:
 *
 *  1. `scripts/seed-data.json` — dipakai `bun run db:seed` untuk database
 *     baru, termasuk penginstalan orang lain.
 *  2. `snapshot/articles*.json` — sumber data halaman beranda dan detail
 *     ketika `API_MODE=snapshot`. Inilah yang dilihat pengunjung sebelum
 *     ada database.
 *  3. Database yang sudah jalan — diperbarui lewat `--db`; tanpa itu installasi
 *     lama tetap memakai URL picsum.
 *
 * Dipisah dari `db:seed` supaya perubahan data ini bisa dijalankan ulang
 * tanpa harus mengisi ulang seluruh tabel.
 */

const AKAR = join(import.meta.dirname, "..");

const je = process.argv.includes("--db");
const kering = process.argv.includes("--dry-run");

/** Bentuk URL Unsplash: ukuran tetap, isi WebP/optimasi oleh `next/image`. */
function unsplash(foto: string, w: number, h: number): string {
  return `https://images.unsplash.com/${foto}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

type Artikel = { slug: string; cover_url?: string | null };

// --- 1 dan 2: berkas snapshot dan seed ------------------------------------

/**
 * Semua berkas yang mungkin memuat artikel, plus data seed.
 *
 * Daftarnya tidak difilter berdasarkan nama berkas, karena `home.json`
 * ternyata ikut memuat larik `articles` — beranda membaca dari sana, bukan dari
 * `articles.json`. Menyaring hanya yang namanya diawali `articles` akan
 * meninggalkan beranda dengan sampul lama, dan itu persis yang paling sering
 * dilihat pengunjung. Berkas yang tidak memuat artikel dilewati diam-diam.
 */
function kumpulkanBerkas(): string[] {
  const snapshot = readdirSync(join(AKAR, "snapshot"))
    .filter((n) => n.endsWith(".json"))
    .map((n) => `snapshot/${n}`);
  snapshot.push("scripts/seed-data.json");
  return snapshot;
}

const berkas = kumpulkanBerkas();

let diSeed = 0;
let diSnapshot = 0;

for (const rel of berkas) {
  const penuh = join(AKAR, rel);
  const data = JSON.parse(readFileSync(penuh, "utf-8")) as Record<string, unknown>;

  // Empat bentuk berbeda di folder yang sama, dan itu memang datanya:
  // `snapshot/home.json` memakai `articles`, `snapshot/articles.json` adalah
  // larik langsung, `seed-data.json` menaruhnya di bawah `tables`, dan
  // `snapshot/articles__kerja-sama-layanan-rujukan.json` adalah satu objek
  // berita saja; nama berkasnya `articles__` plus slug-nya.
  const daftar: Artikel[] = Array.isArray(data)
      ? (data as Artikel[])
      : Array.isArray(data.articles)
        ? (data.articles as Artikel[])
        : ((data.tables as { articles?: Artikel[] } | undefined)?.articles ??
          // Berkas satu berita: punya `slug` sendiri, tanpa pembungkus larik.
          (typeof data.slug === "string" && "cover_url" in data ? [data as Artikel] : []));

  if (daftar.length === 0) continue;
  // Kumpulkan perubahan dulu, baru terapkan ke teks asli. Menulis ulang
  // seluruh berkas lewat `JSON.stringify` akan mengubah indentasi dari satu
  // spasi menjadi dua dan menghasilkan diff ribuan baris untuk delapan
  // perubahan — tidak bisa ditinjau, dan sekali lagi bisa menimpa keputusan
  // pemformat yang sudah ada.
  const perubahan: { dari: string; ke: string }[] = [];
  for (const a of daftar) {
    const peta = COVER_BERITA.find((c) => c.slug === a.slug);
    if (!peta) continue;
    const baru = unsplash(peta.foto, 960, 540);
    if (a.cover_url === baru) continue;
    perubahan.push({ dari: a.cover_url ?? "", ke: baru });
  }
  if (perubahan.length === 0) continue;

  let teks: string = readFileSync(penuh, "utf-8");
  for (const p of perubahan) {
    // Nilai lama dicari sebagai string JSON, bukan sebagai path, supaya
    // kecocokan tidak melompat ke berkas lain yang kebetulan memuat teks sama.
    const target = JSON.stringify(p.dari);
    if (!teks.includes(target)) {
      console.error(`  ! ${rel}: nilai ${target} tidak ditemukan, dilewati`);
      continue;
    }
    teks = teks.replace(target, JSON.stringify(p.ke));
  }

  if (!kering) writeFileSync(penuh, teks);
  if (rel.startsWith("scripts/")) diSeed += perubahan.length;
  else diSnapshot += perubahan.length;
  console.log(`${rel}: ${perubahan.length} sampul diperbarui`);
}

// --- 3: database yang sudah jalan ------------------------------------------

if (je) {
  const { dbOrNull } = await import("../src/server/db/client");
  const db = dbOrNull();
  if (db === null) {
    console.error("DATABASE_URL tidak ada; database dilewati (berkas tetap diperbarui).");
  } else {
    for (const peta of COVER_BERITA) {
      if (kering) {
        console.log(`  akan perbarui ${peta.slug} -> ${unsplash(peta.foto, 960, 540)}`);
        continue;
      }
      const { sql } = await import("drizzle-orm");
      await db.execute(
        sql`UPDATE articles SET cover_url = ${unsplash(peta.foto, 960, 540)} WHERE slug = ${peta.slug}`,
      );
    }
    console.log(`database: ${COVER_BERITA.length} sampul diperbarui`);
  }
}

console.log(
  `\nselesai: ${diSnapshot} di snapshot, ${diSeed} di seed${je ? ", database ikut" : ""}` +
    (kering ? " (dry run: tidak ada yang ditulis)" : ""),
);
