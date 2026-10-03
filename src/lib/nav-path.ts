import {
  FOOTER_LINKS,
  HEADER_CTAS,
  NAV_ITEMS,
  type NavChild,
  type NavItem,
} from "@/data/navigation";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";

/**
 * Pencarian jejak remah roti di dalam data navigasi.
 *
 * Dipakai halaman "[...slug]" supaya breadcrumb untuk link navbar yang belum
 * punya halaman khusus tetap terbentuk otomatis dari hierarki menu, tanpa
 * harus menulis daftar path secara manual.
 */

/** Pecah "/a/b/c" menjadi ["a", "b", "c"]. */
function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

/**
 * Telusuri pohon navigasi dari level-1 sampai bawah, lalu kembalikan
 * [{"label","href"}] untuk setiap segmen yang ditemukan.
 *
 * Mengembalikan `null` kalau path tidak ada di menu — pemanggil lalu
 * memakai fallback berupa breadcrumb sederhana.
 */
export function resolveTrail(pathname: string): { label: string; href: string }[] | null {
  const segs = segments(pathname);
  if (segs.length === 0) return null;

  const trail: { label: string; href: string }[] = [];

  // Level-1: cocokkan berdasarkan label yang sama dengan segment (slug-ified).
  const level1 = NAV_ITEMS.find((item) => matches(item, segs[0]));
  if (!level1) return null;

  let hrefSoFar = "";
  pushAncestor(trail, level1, hrefSoFar);

  // Level berikutnya: cari anak yang cocok dengan segment berikutnya.
  let current: NavChild[] | undefined = (level1 as NavItem).children;
  for (let i = 1; i < segs.length; i++) {
    const found = (current ?? []).find((c) => matches(c, segs[i]));
    if (!found) break;
    hrefSoFar = found.href;
    trail.push({ label: found.label, href: found.href });
    current = found.children;
  }

  return trail.length > 0 ? trail : null;
}

/** Gabung anak ke trail dengan href induk yang sudah diketahui. */
function pushAncestor(
  trail: { label: string; href: string }[],
  node: NavItem | NavChild,
  parentHref: string
) {
  const segs = segments(node.href);
  const href = segs.length > 1 ? node.href : `${parentHref}/${segs[0] ?? ""}`;
  trail.push({ label: node.label, href });
}

/**
 * Cocokkan label menu dengan satu segmen URL.
 *
 * "/pelayanan/prioritas/jantung-terpadu" -> "jantung-terpadu".
 * Label "Layanan Prioritas" -> "layanan-prioritas".
 * Bandingkan bentuk slug dari keduanya supaya "jantung-terpadu" tetap cocok
 * walau labelnya "Jantung Terpadu".
 */
function matches(node: NavItem | NavChild, segment: string): boolean {
  if (slugify(node.label) === segment) return true;

  const lastSegment = segments(node.href).pop();
  if (lastSegment === segment) return true;

  // Cocokkan juga dengan slug terakhir dari label, mis. "MCU" -> "mcu".
  const words = node.label.toLowerCase().split(/\s+/);
  return words.some((w) => slugify(w) === segment);
}

/** "Layanan Prioritas" -> "layanan-prioritas". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ambil label manusia dari segmen URL, untuk fallback breadcrumb.
 * "pengumuman-terbaru" -> "Pengumuman Terbaru" (huruf awal kapital).
 */
export function humanize(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Path yang punya route sendiri di `src/app`, jadi tidak boleh didaftarkan
 * lagi oleh catch-all.
 *
 * `/ppid` punya subtree di `src/app/ppid`, jadi hanya leaf-nya yang dilewati
 * dan halaman induknya tetap terdaftar. `/informasi-publik/brosur` tidak punya
 * anak di menu, jadi path-nya sendiri yang dilewati karena `src/app/informasi-publik/brosur`
 * sudah menangani induk dan detailnya.
 */
const OWN_ROUTE_SUBTREES = new Set(["/ppid", "/informasi-publik/brosur"]);

/**
 * Apakah path ini dilayani route khusus di `src/app`, bukan catch-all?
 *
 * Seluruh subtree di bawah satu path juga dianggap route khusus: `/ppid/...`
 * dan `/informasi-publik/brosur/...` punya foldernya masing-masing.
 *
 * Dipakai tes navigasi supaya daftar yang dikecualikan di sini dan di
 * `collectNavPaths()` tidak bisa berbeda sumber.
 */
export function hasOwnRoute(path: string): boolean {
  const clean = path.replace(/\/+$/, "") || "/";
  for (const prefix of OWN_ROUTE_SUBTREES) {
    if (clean === prefix || clean.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/**
 * Kumpulkan seluruh path dari data navigasi (kecuali root) dalam bentuk
 * parameter catch-all.
 *
 * Dipakai `generateStaticParams` pada halaman `[...slug]`. Rute catch-all
 * memerlukan `{ slug: string[] }`, bukan `{ path: string }`; kalau salah
 * bentuk, tidak ada satu pun halaman yang ter-prerender dan setiap tautan
 * navbar berakhir jadi 404.
 *
 * Lihat `generate-static-params` pada dokumentasi Next.js.
 */
export function collectNavPaths(): { slug: string[] }[] {
  const out: string[] = [];

  const walk = (nodes: (NavItem | NavChild)[], parent: string) => {
    for (const node of nodes) {
      const segs = segments(node.href);
      const full = segs.length > 1 ? node.href : `${parent}/${segs[0] ?? ""}`;
      const clean = full.replace(/\/+$/, "") || "/";
      // Path yang sudah punya folder sendiri di src/app tidak didaftarkan
      // di sini, supaya tidak bentrok dengan route eksplisit.
      if (clean !== "/" && !out.includes(clean) && !hasOwnRoute(clean)) {
        out.push(clean);
      }
      if (node.children && !hasOwnRoute(clean)) walk(node.children, clean);
    }
  };

  // Menu utama, tombol CTA header, dan tautan footer semuanya menghasilkan
  // halaman, jadi ketiganya ikut terdaftar.
  walk(NAV_ITEMS, "");
  walk(HEADER_CTAS, "");
  walk(FOOTER_LINKS, "");

  // PPID punya route sendiri di src/app/ppid. Import di sini dipakai sebagai
  // penjaga: kalau submenu PPID pernah dikosongkan, halaman induknya yang
  // biasanya menampilkan tautannya ikut kehilangan isi.
  if (NAV_PPID_CHILDREN.length === 0) throw new Error("NAV_PPID_CHILDREN kosong");

  return out.map((path) => ({ slug: segments(path) }));
}