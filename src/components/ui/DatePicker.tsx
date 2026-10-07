"use client";

import { useMemo, useState } from "react";
import {
  INISIAL_HARI,
  dariIso,
  hariDalamBulan,
  isoHariIni,
  judulBulan,
  kisiKalender,
  nomorHari,
  tanggalPanjang,
  tanggalPendek,
  tambahHari,
} from "@/lib/jadwal";

/**
 * Pemilih tanggal untuk pendaftaran.
 *
 * Input `type="date"` bawaan peramban sengaja tidak dipakai.inux Dua alasan:
 *
 * Formatnya mengikuti bahasa peramban, sehingga di mesin berbahasa Inggris
 * tampil `mm/dd/yyyy` dan tanggal 7 Oktober terbaca sebagai tanggal 10
 * Juli. Kalender ini selalu `dd/MM/yyyy` dan nama bulan Indonesia.
 *
 * Yang lebih penting, input itu tidak bisa membatasi tanggal yang boleh
 * dipilih. Padahal di sini batasnya nyata: dokter hanya praktik pada hari
 * tertentu, dan memilih tanggal lain berakhir dengan "dokter ini tidak
 * praktik pada tanggal tersebut" setelah pengguna sudah mengisi半个 formulir.
 * Kalender ini menonaktifkan hari itu sejak awal, jadi tanggal yang bisa
 * dipilih selalu hari dokter praktik.
 *
 * Tanggal disimpan sebagai `YYYY-MM-DD` supaya langsung cocok dengan
 * `min` pada input dan dengan parameter `date` di `GET /api/v1/schedules`.
 */
export default function DatePicker({
  nilai,
  onUbah,
  /** Nomor hari yang boleh dipilih, 1 Senin sampai 7 Minggu. Kosong = semua. */
  hariBoleh,
  /** Kalau diisi, hanya tanggal pada bulan ini yang boleh dipilih. */
  batas,
  id = "tanggal",
}: {
  nilai: string;
  onUbah: (iso: string) => void;
  hariBoleh?: number[];
  batas?: string;
  id?: string;
}) {
  const hariIni = isoHariIni();
  const awal = dariIso(nilai) ?? dariIso(hariIni) ?? new Date();
  const [kursor, setKursor] = useState<{ tahun: number; bulan: number }>({
    tahun: awal.getUTCFullYear(),
    bulan: awal.getUTCMonth() + 1,
  });
  const { tahun, bulan } = kursor;

  const bolehPakaiHari = (iso: string): boolean => {
    if (iso < hariIni) return false;
    if (batas !== undefined && iso > batas) return false;
    if (hariBoleh !== undefined && hariBoleh.length > 0) {
      const nomor = nomorHari(iso);
      if (nomor === null || !hariBoleh.includes(nomor)) return false;
    }
    return true;
  };

  const kisi = useMemo(
    () => kisiKalender(tahun, bulan),
    [tahun, bulan],
  );

  /** Geser satu bulan. Batas melompat tidak melewati hari ini. */
  const geser = (bulanDelta: number) => {
    const d = new Date(Date.UTC(tahun, bulan - 1 + bulanDelta, 1));
    setKursor({ tahun: d.getUTCFullYear(), bulan: d.getUTCMonth() + 1 });
  };

  const bisaSebelumnya = useMemo(() => {
    const d = new Date(Date.UTC(tahun, bulan - 2, 1));
    const akhir = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    const isoAkhir = `${akhir.getUTCFullYear()}-${String(akhir.getUTCMonth() + 1).padStart(2, "0")}-${String(akhir.getUTCDate()).padStart(2, "0")}`;
    return isoAkhir >= hariIni;
  }, [tahun, bulan, hariIni]);

  const bisaSesudahnya = useMemo(() => {
    if (batas === undefined) return true;
    const d = new Date(Date.UTC(tahun, bulan, 1));
    const isoAwal = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    return isoAwal <= batas;
  }, [tahun, bulan, batas]);

  const tampil = nilai ? tanggalPendek(nilai) : "Pilih tanggal";

  return (
    <div className="tanggal-pilih">
      <button
        type="button"
        className="tanggal-pilih-kotak"
        onClick={() => document.getElementById(`${id}-buka`)?.focus()}
        aria-expanded="true"
        aria-controls={`${id}-kalender`}
      >
        <span className="tanggal-pilih-label">{tampil}</span>
        <i className="bi bi-calendar3" aria-hidden="true" />
      </button>

      <div className="tanggal-kalender" id={`${id}-kalender`}>
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
          <span className="tanggal-kalender-judul">{judulBulan(tahun, bulan)}</span>
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

        <div className="tanggal-kalender-hari" role="row">
          {INISIAL_HARI.map((h) => (
            <span key={h} className="tanggal-kalender-kepala-hari">
              {h}
            </span>
          ))}
        </div>

        <div className="tanggal-kalender-kisi" role="grid">
          {kisi.map((sel) => {
            const aktif = nilai === sel.iso;
            const bisa = sel.dalamBulan && bolehPakaiHari(sel.iso);
            return (
              <button
                key={sel.iso}
                type="button"
                role="gridcell"
                className={[
                  "tanggal-kalender-sel",
                  sel.dalamBulan ? "" : "di-luar-bulan",
                  aktif ? "dipilih" : "",
                  bisa ? "" : "tidak-bisa",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!bisa}
                aria-current={aktif ? "date" : undefined}
                aria-label={tanggalPanjang(sel.iso)}
                onClick={() => onUbah(sel.iso)}
              >
                {sel.tanggal}
              </button>
            );
          })}
        </div>

        <p className="tanggal-kalender-keterangan">
          {hariBoleh !== undefined && hariBoleh.length > 0
            ? " Tanggal bergaris biru adalah hari dokter praktik. Tanggal lain dinonaktifkan."
            : " Tanggal lampau dinonaktifkan."}
        </p>
      </div>
    </div>
  );
}

/** Nilai default `min` untuk input native yang tetap dipakai di backend. */
export function hariIniIso(): string {
  return isoHariIni();
}

/** Helper yang dipakai induk untuk menggeser hari praktik ke tanggal konkret. */
export { tambahHari, nomorHari, hariDalamBulan };
