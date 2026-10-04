import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { ARTICLES, FACILITIES, MCU_HOLIDAY_PACKAGES, MCU_PACKAGES, PRIORITY_SERVICES } from "@/data/home";
import { BROSURS } from "@/data/brosur";
import { CLINIC_DETAILS } from "@/data/clinics";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import { MANAGEMENT } from "@/data/manajemen";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";
import { collectNavPaths } from "@/lib/nav-path";

/**
 * Daftar path untuk `sitemap.xml`, dikumpulkan tanpa menyentuh Next.js.
 *
 * Dipisah dari `src/app/sitemap.ts` supaya aturannya bisa diuji tanpa
 * merender apa pun.
 *
 * Tiga sumber, tidak ada daftar path manual di file mana pun:
 *
 * 1. Folder di `src/app` yang punya `page.tsx` sendiri. Dibaca dari
 *    filesystem, jadi route baru ikut masuk begitu foldernya dibuat.
 * 2. `collectNavPaths()` untuk halaman yang dilayani catch-all `[...slug]`.
 *    Fungsi itu justru melewati path yang punya folder sendiri, jadi
 *    sumbernya berlawanan dengan nomor satu dan keduanya memang perlu.
 * 3. Modul data tiap route `[slug]`, yang nilainya persis sama dengan
 *    `generateStaticParams` di route-nya.
 *
 * `collectNavPaths()` melewati `/ppid` dan `/tentang-kami/manajemen` karena
 * keduanya punya folder sendiri, sehingga seluruh subtree `[slug]`-nya ikut
 * terlewat. Keduanya ditambahkan di sini dari modul datanya, supaya tidak ada
 * halaman yang hilang dari sitemap.
 */
export type SitemapEntry = {
  /** Path tanpa domain, selalu diawali `/`. */
  path: string;
  /** Prioritas 0 sampai 1, sesuai Vertex sitemap.org. */
  priority: number;
  /** Seberapa sering berubah isinya, dari `MetadataRoute.Sitemap`. */
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
};

/**
 * Route yang punya halaman, tapi tidak boleh masuk sitemap.
 *
 * `/daftar-online` tidak diindeks karena isinya berbeda tiap pengunjung:
 * halaman itu menampilkan formulir yang menanyakan tanggal dan jam, dan
 * menampilkan hasil pencarian jadwal kepada orang yang berbeda.
 */
const DIKECUALIKAN = new Set(["/daftar-online"]);

/** Folder di bawah `src/app` yang bukan halaman untuk pengunjung. */
const BUKAN_HALAMAN = [
  // Route handler API. Punya halaman di bawah `/api/v1`, tapi isinya JSON.
  "api",
  // Halaman cadangan Next.js, bukan konten situs.
  "_not-found",
  "_global-error",
];

/**
 * Akar repo.
 *
 * `process.cwd()`, bukan `import.meta.dirname`. Yang kedua tidak tersedia di
 * bundel server milik Turbopack, dan build gagal saat modul dievaluasi.
 */
const AKAR = process.cwd();

/**
 * Path absolut dari folder statis yang punya `page.tsx`.
 *
 * Folder dinamis dilewati karena nama foldernya bukan path URL. Nama folder
 * dinamis selalu diawali `[`, jadi `page.tsx` di `/pelayanan/mcu/reguler`
 * terhitung sebagai `/pelayanan/mcu/reguler`, bukan sebagai slug.
 */
function routeFolders(): string[] {
  const appDir = path.join(AKAR, "src/app");
  const out: string[] = [];

  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith("[")) continue;
      if (prefix === "" && BUKAN_HALAMAN.includes(entry.name)) continue;

      // Grup route `(nama)` bukan segmen URL: isinya dilayani seolah folder
      // grupnya tidak ada. Tanpa ini `/admin/(panel)` ikut masuk peta
      // padahal URL itu tidak pernah bisa dibuka (balas 404). Anak di
      // dalamnya tetap ditelusuri supaya halaman statis di bawah grup tidak
      // ikut hilang.
      const grup =
        entry.name.startsWith("(") && entry.name.endsWith(")");
      const full = path.join(dir, entry.name);
      if (grup) {
        walk(full, prefix);
        continue;
      }

      const segments = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (existsSync(path.join(full, "page.tsx"))) out.push(`/${segments}`);
      walk(full, segments);
    }
  };

  walk(appDir, "");
  return out;
}

/**
 * Prioritas dan seberapa sering berubah, berdasarkan kedalamannya.
 *
 * Semakin dalam path-nya, semakin jauh dari beranda, jadi prioritasnya
 * semakin kecil. Halaman yang isinya jarang berubah dijadwalkan jarang.
 */
function bobot(pathUrl: string): Pick<SitemapEntry, "priority" | "changeFrequency"> {
  const kedalaman = pathUrl.split("/").filter(Boolean).length;

  if (pathUrl === "/") return { priority: 1, changeFrequency: "daily" };
  if (kedalaman === 1) return { priority: 0.9, changeFrequency: "weekly" };

  // Profil orang dan direktori brosur jarang berubah.
  if (/\/manajemen\/[^/]+$/.test(pathUrl) || /\/informasi-publik\/brosur\//.test(pathUrl)) {
    return { priority: 0.4, changeFrequency: "yearly" };
  }
  if (kedalaman <= 2) return { priority: 0.7, changeFrequency: "monthly" };
  return { priority: 0.6, changeFrequency: "monthly" };
}

export function collectSitemapPaths(): SitemapEntry[] {
  const semua = new Set<string>();

  // Beranda tidak pernah ada di `collectNavPaths()`, dan tidak punya folder
  // karena dilayani `src/app/page.tsx`.
  semua.add("/");

  for (const folder of routeFolders()) semua.add(folder);
  for (const { slug } of collectNavPaths()) semua.add(`/${slug.join("/")}`);

  const tambahDetail = (prefix: string, slug: string) =>
    semua.add(`${prefix}/${slug}`);

  for (const a of ARTICLES) tambahDetail("/berita", a.slug);
  for (const s of PRIORITY_SERVICES) tambahDetail("/pelayanan/prioritas", s.slug);
  for (const f of FACILITIES) tambahDetail("/pelayanan/medis", f.slug);
  for (const d of CLINIC_DETAILS) tambahDetail("/pelayanan/poliklinik", d.slug);
  for (const p of MCU_PACKAGES) tambahDetail("/pelayanan/mcu/reguler", p.slug);
  for (const p of MCU_HOLIDAY_PACKAGES) tambahDetail("/pelayanan/mcu/holiday", p.slug);
  for (const d of DIAGNOSTIC_SERVICES) tambahDetail("/pelayanan/diagnostik", d.slug);
  for (const b of BROSURS) tambahDetail("/informasi-publik/brosur", b.slug);

  // Subtree yang tidak terlihat oleh `collectNavPaths()`, karena induknya punya
  // folder sendiri sehingga seluruh cabangnya ikut dilewati.
  for (const anak of NAV_PPID_CHILDREN) semua.add(anak.href);
  for (const manager of MANAGEMENT) semua.add(`/tentang-kami/manajemen/${manager.slug}`);

  return [...semua]
    .filter((p) => !DIKECUALIKAN.has(p))
    .map((p) => ({ path: p, ...bobot(p) }))
    .sort((a, b) => a.path.localeCompare(b.path, "id"));
}