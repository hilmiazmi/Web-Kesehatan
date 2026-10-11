import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { listAudit, TABEL_AUDIT } from "@/server/admin/audit";

export const metadata: Metadata = {
  title: "Riwayat Perubahan",
  description: "Jejak tindakan admin: siapa mengubah apa, dan kapan.",
};

/** Label aksi yang tampil di tabel, bukan nilai enum-nya. */
const LABEL_AKSI: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  status: "Status",
  login: "Masuk",
  logout: "Keluar",
  password: "Sandi",
};

/** Baris per halaman. Sama dengan daftar records dan inbox. */
const UKURAN = 25;

/**
 * Halaman riwayat perubahan.
 *
 * Dibaca langsung di server seperti dasbor, bukan lewat Route Handler, supaya
 * angkanya ada di HTML hasil render pertama dan tidak perlu menambah keadaan
 * "memuat" di sisi klien.
 *
 * Aksesnya hanya `super_admin`. Alasannya bukan kerahasiaan teknis, melainkan
 * fungsi datanya: riwayat ini dipakai menelusuri siapa mengubah apa, dan peran
 * yang tidak mengubah konten tidak punya pertanyaan yang perlu dijawabnya.
 */
export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>;
}) {
  const claims = await readSession();
  if (claims === null) redirect("/admin/login");

  if (claims.role !== "super_admin") redirect("/admin");

  const params = await searchParams;
  const tabel = params.table && TABEL_AUDIT.includes(params.table) ? params.table : null;
  const halaman = Math.max(1, Number(params.page ?? "1") || 1);

  const db = dbOrNull();
  if (db === null) {
    return (
      <div>
        <h1 className="mb-3">Riwayat Perubahan</h1>
        <div className="admin-alert admin-alert-info" role="status">
          Server berjalan dalam mode baca-saja, jadi riwayat tidak bisa dibaca.
        </div>
      </div>
    );
  }

  let items: Awaited<ReturnType<typeof listAudit>>["items"] = [];
  let total = 0;
  try {
    const hasil = await listAudit(db, { page: halaman, size: UKURAN, tableName: tabel });
    items = hasil.items;
    total = hasil.total;
  } catch {
    return (
      <div>
        <h1 className="mb-3">Riwayat Perubahan</h1>
        <div className="admin-alert admin-alert-gagal" role="alert">
          Riwayat gagal dimuat. Kalau migrasi <code>drizzle/0006_audit_admin.sql</code>{" "}
          belum dijalankan, tabel riwayatnya belum ada.
        </div>
      </div>
    );
  }

  const jumlahHalaman = Math.max(1, Math.ceil(total / UKURAN));

  return (
    <div>
      <h1 className="mb-3">Riwayat Perubahan</h1>

      <form className="admin-toolbar" action="/admin/riwayat">
        <label className="d-flex align-items-center gap-2">
          <span className="text-body-secondary">Saring tabel</span>
          <select
            className="form-select"
            style={{ width: "auto" }}
            name="table"
            defaultValue={tabel ?? ""}
          >
            <option value="">Semua tabel</option>
            {TABEL_AUDIT.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-outline-primary">
          Terapkan
        </button>
      </form>

      <div className="admin-table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              <th scope="col">Waktu (UTC)</th>
              <th scope="col">Aksi</th>
              <th scope="col">Pelaku</th>
              <th scope="col">Tabel</th>
              <th scope="col">Ringkasan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="admin-empty" colSpan={5}>
                  Belum ada tindakan yang tercatat.
                </td>
              </tr>
            ) : (
              items.map((b) => (
                <tr key={b.id}>
                  <td>{b.created_at.replace("T", " ").replace("Z", "")}</td>
                  <td>{LABEL_AKSI[b.action] ?? b.action}</td>
                  <td>{b.actor_email}</td>
                  <td>
                    {/* Nama tabel ditautkan ke halaman kelolanya supaya riwayat
                        bisa langsung ditindaklanjuti, bukan cuma dibaca. */}
                    {b.table_name === "" ? (
                      "—"
                    ) : (
                      <Link className="admin-tautan" href={`/admin/records/${b.table_name}`}>
                        {b.table_name}
                      </Link>
                    )}
                  </td>
                  <td>{b.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div className="admin-pager">
          <span>
            Menampilkan {(halaman - 1) * UKURAN + 1}–{Math.min(halaman * UKURAN, total)} dari{" "}
            {total} baris
          </span>
          <div className="d-flex gap-2">
            {/* Di batas halaman, tombolnya jadi teks biasa. Tautan yang terlihat
                mati tapi tetap bisa diklik akan membawa ke halaman kosong yang
                membingungkan. */}
            {halaman <= 1 ? (
              <span className="btn btn-outline-secondary btn-sm disabled">Sebelumnya</span>
            ) : (
              <Link
                className="btn btn-outline-secondary btn-sm"
                href={`/admin/riwayat?table=${tabel ?? ""}&page=${halaman - 1}`}
              >
                Sebelumnya
              </Link>
            )}
            {halaman >= jumlahHalaman ? (
              <span className="btn btn-outline-secondary btn-sm disabled">Berikutnya</span>
            ) : (
              <Link
                className="btn btn-outline-secondary btn-sm"
                href={`/admin/riwayat?table=${tabel ?? ""}&page=${halaman + 1}`}
              >
                Berikutnya
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
