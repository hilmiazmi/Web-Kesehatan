import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { CLINICS } from "@/data/clinics";
import { hrefDaftarOnline } from "@/lib/daftar-online";

export const metadata: Metadata = {
  title: "Rawat Jalan",
  description:
    "Unit rawat jalan: klinik spesialis, jam pelayanan, dan pendaftaran tanpa perlu mencari dokter lebih dulu.",
};

/**
 * Halaman rawat jalan.
 *
 * Alurnya dibalik dari `/daftar-online`. Di formulir pendaftaran, yang pertama
 * dipilih adalah dokter, lalu jam kunjungan. Urutan itu hanya masuk akal
 * kalau orang sudah tahu nama dokter yang dicari. Pengunjung unit rawat jalan
 * biasanya datang dengan kondisi yang ingin ditangani, bukan dengan nama dokter,
 * jadi halaman ini memulai dari klinik: pilih klinik, lihat dokter yang
 * praktik, baru pilih jam.
 *
 * Isinya mengikuti cakupan halaman rawat jalan di situs acuan: klinik
 * spesialis dan unit pelayanan. Nama klinik diambil dari `src/data/clinics.ts`,
 * bukan disalin dari sana.
 */
export default function RawatJalanPage() {
  // Klinik yang punya dokter adalah yang bisa langsung dipesan lewat
  // formulir. Sisanya tetap ditampilkan sebagai informasi layanan.
  const denganDokter = CLINICS.filter((c) => c.details.some((d) => d.specialty));
  const tanpaDokter = CLINICS.filter((c) => !c.details.some((d) => d.specialty));

  return (
    <>
      <PageHeader
        title="Rawat Jalan"
        subtitle="Klinik spesialis dan unit pelayanan untuk pasien yang tidak perlu menginap."
        trail={[{ label: "Pelayanan" }, { label: "Rawat Jalan" }]}
      />

      <section className="section">
        <div className="container">
          <p className="halaman-teks">
            Unit rawat jalan melayani pasien dengan pendekatan pemeliharaan
            kesehatan, peningkatan kesehatan, pencegahan penyakit, penyembuhan
            penyakit, dan pemulihan kesehatan. Unit ini tidak memerlukan
 * inap lebih dulu, sehingga kunjungan bisa diselesaikan dalam satu hari.
            diselesaikan dalam satu hari.
          </p>

          <h2 className="halaman-sub-kecil">Klinik spesialis</h2>
          <p className="halaman-teks">
            Stripe pada setiap klinik adalah spesialisasi yang dilayaninya. Pilih
            klinik untuk melihat dokter dan jam praktiknya.
          </p>

          <div className="halaman-kartu-grid">
            {denganDokter.map((c) => (
              <div key={c.slug} className="halaman-kartu">
                <span className="halaman-kartu-judul">{c.name}</span>
                <span className="halaman-kartu-isi">{c.description}</span>
                <span className="halaman-kartu-jam">{c.hours}</span>
              </div>
            ))}
          </div>

          {tanpaDokter.length > 0 ? (
            <>
              <h2 className="halaman-sub-kecil">Klinik tambahan</h2>
              <div className="halaman-kartu-grid">
                {tanpaDokter.map((c) => (
                  <div key={c.slug} className="halaman-kartu">
                    <span className="halaman-kartu-judul">{c.name}</span>
                    <span className="halaman-kartu-isi">{c.description}</span>
                    <span className="halaman-kartu-jam">{c.hours}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <h2 className="halaman-sub-kecil">Unit pelayanan</h2>
          <p className="halaman-teks">
            Unit ini bekerja sebagai pelayan rujukan dan pemeriksaan khusus.
            Visits unit memerlukan rujukan dari dokter atau klinik lain.
          </p>
          <div className="halaman-kartu-grid">
            {UNIT_PELAYANAN.map((u) => (
              <Link
                key={u.nama}
                href={hrefDaftarOnline(u.jalur)}
                className="halaman-kartu halaman-kartu-ringkas"
              >
                <span className="halaman-kartu-judul">{u.nama}</span>
                <i className="bi bi-arrow-right halaman-kartu-panah" aria-hidden="true" />
              </Link>
            ))}
          </div>

          <h2 className="halaman-sub-kecil">Jam pelayanan</h2>
          <ul className="halaman-daftar halaman-daftar-ikon">
            <li>
              <i className="bi bi-clock" aria-hidden="true" />
              Poliklinik dan unit pelayanan: Senin sampai Jumat, pukul 07.30
              sampai 14.00.
            </li>
            <li>
              <i className="bi bi-calendar-week" aria-hidden="true" />
              Libur nasional dan hari yang ditetapkan pemerintah tetap
              merupakan hari libur.
            </li>
            <li>
              <i className="bi bi-info-circle" aria-hidden="true" />
              Instalasi gawat darurat tetap buka 24 jam dan tidak mengikuti jam
              di atas.
            </li>
          </ul>

          <div className="d-flex gap-2 flex-wrap mt-4">
            <Link
              href={hrefDaftarOnline("/pelayanan/medis/rawat-jalan")}
              className="btn btn-primary"
            >
              Daftar Rawat Jalan
            </Link>
            <Link href="/jadwal-dokter" className="btn btn-tertiary">
              Lihat Jadwal Dokter
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Unit pelayanan di bawah rawat jalan, mengikuti cakupan halaman acuan. */
const UNIT_PELAYANAN = [
  { nama: "Medical Check Up (MCU)", jalur: "/pelayanan/mcu" },
  { nama: "Unit Pelayanan Hemodialisa", jalur: "/pelayanan/prioritas/uro-nefrologi" },
  { nama: "Unit Pelayanan Katerisasi Jantung", jalur: "/pelayanan/prioritas/jantung-terpadu" },
  { nama: "Unit Pelayanan Diagnostic Center", jalur: "/pelayanan/medis/diagnostic-center" },
  { nama: "Radioterapi", jalur: "/pelayanan/prioritas/kanker-terpadu" },
  { nama: "Poliklinik Anak", jalur: "/pelayanan/poliklinik/anak" },
  { nama: "Poliklinik Kandungan", jalur: "/pelayanan/poliklinik/kebidanan-dan-kandungan" },
  { nama: "Poliklinik Mata", jalur: "/pelayanan/poliklinik/mata" },
];
