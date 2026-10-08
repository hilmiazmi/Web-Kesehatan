"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

/**
 * Panel ketersediaan tempat tidur.
 *
 * Angkanya dibaca dari `GET /api/v1/beds`, bukan dari modul data lokal.
 * Modul lokal pernah menjadi sumber angka halaman ini, sementara database
 * sudah punya tabel `bed_capacity` yang juga dipakai dasbor admin. Dua sumber
 * untuk fakta yang sama pasti akan berbeda pada akhir: angka yang tampil di sini
 * tidak akan sama dengan angka yang dilihat petugas di panel.
 *
 * Ketersediaan bersifat hasil peninjauan, bukan janji. Karena itu waktu
 * peninjauan terakhir ikut ditampilkan: pengunjung bisa menilai sendiri
 * seberapa baru angkanya, dan petugas tahu kapan datanya perlu diperbarui
 * lagi.
 */

/** Satu ruang dari `GET /api/v1/beds`. */
type Ruang = {
  ward_name: string;
  class_name: string;
  room_code: string | null;
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  gender_policy: string | null;
  note: string | null;
  /** Waktu peninjauan dalam ISO 8601 dengan penanda `Z`. */
  observed_at: string;
};

/** Ringkasan seluruh ruang dari `GET /api/v1/beds`. */
type Ringkasan = {
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  occupancy_percent: number;
  observed_at: string | null;
  room_count: number;
};

type Muat = { status: "memuat" | "siap" | "gagal"; data: { items: Ruang[]; summary: Ringkasan } | null };

/** Keadaan awal sebelum pembacaan pertama selesai. */
const awal: Muat = { status: "memuat", data: null };

async function ambil(url: string): Promise<{ items: Ruang[]; summary: Ringkasan }> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: { items?: Ruang[]; summary?: Ringkasan };
  };
  if (!body.data?.summary) throw new Error("respons tanpa ringkasan");
  return { items: body.data.items ?? [], summary: body.data.summary };
}

/**
 * Waktu peninjauan dalam bahasa manusia, atau `null` kalau belum ada.
 *
 * Ditambah jam WIB karena angka yang dikirim backend adalah UTC dengan penanda
 * `Z`, sedangkan pembaca di sini berada di WIB. Tanpa itu, waktu yang tampil
 * tertujuh jam dan terlihat seperti peninjauan semalam.
 */
export function waktuTinjauan(iso: string | null): string | null {
  if (iso === null || iso === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${formatDate(iso)}, ${d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })} WIB`;
}

export default function KapasitasBedPanel({ lengkap = true }: { lengkap?: boolean }) {
  const [muat, setMuat] = useState<Muat>(awal);

  useEffect(() => {
    let hidup = true;

    ambil("/api/v1/beds")
      .then((data) => {
        if (hidup) setMuat({ status: "siap", data });
      })
      .catch(() => {
        if (hidup) setMuat({ status: "gagal", data: null });
      });

    return () => {
      hidup = false;
    };
  }, []);

  if (muat.status === "gagal") {
    return (
      <div className="halaman-keterangan" role="alert">
        Data ketersediaan tempat tidur gagal dimuat. Muat ulang halaman atau
        hubungi loket informasi.
      </div>
    );
  }

  // Ringkasan dan tabel sengaja menampilkan tanda hubung saat masih memuat,
  // bukan angka nol. Angka nol berarti "tidak ada tempat tidur", dan itu
  // informasi yang salah sehingga tidak boleh tampil sebelum data tiba.
  const s = muat.data?.summary ?? null;
  const angka = (n: number | undefined): string =>
    muat.status === "siap" && n !== undefined ? String(n) : "-";

  const ditinjau = waktuTinjauan(s?.observed_at ?? null);

  return (
    <div>
      <div className="halaman-statistik mb-3">
        <div className="halaman-stat">
          <span className="halaman-stat-nilai">{angka(s?.total_beds)}</span>
          <span className="halaman-stat-label">Total tempat tidur</span>
        </div>
        <div className="halaman-stat">
          <span className="halaman-stat-nilai">{angka(s?.available_beds)}</span>
          <span className="halaman-stat-label">Tersedia</span>
        </div>
        <div className="halaman-stat">
          <span className="halaman-stat-nilai">{angka(s?.occupied_beds)}</span>
          <span className="halaman-stat-label">Terisi</span>
        </div>
        <div className="halaman-stat">
          <span className="halaman-stat-nilai">{angka(s?.reserved_beds)}</span>
          <span className="halaman-stat-label">Dipesan</span>
        </div>
        <div className="halaman-stat">
          <span className="halaman-stat-nilai">{angka(s?.room_count)}</span>
          <span className="halaman-stat-label">Ruang perawatan</span>
        </div>
      </div>

      <p className="halaman-keterangan">
        {ditinjau !== null ? (
          <>
            Angka terakhir ditinjau pada <time dateTime={s?.observed_at ?? undefined}>{ditinjau}</time>.
          </>
        ) : (
          "Waktu peninjauan terakhir belum tersedia."
        )}{" "}
        Ketersediaan berubah setiap jam dan bukan jaminan kamar kosong.
        Permintaan masuk tetap diteruskan ke petugas untuk dipastikan.
      </p>

      {lengkap ? (
        <div className="halaman-tabel-wrap mt-3">
          <table className="table halaman-tabel">
            <thead>
              <tr>
                <th scope="col">Ruang</th>
                <th scope="col">Kelas</th>
                <th scope="col">Kode ruang</th>
                <th scope="col">Total</th>
                <th scope="col">Terisi</th>
                <th scope="col">Dipesan</th>
                <th scope="col">Tersedia</th>
                <th scope="col">Kebijakan</th>
              </tr>
            </thead>
            <tbody>
              {muat.status === "siap" && (muat.data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="halaman-keterangan">
                    Belum ada ruang yang tercatat.
                  </td>
                </tr>
              ) : (
                (muat.data?.items ?? []).map((r) => (
                  <tr key={`${r.ward_name}-${r.room_code ?? ""}`}>
                    <th scope="row">{r.ward_name}</th>
                    <td>{r.class_name}</td>
                    <td>{r.room_code ?? "-"}</td>
                    <td>{r.total_beds}</td>
                    <td>{r.occupied_beds}</td>
                    <td>{r.reserved_beds}</td>
                    <td>{r.available_beds}</td>
                    <td>{r.gender_policy ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 mb-0">
          <Link href="/kapasitas-bed" className="btn btn-tertiary">
            Rincian Kapasitas Bed
          </Link>
        </p>
      )}
    </div>
  );
}