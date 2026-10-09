import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
import GalleryLightbox from "@/components/ui/GalleryLightbox";
import { AWARDS, GALLERY } from "@/data/home";
import { GALLERY_PHOTOS, photo, randomPhoto } from "@/data/images";

/**
 * Section 7 — "Akreditasi & Penghargaan".
 * Section 8 — "Gallery".
 *
 * Digabung dalam satu file karena keduanya satu berkas sederhana tanpa state.
 *
 * Perbedaan penting: akreditasi di situs referensi berupa carousel
 * 4-tampilan, sedangkan gallery berupa grid statis empat kolom tanpa
 * interaksi. Karena itu hanya akreditasi yang memakai CardCarousel.
 *
 * Foto penghargaan memakai picsum.photos dengan seed tetap supaya hasilnya
 * stabil dan tidak berganti-ganti tiap muat halaman.
 */
export function AwardsSection() {
  return (
    <section id="akreditasi" className="section">
      {/* Situs referensi tidak memakai sub-judul di section ini
          (`section-title pb-0` hanya berisi h2). */}
      <div className="container section-title pb-0">
        <h2>Akreditasi &amp; Penghargaan</h2>
      </div>

      <CardCarousel label="Akreditasi dan penghargaan">
        {AWARDS.map((a, i) => (
          <div className="award-item" key={a}>
            <Photo
              src={randomPhoto(`award-${i}`, 500, 400)}
              alt={a}
              sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 280px"
              height={130}
              radius="all"
            />
            <p className="award-title">{a}</p>
          </div>
        ))}
      </CardCarousel>
    </section>
  );
}

export function GallerySection() {
  return (
    <section id="galeri" className="section light-background">
      <div className="container section-title pb-0">
        <h2>Gallery</h2>
      </div>

      <div className="container">
        <GalleryLightbox
          className="gallery-grid"
          height={135}
          sizes="(max-width: 768px) 50vw, 200px"
          foto={GALLERY.map((g, i) => ({
            src: photo(GALLERY_PHOTOS[i % GALLERY_PHOTOS.length], 400, 400),
            // Nama unit sudah tertulis di `caption` tepat di bawah foto, jadi
            // `alt` dikosongkan agar tidak dibacakan dua kali.
            alt: "",
            caption: g,
          }))}
        />
      </div>
    </section>
  );
}