import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
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
    <section id="akreditasi" className="penghargaan section">
      <div className="container section-title pb-4">
        <h2>Akreditasi &amp; Penghargaan</h2>
        <p>&quot;Komitmen kami terhadap mutu dan pelayanan&quot;</p>
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
    <section id="galeri" className="gallery section light-background">
      <div className="container section-title pb-4">
        <h2>Gallery</h2>
        <p>&quot;Kegiatan dan fasilitas rumah sakit&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-3 gx-3">
          {GALLERY.map((g, i) => (
            <div className="col-6 col-md-4 col-lg-2" key={g}>
              <figure className="gallery-item mb-0">
                  <Photo
                    src={photo(GALLERY_PHOTOS[i % GALLERY_PHOTOS.length], 400, 400)}
                    alt={g}
                    sizes="(max-width: 768px) 50vw, 200px"
                    height={135}
                    radius="all"
                  />
                <figcaption>{g}</figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}