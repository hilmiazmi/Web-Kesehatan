"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hrefDaftarOnline } from "@/lib/daftar-online";
import { NAMA_HARI, hariPraktik, isoHariIni, tanggalDekat } from "@/lib/jadwal";

/** Bentuk satu baris dari `GET /api/v1/doctors`. */
type DokterApi = {
  id: string;
  full_name: string;
  title: string | null;
  specialty?: string | null;
};

/** Bentuk satu baris dari `GET /api/v1/doctors/<id>/schedules`. */
type JadwalApi = { id: string; day_of_week: number };

type Muat<T> = { status: "memuat" | "siap" | "gagal"; data: T };

/** Keadaan awal sebelum pembacaan pertama selesai. */
const kosong = <T,>(): Muat<T[]> => ({ status: "memuat", data: [] });

async function ambil<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { data: T };
  return body.data;
}

/**
 * Widget "Cari Jadwal Dokter" di beranda.
 *
 * Daftar dokter dibaca dari `GET /api/v1/doctors`, bukan dari
 * `src/data/doctors.ts`. Widget sebelumnya memakai data lokal yang berisi 60
 * dokter dengan nama yang tidak ada satu pun di database, sementara
 * `POST /api/v1/appointments` memvalidasi `schedule_id` ke database. Setiap
 * dokter yang ditampilkan di sini tapi tidak ada di sana akan ditolak saat
 * pengguna menekan tombol.
 *
 * Pilihan lalu dibawa ke `/daftar-online` lewat query string: `spesialis`,
 * `dokter`, dan `tanggal`. Parameter itu dibaca formulir, jadi orang tidak
 * perlu mengulang pilihannya. Tanggal dikirim sebagai tanggal konkret
 * hasil konversi hari yang dipilih, karena formulir butuh tanggal, bukan
 * nama hari.
 */
