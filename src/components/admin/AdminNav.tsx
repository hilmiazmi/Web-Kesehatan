"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TableSummary } from "@/components/admin/types";

/**
 * Sidebar panel admin.
 *
 * Penandaan halaman aktif memakai `usePathname()`, bukan menerima nama
 * halaman sebagai prop. Alasannya, setiap halaman harus mengingat nama
 * segmentnya dan mencocokkannya sendiri; kalau pencocokan dilakukan di sini
 * dari `pathname`, ada satu tempat saja yang harus benar dan tidak ada
 * halaman yang bisa lupa mengirim prop-nya.
 */
export default function AdminNav({
  tables,
  inboxKinds,
  unread,
  canEdit,
}: {
  tables: readonly TableSummary[];
  inboxKinds: readonly { slug: string; label: string }[];
  unread: number;
  canEdit: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Menu panel admin">
      <Butir href="/admin" pathname={pathname} exactly>
        <i className="bi bi-speedometer2" aria-hidden="true" />
        Dasbor
      </Butir>

      {canEdit ? (
        <>
          <div className="admin-nav-group">Konten</div>
          {tables.map((t) => (
            <Butir key={t.table} href={`/admin/records/${t.table}`} pathname={pathname}>
              <i className="bi bi-table" aria-hidden="true" />
              {t.label}
            </Butir>
          ))}
          {/*
            Menu terpisah, bukan tabel di registry. Kapasitas bed bukan isi
            konten: ruangnya sudah ada dan tidak bisa ditambah dari panel,
            karena server mencocokkan baris berdasarkan nama ruang dan kelas.
          */}
          <Butir href="/admin/beds" pathname={pathname}>
            <i className="bi bi-hospital" aria-hidden="true" />
            Kapasitas Bed
          </Butir>
        </>
      ) : null}

      <div className="admin-nav-group">Inbox</div>
      {inboxKinds.map((k) => (
        <Butir key={k.slug} href={`/admin/inbox/${k.slug}`} pathname={pathname}>
          <i className="bi bi-inbox" aria-hidden="true" />
          {k.label}
        </Butir>
      ))}

      {unread > 0 ? (
        <div className="admin-nav-group">Total belum ditangani: {unread}</div>
      ) : null}
    </nav>
  );
}

/** Satu tautan sidebar, dengan penandaan kalau sedang dibuka. */
function Butir({
  href,
  pathname,
  exactly,
  children,
}: {
  href: string;
  pathname: string;
  exactly?: boolean;
  children: React.ReactNode;
}) {
  const aktif = exactly ? pathname === href : pathname.startsWith(href);
  return (
    <Link className="admin-nav-link" href={href} aria-current={aktif ? "page" : undefined}>
      {children}
    </Link>
  );
}
