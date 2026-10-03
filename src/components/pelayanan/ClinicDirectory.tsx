"use client";

import { useId, useRef, useState } from "react";
import Photo from "@/components/ui/Photo";
import {
  ClinicCardGrid,
  type ClinicCard,
} from "@/components/pelayanan/ClinicCardGrid";
import { GALLERY_PHOTOS, photo } from "@/data/images";
import {
  cariKlinik,
  type DokterCari,
} from "@/lib/cari-klinik";

/** Satu tab klinik, beserta isi panel yang tampil ketika tabnya dipilih. */
export type ClinicTab = {
  slug: string;
  name: string;
  description: string;
  services: string[];
  hours: string;
};

/**
 * Direktori klinik untuk halaman /pelayanan/poliklinik.
 *
 * Polanya ditiru dari halaman /poliklinik di situs referensi: daftar klinik
 * berupa tab vertikal di kolom kiri, isi klinik terpilih di kolom kanan.
 *
 * Ukuran tombol, warna, dan radius diukur dari sana lewat getComputedStyle():
 *   tombol 229 x 38px, latar #f2f7fc, teks #444, radius 5px, font 12px,
 *   margin 6px 3px, dan yang aktif latar #1977cc dengan teks putih.
 *
 * Kolom membagi 3 dan 9, sama seperti halaman acuan.
 *
 * Tab memakai <button>, bukan <a>, karena yang diklik hanya mengganti panel
 * dan tidak berpindah halaman.
 *
 * Hanya panel aktif yang dirender. Karena itu `aria-controls` hanya dipasang
 * pada tab yang sedang terpilih; kalau dipasang juga pada tab lain, id yang
 * ditunjuknya tidak ada di DOM dan pembaca layar akan diam.
 *
 * Data dikirim dari halaman server sebagai props, bukan diimpor dari
 * `@/data/clinics`. Modul itu memuat isi penuh 25 halaman detail klinik —
 * deskripsi, daftar layanan, jam praktik — yang tidak pernah dirender di sini.
 * Mengimpornya akan mengirim semuanya ke browser tanpa ada yang memakainya.
 *
 * Pencarian teksnya dihitung oleh `cariKlinik()` di `src/lib/cari-klinik.ts`,
 * bukan di dalam komponen. Alasannya supaya aturannya bisa diuji tanpa
 * merender apa pun.
 *
 * `setState` tidak pernah dipanggil dari dalam `useEffect`, karena aturan
 * eslint `react-hooks/set-state-in-effect` melarangnya. Perpindahan tab karena
 * kata kunci berubah ditangani di dalam `onChange`, bukan saat render.
 */
