import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Photo from "@/components/ui/Photo";
import TextToSpeech from "@/components/ui/TextToSpeech";
import { ARTICLES } from "@/data/home";
import { formatDate, stripHtml } from "@/lib/format";
import {
  fotoBerita,
  getPublicArticle,
  getPublicArticles,
} from "@/lib/content-loader";

/**
 * Halaman detail berita yang membaca langsung dari tabel `articles` saat runtime.
 *
 * Perubahan dari PRD butir 9: sebelumnya hanya slug dari `ARTICLES` yang
 * dilayani, dan isi halaman membaca array statis yang sama. Sekarang:
 *
 * 1. `generateStaticParams()` tetap menyediakan enam belas slug statis awal
 *    supaya halaman bawaan ter-prerender saat build.
 * 2. `dynamicParams = true` mengizinkan artikel baru yang ditambah admin
 *    lewat panel dilayani saat diminta, tanpa perlu build ulang.
 * 3. `revalidate = 60` memperbarui halaman setiap menit sehingga perubahan
 *    isi yang diedit admin langsung terlihat oleh pengunjung.
 */
export const dynamicParams = true;
export const revalidate = 60;

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
    description: article.metaDescription ?? article.excerpt,
  };
}

export default async function DetailBeritaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);

  if (!article) notFound();

  // Daftar lengkap untuk navigasi prev/next diambil dari loader yang sama,
  // jadi artikel baru dari database tetap punya navigasi antar-artikel.
  // Lingkaran prev/next hanya dibuat kalau ada minimal dua artikel; satu artikel
  // tidak berguna dan menambah satu klik sia-sia.
  const semua = await getPublicArticles();
  const posisi = semua.findIndex((a) => a.slug === slug);
  const adaNavigasi = semua.length > 1 && posisi >= 0;
  const foto = fotoBerita(article, posisi >= 0 ? posisi : 0, 1000, 560);

  const next = semua[(posisi + 1) % semua.length];
  const prev = semua[(posisi - 1 + semua.length) % semua.length];

  const isiTeks = article.bodyHtml
    ? stripHtml(article.bodyHtml)
    : (article.paragraphs?.join(". ") ?? article.excerpt);

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

              <TextToSpeech text={isiTeks} title={article.title} />

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
