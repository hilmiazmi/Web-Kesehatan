import type { Metadata } from "next";
import Link from "next/link";
import {
  alatRadiologi,
  fasilitasRadiologi,
  radInfo,
} from "../../data/radiologi";
import s from "./radiologi.module.css";

export const metadata: Metadata = {
  title: "Layanan Radiologi | RSUD Contoh Sehat - Rumah Sehat Untuk Semua",
  description: radInfo.pengantar[0],
  openGraph: {
    title: "Layanan Radiologi | RSUD Contoh Sehat",
    description: radInfo.pengantar[0],
    type: "website",
  },
};

export default function RadiologiPage() {
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
                Radiologi
              </li>
            </ol>
          </nav>
          <h1 className={s.title}>{radInfo.judul}</h1>
          <p className="lead mb-4">{radInfo.pengantar[0]}</p>
          <Link href="/register" className={s.btn}>
            Daftar Online
          </Link>
        </div>
      </section>

      <section className={s.section} aria-labelledby="tentang-rad">
        <div className="container">
          <h2 id="tentang-rad" className={s.heading}>
            Fasilitas Pemeriksaan
          </h2>
          <p>{radInfo.pengantar[1]}</p>
          <p>{radInfo.fasilitasJudul}</p>
          <ul className={s.check}>
            {fasilitasRadiologi.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.sectionAlt} aria-labelledby="alat-rad">
        <div className="container">
          <h2 id="alat-rad" className={s.heading}>
            Peralatan dan Fungsi Tindakan
          </h2>
          <div className="row g-4">
            {alatRadiologi.map((a) => (
              <div className="col-md-6 col-lg-4" key={a.id} id={a.id}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <i className={`bi ${a.ikon} ${s.icon}`} aria-hidden="true" />
                    <h3 className="h5 mt-2">{a.nama}</h3>
                    <p className="text-muted small mb-2">Fungsi tindakan:</p>
                    <ul className={s.check}>
                      {a.fungsi.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="small text-muted mt-4 mb-0">
            Situs demo untuk pembelajaran/portofolio. Seluruh data fiktif.
          </p>
        </div>
      </section>
    </main>
  );
}
