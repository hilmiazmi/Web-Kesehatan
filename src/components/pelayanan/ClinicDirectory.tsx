"use client";

import { useRef, useState } from "react";
import Photo from "@/components/ui/Photo";
import {
  ClinicCardGrid,
  type ClinicCard,
} from "@/components/pelayanan/ClinicCardGrid";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/** Satu tab klinik, beserta isi panel yang tampil ketika tabnya dipilih. */
export type ClinicTab = {
  slug: string;
  name: string;
  description: string;
  services: string[];
  hours: string;
};

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
 *
 * Hanya panel aktif yang dirender. Karena itu `aria-controls` hanya dipasang
 * pada tab yang sedang terpilih; kalau dipasang juga pada tab lain, id yang
 * ditunjuknya tidak ada di DOM dan pembaca layar akan diam.
 *
 * Data dikirim dari halaman server sebagai props, bukan diimpor dari
 * `@/data/clinics`. Modul itu memuat isi penuh 25 halaman detail klinik —
 * deskripsi, daftar layanan, jam praktik — yang tidak pernah dirender di sini.
 * Mengimpornya akan mengirim semuanya ke browser tanpa ada yang memakainya.
 */
export default function ClinicDirectory({
  clinics,
  details,
}: {
  clinics: ClinicTab[];
  details: ClinicCard[];
}) {
  const [aktif, setAktif] = useState(0);
  const daftarTab = useRef<(HTMLButtonElement | null)[]>([]);
  const klinik = clinics[aktif];

  /** Panah atas dan bawah memindahkan tab, sesuai pola tablist vertikal. */
  const geser = (arah: 1 | -1) => {
    const berikut = (aktif + arah + clinics.length) % clinics.length;
    setAktif(berikut);
    daftarTab.current[berikut]?.focus();
  };

  return (
    <div className="row g-4">
      <div className="col-md-3">
        <ul className="klinik-tab-list" role="tablist" aria-orientation="vertical">
          {clinics.map((k, i) => (
            <li key={k.slug} role="presentation">
              <button
                type="button"
                role="tab"
                id={`klinik-tab-${k.slug}`}
                aria-selected={i === aktif}
                aria-controls={
                  i === aktif ? `klinik-panel-${k.slug}` : undefined
                }
                // Roving tabindex: hanya tab terpilih yang bisa difokuskan,
                // supaya penfocusan tidak berhenti di 16 tab satu per satu.
                tabIndex={i === aktif ? 0 : -1}
                ref={(el) => {
                  daftarTab.current[i] = el;
                }}
                className={`klinik-tab${i === aktif ? " aktif" : ""}`}
                onClick={() => setAktif(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    geser(1);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    geser(-1);
                  }
                }}
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

          <ClinicCardGrid
            list={details.filter((d) => d.clinicSlug === klinik.slug)}
          />
        </div>
      </div>
    </div>
  );
}