export default function DoctorSearchCard() {
  const [dokter, setDokter] = useState<Muat<DokterApi[]>>(kosong);
  /** Jadwal dibaca per dokter, jadi kuncinya ikut disimpan. */
  const [jadwal, setJadwal] = useState<Muat<JadwalApi[]> & { untuk: string }>({
    ...kosong(),
    untuk: "",
  });
  const [spesialitas, setSpesialitas] = useState("");
  const [pilihDokter, setPilihDokter] = useState("");
  const [pilihHari, setPilihHari] = useState(0);

  useEffect(() => {
    let hidup = true;
    ambil<DokterApi[]>("/api/v1/doctors")
      .then((data) => {
        if (hidup) setDokter({ status: "siap", data });
      })
      .catch(() => {
        if (hidup) setDokter({ status: "gagal", data: [] });
      });
    return () => {
      hidup = false;
    };
  }, []);

  // Pilihan dokter dan hari tidak berlaku begitu induknya berubah, jadi
  // ikut dikosongkan. Penyesuaian dilakukan saat render, bukan di effect,
  // mengikuti pola React untuk state turunan.
  const [lastSpesialitas, setLastSpesialitas] = useState(spesialitas);
  if (spesialitas !== lastSpesialitas) {
    setLastSpesialitas(spesialitas);
    setPilihDokter("");
  }
  const [lastDokter, setLastDokter] = useState(pilihDokter);
  if (pilihDokter !== lastDokter) {
    setLastDokter(pilihDokter);
    setPilihHari(0);
  }

  // Jadwal mingguan dokter terpilih, untuk tahu hari mana yang boleh dipilih.
  useEffect(() => {
    if (pilihDokter === "") return;
    let hidup = true;
    ambil<JadwalApi[]>(`/api/v1/doctors/${pilihDokter}/schedules`)
      .then((data) => {
        if (hidup) setJadwal({ status: "siap", data, untuk: pilihDokter });
      })
      .catch(() => {
        if (hidup) setJadwal({ status: "gagal", data: [], untuk: pilihDokter });
      });
    return () => {
      hidup = false;
    };
  }, [pilihDokter]);

  /**
   * Jadwal milik dokter yang sedang dipilih.
   *
   * Diturunkan dari kunci dokter, bukan state terpisah. Effect berjalan
   * sesudah render pertama, jadi dokter yang baru dipilih masih akan memakai
   * jadwal dokter sebelumnya kalau tidak dibandingkan kuncinya.
   */
  const jadwalDipakai: Muat<JadwalApi[]> =
    jadwal.untuk === pilihDokter ? jadwal : { status: "memuat", data: [] };

  /** Spesialitas yang punya dokter, urut abjad. */
  const daftarSpesialitas = useMemo(() => {
    const unik = new Set<string>();
    for (const d of dokter.data) {
      if (d.specialty && d.specialty.trim() !== "") unik.add(d.specialty);
    }
    return [...unik].sort((a, b) => a.localeCompare(b, "id"));
  }, [dokter.data]);

  const dokterSpesialitas = useMemo(
    () =>
      spesialitas
        ? dokter.data.filter((d) => d.specialty === spesialitas)
        : dokter.data,
    [dokter.data, spesialitas],
  );

  const hariTersedia = useMemo(
    () => hariPraktik(jadwalDipakai.data.map((j) => j.day_of_week)),
    [jadwalDipakai.data],
  );

  const dokterTerpilih = dokter.data.find((d) => d.id === pilihDokter);
  const tanggal = pilihHari ? tanggalDekat(isoHariIni(), pilihHari) : null;

  const tujuan = hrefDaftarOnline(undefined, {
    dokter: pilihDokter || undefined,
    tanggal: tanggal ?? undefined,
  }) + (spesialitas && !pilihDokter ? `?spesialis=${encodeURIComponent(spesialitas)}` : "");

  const belumAda = Boolean(spesialitas) && dokterSpesialitas.length === 0;

  return (
    <section id="cari-dokter" className="section pb-3">
      <div className="container position-relative cari-dokter mt-3">
        <div className="row gy-4">
          <div className="col-md-12">
            <div className="row">
              <div className="card">
                <div className="card-title mb-0 text-start">
                  <h3 className="mx-3 mt-3 mb-2">Cari Jadwal Dokter</h3>
                </div>

                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="spesialis">
                        Spesialis
                      </label>
                      <select
                        id="spesialis"
                        name="spesialis"
                        className="form-select"
                        value={spesialitas}
                        onChange={(e) => setSpesialitas(e.target.value)}
                        disabled={dokter.status !== "siap"}
                      >
                        <option value="">Pilih Spesialis</option>
                        {daftarSpesialitas.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mt-3 mt-md-0">
                      <label className="form-label" htmlFor="dokter">
                        Dokter
                      </label>
                      <select
                        id="dokter"
                        name="dokter"
                        className="form-select"
                        value={pilihDokter}
                        onChange={(e) => setPilihDokter(e.target.value)}
                        disabled={!spesialitas || belumAda || dokter.status !== "siap"}
                      >
                        <option value="">
                          {!spesialitas
                            ? "Pilih spesialis dahulu"
                            : belumAda
                              ? "Data dokter belum tersedia"
                              : "Pilih Dokter"}
                        </option>
                        {dokterSpesialitas.map((d) => (
                          <option key={d.id} value={d.id}>
                            {[d.title, d.full_name].filter(Boolean).join(" ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mt-3 mt-md-0">
                      <label className="form-label" htmlFor="hari">
                        Pilihan Hari
                      </label>
                      <select
                        id="hari"
                        name="hari"
                        className="form-select"
                        value={pilihHari}
                        onChange={(e) => setPilihHari(Number(e.target.value))}
                        disabled={!pilihDokter || jadwalDipakai.status !== "siap"}
                      >
                        <option value="">
                          {jadwalDipakai.status === "memuat"
                            ? "Memuat..."
                            : !pilihDokter
                              ? "Pilih dokter dahulu"
                              : hariTersedia.length === 0
                                ? "Dokter ini tidak punya jadwal"
                                : "Pilih Hari"}
                        </option>
                        {hariTersedia.map((n) => (
                          <option key={n} value={n}>
                            {NAMA_HARI[n]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-12 d-flex gap-2 flex-wrap align-items-center">
                      {/* URL hasil pilihan: prefetch URL yang belum final sia-sia. */}
                      <Link
                        href={tujuan}
                        className={`btn btn-primary ${tanggal ? "" : "disabled"}`}
                        prefetch={false}
                        aria-disabled={!tanggal}
                        onClick={(e) => {
                          if (!tanggal) e.preventDefault();
                        }}
                      >
                        Daftar Online
                      </Link>
                      {tanggal && dokterTerpilih ? (
                        <span className="form-konteks mb-0">
                          Lanjut dengan {dokterTerpilih.full_name} pada hari{" "}
                          {NAMA_HARI[pilihHari]}, {tanggal.split("-").reverse().join("/")}.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

