import type { Metadata } from "next";
import { dbOrNull } from "@/server/db/client";
import { loadStats, type Stats } from "@/server/admin/stats";

export const metadata: Metadata = {
  title: "Dasbor Panel Admin",
  description: "Ringkasan isi dan antrean yang belum ditangani.",
};

/**
 * Dasbor panel admin.
 *
 * Angkanya dibaca langsung dari database di server, bukan lewat Route Handler,
 * supaya HTML hasil render pertama sudah berisi angkanya. Sumbernya `loadStats`
 * yang sama dengan yang dipakai endpoint `/api/v1/admin/stats`, jadi angka di
 * sini tidak bisa berbeda dari angka yang dibaca lewat API.
 */
export default async function AdminDashboardPage() {
  const db = dbOrNull();

  if (db === null) {
    return (
      <div>
        <h1 className="mb-3">Dasbor</h1>
        <div className="admin-alert admin-alert-info" role="status">
          Server berjalan dalam mode baca-saja. Dasbor butuh database, jadi
          angkanya tidak bisa ditampilkan. Lihat halaman publik untuk data yang
          tersimpan di snapshot.
        </div>
      </div>
    );
  }

  let stats: Stats;
  try {
    stats = await loadStats(db);
  } catch {
    return (
      <div>
        <h1 className="mb-3">Dasbor</h1>
        <div className="admin-alert admin-alert-gagal" role="alert">
          Angka dasbor gagal dimuat. Periksa koneksi database lalu muat ulang
          halaman ini.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3">Dasbor</h1>

      <h2 className="fs-5 mb-3">Perlu ditangani</h2>
      <dl className="row g-3 mb-4">
        <Statistik judul="Belum ditangani" nilai={stats.inbox_unread} />
        <Statistik judul="Pendaftaran hari ini" nilai={stats.appointments_today} />
        <Statistik judul="Pendaftaran akan datang" nilai={stats.appointments_upcoming} />
        <Statistik judul="Tempat tidur tersedia" nilai={stats.beds_available} dari={stats.beds_total} />
      </dl>

      <h2 className="fs-5 mb-3">Isi situs</h2>
      <dl className="row g-3 mb-4">
        <Statistik judul="Berita terbit" nilai={stats.articles} />
        <Statistik judul="Layanan aktif" nilai={stats.services} />
        <Statistik judul="Paket MCU aktif" nilai={stats.mcu_packages} />
        <Statistik judul="Dokter aktif" nilai={stats.doctors} />
        <Statistik judul="Jadwal aktif" nilai={stats.schedules} />
        <Statistik judul="Halaman terbit" nilai={stats.pages} />
        <Statistik judul="Slide hero aktif" nilai={stats.hero_slides} />
      </dl>

      <h2 className="fs-5 mb-3">Survei kepuasan</h2>
      <dl className="row g-3">
        <Statistik judul="Rata-rata" nilai={stats.survey_average ?? "-"} />
        <Statistik judul="Jumlah isian" nilai={stats.survey_responses} />
      </dl>
    </div>
  );
}

/** Satu kartu angka. */
function Statistik({
  judul,
  nilai,
  dari,
}: {
  judul: string;
  nilai: number | string;
  dari?: number;
}) {
  return (
    <div className="col-md-6 col-lg-3">
      <div className="admin-stat">
        <dt>{judul}</dt>
        <dd>
          {nilai}
          {dari !== undefined ? <span className="fs-6 text-body-secondary"> / {dari}</span> : null}
        </dd>
      </div>
    </div>
  );
}