export default function ClinicDirectory({
  clinics,
  details,
  doctors,
}: {
  clinics: ClinicTab[];
  details: (ClinicCard & { specialty?: string })[];
  doctors: DokterCari[];
}) {
  const [cari, setCari] = useState("");
  const [aktif, setAktif] = useState(0);
  const daftarTab = useRef<(HTMLButtonElement | null)[]>([]);
  const idCari = useId();

  const hasil = cariKlinik(clinics, details, doctors, cari);

  /**
   * Tab yang tampil.
   *
   * Indeks `aktif` bisa menunjuk ke luar daftar hasil saringan, karena daftar
   * itu ikut berubah mengikuti kata kunci. Karena itu dipakai `?? daftar[0]`
   * supaya panel tidak pernah crash. `onChange` di bawah sudah mengembalikan
   * `aktif` ke nol setiap kali kata kunci berubah, jadi kasus ini hanya
   * muncul sesaat di antara dua render.
   */
  const klinik = hasil.klinik[aktif] ?? hasil.klinik[0];
  const totalKlinik = hasil.klinik.length;
  const totalDokter = hasil.klinik.reduce(
    (n, k) => n + (hasil.dokter[k.slug]?.length ?? 0),
    0,
  );

  /**
   * Kata kunci baru selalu memculkan klinik pertama.
   *
   * Ini dilakukan di dalam penanganan peristiwa, bukan saat render. Versi
   * pertama memakai penyesuaian saat render dengan pasangan `lastX` dan
   * `setLastX`, dan itu berputar tanpa henti: ketika saringan mengembalikan
   * nol klinik, syarat "harus kembali ke yang pertama" tetap berlaku di setiap
   * render sehingga React melempar "Too many re-renders".
   */
  const ubahKataKunci = (nilai: string) => {
    setCari(nilai);
    setAktif(0);
  };

  /** Panah atas dan bawah memindahkan tab, sesuai pola tablist vertikal. */
  const geser = (arah: 1 | -1) => {
    if (hasil.klinik.length === 0) return;
    const berikut = (aktif + arah + hasil.klinik.length) % hasil.klinik.length;
    setAktif(berikut);
    daftarTab.current[berikut]?.focus();
  };

  return (
    <div className="row g-4">
      <div className="col-md-3">
        {/* Pencarian poliklinik. Labelnya terlihat, bukan hanya untuk pembaca
            layar, karena kotak ini tidak punya penjelasan lain yang
            menjelaskan apa yang diisikan. */}
        <div className="klinik-cari">
          <label className="klinik-cari-label" htmlFor={idCari}>
            Cari klinik
          </label>
          <input
            id={idCari}
            type="search"
            className="form-control klinik-cari-input"
            placeholder="Nama klinik, layanan, atau dokter"
            value={cari}
            onChange={(e) => ubahKataKunci(e.target.value)}
            autoComplete="off"
          />
          {/* Ringkasan hasil diumumkan pembaca layar setiap kali kata kunci
              berubah, karena daftar tab di bawahnya ikut berubah. */}
          <p className="klinik-cari-hasil" role="status" aria-live="polite">
            {cari.trim().length === 0
              ? `${totalKlinik} klinik. Tulis di atas untuk menyaring.`
              : totalKlinik === 0
                ? `Tidak ada klinik yang cocok dengan "${cari.trim()}".`
                : `${totalKlinik} klinik cocok dengan "${cari.trim()}"${totalDokter > 0 ? `, ${totalDokter} dokter` : ""}.`}
          </p>
        </div>

        <ul className="klinik-tab-list" role="tablist" aria-orientation="vertical">
          {hasil.klinik.map((k, i) => (
            <li key={k.slug} role="presentation">
              <button
                type="button"
                role="tab"
                id={`klinik-tab-${k.slug}`}
                aria-selected={i === aktif}
                aria-controls={
                  i === aktif ? `klinik-panel-${k.slug}` : undefined
                }
                // Roving tabindex: hanya tab terpilih yang bisa difokuskan,
                // supaya penfocusan tidak berhenti di 16 tab satu per satu.
                tabIndex={i === aktif ? 0 : -1}
                ref={(el) => {
                  daftarTab.current[i] = el;
                }}
                className={`klinik-tab${i === aktif ? " aktif" : ""}`}
                onClick={() => setAktif(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    geser(1);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    geser(-1);
                  }
                }}
              >
                {k.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-md-9">
        {klinik === undefined ? (
          <div className="klinik-panel klinik-panel-kosong">
            <h2 className="klinik-panel-title">Klinik tidak ditemukan</h2>
            <p className="klinik-panel-desc">
              Tidak ada klinik yang cocok dengan &quot;{cari.trim()}&quot;.
              Coba kata yang lebih umum, atau{" "}
              <button
                type="button"
                className="klinik-cari-reset"
                onClick={() => ubahKataKunci("")}
              >
                kosongkan kata kunci
              </button>{" "}
              untuk melihat semua klinik.
            </p>
          </div>
        ) : (
        <div
          className="klinik-panel"
          role="tabpanel"
          id={`klinik-panel-${klinik.slug}`}
          aria-labelledby={`klinik-tab-${klinik.slug}`}
          tabIndex={0}
        >
          <div className="row g-4 align-items-start">
            <div className="col-sm-5">
              <Photo
                src={photo(GALLERY_PHOTOS[aktif % GALLERY_PHOTOS.length], 400, 400)}
                alt={klinik.name}
                sizes="(max-width: 576px) 100vw, 240px"
                height={180}
                radius="all"
              />
            </div>

            <div className="col-sm-7">
              <h2 className="klinik-panel-title">{klinik.name}</h2>
              <p className="klinik-panel-desc">{klinik.description}</p>

              <h3 className="klinik-panel-sub">Layanan</h3>
              <ul className="detail-list">
                {klinik.services.map((s) => (
                  <li key={s}>
                    <i className="bi bi-check-circle" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>

              {/* Daftar dokter per klinik. Hanya muncul kalau klinik ini punya
                  dokter, dan isinya disaring oleh kata kunci yang sama. */}
              {(hasil.dokter[klinik.slug]?.length ?? 0) > 0 && (
                <>
                  <h3 className="klinik-panel-sub">Dokter</h3>
                  <ul className="detail-list">
                    {hasil.dokter[klinik.slug]!.map((d) => (
                      <li key={d.slug}>
                        <i className="bi bi-person-badge" aria-hidden="true" />
                        {d.name}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="klinik-panel-hours">
                <i className="bi bi-clock" aria-hidden="true" />
                {klinik.hours}
              </p>
            </div>
          </div>

          <ClinicCardGrid
            list={(hasil.detail[klinik.slug] ?? []) as ClinicCard[]}
          />
        </div>
        )}
      </div>
    </div>
  );
}