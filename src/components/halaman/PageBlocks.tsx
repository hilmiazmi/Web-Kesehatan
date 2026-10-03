import Link from "next/link";
import GalleryLightbox from "@/components/ui/GalleryLightbox";
import type { BlokHalaman } from "@/data/halaman";
import { childrenOf } from "@/lib/nav-path";

/**
 * Perender isi halaman generik.
 *
 * Blok-blok di `src/data/halaman/` dirender berurutan di sini. styling memakai
 * kelas `halaman-*` di `src/styles/pages.css`.
 *
 * Komponen ini server component: tidak ada state dan tidak ada interaksi
 * di sisi klien, jadi tidak perlu "use client".
 */
export default function PageBlocks({
  blok,
  pathname,
}: {
  blok: BlokHalaman[];
  /** Path halaman, dipakai blok `tautan-anak` untuk mencari anak di menu. */
  pathname: string;
}) {
  return (
    <div className="halaman-isi">
      {blok.map((b, i) => (
        <Blok key={i} blok={b} pathname={pathname} />
      ))}
    </div>
  );
}

function Blok({
  blok,
  pathname,
}: {
  blok: BlokHalaman;
  pathname: string;
}) {
  switch (blok.jenis) {
    case "paragraf":
      return <p className="halaman-teks">{blok.teks}</p>;

    case "sub":
      return <h2 className="halaman-sub">{blok.teks}</h2>;

    case "sub-kecil":
      return <h3 className="halaman-sub-kecil">{blok.teks}</h3>;

    case "daftar":
      return (
        <>
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <ul className={blok.ikon ? "halaman-daftar halaman-daftar-ikon" : "halaman-daftar"}>
            {blok.butir.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      );

    case "daftar-tebal":
      return (
        <>
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <ul className="halaman-daftar">
            {blok.butir.map((t) => (
              <li key={t.tebal}>
                <strong>{t.tebal}</strong> {t.isi}
              </li>
            ))}
          </ul>
        </>
      );

    case "langkah":
      return (
        <>
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <ol className="halaman-langkah">
            {blok.butir.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </>
      );

    case "tabel":
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <div className="halaman-tabel-wrap">
            <table className="table halaman-tabel">
              <thead>
                <tr>
                  {blok.kolom.map((k) => (
                    <th key={k} scope="col">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blok.baris.map((baris, i) => (
                  <tr key={i}>
                    {baris.map((sel, j) => (
                      <td key={j}>{sel}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {blok.catatan ? <p className="halaman-keterangan">{blok.catatan}</p> : null}
        </div>
      );

    case "kartu":
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <div className="halaman-kartu-grid">
            {blok.butir.map((k) => {
              const isi = (
                <>
                  <i className={`bi ${k.ikon} halaman-kartu-ikon`} aria-hidden="true" />
                  <span className="halaman-kartu-judul">{k.judul}</span>
                  <span className="halaman-kartu-isi">{k.isi}</span>
                </>
              );
              return k.href ? (
                <Link key={k.judul} href={k.href} className="halaman-kartu">
                  {isi}
                </Link>
              ) : (
                <div key={k.judul} className="halaman-kartu">
                  {isi}
                </div>
              );
            })}
          </div>
        </div>
      );

    case "statistik":
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <div className="halaman-statistik">
            {blok.butir.map((s) => (
              <div className="halaman-stat" key={s.label}>
                <span className="halaman-stat-nilai">{s.nilai}</span>
                <span className="halaman-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="halaman-keterangan">{blok.catatan}</p>
        </div>
      );

    case "tautan-anak": {
      const anak = childrenOf(pathname);
      if (anak.length === 0) return null;
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          {blok.ket ? <p className="halaman-teks">{blok.ket}</p> : null}
          <ul className="halaman-daftar halaman-daftar-ikon">
            {anak.map((a) => (
              <li key={a.href}>
                <Link href={a.href}>{a.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "tautan":
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
          <p className="halaman-teks">{blok.ket}</p>
          <Link href={blok.href} className="btn btn-primary">
            {blok.label}
          </Link>
        </div>
      );

    case "galeri":
      return (
        <div className="halaman-blok">
          {blok.judul ? <h3 className="halaman-sub-kecil">{blok.judul}</h3> : null}
            <GalleryLightbox foto={blok.foto} height={150} />
          {blok.ket ? <p className="halaman-keterangan">{blok.ket}</p> : null}
        </div>
      );

    case "catatan":
      return (
        <aside className="halaman-catatan">
          {blok.judul ? <strong>{blok.judul} </strong> : null}
          {blok.teks}
        </aside>
      );
  }
}
