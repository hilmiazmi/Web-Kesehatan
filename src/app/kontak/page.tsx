import type { Metadata } from "next";
import PageBlocks from "@/components/halaman/PageBlocks";
import PageHeader from "@/components/layout/PageHeader";
import FeedbackForm from "@/components/forms/feedback-form";
import { HALAMAN } from "@/data/halaman";
import { CONTACT } from "@/data/navigation";
import { resolveTrail } from "@/lib/nav-path";

export const metadata: Metadata = {
  title: "Kontak",
  description:
    "Alamat, kanal kontak, dan formulir kritik dan saran untuk RSUD Contoh Sehat.",
};

/**
 * Halaman kontak.
 *
 * Isi teksnya tetap datang dari `HALAMAN["kontak"]`, jadi halaman ini tidak
 * menyalin isi blok generik ke tempat lain. Yang ditambahkan hanya
 * formulirnya, karena `POST /api/v1/feedbacks` sudah ada dan kotak inbox
 * admin sudah menunggu isinya.
 *
 * Halaman ini butuh route sendiri: blok generik dirender `[...slug]`, dan
 * sisipan formulir tidak bisa datang dari data karena isinya interaktif.
 */
export default function KontakPage() {
  const isi = HALAMAN["kontak"];
  const navTrail = resolveTrail("/kontak");
  const label = navTrail?.at(-1)?.label ?? "Kontak";
  const trail =
    navTrail?.map((t, i) => ({ label: t.label, ...(i === navTrail.length - 1 ? {} : { href: t.href }) })) ?? [
      { label },
    ];

  return (
    <>
      <PageHeader title={label} trail={trail} />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <p className="detail-lead">{isi.ringkas}</p>
              <PageBlocks blok={isi.blok} pathname="/kontak" />

              <h2 className="detail-heading mt-5">Kritik dan Saran</h2>
              <p className="detail-lead">
                Saran, keluhan, dan apresiasi bisa dikirim lewat formulir di
                bawah. Isi nama, surel, dan telepon boleh dikosongkan; kode
                tiket yang muncul setelah dikirim dipakai untuk mengecek
                perkembangannya. Untuk hal yang mendesak,
                hubungi{" "}
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a> atau datang ke
                loket informasi.
              </p>

              <div className="card mt-3">
                <div className="card-content">
                  <FeedbackForm />
                </div>
              </div>

              <p className="form-footnote">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Formulir ini mengirim data ke <code>POST /api/v1/feedbacks</code>.
                Data yang terisi hanya nama, surel, telepon, unit layanan, dan
                isi pesan; tidak ada data kunjungan pasien yang diminta.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}