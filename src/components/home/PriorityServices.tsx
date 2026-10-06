import Link from "next/link";
import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
import { PRIORITY_SERVICES } from "@/data/home";
import { PRIORITY_PHOTOS, photo } from "@/data/images";

/**
 * Section 3 — "Layanan Unggulan & Prioritas".
 *
 * 6 kartu, jumlah dan urutan sesuai situs referensi yang sudah diverifikasi.
 * Foto memakai aset stok Unsplash, bukan foto asli situs referensi.
 *
 * Di situs referensi keenam kartu berada di dalam carousel yang hanya
 * menampilkan 4 sekaligus, jadi tinggi section tidak mengikuti jumlah kartu.
 * Struktur dan pembagian kolomnya ditiru; hanya fotonya yang diganti aset stok.
 */
export default function PriorityServices() {
  return (
    <section id="layanan" className="section pb-3">
      <div className="container section-title pb-4">
        <h2>Layanan Unggulan &amp; Prioritas</h2>
        <p>&quot;Layanan Terbaik Untuk Kesehatan Anda&quot;</p>
      </div>

      <CardCarousel label="Layanan unggulan dan prioritas">
        {PRIORITY_SERVICES.map((s, i) => (
          <div className="card" key={s.slug}>
            {/* `Photo` sudah membawa wrapper `.photo-box` sendiri; membungkus
                lagi membuat aturan `.image-content img` (tinggi 190px tetap)
                mengalahkan prop `height` di bawah. */}
            <Photo
              src={photo(PRIORITY_PHOTOS[i % PRIORITY_PHOTOS.length], 600, 400)}
              alt={s.title}
              sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 360px"
              height={190}
              radius="top"
            />

            <div className="card-content">
              <h3 className="card-title">{s.title}</h3>
              <p className="card-description">{s.description}</p>
              <Link href={`/pelayanan/prioritas/${s.slug}`} className="btn btn-primary">
                Detail
              </Link>
            </div>
          </div>
        ))}
      </CardCarousel>
    </section>
  );
}