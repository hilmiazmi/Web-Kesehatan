import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import KapasitasBedPanel from "@/components/beds/KapasitasBedPanel";

export const metadata: Metadata = {
  title: "Kapasitas Bed",
  description:
    "Ketersediaan tempat tidur RSUD Contoh Sehat per ruang, beserta waktu peninjauan terakhir.",
};

/**
 * Halaman "/kapasitas-bed".
 *
 * Angkanya dibaca dari `GET /api/v1/beds`, tabel `bed_capacity`, yang juga
 * dipakai dasbor admin. Halaman ini sebelumnya dirender oleh halaman umum
 * dari isi statis di `src/data/halaman/utama.ts`, sementara angka di sana
 * sudah tidak sama dengan isi database.
 *
 * Tabelnya sengaja tidak ikut dihitung ulang saat render. Kapasitas bed
 * berubah beberapa kali sehari, jadi membekukannya di build membuat angka
 * yang tampil bisa berjam-jam basi tanpa ada tandanya. Karena itu waktu
 * peninjauan terakhir ikut ditampilkan, dan angkanya dibaca di peramban
 * setiap kali halaman dibuka.
 */
export default function KapasitasBedPage() {
  return (
    <>
      <PageHeader
        title="Kapasitas Bed"
        subtitle="Ketersediaan tempat tidur per ruang dan waktu peninjauan terakhir."
        trail={[{ label: "Kapasitas Bed" }]}
      />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <KapasitasBedPanel />

              <p className="halaman-keterangan mt-4">
                Data ini adalah hasil peninjauan petugas, bukan catatan
                otomatis dari sistem. Kamar yang tercatat tersedia bisa saja
                sudah terisi saat Anda membaca halaman ini, dan permintaan
                masuk tetap perlu dipastikan petugas sebelum Anda datang.
              </p>

              <div className="d-flex gap-2 flex-wrap mt-4">
                <Link href="/rawat-inap" className="btn btn-tertiary">
                  Permintaan Rawat Inap
                </Link>
                <Link href="/rawat-jalan" className="btn btn-tertiary">
                  Rawat Jalan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}