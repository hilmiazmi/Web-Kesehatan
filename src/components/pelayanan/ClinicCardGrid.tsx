import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { GALLERY_PHOTOS, photo } from "@/data/images";

/** Yang dibutuhkan kartu untuk berdiri sendiri: tautan, nama, dan foto. */
export type ClinicCard = {
  slug: string;
  name: string;
  /** Klinik induknya. Dipakai untuk memfilter kartu per tab. */
  clinicSlug: string;
};

/**
 * Kartu klinik di bawah tab pada halaman /pelayanan/poliklinik.
 *
 * Di situs referensi tiap klinik punya satu atau lebih kartu yang menuju ke
 * halaman detail. Kartu ini adalah tautan, bukan tombol, supaya bisa dipilah
 * dengan keyboard dan dibuka di tab baru.
 *
 * Daftar kartu dikirim sebagai props oleh halaman server, bukan diimpor dari
 * `@/data/clinics`. Komponen ini dipakai dari dalam `ClinicDirectory` yang
 * client, jadi mengimpor modul data akan menarik isi penuh 25 detail klinik ke
 * browser, padahal yang dirender di direktori hanya nama dan fotonya.
 */
export function ClinicCardGrid({ list }: { list: ClinicCard[] }) {
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