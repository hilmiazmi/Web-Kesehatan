"use client";

import { useState } from "react";
import Link from "next/link";
import { filterPoliklinik, type PoliklinikItem } from "@/lib/poliklinik";

/**
 * Daftar poliklinik dengan kolom pencarian.
 *
 * Client component karena ada input. Hasil saringan dihitung langsung saat
 * render (state turunan), bukan lewat useEffect, sesuai aturan eslint
 * `react-hooks/set-state-in-effect` di repo ini.
 */
export default function PoliklinikList({ items }: { items: PoliklinikItem[] }) {
  const [query, setQuery] = useState("");
  const shown = filterPoliklinik(items, query);

  return (
    <>
      <div className="poliklinik-search">
        <label htmlFor="cari-poliklinik" className="visually-hidden">
          Cari poliklinik
        </label>
        <input
          id="cari-poliklinik"
          type="search"
          className="form-control"
          placeholder="Cari poliklinik, spesialis, atau lokasi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="poliklinik-count" role="status">
        {shown.length === 0
          ? `Tidak ada poliklinik yang cocok dengan "${query.trim()}".`
          : `Menampilkan ${shown.length} dari ${items.length} poliklinik.`}
      </p>

      <div className="row gy-4 gx-4">
        {shown.map((p) => (
          <div className="col-md-6 col-lg-4" key={p.slug}>
            <article className="card poliklinik-card">
              <div className="card-content">
                <div className="poliklinik-icon" aria-hidden="true">
                  <i className={`bi ${p.icon}`} />
                </div>
                <h2 className="card-title">{p.name}</h2>
                <p className="card-description">{p.description}</p>
                <ul className="poliklinik-meta">
                  <li>
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    {p.location}
                  </li>
                  <li>
                    <i className="bi bi-person-badge" aria-hidden="true" />
                    {p.doctorCount > 0
                      ? `${p.doctorCount} dokter`
                      : "Daftar dokter segera hadir"}
                  </li>
                </ul>
                <Link href="/#cari-dokter" className="btn btn-primary">
                  Cari Jadwal Dokter
                </Link>
              </div>
            </article>
          </div>
        ))}
      </div>
    </>
  );
}
