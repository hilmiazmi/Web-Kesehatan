import type { Metadata } from "next";
import SettingsManager from "@/components/admin/SettingsManager";
import { canEditContent, readSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Pengaturan Situs",
  description: "Ubah nama, kontak, jam layanan, dan catatan kaki situs.",
};

/**
 * Halaman pengaturan situs.
 *
 * Gate-nya sudah ada di `(panel)/layout.tsx`, jadi halaman ini tidak perlu
 * mengulang redirect. Yang tetap diperiksa di sini adalah peran, karena
 * `PUT /api/v1/admin/settings` menolak `front_office`. Tanpa cek peran di sini,
 * `front_office` akan melihat form yang tidak akan pernah berhasil disimpan.
 */
export default async function AdminSettingsPage() {
  const claims = await readSession();
  const bisaUbah = claims !== null && canEditContent(claims.role);

  return (
    <div>
      <h1 className="mb-3">Pengaturan Situs</h1>

      {!bisaUbah ? (
        <div className="admin-alert admin-alert-info mb-3" role="status">
          Peranmu menangani pengajuan yang masuk, bukan isi situs. Pengaturan
          nama dan kontak hanya bisa diubah oleh editor dan super admin.
        </div>
      ) : (
        <>
          <p className="halaman-keterangan">
            Isian di sini dipakai header, footer, halaman kontak, dan blok
            layanan pada seluruh situs publik. Semua kolom bertanda bintang
            wajib diisi: kalau dikosongkan, server akan mengembalikan nilai
            bawaannya dan mengabaikan isian kosong itu.
          </p>
          <SettingsManager />
        </>
      )}
    </div>
  );
}