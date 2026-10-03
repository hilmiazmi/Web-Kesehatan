"use client";

import { useState } from "react";
import Photo from "@/components/ui/Photo";
import { ClinicCardGrid } from "@/components/pelayanan/ClinicCardGrid";
import { CLINICS } from "@/data/clinics";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/**
 * Direktori klinik untuk halaman /pelayanan/poliklinik.
 *
 * Polanya ditiru dari halaman /poliklinik di situs referensi: daftar klinik
 * berupa tab vertikal di kolom kiri, isi klinik terpilih di kolom kanan.
 *
 * Ukuran tombol, warna, dan radius diukur dari sana lewat getComputedStyle():
 *   tombol 229 x 38px, latar #f2f7fc, teks #444, radius 5px, font 12px,
 *   margin 6px 3px, dan yang aktif latar #1977cc dengan teks putih.
 *
 * Kolom membagi 3 dan 9, sama seperti halaman acuan.
 *
 * Tab memakai <button>, bukan <a>, karena yang diklik hanya mengganti panel
 * dan tidak berpindah halaman.
 */
export default function ClinicDirectory() {
  const [aktif, setAktif] = useState(0);
  const klinik = CLINICS[aktif];

  return (
    <div className="row g-4">
      <div className="col-md-3">
        <ul className="klinik-tab-list" role="tablist" aria-orientation="vertical">
          {CLINICS.map((k, i) => (
            <li key={k.slug} role="presentation">
              <button
                type="button"
                role="tab"
                id={`klinik-tab-${k.slug}`}
                aria-selected={i === aktif}
                aria-controls={`klinik-panel-${k.slug}`}
                className={`klinik-tab${i === aktif ? " aktif" : ""}`}
                onClick={() => setAktif(i)}
              >
                {k.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-md-9">
        <div
          className="klinik-panel"
          role="tabpanel"
          id={`klinik-panel-${klinik.slug}`}
          aria-labelledby={`klinik-tab-${klinik.slug}`}
          tabIndex={0}
        >
          <div className="row g-4 align-items-start">
            <div className="col-sm-5">
              <Photo
                src={photo(GALLERY_PHOTOS[aktif % GALLERY_PHOTOS.length], 400, 400)}
                alt={klinik.name}
                sizes="(max-width: 576px) 100vw, 240px"
                height={180}
                radius="all"
              />
            </div>

            <div className="col-sm-7">
              <h2 className="klinik-panel-title">{klinik.name}</h2>
              <p className="klinik-panel-desc">{klinik.description}</p>

              <h3 className="klinik-panel-sub">Layanan</h3>
              <ul className="detail-list">
                {klinik.services.map((s) => (
                  <li key={s}>
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>

              <p className="klinik-panel-hours">
                <i className="bi bi-clock" aria-hidden="true" />
                {klinik.hours}
              </p>
            </div>
          </div>

          <ClinicCardGrid clinicSlug={klinik.slug} />
        </div>
      </div>
    </div>
  );
}