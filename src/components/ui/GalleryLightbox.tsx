"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import Photo from "@/components/ui/Photo";

/**
 * Satu foto di dalam galeri.
 *
 * Bentuk `src` dan `alt` sama dengan blok `galeri` di data halaman, jadi array
 * dari blok itu bisa langsung dipakai. `caption` opsional untuk grid beranda
 * yang menampilkan nama unit di bawah foto.
 *
 * Grid yang sekaligus menampilkan `caption` sebaiknya mengosongkan `alt`:
 * teks yang sama muncul dua kali kalau keduanya diisi, dan pembaca layar
 * membacakannya dua kali. Keterangan di dalam lightbox memakai `caption`
 * lebih dulu supaya nama unit tetap tampil saat album dibuka.
 */
type Foto = { src: string; alt: string; caption?: string };

/**
 * Galeri foto dengan lightbox.
 *
 * PRD bagian 8.3 menyebut section Gallery sebagai "Grid + lightbox", dan
 * bagian 8.4 menyebut komponen ini dengan nama `GalleryLightbox`. Sebelumnya
 * gridnya statis tanpa interaksi, jadi PRD baru terpenuhi setelah berkas ini
 * dipakai di dua tempat: section Gallery di beranda dan blok `galeri` di
 * halaman generik.
 *
 * Sifat penting:
 *
 * - Pemicunya `<button>`, bukan `<div onClick>`, supaya bisa
 *   dijangkau keyboard dan terbaca screen reader sebagai tombol.
 * - Fokus dikembalikan ke thumbnail yang diklik setelah ditutup. Tanpa itu,
 *   pengguna keyboard akan kembali ke awal halaman.
 * - Tidak ada `setState` di dalam `useEffect`. Effek hanya menyentuh DOM:
 *   mengunci scroll, memasang penangan tombol, dan memindahkan fokus. Index
 *   foto yang sedang aktif disimpan di state, bukan di ref.
 * - Panah kiri dan kanan memutar galeri. `Escape` menutup.
 */
export default function GalleryLightbox({
  foto,
  height = 150,
  sizes = "(max-width: 768px) 50vw, 25vw",
  className = "halaman-galeri",
}: {
  foto: readonly Foto[];
  /** Tinggi thumbnail dalam piksel. */
  height?: number;
  sizes?: string;
  /** Kelas pada wadah grid. Beranda memakai `gallery-grid`. */
  className?: string;
}) {
  /** Index foto yang dibuka, atau `null` saat lightbox tertutup. */
  const [aktif, setAktif] = useState<number | null>(null);
  /** Thumbnail yang diklik, dipakai untuk mengembalikan fokus setelah ditutup. */
  const pemicu = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);

  const terbuka = aktif !== null;

  const buka = useCallback((i: number, peristiwa: MouseEvent<HTMLButtonElement>) => {
    pemicu.current = peristiwa.currentTarget;
    setAktif(i);
  }, []);

  const tutup = useCallback(() => setAktif(null), []);

  const geser = useCallback(
    (arah: 1 | -1) => {
      setAktif((sekarang) =>
        sekarang === null ? null : (sekarang + arah + foto.length) % foto.length
      );
    },
    [foto.length]
  );

  // Efek ini sengaja bergantung pada `terbuka`, bukan pada `aktif`. Kalau ia
  // bergantung pada `aktif`, setiap kali panah ditekan efek ini ikut dibersihkan
  // dan mengembalikan fokus ke thumbnail, sehingga galeri terasa tersendat.
  useEffect(() => {
    if (!terbuka) return;

    const sebelum = document.activeElement as HTMLElement | null;
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialog.current
      ?.querySelector<HTMLButtonElement>("[data-lightbox-tutup]")
      ?.focus();

    return () => {
      document.body.style.overflow = overflowLama;
      (sebelum ?? pemicu.current)?.focus();
    };
  }, [terbuka]);

  useEffect(() => {
    if (!terbuka) return;

    const onTombol = (peristiwa: KeyboardEvent) => {
      if (peristiwa.key === "Escape") {
        peristiwa.preventDefault();
        setAktif(null);
        return;
      }
      if (peristiwa.key === "ArrowRight") {
        peristiwa.preventDefault();
        geser(1);
        return;
      }
      if (peristiwa.key === "ArrowLeft") {
        peristiwa.preventDefault();
        geser(-1);
        return;
      }
      if (peristiwa.key !== "Tab") return;

      // Jebak fokus. Tanpa ini, Tab dari tombol terakhir keluar ke isi
      // halaman di belakang overlay.
      const bisaFokus = dialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!bisaFokus || bisaFokus.length === 0) return;
      const pertama = bisaFokus[0];
      const terakhir = bisaFokus[bisaFokus.length - 1];
      if (peristiwa.shiftKey && document.activeElement === pertama) {
        peristiwa.preventDefault();
        terakhir.focus();
      } else if (!peristiwa.shiftKey && document.activeElement === terakhir) {
        peristiwa.preventDefault();
        pertama.focus();
      }
    };

    document.addEventListener("keydown", onTombol);
    return () => document.removeEventListener("keydown", onTombol);
  }, [terbuka, geser]);

  if (foto.length === 0) return null;

  const kini = aktif === null ? null : foto[aktif];

  return (
    <>
      <div className={className}>
        {foto.map((f, i) => (
          <button
            key={f.src + (f.caption ?? f.alt) + i}
            type="button"
            className="galeri-pemicu"
            onClick={(peristiwa) => buka(i, peristiwa)}
            aria-label={`Perbesar ${f.caption ?? f.alt}`}
          >
            <Photo
              src={f.src}
              alt={f.alt}
              height={height}
              radius="all"
              sizes={sizes}
            />
            {f.caption ? (
              <span className="galeri-keterangan">{f.caption}</span>
            ) : null}
          </button>
        ))}
      </div>

      {kini ? (
        <div
          ref={dialog}
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={kini.alt}
          onClick={tutup}
        >
          <div className="lightbox-kotak" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-tutup"
              data-lightbox-tutup
              onClick={tutup}
              aria-label="Tutup galeri"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="lightbox-navigasi"
              onClick={() => geser(-1)}
              aria-label="Foto sebelumnya"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>

            <figure className="lightbox-gambar">
              <Image
                src={kini.src}
                alt={kini.alt}
                width={1200}
                height={800}
                sizes="(max-width: 768px) 92vw, 80vw"
                priority
              />
              <figcaption className="lightbox-keterangan">
                {kini.caption ?? kini.alt}
                <span className="lightbox-posisi">
                  {(aktif ?? 0) + 1} dari {foto.length}
                </span>
              </figcaption>
            </figure>

            <button
              type="button"
              className="lightbox-navigasi"
              onClick={() => geser(1)}
              aria-label="Foto berikutnya"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
