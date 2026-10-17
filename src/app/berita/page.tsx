import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { formatDate, summarize } from "@/lib/format";
import { fotoBerita, getPublicArticles } from "@/lib/content-loader";

export const metadata: Metadata = {
  title: "Berita dan Artikel",
  description:
    "Kumpulan berita dan artikel kesehatan seputar layanan RSUD Contoh Sehat.",
};

/**
 * Halaman di-regenerate tiap menit.
 *
 * Sumber beritanya `getPublicArticles()`, bukan modul `src/data/home.ts`, supaya
 * berita yang ditambah atau diubah lewat `/admin/records/articles` langsung
 * terlihat pengunjung. Tanpa `revalidate`, halamannya tetap prerender hasil
 * build dan perubahan admin baru muncul setelah build berikutnya, yang tidak
 * pernah berjalan sendiri di VPS.
 *
 * Loader mengembalikan data statis kalau database tidak ada, jadi `next build`
 * di lingkungan pratinjau tetap berhasil tanpa PostgreSQL.
 */
export const revalidate = 60;

/** Daftar semua berita. */
export default async function NewsIndexPage() {
  const articles = await getPublicArticles();

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
            {articles.map((a, i) => {
              const foto = fotoBerita(a, i, 600, 400);

              return (
                <div className="col-md-6 col-lg-3" key={a.slug}>
                  <article className="card">
                    <div className="image-content">
                      <Photo
                        src={foto.src}
                        alt={a.title}
                        sizes="(max-width: 768px) 100vw, 300px"
                        height={165}
                        radius="top"
                        unoptimized={foto.unoptimized}
                      />
                    </div>

                    <div className="card-content">
                      <h2 className="card-title">{a.title}</h2>
                      <time className="berita-date" dateTime={a.date}>
                        {formatDate(a.date)}
                      </time>
                      <p className="card-description">{summarize(a.excerpt)}</p>
                      <Link href={`/berita/${a.slug}`} className="link-more">
                        Baca Selengkapnya
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
