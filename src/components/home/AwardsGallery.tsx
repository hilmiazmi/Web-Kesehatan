import Photo from "@/components/ui/Photo";
import { AWARDS, GALLERY } from "@/data/home";
import { GALLERY_PHOTOS, photo, randomPhoto } from "@/data/images";

/**
 * Section 7 — "Akreditasi & Penghargaan".
 * Section 8 — "Gallery".
 *
 * Digabung dalam satu file karena keduanya sama-sama grid tanpa interaksi.
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

      <div className="container">
        <div className="row gy-4 gx-4">
          {AWARDS.map((a, i) => (
            <div className="col-md-6 col-lg-3" key={a}>
              <div className="award-item">
                  <Photo
                    src={randomPhoto(`award-${i}`, 500, 400)}
                    alt={a}
                    sizes="(max-width: 768px) 50vw, 280px"
                    height={130}
                    radius="all"
                  />
                <p className="award-title">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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