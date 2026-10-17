"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  INISIAL_HARI,
  dariIso,
  isoHariIni,
  judulBulan,
  kisiKalender,
  nomorHari,
  tanggalPanjang,
  tanggalPendek,
} from "@/lib/jadwal";

/**
 * Pemilih tanggal untuk pendaftaran.
 *
 * Input `type="date"` bawaan peramban sengaja tidak dipakai. Dua alasan:
 *
 * Formatnya mengikuti bahasa peramban, sehingga di mesin berbahasa Inggris
 * tampil `mm/dd/yyyy` dan tanggal 7 Oktober terbaca sebagai 10 Juli.
 * Kalender ini selalu `dd/MM/yyyy` dengan nama bulan Indonesia.
 *
 * Yang lebih penting, input itu tidak bisa membatasi tanggal yang boleh
 * dipilih. Padahal di sini batasnya nyata: dokter hanya praktik pada hari
 * tertentu, dan memilih tanggal lain berakhir dengan "dokter ini tidak
 * praktik pada tanggal tersebut" setelah pengguna sudah mengisi sebagian
 * formulir. Kalender ini menonaktifkan hari itu sejak awal.
 *
 * Tanggal disimpan sebagai `YYYY-MM-DD` supaya langsung cocok dengan
 * parameter `date` di `GET /api/v1/schedules`.
 */
export default function DatePicker({
  nilai,
  onUbah,
  /** Nomor hari yang boleh dipilih, 1 Senin sampai 7 Minggu. Kosong = semua. */
  hariBoleh,
  /** Kalau diisi, hanya tanggal sampai nilai ini yang boleh dipilih. */
  batas,
  /**
   * Id tombol pemicu.
   *
   * Ada supaya `<label htmlFor={id}>` di formulir benar-benar tertaut ke
   * tombolnya. Tanpa itu labelnya menunjuk ke elemen yang tidak ada, dan
   * pembaca layar membacakan "Tanggal Rencana" tanpa tahu kontrol mana yang
   * dimaksud.
   */
  id = "tanggal",
}: {
  nilai: string;
  onUbah: (iso: string) => void;
  hariBoleh?: number[];
  batas?: string;
  id?: string;
}) {
  const hariIni = isoHariIni();
  const dasar = dariIso(nilai) ?? dariIso(hariIni) ?? new Date();

  const [buka, setBuka] = useState(false);
  const [kursor, setKursor] = useState({ tahun: dasar.getUTCFullYear(), bulan: dasar.getUTCMonth() + 1 });
  const akarRef = useRef<HTMLDivElement>(null);

  /** Buka kalender pada bulan tanggal yang sedang dipilih. */
  const bukaKe = (iso: string) => {
    const d = dariIso(iso);
    if (d !== null) setKursor({ tahun: d.getUTCFullYear(), bulan: d.getUTCMonth() + 1 });
  };

  // Ketuk di luar atau tekan Escape menutup kalender. Tanpa dua ini kalender
  // tidak punya jalan keluar selain memilih tanggal, dan kalender yang
  // menempel selamanya menutupi isi di bawahnya.
  useEffect(() => {
    if (!buka) return;

    const tutup = (e: MouseEvent) => {
      if (!akarRef.current?.contains(e.target as Node)) setBuka(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };

    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", escape);
    };
  }, [buka]);

  const bolehPakaiHari = (iso: string): boolean => {
    if (iso < hariIni) return false;
    if (batas !== undefined && iso > batas) return false;
    if (hariBoleh !== undefined && hariBoleh.length > 0) {
      const nomor = nomorHari(iso);
      if (nomor === null || !hariBoleh.includes(nomor)) return false;
    }
    return true;
  };

  const kisi = useMemo(() => kisiKalender(kursor.tahun, kursor.bulan), [kursor]);

  const geser = (delta: number) => {
    const d = new Date(Date.UTC(kursor.tahun, kursor.bulan - 1 + delta, 1));
    setKursor({ tahun: d.getUTCFullYear(), bulan: d.getUTCMonth() + 1 });
  };

  // Bulan sebelumnya tidak ditampilkan kalau seluruh isinya sudah lewat.
  const bisaSebelumnya = useMemo(() => {
    const d = new Date(Date.UTC(kursor.tahun, kursor.bulan - 2, 1));
    const akhir = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    const iso = `${akhir.getUTCFullYear()}-${String(akhir.getUTCMonth() + 1).padStart(2, "0")}-${String(akhir.getUTCDate()).padStart(2, "0")}`;
    return iso >= hariIni;
  }, [kursor, hariIni]);

  const bisaSesudahnya = batas === undefined
    || `${kursor.tahun}-${String(kursor.bulan).padStart(2, "0")}-01` <= batas;

  return (
    <div className="tanggal-pilih" ref={akarRef}>
      <button
        type="button"
        id={id}
        className="tanggal-pilih-kotak"
        onClick={() => {
          bukaKe(nilai || hariIni);
          setBuka((v) => !v);
        }}
        aria-expanded={buka}
        aria-controls={`${id}-kalender`}
      >
        <span className="tanggal-pilih-label">{nilai ? tanggalPendek(nilai) : "Pilih tanggal"}</span>
        <i className="bi bi-calendar3" aria-hidden="true" />
      </button>

      {buka ? (
        <div
          className={`tanggal-kalender${hariBoleh !== undefined && hariBoleh.length > 0 ? " ada-praktik" : ""}`}
          id={`${id}-kalender`}
        >
          <div className="tanggal-kalender-kepala">
            <button
              type="button"
              className="tanggal-kalender-nav"
              onClick={() => geser(-1)}
              disabled={!bisaSebelumnya}
              aria-label="Bulan sebelumnya"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <span className="tanggal-kalender-judul">{judulBulan(kursor.tahun, kursor.bulan)}</span>
            <button
              type="button"
              className="tanggal-kalender-nav"
              onClick={() => geser(1)}
              disabled={!bisaSesudahnya}
              aria-label="Bulan berikutnya"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="tanggal-kalender-hari">
            {INISIAL_HARI.map((h) => (
              <span key={h} className="tanggal-kalender-kepala-hari">{h}</span>
            ))}
          </div>

          <div className="tanggal-kalender-kisi">
            {kisi.map((sel) => {
              const dipilih = nilai === sel.iso;
              const bisa = sel.dalamBulan && bolehPakaiHari(sel.iso);
              return (
                <button
                  key={sel.iso}
                  type="button"
                  className={[
                    "tanggal-kalender-sel",
                    sel.dalamBulan ? "" : "di-luar-bulan",
                    dipilih ? "dipilih" : "",
                    bisa ? "" : "tidak-bisa",
                  ].filter(Boolean).join(" ")}
                  disabled={!bisa}
                  aria-current={dipilih ? "date" : undefined}
                  aria-label={tanggalPanjang(sel.iso)}
                  onClick={() => {
                    onUbah(sel.iso);
                    setBuka(false);
                  }}
                >
                  {sel.tanggal}
                </button>
              );
            })}
          </div>

          <p className="tanggal-kalender-keterangan">
            {hariBoleh !== undefined && hariBoleh.length > 0
              ? "Tanggal bergaris biru adalah hari dokter praktik."
              : "Tanggal lampau dinonaktifkan."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
