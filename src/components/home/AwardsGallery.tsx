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
<<<<<<< HEAD
    <section id="akreditasi" className="penghargaan section">
=======
    <section id="akreditasi" className="section">
      {/* Situs referensi tidak memakai sub-judul di section ini
          (`section-title pb-0` hanya berisi h2). */}
>>>>>>> origin/main
      <div className="container section-title pb-0">
        <h2>Akreditasi &amp; Penghargaan</h2>
      </div>

      <CardCarousel label="Akreditasi dan penghargaan">
        {AWARDS.map((a, i) => (
          <div className="card" key={a}>
            {/* Pembungkus `image-content` sengaja tidak dipakai di sini. Di
                repo ini `.image-content img` mengunci tinggi 190px, sedangkan
                di situs referensi container itu tidak punya aturan apa pun dan
                ukuran gambarawards diatur oleh `.penghargaan-img img`. Pakai
                `.image-content` akan memaksa tinggi yang tidak ada di acuan. */}
            <div className="penghargaan-img text-center">
              <Photo
                src={randomPhoto(`award-${i}`, 500, 400)}
                alt={a}
                sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 280px"
                height={130}
                radius="all"
              />
            </div>
            <div className="card-content">
              <h3 className="card-title">{a}</h3>
            </div>
          </div>
        ))}
      </CardCarousel>
    </section>
  );
}

export function GallerySection() {
  return (
<<<<<<< HEAD
    <section id="galeri" className="gallery section light-background">
=======
    <section id="galeri" className="section light-background">
>>>>>>> origin/main
      <div className="container section-title pb-0">
        <h2>Gallery</h2>
      </div>

      <div className="container">
        <GalleryLightbox
          className="gallery-grid"
          height={215}
          sizes="(max-width: 992px) 50vw, 25vw"
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