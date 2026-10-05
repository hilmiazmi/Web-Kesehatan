import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { ARTICLES } from "@/data/home";
import { formatDate, summarize } from "@/lib/format";
import {
  fotoBerita,
  getPublicArticle,
  getPublicArticles,
} from "@/lib/content-loader";

/**
 * Hanya slug bawaan yang di-prerender.
 *
 * `dynamicParams` dibiarkan `true` supaya slug yang tidak ada di
 * `generateStaticParams` tetap dilayani. Tanpa itu, berita yang baru dibuat di
 * panel admin akan menjawab 404  barisnya ada di database. Sifat
 * aslinya memang `true`, jadi ini hanya ditulis supaya tidak ada yang
 * mengira boleh mengubahnya seperti `[...slug]` yang sengaja `false`.
 */
export const dynamicParams = true;

/** Sama seperti halaman `/berita`, supaya perubahan admin cepat terlihat. */
export const revalidate = 60;

/** Prerender semua artikel bawaan saat build. */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) return { title: "Berita Tidak Ditemukan" };
  return {
    title: article.title,
    description: summarize(article.metaDescription ?? article.excerpt),
    openGraph: { title: article.title, type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) notFound();

  // Daftar berita ikut diambil supaya navigasi Sebelumnya dan Berikutnya memakai
  // urutan yang sama dengan `/berita`. Kalau daftar ini hanya berisi satu
  // berita, kedua tautan disembunyikan: menautkan artikel ke dirinya sendiri
  // tidak berguna dan menambah satu klik sia-sia.
  const semua = await getPublicArticles();
  const posisi = semua.findIndex((a) => a.slug === slug);
  const adaNavigasi = semua.length > 1 && posisi >= 0;
  const foto = fotoBerita(article, posisi >= 0 ? posisi : 0, 1000, 560);

  const next = semua[(posisi + 1) % semua.length];
  const prev = semua[(posisi - 1 + semua.length) % semua.length];

  return (
    <>
      <PageHeader
        title={article.title}
        trail={[{ label: "Berita" }, { label: "Detail Berita" }]}
      />

      <article className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9">
              <p className="article-meta">
                <time dateTime={article.date}>{formatDate(article.date)}</time>
                <span aria-hidden="true"> &middot; </span>
                <span>{article.author ?? "Redaksi"}</span>
              </p>

              <Photo
                src={foto.src}
                alt={article.title}
                sizes="(max-width: 992px) 100vw, 900px"
                preload
                height={420}
                radius="top"
                unoptimized={foto.unoptimized}
              />

              <div className="article-body">
                {article.bodyHtml ? (
                  // `body_html` comes from `render()` in `src/server/markdown.ts`,
                  // which strips dangerous tags and attributes. Sanitation
                  // happens once, on write, and is not repeated here.
                  <div dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
                ) : (
                  article.paragraphs?.map((p, i) => <p key={i}>{p}</p>)
                )}
              </div>

              {adaNavigasi && (
                <nav className="article-nav" aria-label="Navigasi artikel">
                  <Link
                    href={`/berita/${prev.slug}`}
                    className="article-nav-link"
                  >
                    <small>Sebelumnya</small>
                    <span>{prev.title}</span>
                  </Link>
                  <Link
                    href={`/berita/${next.slug}`}
                    className="article-nav-link text-end"
                  >
                    <small>Berikutnya</small>
                    <span>{next.title}</span>
                  </Link>
                </nav>
              )}

              <div className="text-center mt-5">
                <Link href="/berita" className="btn btn-primary">
                  Semua Berita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
