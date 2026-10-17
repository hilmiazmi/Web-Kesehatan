import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PageBlocks from "@/components/halaman/PageBlocks";
import WbsForm from "@/components/forms/wbs-form";
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
 * Endpoint yang dipakai hanya Satu: `POST /api/v1/wbs-reports` untuk laporan
 * Whistle Blowing System. Dua formulir lain, permohonan informasi dan
 * keberatan, belum punya Route Handler, jadi isiannya tetap ditampilkan dan
 * tombolnya dimatikan. Menyalakan tombol tanpa endpoint sama dengan menyuruh
 * orang mengisi form yang tidak pernah sampai.
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

                  {/* Hanya WBS yang punya endpoint. Yang lain masih menampilkan
                      isian saja karena Route Handler-nya belum ada. */}
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

                  {page.form.endpoint === "/api/v1/wbs-reports" ? (
                    <>
                      <div className="card mt-3">
                        <div className="card-content">
                          <WbsForm />
                        </div>
                      </div>
                      <p className="form-footnote">
                        <i className="bi bi-info-circle" aria-hidden="true" />
                        Formulir ini mengirim data ke{" "}
                        <code>POST /api/v1/wbs-reports</code>. Laporan yang
                        dikirim masuk ke inbox WBS di panel admin dan kode
                        tiketnya dipakai untuk mengecek perkembangan.
                      </p>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-primary mt-3" disabled>
                        {page.form.submitLabel}
                      </button>

                      <p className="form-footnote">
                        <i className="bi bi-info-circle" aria-hidden="true" />
                        Formulir belum dapat dikirim dari halaman ini.
                        Pengisiannya dilakukan di loket PPID pada jam kerja.
                      </p>
                    </>
                  )}
                </section>
              ) : null}
            </article>
          </DetailLayout>
        </div>
      </section>
    </>
  );
}