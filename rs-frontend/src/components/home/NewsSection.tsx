import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { ARTICLES } from "@/data/home";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { formatDate } from "@/lib/format";


/**
 * Section 6 — "Berita dan Artikel Kesehatan".
 *
 * Situs referensi menampilkan 16 kartu; di sini seluruh 16 ditampilkan agar
 * tidak ada data yang tertinggal. Foto asli tidak disalin, jadi tiap kartu
 * memakai foto stok bergiliran dari pool.
 */
export default function NewsSection() {
  return (
    <section id="berita" className="berita section pb-3 light-background">
      <div className="container section-title pb-4">
        <h2>Berita dan Artikel Kesehatan</h2>
        <p>&quot;Informasi terkini mengenai layanan kami&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-4 gx-4">
          {ARTICLES.map((a, i) => (
            <div className="col-md-6 col-lg-3" key={a.slug}>
              <article className="card card-berita">
                <div className="image-content">
                    <Photo
                      src={photo(NEWS_PHOTOS[i % NEWS_PHOTOS.length], 600, 400)}
                      alt={a.title}
                      sizes="(max-width: 768px) 100vw, 300px"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}