import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import CariDokter from "@/components/jadwal/CariDokter";
import JadwalTabel from "@/components/jadwal/JadwalTabel";
import { DOCTORS } from "@/data/doctors";

export const metadata: Metadata = {
  title: "Jadwal Dokter",
  description:
    "Cari jadwal praktik dokter RSUD Contoh Sehat berdasarkan spesialisasi, nama dokter, dan hari.",
};

/**
 * Halaman jadwal dokter.
 *
 * Halaman acuan `/jadwal-dokter` di situs referensi memuat kartu "Cari Dokter"
 * dengan tiga pilihan berurutan, lalu tabel yang dimuat lewat permintaan
 * jaringan setelah dokter dipilih. Bagian kartunya ditiru di sini; bagian
 * tabelnya sengaja dibuat berbeda, yaitu seluruh jadwal langsung dirender di
 * server. Alasannya ada di `src/components/jadwal/JadwalTabel.tsx`.
 *
 * Data dokter dibaca dari `src/data/doctors.ts`, satu-satunya sumber nama
 * dokter di repo. Tidak ada nama yang ditulis ulang di halaman ini.
 */
export default function JadwalDokterPage() {
  const doctors = DOCTORS.map(({ slug, name, specialty, schedule }) => ({
    slug,
    name,
    specialty,
    schedule,
  }));

  return (
    <>
      <PageHeader
        title="Jadwal Dokter"
        subtitle="Pilih spesialisasi, nama dokter, dan hari untuk melihat jam praktiknya."
        trail={[{ label: "Jadwal Dokter" }]}
      />

      <section className="section">
        <div className="container">
          <CariDokter doctors={doctors} />

          <h2 className="jadwal-subjudul">Seluruh Jadwal</h2>
          <JadwalTabel doctors={doctors} />

          <div className="d-flex gap-2 flex-wrap mt-4">
            <Link href="/daftar-online" className="btn btn-primary">
              Daftar Online
            </Link>
            <Link href="/pelayanan/poliklinik" className="btn btn-tertiary">
              Lihat Poliklinik
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}