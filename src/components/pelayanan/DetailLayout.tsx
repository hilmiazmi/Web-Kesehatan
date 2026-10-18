import Photo from "@/components/ui/Photo";
import TextToSpeech from "@/components/ui/TextToSpeech";
import DetailSidebar, { type SidebarItem } from "@/components/pelayanan/DetailSidebar";
import { gabungTeks } from "@/data/halaman";

/**
 * Susunan halaman detail yang dipakai bersama.
 *
 * Di situs referensi setiap halaman detail punya dua kolom: daftar halaman
 * saudara di kiri dan isi halaman di kanan. `DetailLayout` membungkus dua
 * kolom itu, `DetailBody` mengisi kolom kanan.
 *
 * Keduanya server component supaya isi tetap dirender di server.
 */

/**
 * Judul bagian layanan yang dirender DetailBody.
 *
 * Diekspor karena halaman yang menyusun teks baca-nyaringnya sendiri
 * (detail poliklinik) memakai judul yang sama persis di JSX dan di urutan
 * pembacaan; satu nama menghindari dua kata yang saling tertinggal.
 */
export const JUDUL_LAYANAN = "Layanan";

/** Kolom kiri berisi daftar saudara, kolom kanan berisi isi halaman. */
export function DetailLayout({
  items,
  currentHref,
  children,
}: {
  items: SidebarItem[];
  currentHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row g-4">
      <div className="col-lg-3">
        <DetailSidebar items={items} currentHref={currentHref} />
      </div>
      <div className="col-lg-9">{children}</div>
    </div>
  );
}

/**
 * Isi halaman detail: judul besar, foto utama, paragraf pembuka, daftar
 * butir layanan, lalu tombol pendaftaran online.
 *
 * `description` diambil dari data identitas layanan supaya tidak ada teks
 * yang ditulis dua kali. Butir layanan datang dari
 * `src/data/detail-content.ts`.
 */
export function DetailBody({
  title,
  description,
  points,
  photoSrc,
  photoAlt,
  introTail,
}: {
  title: string;
  description: string;
  points: string[];
  photoSrc: string;
  photoAlt: string;
  /** Kalimat penutup yang sama dipakai di semua halaman detail. */
  introTail: string;
}) {
  // Teks baca-nyaring disusun dari properti yang dirender, urutannya
  // mengikuti urutan visual: paragraf pembuka, penutup, judul bagian, lalu
  // butir layanan.
  const teks = gabungTeks([description, introTail, JUDUL_LAYANAN, ...points]);

  return (
    <article>
      <h1 className="detail-title">{title}</h1>

      <div className="detail-body-photo">
        <Photo
          src={photoSrc}
          alt={photoAlt}
          sizes="(max-width: 992px) 100vw, 720px"
          preload
          height={280}
          radius="all"
        />
      </div>

      <p className="detail-lead">{description}</p>
      <p className="detail-lead">{introTail}</p>

      <TextToSpeech text={teks} title={title} />

      <h2 className="detail-subheading">{JUDUL_LAYANAN}</h2>
      <ul className="detail-list">
        {points.map((p) => (
          <li key={p}>
            <i className="bi bi-check-circle" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </article>
  );
}