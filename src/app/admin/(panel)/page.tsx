import type { Metadata } from "next";
import Link from "next/link";
import Sparkline from "@/components/admin/Sparkline";
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
/**
 * Baris tabel "Isi situs".
 *
 * Susunan dan ikonnya ditulis di sini, bukan dirangkai dari data, supaya tiap
 * baris benar-benar punya tautan ke halaman yang mengelolanya. Deretan kartu
 * angka tidak bisa mengatakan ke mana harus pergi setelah melihat angkanya,
 * dan itulah yang membuatnya terasa seperti tempelan.
 */
const BARIS_ISI = (s: Stats) => [
  { label: "Berita terbit", nilai: s.articles, ikon: "bi-newspaper", href: "/admin/records/articles", tempat: "Berita" },
  { label: "Layanan aktif", nilai: s.services, ikon: "bi-heart-pulse", href: "/admin/records/services", tempat: "Layanan" },
  { label: "Paket MCU aktif", nilai: s.mcu_packages, ikon: "bi-clipboard-check", href: "/admin/records/mcu_packages", tempat: "Paket MCU" },
  { label: "Dokter aktif", nilai: s.doctors, ikon: "bi-person-badge", href: "/admin/records/doctors", tempat: "Dokter" },
  { label: "Jadwal aktif", nilai: s.schedules, ikon: "bi-clock", href: "/admin/records/doctor_schedules", tempat: "Jadwal praktik" },
  { label: "Halaman terbit", nilai: s.pages, ikon: "bi-file-text", href: "/admin/records/pages", tempat: "Halaman" },
  { label: "Slide hero aktif", nilai: s.hero_slides, ikon: "bi-images", href: "/admin/records/hero_slides", tempat: "Slide hero" },
];

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
          judul="Akan datang"
          nilai={stats.appointments_upcoming}
          ikon="bi-calendar-event"
          varian="biru"
        />
        <Statistik
          judul="Bed tersedia"
          nilai={stats.beds_available}
          dari={stats.beds_total}
          ikon="bi-hospital"
          varian="hijau"
        />
      </dl>

      {/* Signature dasbor: arah empat belas hari dalam satu garis.
          Angka total hari ini tidak bisa membedakan "lagi sepi" dari "lagi
          ramai"; garisnya bisa. Sumbernya data harian yang sudah diambil
          halaman ini, jadi tidak ada query tambahan hanya untuk hiasan.
          Tabel keempat belas hari tetap ada di bawah untuk yang memang ingin
          memeriksa satu tanggal; kartu ini ringkasan, bukan pengganti. */}
      <section className="mb-4 admin-spark-kartu">
        <div>
          <h2 className="fs-6 mb-1">Pendaftaran empat belas hari</h2>
          <p className="halaman-keterangan mb-2">
            Arah pendaftaran terakhir, bukan jumlah hari ini. Total hari ini{" "}
            <strong className="admin-angka">{stats.appointments_today}</strong>.
          </p>
        </div>
        <Sparkline data={harian} label="Pendaftaran empat belas hari" />
      </section>

      <h2 className="fs-5 mb-3">Survei kepuasan</h2>
      <dl className="row g-3 mb-4">
        <Statistik judul="Rata-rata" nilai={stats.survey_average ?? "-"} ikon="bi-star" varian="kuning" />
        <Statistik judul="Jumlah isian" nilai={stats.survey_responses} ikon="bi-chat-square-text" varian="kuning" />
      </dl>

      {/* Isi situs bukan deretan kartu. Tujuh angka yang sumbernya berbeda
          (berita, layanan, paket, dokter, jadwal, halaman, slide) tidak perlu
          layak dipantau mendesak; yang dibutuhkan adalah bisa dihitung dan
          ditelusuri. Tabel itu yang menyebutkan angkanya dan tempat
          mengubahnya, dan deretan kartu berwarna sama hanya membuat keduanya
          sama-sama tidak bisa dibaca. */}
      <section className="mb-4">
        <h2 className="fs-5 mb-2">Isi situs</h2>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">Jenis isi</th>
                <th scope="col" className="text-end">
                  Jumlah
                </th>
                <th scope="col">Kelola di</th>
              </tr>
            </thead>
            <tbody>
              {BARIS_ISI(stats).map((b) => (
                <tr key={b.label}>
                  <td>
                    <i className={`bi ${b.ikon} admin-bar-ikon`} aria-hidden="true" />
                    {b.label}
                  </td>
                  <td className="admin-angka">{b.nilai}</td>
                  <td>
                    <Link className="admin-tautan" href={b.href}>
                      {b.tempat}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                    <td className="admin-angka text-end">{h.total}</td>
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
                    <td className="admin-angka text-end">{s.total === 0 ? "-" : s.average}</td>
                    <td className="admin-angka text-end">{s.total}</td>
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
