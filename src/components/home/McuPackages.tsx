import Link from "next/link";
import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
import { MCU_PACKAGES } from "@/data/home";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { formatIDR } from "@/lib/format";

/**
 * Section 5 — "Paket MCU & Promosi".
 *
 * 8 paket reguler, sesuai jumlah di situs referensi. Harga di sini angka
 * karangan sendiri (PRD bagian 9: harga referensi tidak ditampilkan publik).
 *
 * Di situs referensi kedelapan paket berada di carousel 4-tampilan, jadi tinggi
 * section tetap sewajarnya berapa pun jumlah paket.
 */
export default function McuPackages() {
  return (
    <section id="mcu" className="mcu section pb-3">
      <div className="container section-title pb-4">
        <h2>Paket MCU &amp; Promosi</h2>
        <p>&quot;Berbagai penawaran istimewa untuk Anda&quot;</p>
      </div>

      <CardCarousel label="Paket medical check up dan promosi">
        {MCU_PACKAGES.map((p, i) => (
          <div className="card" key={p.slug}>
            <div className="image-content">
              <Photo
                src={photo(NEWS_PHOTOS[i % NEWS_PHOTOS.length], 600, 400)}
                alt={p.title}
                sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 300px"
                height={150}
                radius="top"
              />
            </div>

            <div className="card-content">
              <h3 className="card-title">{p.title}</h3>
              <p className="mcu-price">{formatIDR(p.price)}</p>
              <ul className="mcu-items">
                {p.items.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={`/pelayanan/mcu/reguler/${p.slug}`}
                className="btn btn-primary"
              >
                Detail
              </Link>
            </div>
          </div>
        ))}
      </CardCarousel>
    </section>
  );
}