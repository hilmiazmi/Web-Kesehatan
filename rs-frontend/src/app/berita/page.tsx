import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { ARTICLES } from "@/data/home";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { formatDate, summarize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Berita dan Artikel",
  description:
    "Kumpulan berita dan artikel kesehatan seputar layanan RSUD Contoh Sehat.",
};


/** Daftar semua berita. */
export default function NewsIndexPage() {
  return (
    <>
      <PageHeader
        title="Berita dan Artikel Kesehatan"
        subtitle="Informasi terkini mengenai layanan kami."
        trail={[{ label: "Berita" }]}
      />

      <section className="section">
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
                    <h2 className="card-title">{a.title}</h2>
                    <time className="berita-date" dateTime={a.date}>
                      {formatDate(a.date)}
                    </time>
                    <p className="card-description">
                      {summarize(a.excerpt)}
                    </p>
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
    </>
  );
}