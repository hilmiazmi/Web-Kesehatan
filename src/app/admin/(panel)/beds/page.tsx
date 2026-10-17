import type { Metadata } from "next";
import Link from "next/link";
import BedsManager from "@/components/admin/BedsManager";
import { canEditContent, readSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Kapasitas Bed",
  description: "Perbarui jumlah tempat tidur yang terisi dan dipesan di setiap ruang.",
};

/**
 * Halaman ubah kapasitas tempat tidur.
 *
 * Ini satu-satunya halaman panel yang tidak memakai `RecordManager`. Bed bukan
 * tabel konten: ruangnya sudah ada dan tidak bisa ditambah lewat panel,
 * karena `perbaruiTempatTidur` mencocokkan baris berdasarkan nama ruang dan
 * kelas, bukan id. Mengizinkan tambah baris berarti petugas bisa membuat dua
 * baris untuk ruang yang sama tanpa melihat galat apa pun.
 */
export default async function AdminBedsPage() {
  const claims = await readSession();
  const bisaUbah = claims !== null && canEditContent(claims.role);

  return (
    <div>
      <h1 className="mb-3">Kapasitas Bed</h1>
      {!bisaUbah ? (
        <div className="admin-alert admin-alert-info mb-3" role="status">
          Peranmu menangani pengajuan yang masuk, bukan isi situs. Buka menu
          Inbox di samping untuk melihat pendaftaran, kritik, dan laporan.
        </div>
      ) : (
        <>
          <p className="halaman-keterangan">
            Angka yang disimpan di sini langsung tampil di halaman{" "}
            <Link href="/kapasitas-bed">Kapasitas Bed</Link>. Waktu peninjauan
            terakhir ikut diperbarui setiap kali disimpan, jadi angka basi
            terlihat dari tanggalnya, bukan dari tebakan.
          </p>
          <BedsManager />
        </>
      )}
    </div>
  );
}