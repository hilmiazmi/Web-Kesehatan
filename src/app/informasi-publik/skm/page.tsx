import type { Metadata } from "next";
import PageBlocks from "@/components/halaman/PageBlocks";
import PageHeader from "@/components/layout/PageHeader";
import SurveyForm from "@/components/forms/survey-form";
import { HALAMAN } from "@/data/halaman";
import { resolveTrail } from "@/lib/nav-path";

export const metadata: Metadata = {
  title: "Survey Kepuasan Masyarakat",
  description:
    "Nilai pelayanan yang baru saja diterima di RSUD Contoh Sehat, dengan lima pertanyaan dan skala satu sampai lima.",
};

/**
 * Halaman survei kepuasan masyarakat.
 *
 * Isi teksnya tetap dari `HALAMAN["informasi-publik/skm"]` supaya blok
 * generiknya tidak punya salinan kedua. Yang ditambahkan hanya formulirnya,
 * karena `POST /api/v1/survey-responses` sudah ada dan sudah punya tempat di
 * panel admin, tapi tidak ada satu pun jawaban yang bisa masuk sebelum halaman
 * ini punya formulir.
 */
export default function SkmPage() {
  const isi = HALAMAN["informasi-publik/skm"];
  const navTrail = resolveTrail("/informasi-publik/skm");
  const label = navTrail?.at(-1)?.label ?? "Survey Kepuasan Masyarakat";
  const trail =
    navTrail?.map((t, i) => ({
      label: t.label,
      ...(i === navTrail.length - 1 ? {} : { href: t.href }),
    })) ?? [{ label }];

  return (
    <>
      <PageHeader title={label} trail={trail} />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <p className="detail-lead">{isi.ringkas}</p>
              <PageBlocks blok={isi.blok} pathname="/informasi-publik/skm" />

              <h2 className="detail-heading mt-5">Isi Survei</h2>
              <p className="detail-lead">
                Lima pertanyaan, skala 1 sampai 5. Nilai minimal satu
                pertanyaan sudah cukup untuk tercatat.
              </p>

              <div className="card mt-3">
                <div className="card-content">
                  <SurveyForm />
                </div>
              </div>

              <p className="form-footnote">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Formulir ini mengirim data ke{" "}
                <code>POST /api/v1/survey-responses</code>. Skor keseluruhan
                dihitung ulang dari jawaban yang Anda kirim, bukan diambil dari
                angka yang dikirim peramban, supaya rata-rata di panel selalu
                sama dengan isian yang Anda lihat.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}