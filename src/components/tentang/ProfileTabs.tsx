"use client";

import { useState } from "react";
import Photo from "@/components/ui/Photo";
import { ABOUT_SECTIONS } from "@/data/informasi";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/**
 * Tab profil rumah sakit.
 *
 * Halaman acuan `/about` di situs referensi tidak menumpuk lima seksi secara
 * berurutan. Isinya menjadi lima tab dengan daftar vertikal di kolom kiri
 * (col-lg-3) dan panel di kanan (col-lg-9). Susunan itu diukur lewat
 * getComputedStyle dan ditiru di sini, termasuk ukuran judul panel 40px dengan
 * weight 500 dan line-height 48px.
 *
 * Bedanya satu: halaman acuan memakai h1 untuk kelima judul itu, padahal
 * halaman ini sudah punya satu h1 di PageHeader. Lima h1 tambahan itu salah
 * untuk pembaca layar, jadi di sini tetap h2.
 *
 * Pole `setState` dipakai langsung di event handler, tidak pernah di
 * `useEffect`, sesuai aturan eslint `react-hooks/set-state-in-effect`.
 */

/** Seksi yang memakai foto. Tiga seksi lain cukup teks. */
const SEKSI_FOTO = new Set(["budaya-kerja", "sejarah", "maklumat-pelayanan"]);

export default function ProfileTabs() {
  const [active, setActive] = useState(0);
  const current = ABOUT_SECTIONS[active];

  return (
    <section className="inner-page">
      <div className="container">
        <div className="row">
          <div className="col-lg-3">
            <ul className="nav nav-tabs flex-column profil-tabs" role="tablist">
              {ABOUT_SECTIONS.map((section, i) => (
                <li className="nav-item" key={section.slug} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-controls={`profil-panel-${section.slug}`}
                    id={`profil-tab-${section.slug}`}
                    className={`nav-link text-start ${i === active ? "active show" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-lg-9 mt-4 mt-lg-0">
            <div
              className="tab-pane active show"
              role="tabpanel"
              id={`profil-panel-${current.slug}`}
              aria-labelledby={`profil-tab-${current.slug}`}
            >
              <div className="detail-title">
                <h2>{current.title}</h2>
              </div>
              <p className="detail-lead">{current.lead}</p>
              <ul className="detail-list">
                {current.points.map((p) => (
                  <li key={p}>
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>

              {SEKSI_FOTO.has(current.slug) ? (
                <div className="row g-3 mt-2">
                  {GALLERY_PHOTOS.slice(0, 4).map((id) => (
                    <div className="col-6 col-md-3" key={id}>
                      <Photo
                        src={photo(id, 600, 400)}
                        alt={`Dokumentasi ${current.title} di RSUD Contoh Sehat`}
                        sizes="(max-width: 768px) 50vw, 200px"
                        height={140}
                        radius="all"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
