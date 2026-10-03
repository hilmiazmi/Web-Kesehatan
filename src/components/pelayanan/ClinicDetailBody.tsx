import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import DoctorCard from "@/components/pelayanan/DoctorCard";
import { CLINIC_DETAILS, type ClinicDetail } from "@/data/clinics";
import { DOCTORS } from "@/data/doctors";
import { doctorsForClinic } from "@/lib/poliklinik";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/**
 * Posisi klinik di dalam daftar, untuk memilih foto.
 *
 * Dipisah supaya foto tiap halaman tidak selalu sama. Kalau indeks selalu nol,
 * seluruh 25 halaman akan menampilkan foto yang sama persis.
 */
function detailIndex(slug: string): number {
  const i = CLINIC_DETAILS.findIndex((d) => d.slug === slug);
  return i < 0 ? 0 : i;
}

/**
 * Isi halaman detail satu klinik.
 *
 * Berkas ini sengaja terpisah dari `ClinicCardGrid.tsx`. `ClinicDirectory`
 * adalah komponen client karena tabnya butuh `useState`, dan ia mengimpor
 * `ClinicCardGrid`. Kalau `ClinicDetailBody` ikut tinggal di berkas itu, seluruh
 * modul ini — beserta `DetailLayout`, `DetailSidebar`, dan isi penuh 25 detail
 * klinik — ikut masuk client graph dan dikirim ke browser, padahal tidak ada
 * yang merendernya di direktori.
 */
export function ClinicDetailBody({
  detail,
}: {
  detail: ClinicDetail & { clinicSlug: string; clinicName: string };
}) {
  // Foto diambil dari posisi klinik ini di dalam daftar, bukan selalu indeks
  // nol. Tanpa itu, seluruh 25 halaman akan tampil dengan foto yang sama.
  const foto = GALLERY_PHOTOS[detailIndex(detail.slug) % GALLERY_PHOTOS.length];

  // Dibaca di server, jadi DOCTORS tidak ikut masuk bundel browser. Daftar
  // dokter hanya ada pada klinik yang menandai spesialisasinya; klinik lain
  // tetap punya halaman detailnya tanpa blok ini.
  const doctors = doctorsForClinic(detail, DOCTORS);

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
            src={photo(foto, 900, 600)}
            alt={detail.name}
            sizes="(max-width: 992px) 100vw, 720px"
            preload
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

        {doctors.length > 0 && (
          <>
            <h2 className="detail-subheading">Dokter dan Jadwal Praktik</h2>
            <div className="row gy-4 gx-4">
              {doctors.map((d) => (
                <div className="col-md-6 col-lg-4" key={d.slug}>
                  <DoctorCard doctor={d} />
                </div>
              ))}
            </div>
          </>
        )}

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