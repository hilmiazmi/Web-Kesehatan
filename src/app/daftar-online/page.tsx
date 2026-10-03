import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import RegistrationForm from "@/components/forms/registration-form";

export const metadata: Metadata = {
  title: "Daftar Online",
  description:
    "Formulir pendaftaran pasien secara online untuk rawat jalan maupun medical check up.",
};

/** Halaman formulir pendaftaran online. */
export default function DaftarOnlinePage() {
  return (
    <>
      <PageHeader
        title="Pendaftaran Online"
        subtitle="Isi formulir berikut untuk mengirim permintaan pendaftaran."
        trail={[{ label: "Daftar Online" }]}
      />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <div className="card">
                <div className="card-content">
                  <RegistrationForm />
                </div>
              </div>

              <p className="form-footnote">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Validasi formulir berjalan di sisi peramban, dan
                penyimpanannya ke server belum dikirim. Endpoint-nya sudah
                ada (<code>POST /api/v1/appointments</code>), tetapi
                bentuknya berbeda: endpoint itu menuntut pilihan dokter dan
                jam, sedangkan formulir ini baru menanyakan tanggal.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
