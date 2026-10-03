import type { CSSProperties } from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimeAvatar from "@/components/ui/AnimeAvatar";
import { MANAGEMENT } from "@/data/informasi";

export const metadata: Metadata = {
  title: "Manajemen",
  description: "Susunan pimpinan RSUD Contoh Sehat.",
};

/** Tinggi kotak avatar, sama dengan tinggi foto kartu lain. */
const TINGGI_AVATAR = "200px";

/**
 * Halaman manajemen.
 *
 * Halaman acuan `/manajemen` di situs referensi memakai kisi empat kolom, dan
 * jumlah itu sudah dicocokkan saat pengukuran.
 *
 * Foto memakai avatar anime 90-an yang digambar sendiri di dalam
 * `src/components/ui/AnimeAvatar.tsx`. Avatar memakai `div` berkelas
 * `photo-box`, bukan komponen `Photo`, karena `Photo` memakai `next/image`
 * yang menolak SVG.
 */
export default function ManajemenPage() {
  return (
    <>
      <PageHeader
        title="Manajemen"
        subtitle="Susunan pimpinan RSUD Contoh Sehat."
        trail={[
          { label: "Tentang Kami", href: "/tentang-kami" },
          { label: "Manajemen" },
        ]}
      />

      <section className="section">
        <div className="container">
          <div className="row g-4">
            {MANAGEMENT.map((person, i) => (
              <div className="col-lg-3 col-md-6" key={person.name}>
                <div className="card">
                  <div
                    className="photo-box photo-box--top"
                    style={{ "--photo-h": TINGGI_AVATAR } as CSSProperties}
                  >
                    <AnimeAvatar variant={i} />
                  </div>
                  <div className="card-content">
                    <h2 className="card-title">{person.name}</h2>
                    <p className="card-description">{person.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}