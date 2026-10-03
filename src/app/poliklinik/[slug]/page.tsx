import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import DoctorCard from "@/components/pelayanan/DoctorCard";
import { DOCTORS } from "@/data/doctors";
import { POLIKLINIK } from "@/data/poliklinik";
import { doctorsForSpecialty, findPoliklinik } from "@/lib/poliklinik";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POLIKLINIK.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const poli = findPoliklinik(POLIKLINIK, slug);
  if (!poli) return { title: "Poliklinik tidak ditemukan" };
  return { title: poli.name, description: poli.description };
}

/**
 * Detail poliklinik dinamis, path `/poliklinik/[slug]`:
 * deskripsi poliklinik, lokasi, dan daftar dokter beserta jadwalnya.
 */
export default async function PoliklinikDetailPage({ params }: Props) {
  const { slug } = await params;
  const poli = findPoliklinik(POLIKLINIK, slug);
  if (!poli) notFound();

  const doctors = doctorsForSpecialty(poli.specialty, DOCTORS);

  return (
    <>
      <PageHeader
        title={poli.name}
        subtitle={poli.description}
        trail={[
          { label: "Pelayanan", href: "/pelayanan" },
          { label: "Poliklinik", href: "/pelayanan/poliklinik" },
          { label: poli.name },
        ]}
      />

      <section className="section">
        <div className="container">
          <ul className="poliklinik-meta poliklinik-meta-detail">
            <li>
              <i className="bi bi-geo-alt" aria-hidden="true" />
              {poli.location}
            </li>
            <li>
              <i className="bi bi-clock" aria-hidden="true" />
              Senin sampai Jumat, pukul 07.30 sampai 14.00
            </li>
            <li>
              <i className="bi bi-person-badge" aria-hidden="true" />
              {doctors.length > 0
                ? `${doctors.length} dokter`
                : "Daftar dokter segera hadir"}
            </li>
          </ul>

          <h2 className="poliklinik-section-title">Dokter dan Jadwal Praktik</h2>

          {doctors.length === 0 ? (
            <p>Jadwal dokter untuk poliklinik ini belum tersedia.</p>
          ) : (
            <div className="row gy-4 gx-4">
              {doctors.map((d) => (
                <div className="col-md-6 col-lg-4" key={d.slug}>
                  <DoctorCard doctor={d} />
                </div>
              ))}
            </div>
          )}

          <p className="poliklinik-back">
            <Link href="/pelayanan/poliklinik">
              <i className="bi bi-arrow-left" aria-hidden="true" /> Kembali ke
              daftar poliklinik
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
