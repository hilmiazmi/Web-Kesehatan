"use client";

import { useState } from "react";
import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { FACILITIES } from "@/data/home";
import { FACILITY_PHOTOS, photo } from "@/data/images";

/**
 * Section 4 — "Fasilitas & Layanan".
 *
 * Di situs referensi pola ini tab vertikal di kolom kiri (col-lg-3) dan konten
 * berganti di kanan (col-lg-9, lebar 8+4). Struktur dan pembagian kolomnya
 * ditiru persis; hanya fotonya yang diganti aset stok.
 */
export default function FacilityTabs() {
  const [active, setActive] = useState(0);
  const current = FACILITIES[active];

  return (
    <section id="fasilitas" className="departments section light-background">
      <div className="container section-title pb-4">
        <h2>Fasilitas &amp; Layanan</h2>
        <p>
          &quot;Pelayanan kesehatan secara terpadu dengan dukungan tenaga medis
          profesional, sarana prasarana lengkap, serta sistem informasi digital
          yang terintegrasi teknologi medis terkini&quot;
        </p>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-lg-3">
            {/* Tombol, bukan <a>, karena yang diklik hanya mengganti panel. */}
            <ul className="nav nav-tabs flex-column facility-tabs" role="tablist">
              {FACILITIES.map((f, i) => (
                <li className="nav-item" key={f.slug} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-controls={`panel-${f.slug}`}
                    id={`tab-${f.slug}`}
                    className={`nav-link text-start ${i === active ? "active show" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    {f.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-lg-9 mt-4 mt-lg-0">
            <div
              className="tab-pane active show"
              role="tabpanel"
              id={`panel-${current.slug}`}
              aria-labelledby={`tab-${current.slug}`}
            >
              <div className="row align-items-center">
                <div className="col-lg-8 details order-2 order-lg-1">
                  <h3>{current.title}</h3>
                  <p>{current.description}</p>
                  <Link
                    href={`/pelayanan/medis/${current.slug}`}
                    className="link-more"
                  >
                    Selengkapnya
                  </Link>
                </div>
                <div className="col-lg-4 text-center order-1 order-lg-2">
                    <Photo
                      src={photo(
                        FACILITY_PHOTOS[active % FACILITY_PHOTOS.length],
                        600,
                        460
                      )}
                      alt={current.title}
                      sizes="(max-width: 992px) 100vw, 340px"
                      height={230}
                      radius="all"
                    />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}