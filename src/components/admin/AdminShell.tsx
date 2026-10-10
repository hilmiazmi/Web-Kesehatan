import type { Role, SessionClaims } from "@/server/auth/session";
import { canEditContent, canManageUsers } from "@/server/auth/session";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/admin/LogoutButton";
import type { TableSummary } from "@/components/admin/types";

/**
 * Kerangka panel admin:sidebar di kiri, isi di kanan.
 *
 * Daftar tabel dan inbox dikirim dari server, bukan diambil lewat
 * `GET /api/v1/admin/tables`. Sumbernya sama dengan yang dipakai Route Handler,
 * jadi label dan daftar kolom di layar tidak bisa berbeda dari yang dibaca
 * server, dan sidebar muncul di HTML hasil render pertama tanpa perlu menunggu
 * permintaan peramban.
 */
export default function AdminShell({
  claims,
  tables,
  inboxKinds,
  unread,
  children,
}: {
  claims: SessionClaims;
  tables: readonly TableSummary[];
  inboxKinds: readonly { slug: string; label: string }[];
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <strong>Panel Admin</strong>
          <span>RSUD Contoh Sehat</span>
        </div>

        <AdminNav
          tables={tables}
          inboxKinds={inboxKinds}
          unread={unread}
          canEdit={canEditContent(claims.role)}
          canManageUsers={canManageUsers(claims.role)}
        />

        <div className="admin-brand">
          <span>
            {claims.name} — {ROLE_LABEL[claims.role]}
          </span>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-top">
          <strong>Panel Admin</strong>
          <div className="admin-user">
            {/* Inisial nama sebagai avatar. Dibuat di server dari huruf
                pertama, jadi tidak butuh JavaScript dan tidak berkedip. */}
            <span className="admin-avatar" aria-hidden="true">
              {claims.name.charAt(0)}
            </span>
            <span>{claims.email}</span>
            <span className="admin-role">{ROLE_LABEL[claims.role]}</span>
            <LogoutButton />
          </div>
        </div>

        <div className="admin-body">{children}</div>
      </div>
    </div>
  );
}

/** Nama peran yang tampil di layar, bukan nilai enum-nya. */
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  front_office: "Front Office",
};
