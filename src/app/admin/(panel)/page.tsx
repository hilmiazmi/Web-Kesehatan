import type { Metadata } from "next";
import { dbOrNull } from "@/server/db/client";
import {
  appointmentsPerDay,
  loadStats,
  surveyByUnit,
  type Stats,
} from "@/server/admin/stats";

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
 *
 * Dua tabel yang sama diambil lewat `appointmentsPerDay` dan `surveyByUnit`,
 * bukan lewat fetch dari klien. Alasannya sama: panel ini sudah Server
 * Component, jadi menambah dua tabel tidak perlu memindahkan apa pun ke sisi
 * klien dan tidak perlu menambah satu keadaan "memuat" yang akan berkedip.
 *
 Dua query tambahan itu punya penanganan kegagalan sendiri-sendiri, jadi satu
 * tabel yang gagal diambil tidak membuat tabel lain ikut hilang.
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
  let harian: { date: string; total: number }[] = [];
  let survei: { unit: string; average: number; total: number }[] = [];

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

  // Dua query ini tidak menentukan halaman tetap terbaca atau tidak, jadi
  // kegagalannya ditolerance sendiri. Angka utama sudah ada di atas; tabel ini
  // tambahan, dan lebih baik kosong daripada membuat seluruh dasbor gagal.
  try {
    harian = await appointmentsPerDay(db);
  } catch {
    harian = [];
  }
  try {
    survei = await surveyByUnit(db);
  } catch {
    survei = [];
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
      <dl className="row g-3 mb-4">
        <Statistik judul="Rata-rata" nilai={stats.survey_average ?? "-"} />
        <Statistik judul="Jumlah isian" nilai={stats.survey_responses} />
      </dl>

      <section className="mb-4">
        <h2 className="fs-5 mb-2">Pendaftaran empat belas hari terakhir</h2>
        <p className="halaman-keterangan">
          Empat belas titik berasal dari rentang yang dipatok server, bukan dari
          pilihan halaman ini, jadi tabelnya tidak bisa dipaginasi.
        </p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col" className="text-end">
                  Pendaftaran
                </th>
              </tr>
            </thead>
            <tbody>
              {harian.length === 0 ? (
                <tr>
                  <td className="admin-empty" colSpan={2}>
                    Data harian tidak bisa dimuat.
                  </td>
                </tr>
              ) : (
                harian.map((h) => (
                  <tr key={h.date}>
                    <td>{h.date}</td>
                    <td className="text-end">{h.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="fs-5 mb-2">Survei per unit</h2>
        <p className="halaman-keterangan">
          Unit yang belum punya isian tetap tampil dengan rata-rata kosong,
          bukan nol. Nilai nol dan belum ada data adalah dua hal berbeda, dan
          yang kosong di sini berarti belum ada yang mengisi.
        </p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">Unit</th>
                <th scope="col" className="text-end">
                  Rata-rata
                </th>
                <th scope="col" className="text-end">
                  Isian
                </th>
              </tr>
            </thead>
            <tbody>
              {survei.length === 0 ? (
                <tr>
                  <td className="admin-empty" colSpan={3}>
                    Data survei per unit tidak bisa dimuat.
                  </td>
                </tr>
              ) : (
                survei.map((s) => (
                  <tr key={s.unit}>
                    <td>{s.unit}</td>
                    {/* Kondisi di `total`, bukan di `average`: nol bisa berarti
                        "belum ada yang mengisi". Lihat catatan di
                        `surveyByUnit`. */}
                    <td className="text-end">{s.total === 0 ? "-" : s.average}</td>
                    <td className="text-end">{s.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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
