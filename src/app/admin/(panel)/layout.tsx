import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { readSession } from "@/server/auth/session";
import { all as semuaTabel } from "@/server/admin/registry";
import { allKinds } from "@/server/admin/inbox";
import { dbOrNull } from "@/server/db/client";
import { loadStats } from "@/server/admin/stats";

/**
 * Layout halaman panel yang butuh sesi.
 *
 * Gate-nya di sini, bukan di `admin/layout.tsx`, supaya `/admin/login` tetap
 * bisa dibuka tanpa sesi. Label inbox ditulis di sini, bukan diambil dari
 * backend, karena backend hanya menyimpan slug teknis; nama yang tampil ke
 * operator adalah urusan tampilan.
 */
const INBOX_LABEL: Record<string, string> = {
  appointments: "Pendaftaran Pasien",
  "mcu-registrations": "Registrasi MCU",
  feedbacks: "Kritik dan Saran",
  "wbs-reports": "Laporan WBS",
  "survey-responses": "Respons Survei",
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await readSession();
  if (claims === null) redirect("/admin/login");

  const tables = semuaTabel().map((t) => ({
    table: t.table,
    label: t.label,
    defaultOrder: t.defaultOrder,
    deletable: t.deletable,
    searchColumns: t.searchColumns,
  }));

  const inboxKinds = allKinds().map((k) => ({
    slug: k.slug,
    label: INBOX_LABEL[k.slug] ?? k.slug,
  }));

  // Jumlah belum ditangani gagal dimuat tanpa menggagalkan seluruh sidebar.
  // Mode baca-saja tidak punya database, dan panel menampilkan nol di sana.
  // `loadStats` dihitung dalam satu kali bolak-balik yang hanya baca, jadi
  // biayanya sama dengan satu query daftar.
  let unread = 0;
  const db = dbOrNull();
  if (db !== null) {
    try {
      unread = (await loadStats(db)).inbox_unread;
    } catch {
      unread = 0;
    }
  }

  return (
    <AdminShell claims={claims} tables={tables} inboxKinds={inboxKinds} unread={unread}>
      {children}
    </AdminShell>
  );
}
