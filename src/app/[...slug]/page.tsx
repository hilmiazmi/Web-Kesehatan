import type { Metadata } from "next";
import Link from "next/link";
import PageBlocks from "@/components/halaman/PageBlocks";
import PageHeader from "@/components/layout/PageHeader";
import { isiHalaman } from "@/data/halaman";
import { CONTACT } from "@/data/navigation";
import { collectNavPaths, humanize, resolveTrail } from "@/lib/nav-path";

/**
 * Halaman umum untuk seluruh link navbar yang belum punya halaman khusus.
 *
 * Route yang lebih spesifik (mis. `/berita/[slug]`) selalu menang atas
 * `[...slug]`, jadi halaman ini hanya menangani sisanya. Gunanya supaya tidak
 * ada tautan mati di navbar.
 *
 * Isinya diambil dari `src/data/halaman/`. Seluruh path yang ada di navigasi
 * sudah punya isi di sana; `tests/halaman.test.ts` menjaganya.
 */

/**
 * Hanya path yang benar-benar ada di menu yang boleh dilayani.
 *
 * Tanpa baris ini, sembarang URL seperti /halaman-acak akan dirender sebagai
 * halaman umum dengan status 200alias soft-404, yang buruk untuk mesin
 * pencari. Dengan `false`, path di luar daftar mengembalikan 404 sungguhan.
 */
export const dynamicParams = false;

/** Prerender semua path navbar. */
export function generateStaticParams() {
  return collectNavPaths();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const trail = resolveTrail(path);
  const title = trail?.at(-1)?.label ?? humanize(slug.at(-1) ?? "");
  // Nama rumah sakit tidak ditambahkan di sini.
  //
  // `src/app/layout.tsx` sudah memasang template `%s | RSUD Contoh Sehat`, jadi
  // menulis `${title} - ${SITE.name}` di sini membuat `<title>` menyebut nama
  // rumah sakit dua kali.
  //
  // Angkanya 30 dari 148 halaman, diukur pada 4 Oktober 2026 dengan
  // menyuntikkan baris ini lalu menjalankan `bun run cek:tautan`. Tiga puluh itu
  // sama dengan jumlah route yang dilayani catch-all, sesuai
  // `collectNavPaths()`, karena hanya route generic yang melewati berkas ini.
  //
  // Halaman yang memang mau menyebut nama rumah sakit di awal judulnya tetap
  // boleh, karena `JUDUL_BOLEH_DOBEL` di `scripts/cek-tautan.ts` yang
  // mengecualikannya.
  return { title };
}

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = "/" + slug.join("/");

  // Breadcrumb dari hierarki menu; fallback ke segment terakhir.
  const navTrail = resolveTrail(path);
  const isi = isiHalaman(path);
  const last = slug.at(-1) ?? "";
  const trail = navTrail?.map((t, i) =>
    i === navTrail.length - 1 ? { label: t.label } : t
  ) ?? [{ label: humanize(last) }];

  return (
    <>
      <PageHeader title={trail.at(-1)?.label ?? humanize(last)} trail={trail} />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {isi ? (
                <>
                  <p className="detail-lead">{isi.ringkas}</p>
                  <PageBlocks blok={isi.blok} pathname={path} />
                </>
              ) : (
                /* Changed Only reachable when a nav link has no content yet.
                   tests/halaman.test.ts fails before that can happen, so this
                   is a guard, not a normal state. */
                <div className="content-placeholder-soft">
                  <p>
                    Halaman{" "}
                    <strong>{trail.at(-1)?.label ?? humanize(last)}</strong> belum
                    dilengkapi isi pada versi demo ini.
                  </p>
                </div>
              )}

              <h2 className="detail-heading mt-5">Informasi Kontak</h2>
              <ul className="detail-list">
                <li>
                  <i className="bi bi-telephone" aria-hidden="true" />
                  Telepon: <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
                </li>
                <li>
                  <i className="bi bi-envelope" aria-hidden="true" />
                  Email: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </li>
                <li>
                  <i className="bi bi-clock" aria-hidden="true" />
                  Rawat jalan: Senin sampai Jumat, pukul 07.30 sampai 14.00
                </li>
                <li>
                  <i className="bi bi-hospital" aria-hidden="true" />
                  Instalasi gawat darurat dan rawat inap: 24 jam
                </li>
              </ul>

              <div className="d-flex gap-2 flex-wrap mt-4">
                <Link href="/" className="btn btn-primary">
                  Kembali ke Home
                </Link>
                <Link href="/daftar-online" className="btn btn-tertiary">
                  Daftar Online
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}