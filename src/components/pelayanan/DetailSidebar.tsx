import Link from "next/link";

/**
 * Sidebar halaman detail: daftar halaman saudara di kategori yang sama.
 *
 * Halaman detail layanan prioritas, fasilitas medis, layanan diagnostik,
 * dan paket MCU di situs referensi memakai susunan yang sama: daftar saudara
 * di kolom kiri, isi halaman di kolom kanan.
 *
 * Komponen ini murni server component, tidak ada state.
 */

export type SidebarItem = {
  href: string;
  label: string;
};

export default function DetailSidebar({
  items,
  currentHref,
}: {
  items: SidebarItem[];
  /** Path halaman yang sedang dibuka; dipakai untuk menandai `aria-current`. */
  currentHref: string;
}) {
  return (
    <nav className="detail-sidebar" aria-label="Halaman lain di kategori ini">
      <ul className="detail-sidebar-list">
        {items.map((item) => {
          const aktif = item.href === currentHref;
          return (
            <li className="detail-sidebar-item" key={item.href}>
              <Link
                href={item.href}
                className="detail-sidebar-link"
                aria-current={aktif ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}