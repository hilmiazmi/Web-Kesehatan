import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountsManager from "@/components/admin/AccountsManager";
import SandiSendiri from "@/components/admin/SandiSendiri";
import { canManageUsers, readSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Akun Panel",
  description: "Tambah, ubah peran, nonaktifkan, dan hapus akun yang bisa masuk ke panel admin.",
};

/**
 * Halaman akun panel.
 *
 * Halaman ini butuh `canManageUsers`, bukan gate sesi yang dipakai layout
 * `(panel)`. Peran editor dan front office memang boleh masuk ke panel untuk
 * menangani inbox, tapi mereka tidak boleh melihat daftar akun maupun hash
 * kata sandi orang lain. Gate-nya di sini supaya halamannya menolak dengan
 * aman, bukan sekadar menyembunyikan tautannya di sidebar.
 */
export default async function AdminAccountsPage() {
  const claims = await readSession();
  if (claims === null) redirect("/admin/login");

  if (!canManageUsers(claims.role)) {
    return (
      <div>
        <h1 className="mb-3">Akun Panel</h1>
        <div className="admin-alert admin-alert-info" role="status">
          Peranmu tidak boleh mengelola akun. Halaman ini hanya untuk Super
          Admin. Daftar pengajuan yang menjadi tugasmu ada di menu Inbox.
        </div>
        <h2 className="detail-subheading mt-4">Sandi saya</h2>
        <SandiSendiri akunId={claims.sub} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3">Akun Panel</h1>
      <AccountsManager akunSendiri={claims.sub} />
      <h2 className="detail-subheading mt-4">Sandi saya</h2>
      <SandiSendiri akunId={claims.sub} />
    </div>
  );
}
