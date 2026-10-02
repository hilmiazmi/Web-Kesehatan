import {
  FOOTER_LINKS,
  HEADER_CTAS,
  NAV_ITEMS,
  type NavChild,
  type NavItem,
} from "@/data/navigation";

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
 * "kmanaged-langganan" -> "Kmanaged Langganan" (huruf awal kapital).
 */
export function humanize(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
      if (clean !== "/" && !out.includes(clean)) out.push(clean);
      if (node.children) walk(node.children, clean);
    }
  };

  // Menu utama, tombol CTA header, dan tautan footer semuanya menghasilkan
  // halaman, jadi ketiganya ikut terdaftar.
  walk(NAV_ITEMS, "");
  walk(HEADER_CTAS, "");
  walk(FOOTER_LINKS, "");

  return out.map((path) => ({ slug: segments(path) }));
}
