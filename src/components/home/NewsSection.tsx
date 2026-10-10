import Link from "next/link";
import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
import { ARTICLES } from "@/data/home";
import { fotoBerita, type PublicArticle } from "@/lib/content-loader";
import { formatDate } from "@/lib/format";

/**
 * Section 6 — "Berita dan Artikel Kesehatan".
 *
 * Situs referensi menampilkan 16 kartu di carousel 4-tampilan. Semua 16 tetap
 * ada di sini, jadi tidak ada data yang tertinggal; perbedaannya hanya
 * carousel yang harus digulir untuk melihat sisanya.
 *
 * Foto asli tidak disalin, jadi tiap kartu memakai foto stok bergiliran dari
 * pool, kecuali berita itu punya `cover_url` sendiri dari database.
 *
 * Daftar artikel masuk lewat prop supaya `src/app/page.tsx` bisa mengambilnya
 * dari `getPublicArticles()`. Tanpa itu, kartu di beranda tetap menampilkan
 * modul data statis sementara `/berita` sudah menampilkan isi database, jadi
 * admin dan pengunjung melihat dua isi berbeda untuk hal yang sama. Nilai
 * bawaanya tetap `ARTICLES`, jadi komponen ini masih bisa dipakai tanpa loader.
 */
export default function NewsSection({
  articles = ARTICLES,
}: {
  articles?: PublicArticle[];
}) {
  return (
    <section id="berita" className="section pb-3 light-background">
      {/* Situs referensi tidak memakai sub-judul di section ini
          (`section-title pb-0` hanya berisi h2). Sub-judul hanya ada di
          Layanan, Fasilitas, dan MCU. */}
      <div className="container section-title pb-0">
        <h2>Berita dan Artikel Kesehatan</h2>
      </div>

      <CardCarousel label="Berita dan artikel kesehatan">
        {articles.map((a, i) => {
          const foto = fotoBerita(a, i, 600, 400);

          return (
            <article className="card" key={a.slug}>
              <div className="image-content">
                <Photo
                  src={foto.src}
                  alt={a.title}
                  sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 300px"
                  height={165}
                  radius="top"
                  unoptimized={foto.unoptimized}
                />
              </div>

              <div className="card-content">
                <h3 className="card-title">{a.title}</h3>
                <time className="berita-date" dateTime={a.date}>
                  {formatDate(a.date)}
                </time>
                <p className="card-description">{a.excerpt}</p>
                {/* Di bawah lipatan: tanpa prefetch (hemat RSC, lihat Footer). */}
                <Link href={`/berita/${a.slug}`} className="link-more" prefetch={false}>
                  Baca Selengkapnya
                </Link>
              </div>
            </article>
          );
        })}
      </CardCarousel>
    </section>
  );
}