"use client";

import { useState } from "react";
import Link from "next/link";
import { BROSUR_CATEGORIES, BROSURS, type Brosur } from "@/data/brosur";

/**
 * Daftar brosur digital untuk halaman /informasi-publik/brosur.
 *
 * Polanya ditiru dari halaman brosur di situs referensi: empat kategori
 * menjadi tab, isi kategori terpilih tampil sebagai kartu di kanan.
 *
 * Tab memakai <button> seperti di ClinicDirectory, karena yang diklik hanya
 * mengganti panel dan tidak berpindah halaman.
 */
export default function BrosurDirectory() {
  const [aktif, setAktif] = useState(0);
  const kategori = BROSUR_CATEGORIES[aktif];
  const isi = BROSURS.filter((b) => b.category === kategori.slug);

  return (
    <div className="row g-4">
      <div className="col-md-3">
        <ul className="klinik-tab-list" role="tablist" aria-orientation="vertical">
          {BROSUR_CATEGORIES.map((c, i) => (
            <li key={c.slug} role="presentation">
              <button
                type="button"
                role="tab"
                id={`brosur-tab-${c.slug}`}
                aria-selected={i === aktif}
                aria-controls={`brosur-panel-${c.slug}`}
                className={`klinik-tab${i === aktif ? " aktif" : ""}`}
                onClick={() => setAktif(i)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-md-9">
        <div
          className="klinik-panel"
          role="tabpanel"
          id={`brosur-panel-${kategori.slug}`}
          aria-labelledby={`brosur-tab-${kategori.slug}`}
          tabIndex={0}
        >
          <h2 className="klinik-panel-title">{kategori.name}</h2>

          <div className="brosur-list">
            {isi.map((b) => (
              <BrosurKartu key={b.slug} brosur={b} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Satu kartu brosur: tautan ke halaman detailnya. */
function BrosurKartu({ brosur }: { brosur: Brosur }) {
  return (
    <Link href={`/informasi-publik/brosur/${brosur.slug}`} className="brosur-kartu">
      <span className="brosur-kartu-judul">{brosur.title}</span>
      <span className="brosur-kartu-lead">{brosur.lead}</span>
      <span className="brosur-kartu-baca">
        Baca brosur
        <i className="bi bi-chevron-right" aria-hidden="true" />
      </span>
    </Link>
  );
}