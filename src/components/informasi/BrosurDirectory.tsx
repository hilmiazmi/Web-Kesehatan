"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { BrosurCategory } from "@/data/brosur";

/** Yang dibutuhkan kartu untuk berdiri sendiri di direktori. */
export type BrosurCard = {
  slug: string;
  title: string;
  category: string;
  lead: string;
};

/**
 * Daftar brosur digital untuk halaman /informasi-publik/brosur.
 *
 * Polanya ditiru dari halaman brosur di situs referensi: empat kategori
 * menjadi tab, isi kategori terpilih tampil sebagai kartu di kanan.
 *
 * Tab memakai <button>, bukan <a>, karena yang diklik hanya mengganti panel
 * dan tidak berpindah halaman.
 *
 * Hanya panel aktif yang dirender. Karena itu `aria-controls` hanya dipasang
 * pada tab yang sedang terpilih; kalau dipasang juga pada tab lain, id yang
 * ditunjuknya tidak ada di DOM dan pembaca layar akan diam.
 *
 * Data dikirim dari halaman server sebagai props, bukan diimpor dari
 * `@/data/brosur`. Modul itu memuat isi penuh 21 brosur beserta semua poin
 * di dalamnya, sementara direktori hanya menampilkan judul dan lead.
 */
export default function BrosurDirectory({
  categories,
  brosurs,
}: {
  categories: BrosurCategory[];
  brosurs: BrosurCard[];
}) {
  const [aktif, setAktif] = useState(0);
  const daftarTab = useRef<(HTMLButtonElement | null)[]>([]);
  const kategori = categories[aktif];
  const isi = brosurs.filter((b) => b.category === kategori.slug);

  /** Panah atas dan bawah memindahkan tab, sesuai pola tablist vertikal. */
  const geser = (arah: 1 | -1) => {
    const berikut = (aktif + arah + categories.length) % categories.length;
    setAktif(berikut);
    daftarTab.current[berikut]?.focus();
  };

  return (
    <div className="row g-4">
      <div className="col-md-3">
        <ul className="klinik-tab-list" role="tablist" aria-orientation="vertical">
          {categories.map((c, i) => (
            <li key={c.slug} role="presentation">
              <button
                type="button"
                role="tab"
                id={`brosur-tab-${c.slug}`}
                aria-selected={i === aktif}
                aria-controls={
                  i === aktif ? `brosur-panel-${c.slug}` : undefined
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
function BrosurKartu({ brosur }: { brosur: BrosurCard }) {
  return (
    <Link
      href={`/informasi-publik/brosur/${brosur.slug}`}
      className="brosur-kartu"
    >
      <span className="brosur-kartu-judul">{brosur.title}</span>
      <span className="brosur-kartu-lead">{brosur.lead}</span>
      <span className="brosur-kartu-baca">
        Baca brosur
        <i className="bi bi-chevron-right" aria-hidden="true" />
      </span>
    </Link>
  );
}