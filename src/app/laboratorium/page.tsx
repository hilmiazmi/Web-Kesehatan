import type { Metadata } from "next";
import Link from "next/link";
import {
  alurLab,
  faqLab,
  kategoriLab,
  labInfo,
  persiapanLab,
} from "../../data/laboratorium";
import s from "./laboratorium.module.css";

export const metadata: Metadata = {
  title: "Layanan Laboratorium | RSUD Contoh Sehat - Rumah Sehat Untuk Semua",
  description: labInfo.ringkasan,
  openGraph: {
    title: "Layanan Laboratorium | RSUD Contoh Sehat",
    description: labInfo.ringkasan,
    type: "website",
  },
};

export default function LaboratoriumPage() {
  return (
    <main id="konten">
      <section className={s.hero}>
        <div className="container">
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link href="/">Beranda</Link>
              </li>
              <li className="breadcrumb-item">Pelayanan</li>
              <li className="breadcrumb-item active" aria-current="page">
                Laboratorium
              </li>
            </ol>
          </nav>
          <h1 className={s.title}>{labInfo.judul}</h1>
          <p className="lead mb-4">{labInfo.ringkasan}</p>
          <Link href="/register" className={s.btn}>
            Daftar Online
          </Link>
        </div>
      </section>

      <section className={s.section} aria-labelledby="jam-lab">
        <div className="container">
          <h2 id="jam-lab" className={s.heading}>
            Jam dan Lokasi Layanan
          </h2>
          <div className="row g-3">
            {labInfo.jam.map((j) => (
              <div className="col-md-4" key={j.layanan}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <h3 className="h6 text-muted">{j.layanan}</h3>
                    <p className="fw-bold mb-0">{j.waktu}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 mb-0">
            <i className="bi bi-geo-alt me-2" aria-hidden="true" />
            {labInfo.lokasi} &middot;{" "}
            <i className="bi bi-telephone me-1" aria-hidden="true" />
            {labInfo.kontak}
          </p>
        </div>
      </section>

      <section className={s.sectionAlt} aria-labelledby="jenis-lab">
        <div className="container">
          <h2 id="jenis-lab" className={s.heading}>
            Jenis Pemeriksaan
          </h2>
          <div className="row g-4">
            {kategoriLab.map((k) => (
              <div className="col-md-6 col-lg-4" key={k.id} id={k.id}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <i className={`bi ${k.ikon} ${s.icon}`} aria-hidden="true" />
                    <h3 className="h5 mt-2">{k.nama}</h3>
                    <p className="text-muted">{k.deskripsi}</p>
                    <ul className="mb-0 ps-3">
                      {k.pemeriksaan.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="alur-lab">
        <div className="container">
          <h2 id="alur-lab" className={s.heading}>
            Alur Pelayanan
          </h2>
          <ol className="list-unstyled row g-4 mb-0">
            {alurLab.map((a, i) => (
              <li className="col-md-6 col-lg-3 d-flex gap-3" key={a.judul}>
                <span className={s.step} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="h6 mb-1">{a.judul}</h3>
                  <p className="mb-0 text-muted">{a.isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={s.sectionAlt} aria-labelledby="persiapan-lab">
        <div className="container">
          <h2 id="persiapan-lab" className={s.heading}>
            Persiapan Pasien
          </h2>
          <ul className="mb-0">
            {persiapanLab.map((p) => (
              <li key={p} className="mb-2">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.section} aria-labelledby="faq-lab">
        <div className="container">
          <h2 id="faq-lab" className={s.heading}>
            Pertanyaan Umum
          </h2>
          {faqLab.map((f) => (
            <details className="mb-2 border rounded p-3" key={f.tanya}>
              <summary className="fw-bold">{f.tanya}</summary>
              <p className="mt-2 mb-0">{f.jawab}</p>
            </details>
          ))}
          <p className="small text-muted mt-4 mb-0">
            Situs demo untuk pembelajaran/portofolio. Seluruh data fiktif.
          </p>
        </div>
      </section>
    </main>
  );
}
