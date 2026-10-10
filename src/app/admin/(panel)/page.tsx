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
  // kegagalannya ditoleransi sendiri. Angka utama sudah ada di atas; tabel ini
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
        <Statistik
          judul="Belum ditangani"
          nilai={stats.inbox_unread}
          ikon="bi-inbox"
          varian="merah"
        />
        <Statistik
          judul="Pendaftaran hari ini"
          nilai={stats.appointments_today}
          ikon="bi-calendar-check"
          varian="biru"
        />
        <Statistik
          judul="Pendaftaran akan datang"
          nilai={stats.appointments_upcoming}
          ikon="bi-calendar-event"
          varian="biru"
        />
        <Statistik
          judul="Tempat tidur tersedia"
          nilai={stats.beds_available}
          dari={stats.beds_total}
          ikon="bi-hospital"
          varian="hijau"
        />
      </dl>

      <h2 className="fs-5 mb-3">Isi situs</h2>
      <dl className="row g-3 mb-4">
        <Statistik
          judul="Berita terbit"
          nilai={stats.articles}
          ikon="bi-newspaper"
          varian="hijau"
        />
        <Statistik
          judul="Layanan aktif"
          nilai={stats.services}
          ikon="bi-heart-pulse"
          varian="hijau"
        />
        <Statistik
          judul="Paket MCU aktif"
          nilai={stats.mcu_packages}
          ikon="bi-clipboard-check"
          varian="hijau"
        />
        <Statistik
          judul="Dokter aktif"
          nilai={stats.doctors}
          ikon="bi-person-badge"
          varian="hijau"
        />
        <Statistik
          judul="Jadwal aktif"
          nilai={stats.schedules}
          ikon="bi-clock"
          varian="hijau"
        />
        <Statistik
          judul="Halaman terbit"
          nilai={stats.pages}
          ikon="bi-file-text"
          varian="hijau"
        />
        <Statistik
          judul="Slide hero aktif"
          nilai={stats.hero_slides}
          ikon="bi-images"
          varian="hijau"
        />
      </dl>

      <h2 className="fs-5 mb-3">Survei kepuasan</h2>
      <dl className="row g-3 mb-4">
        <Statistik
          judul="Rata-rata"
          nilai={stats.survey_average ?? "-"}
          ikon="bi-star"
          varian="kuning"
        />
        <Statistik
          judul="Jumlah isian"
          nilai={stats.survey_responses}
          ikon="bi-chat-square-text"
          varian="kuning"
        />
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

/** Satu kartu angka, dengan ikon tile dan tint sesuai kelompoknya. */
function Statistik({
  judul,
  nilai,
  dari,
  ikon,
  varian,
}: {
  judul: string;
  nilai: number | string;
  dari?: number;
  /** Kelas ikon bootstrap, misalnya `bi-inbox`. Selalu `bi-*` yang ada. */
  ikon: string;
  /** Kelompok warna: biru antrean, hijau isi sehat, kuning survei, merah aksi. */
  varian: "biru" | "hijau" | "kuning" | "merah";
}) {
  // Bilah kemajuan hanya kalau penyebutnya jujur. Satu-satunya kartu yang
  // punya penyebut adalah bed (tersedia dari total); kartu lain tidak boleh
  // mengarang penyebut supaya ada barnya.
  const persen =
    dari !== undefined && dari > 0 && typeof nilai === "number"
      ? Math.round((nilai / dari) * 100)
      : null;
  // Nama kelas ditulis utuh, bukan dirangkai dengan template literal.
  // Pemindai `tests/bootstrap-subset.test.ts` hanya membaca teks literal,
  // jadi `admin-stat-${varian}` terbaca sebagai token yatim `admin-stat-`
  // dan tesnya gagal tanpa ada yang salah di peramban.
  const tint: Record<typeof varian, string> = {
    biru: "admin-stat-biru",
    hijau: "admin-stat-hijau",
    kuning: "admin-stat-kuning",
    merah: "admin-stat-merah",
  };
  return (
    <div className="col-md-6 col-lg-3">
      <div className={`admin-stat ${tint[varian]}`}>
        <span className="admin-stat-ikon" aria-hidden="true">
          <i className={`bi ${ikon}`} />
        </span>
        <div className="admin-stat-isi">
          <dt>{judul}</dt>
          <dd>
            {nilai}
            {dari !== undefined ? (
              <span className="fs-6 text-body-secondary"> / {dari}</span>
            ) : null}
          </dd>
          {persen !== null ? (
            <div
              className="admin-progress"
              role="progressbar"
              aria-valuenow={persen}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${judul}: ${persen} persen`}
            >
              <span style={{ width: `${persen}%` }} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
