import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimeAvatar from "@/components/ui/AnimeAvatar";
import { MANAGEMENT } from "@/data/manajemen";
import { PROFIL_MANAJEMEN } from "@/data/manajemen-profil";

/**
 * Prerender satu halaman untuk tiap pimpinan.
 *
 * `params` itu `Promise` di Next.js 16, jadi `slug` harus di-`await`.
 * Nilai yang dikembalikan harus `{ slug: string }[]`, bukan `{ path }`.
 */
export function generateStaticParams() {
  return MANAGEMENT.map((person) => ({ slug: person.slug }));
}

/** Indeks avatar dihitung dari urutan roster, jadi harus sama dengan
 *  indeks yang dipakai kisi di halaman daftar. */
function indexAvatar(slug: string): number {
  const i = MANAGEMENT.findIndex((m) => m.slug === slug);
  return i < 0 ? 0 : i;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = MANAGEMENT.find((m) => m.slug === slug);
  if (!person) return { title: "Profil tidak ditemukan" };
  return {
    title: person.name,
    description: `${person.name}, ${person.role} RSUD Contoh Sehat.`,
  };
}

/** Halaman profil satu pimpinan. */
export default async function ProfilManagerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = MANAGEMENT.find((m) => m.slug === slug);
  if (!person) notFound();

  const profil = PROFIL_MANAJEMEN[slug];
  if (!profil) notFound();

  return (
    <>
      <PageHeader
        title={person.name}
        subtitle={person.role}
        trail={[
          { label: "Tentang Kami", href: "/tentang-kami" },
          { label: "Manajemen", href: "/tentang-kami/manajemen" },
          { label: person.name },
        ]}
      />

      <section className="section">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <div
                className="photo-box photo-box--all"
                style={{ "--photo-h": "320px" } as CSSProperties}
              >
                <AnimeAvatar variant={indexAvatar(slug)} />
              </div>
            </div>

            <div className="col-lg-8">
              <p className="detail-lead">{person.ringkas}</p>

              <h2 className="detail-heading">Pendidikan</h2>
              <ul className="detail-list">
                {profil.pendidikan.map((p) => (
                  <li key={p}>
                    <i className="bi bi-mortarboard" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>

              <h2 className="detail-heading mt-4">Riwayat Jabatan</h2>
              <ul className="detail-list">
                {profil.riwayat.map((r) => (
                  <li key={r}>
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>

              <h2 className="detail-heading mt-4">Fokus Kerja</h2>
              <ul className="detail-list">
                {profil.fokus.map((f) => (
                  <li key={f}>
                    <i className="bi bi-bullseye" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <p className="detail-note">
                Seluruh data pada halaman ini fiktif dan dibuat untuk keperluan
                demonstrasi.
              </p>

              <div className="mt-4">
                <Link
                  href="/tentang-kami/manajemen"
                  className="btn btn-tertiary"
                >
                  <i className="bi bi-arrow-left" aria-hidden="true" />
                  Kembali ke daftar pimpinan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
