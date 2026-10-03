import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import { ARTICLES } from "@/data/home";
import { articleBody } from "@/data/article-body";
import { NEWS_PHOTOS, photo } from "@/data/images";
import { formatDate, summarize } from "@/lib/format";


/** Prerender semua artikel saat build. */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: "Berita Tidak Ditemukan" };
  return {
    title: article.title,
    description: summarize(article.excerpt),
    openGraph: { title: article.title, type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = ARTICLES.findIndex((a) => a.slug === slug);
  if (index === -1) notFound();

  const article = ARTICLES[index];
  const paragraphs = articleBody(article.title, article.excerpt);

  // Artikel lain, untuk navigasi Continuation.
  const next = ARTICLES[(index + 1) % ARTICLES.length];
  const prev = ARTICLES[(index - 1 + ARTICLES.length) % ARTICLES.length];

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
                <span>Redaksi</span>
              </p>

                <Photo
                  src={photo(NEWS_PHOTOS[index % NEWS_PHOTOS.length], 1000, 560)}
                  alt={article.title}
                  sizes="(max-width: 992px) 100vw, 900px"
                  preload
                  height={420}
                  radius="top"
                />

              <div className="article-body">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <nav className="article-nav" aria-label="Navigasi artikel">
                <Link href={`/berita/${prev.slug}`} className="article-nav-link">
                  <small>Sebelumnya</small>
                  <span>{prev.title}</span>
                </Link>
                <Link href={`/berita/${next.slug}`} className="article-nav-link text-end">
                  <small>Berikutnya</small>
                  <span>{next.title}</span>
                </Link>
              </nav>

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