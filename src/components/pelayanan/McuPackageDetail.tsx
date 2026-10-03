import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { FACILITY_PHOTOS, NEWS_PHOTOS, photo } from "@/data/images";
import { formatIDR } from "@/lib/format";

/**
 * Isi halaman detail satu paket MCU.
 *
 * Dipakai oleh dua route: `mcu/reguler/[slug]` dan `mcu/holiday/[slug]`.
 * Keduanya hanya berbeda sumber data, jadi seluruh tata letak ditulis di sini
 * sekali.
 */

export type McuPackage = {
  slug: string;
  title: string;
  price: number;
  items: string[];
};

/** Syarat pendaftaran yang berlaku untuk semua paket. */
const SYARAT = [
  "Pesanan minimal 2 hari sebelum pemeriksaan.",
  "Puasa 8 sampai 10 jam sebelum pemeriksaan.",
  "Bawa surat rujukan bila memakai BPJS Kesehatan.",
  "Hasil pemeriksaan berlaku selama 30 hari.",
];

export function McuPackageDetail({
  pkg,
  index,
  siblings,
  basePath,
  photos,
}: {
  pkg: McuPackage;
  /** Indeks di array data; dipakai untuk memilih foto bergiliran. */
  index: number;
  siblings: McuPackage[];
  /** Prefix path kategori, mis. "/pelayanan/mcu/reguler". */
  basePath: string;
  photos: readonly string[];
}) {
  const href = `${basePath}/${pkg.slug}`;

  return (
    <DetailLayout
      items={siblings.map((p) => ({
        href: `${basePath}/${p.slug}`,
        label: p.title,
      }))}
      currentHref={href}
    >
      <article>
        <h1 className="detail-title">{pkg.title}</h1>

        <div className="detail-body-photo">
          <Photo
            src={photo(photos[index % photos.length], 900, 600)}
            alt={pkg.title}
            sizes="(max-width: 992px) 100vw, 720px"
            priority
            height={280}
            radius="all"
          />
        </div>

        <p className="mcu-price mcu-price-large">{formatIDR(pkg.price)}</p>

        <p className="detail-lead">
          Paket medical check up untuk membantu Anda mengenali kondisi
          kesehatan sejak dini.
        </p>

        <h2 className="detail-subheading">Rincian Pemeriksaan</h2>
        <ul className="mcu-items mcu-items-detailed">
          {pkg.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="detail-subheading">Syarat dan Ketentuan</h2>
        <ul className="detail-list">
          {SYARAT.map((s) => (
            <li key={s}>
              <i className="bi bi-check-circle" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>

        <div className="d-flex gap-2 flex-wrap mt-4">
          <Link href={`/daftar-online?paket=${pkg.slug}`} className="btn btn-primary">
            Pesan Paket Ini
          </Link>
          <Link href={basePath} className="btn btn-tertiary">
            Semua Paket
          </Link>
        </div>
      </article>
    </DetailLayout>
  );
}

export { FACILITY_PHOTOS, NEWS_PHOTOS };