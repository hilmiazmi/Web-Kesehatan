import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PageBlocks from "@/components/halaman/PageBlocks";
import { DetailLayout } from "@/components/pelayanan/DetailLayout";
import { PPID_SUBPAGES } from "@/data/ppid";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return PPID_SUBPAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = PPID_SUBPAGES.find((x) => x.slug === slug);
  if (!p) return { title: "Halaman Tidak Ditemukan" };
  return { title: p.title, description: p.lead };
}

/**
 * Satu halaman anak PPID.
 *
 * Susunannya sama dengan halaman detail layanan: daftar halaman saudara di
 * kolom kiri, isi di kolom kanan. Isinya dirender `PageBlocks`, yang sama
 * dengan halaman generik, sehingga PPID bisa memakai tabel waktu dan biaya
 * tanpa bentuk tata letak baru.
 *
 * Yang belum tersedia di repo ini adalah endpoint pendaftaran PPID, jadi form
 * di bawah hanya menampilkan isinya dan tidak mengirim apa pun.
 */
export default async function PpidSubpage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = PPID_SUBPAGES.find((x) => x.slug === slug);
  if (!page) notFound();

  return (
    <>
      <PageHeader
        trail={[{ label: "PPID", href: "/ppid" }, { label: page.title }]}
      />

      <section className="section">
        <div className="container">
          <DetailLayout
            items={NAV_PPID_CHILDREN.map((c) => ({ href: c.href, label: c.label }))}
            currentHref={`/ppid/${page.slug}`}
          >
            <article>
              <h1 className="detail-title">{page.title}</h1>
              <p className="detail-lead">{page.lead}</p>

              <PageBlocks blok={page.blok} pathname={`/ppid/${page.slug}`} />

              {page.form ? (
                <section>
                  <h2 className="detail-subheading">Formulir</h2>
                  <p className="detail-lead">{page.form.note}</p>

                  {/* Endpoint pendaftaran belum ada di repo ini, jadi halaman
                      ini hanya menampilkan apa yang akan diisi. Tombolnya
                      sengaja dimatikan: tombol yang bisa diklik tapi tidak
                      melakukan apa pun lebih buruk daripada tidak ada. */}
                  <ul className="detail-list">
                    {page.form.fields.map((f) => (
                      <li key={f.label}>
                        {f.label}
                        {f.petunjuk ? (
                          <>
                            {" — "}
                            <span className="text-body-secondary">{f.petunjuk}</span>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  <button type="button" className="btn btn-primary mt-3" disabled>
                    {page.form.submitLabel}
                  </button>

                  <p className="form-footnote">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    Formulir belum dapat dikirim. Pengisian data PR hanya
                    tersedia di loket.
                  </p>
                </section>
              ) : null}
            </article>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}