import type { Metadata } from "next";
import Link from "next/link";
import { jenisPemeriksaanLab, labInfo, layananLab } from "../../data/laboratorium";
import s from "./laboratorium.module.css";

export const metadata: Metadata = {
  title: "Layanan Laboratorium | RSUD Contoh Sehat - Rumah Sehat Untuk Semua",
  description: labInfo.pengantar,
  openGraph: {
    title: "Layanan Laboratorium | RSUD Contoh Sehat",
    description: labInfo.pengantar,
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
          <p className="lead mb-4">{labInfo.pengantar}</p>
          <Link href="/register" className={s.btn}>
            Daftar Online
          </Link>
        </div>
      </section>

      <section className={s.section} aria-labelledby="jenis-lab">
        <div className="container">
          <h2 id="jenis-lab" className={s.heading}>
            Jenis Pemeriksaan Laboratorium
          </h2>
          <p>
            Instalasi Laboratorium RSUD Contoh Sehat melakukan berbagai jenis
            pemeriksaan laboratorium seperti:
          </p>
          <ul className={s.check}>
            {jenisPemeriksaanLab.map((j) => (
              <li key={j}>{j}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.sectionAlt} aria-labelledby="keunggulan-lab">
        <div className="container">
          <h2 id="keunggulan-lab" className={s.heading}>
            Keunggulan Laboratorium
          </h2>
          <p className="mb-0">{labInfo.keunggulan}</p>
        </div>
      </section>

      <section className={s.section} aria-labelledby="layanan-lab">
        <div className="container">
          <h2 id="layanan-lab" className={s.heading}>
            Jenis Layanan Laboratorium
          </h2>
          <div className="row g-4">
            {layananLab.map((l) => (
              <div className="col-md-6" key={l.id} id={l.id}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <i className={`bi ${l.ikon} ${s.icon}`} aria-hidden="true" />
                    <h3 className="h5 mt-2">{l.nama}</h3>
                    <p className="mb-0">{l.deskripsi}</p>
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
