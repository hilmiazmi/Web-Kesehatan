import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import AdmissionForm from "@/components/forms/admission-form";
import KapasitasBedPanel from "@/components/beds/KapasitasBedPanel";

export const metadata: Metadata = {
  title: "Rawat Inap",
  description:
    "Permintaan ruang inap di RSUD Contoh Sehat beserta perkiraan biaya tiap kelas perawatan.",
};

/**
 * Halaman rawat inap.
 *
 * Sengaja terpisah dari halaman rawat jalan. Pendaftaran inap tidak memilih
 * dokter dan jam: yang dipilih adalah kelas perawatan, tanggal masuk, dan
 * perkiraan lama inap. Memakai formulir rawat jalan akan memaksa separuh
 * formulir berisi field yang tidak pernah dipakai, dan kalender yang hanya
 * membuka hari praktik dokter tidak ada artinya di sini: dokter penanggung
 * jawab baru ditentukan setelah pasien diterima.
 */
export default function RawatInapPage() {
  return (
    <>
      <PageHeader
        title="Rawat Inap"
        subtitle="Permintaan ruang inap beserta perkiraan biaya tiap kelas perawatan."
        trail={[{ label: "Rawat Inap" }]}
      />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <div className="card">
                <div className="card-content">
                  <AdmissionForm />
                </div>
              </div>

              <p className="form-footnote">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Formulir ini mengirim permintaan ke{" "}
                <code>POST /api/v1/admissions</code>. Permintaan yang terkirim
                belum tentu berarti kamar tersedia; petugas menghubungi Anda
                untuk memastikan waktu masuk dan kelas yang sesuai. NIK
                divalidasi bentuknya tetapi tidak ikut tersimpan.
              </p>

              <h2 className="halaman-sub-kecil mt-4">Ketersediaan saat ini</h2>
              <KapasitasBedPanel lengkap={false} />

              <div className="d-flex gap-2 flex-wrap mt-4">
                <Link href="/daftar-online" className="btn btn-tertiary">
                  Pendaftaran Rawat Jalan
                </Link>
                <Link href="/kapasitas-bed" className="btn btn-tertiary">
                  Kapasitas Bed
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
