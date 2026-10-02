import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { PRIORITY_SERVICES } from "@/data/home";
import { PRIORITY_PHOTOS, photo } from "@/data/images";

/**
 * Section 3 — "Layanan Unggulan & Prioritas".
 *
 * 6 kartu, jumlah dan urutan sesuai situs referensi yang sudah diverifikasi.
 * Foto memakai aset stok Unsplash, bukan foto asli situs referensi.
 */
export default function PriorityServices() {
  return (
    <section id="layanan" className="layanan section pb-3">
      <div className="container section-title pb-4">
        <h2>Layanan Unggulan &amp; Prioritas</h2>
        <p>&quot;Layanan Terbaik Untuk Kesehatan Anda&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-4 gx-4">
          {PRIORITY_SERVICES.map((s, i) => (
            <div className="col-md-6 col-lg-4" key={s.slug}>
              <div className="card card-layanan">
                <div className="image-content">
                    <Photo
                      src={photo(PRIORITY_PHOTOS[i % PRIORITY_PHOTOS.length], 600, 400)}
                      alt={s.title}
                      sizes="(max-width: 768px) 100vw, 360px"
                      height={190}
                      radius="top"
                    />
                </div>

                <div className="card-content">
                  <h3 className="card-title">{s.title}</h3>
                  <p className="card-description">{s.description}</p>
                  <Link
                    href={`/pelayanan/prioritas/${s.slug}`}
                    className="btn btn-primary"
                  >
                    Detail
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}