import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { CLINIC_DETAILS, type ClinicDetail } from "@/data/clinics";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/**
 * Kartu klinik di bawah tab pada halaman /pelayanan/poliklinik.
 *
 * Di situs referensi tiap klinik punya satu atau lebih kartu yang menuju ke
 * halaman detail. Kartu ini adalah tautan, bukan tombol, supaya bisa dipilah
 * dengan keyboard dan dibuka di tab baru.
 */
export function ClinicCardGrid({ clinicSlug }: { clinicSlug: string }) {
  const list = CLINIC_DETAILS.filter((d) => d.clinicSlug === clinicSlug);
  if (list.length === 0) return null;

  return (
    <div className="clinic-card-grid">
      {list.map((d, i) => (
        <Link
          key={d.slug}
          href={`/pelayanan/poliklinik/${d.slug}`}
          className="clinic-card"
        >
          <Photo
            src={photo(GALLERY_PHOTOS[i % GALLERY_PHOTOS.length], 400, 400)}
            alt={d.name}
            sizes="187px"
            height={180}
            radius="all"
          />
          <span className="clinic-card-title">{d.name}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * Isi halaman detail satu klinik.
 *
 * Sidebar memakai daftar seluruh klinik, bukan hanya satu kelompok, karena di
 * acuan setiap kartu bisa Linking ke klinik lain.
 */
export function ClinicDetailBody({ detail }: { detail: ClinicDetail }) {
  return (
    <DetailLayout
      items={CLINIC_DETAILS.map((d) => ({
        href: `/pelayanan/poliklinik/${d.slug}`,
        label: d.name,
      }))}
      currentHref={`/pelayanan/poliklinik/${detail.slug}`}
    >
      <article>
        <h1 className="detail-title">{detail.name}</h1>

        <div className="detail-body-photo">
          <Photo
            src={photo(GALLERY_PHOTOS[0], 900, 600)}
            alt={detail.name}
            sizes="(max-width: 992px) 100vw, 720px"
            priority
            height={280}
            radius="all"
          />
        </div>

        <p className="detail-lead">{detail.description}</p>

        <h2 className="detail-subheading">Layanan</h2>
        <ul className="detail-list">
          {detail.services.map((s) => (
            <li key={s}>
              <i className="bi bi-check-circle" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>

        <p className="klinik-panel-hours">
          <i className="bi bi-clock" aria-hidden="true" />
          {detail.hours}
        </p>

        <div className="d-flex gap-2 flex-wrap mt-4">
          <Link href="/daftar-online" className="btn btn-primary">
            Daftar Online
          </Link>
          <Link href="/pelayanan/poliklinik" className="btn btn-tertiary">
            Semua Poliklinik
          </Link>
        </div>
      </article>
    </DetailLayout>
  );
}