import Link from "next/link";
import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
import { ARTICLES } from "@/data/home";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { formatDate } from "@/lib/format";

/**
 * Section 6 — "Berita dan Artikel Kesehatan".
 *
 * Situs referensi menampilkan 16 kartu di carousel 4-tampilan. Semua 16 tetap
 * ada di sini, jadi tidak ada data yang tertinggal; perbedaannya hanya
 * carousel yang harus digulir untuk melihat sisanya.
 *
 * Foto asli tidak disalin, jadi tiap kartu memakai foto stok bergiliran dari
 * pool.
 */
export default function NewsSection() {
  return (
    <section id="berita" className="berita section pb-3 light-background">
      <div className="container section-title pb-4">
        <h2>Berita dan Artikel Kesehatan</h2>
        <p>&quot;Informasi terkini mengenai layanan kami&quot;</p>
      </div>

      <CardCarousel label="Berita dan artikel kesehatan">
        {ARTICLES.map((a, i) => (
          <article className="card" key={a.slug}>
            <div className="image-content">
              <Photo
                src={photo(NEWS_PHOTOS[i % NEWS_PHOTOS.length], 600, 400)}
                alt={a.title}
                sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 300px"
                height={165}
                radius="top"
              />
            </div>

            <div className="card-content">
              <h3 className="card-title">{a.title}</h3>
              <time className="berita-date" dateTime={a.date}>
                {formatDate(a.date)}
              </time>
              <p className="card-description">{a.excerpt}</p>
              <Link href={`/berita/${a.slug}`} className="link-more">
                Baca Selengkapnya
              </Link>
            </div>
          </article>
        ))}
      </CardCarousel>
    </section>
  );
}