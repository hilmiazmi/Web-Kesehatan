"use client";

import { useState } from "react";
import HasilJadwal, { type JadwalDokter } from "@/components/jadwal/HasilJadwal";

/**
 * Kartu "Cari Dokter" untuk halaman jadwal dokter.
 *
 * Halaman acuan `/jadwal-dokter` di situs referensi memuat tiga pilihan
 * berurutan di dalam satu kartu: Spesialis, Dokter, lalu Pilihan Hari. Label
 * dan jarak antar kolomnya sudah dicocokkan lewat getComputedStyle.
 *
 * Bedanya satu: halaman acuan jadwalnya diambil lewat permintaan jaringan
 * setelah pengunjung memilih. Di sini jadwalnya sudah ikut dirender, jadi
 * langsung tampil tanpa menunggu.
 */
export default function CariDokter({ doctors }: { doctors: JadwalDokter[] }) {
  const [specialty, setSpecialty] = useState("");
  const [doctorSlug, setDoctorSlug] = useState("");
  const [day, setDay] = useState("");

  // Pilihan di bawahnya tidak berlaku begitu spesialisasinya diganti.
  // dilakukan saat render, bukan di useEffect, mengikuti pola React untuk
  // state turunan dan aturan eslint set-state-in-effect.
  const [lastSpecialty, setLastSpecialty] = useState(specialty);
  if (specialty !== lastSpecialty) {
    setLastSpecialty(specialty);
    setDoctorSlug("");
    setDay("");
  }

  const specialties = [...new Set(doctors.map((d) => d.specialty))].sort();
  const filtered = specialty
    ? doctors.filter((d) => d.specialty === specialty)
    : doctors;
  const doctor = doctors.find((d) => d.slug === doctorSlug);

  return (
    <div className="card jadwal-card">
      <div className="card-header jadwal-card-header">
        <h2 className="h5 mb-0">Cari Dokter</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label" htmlFor="jadwal-spesialis">
              Spesialis
            </label>
            <select
              id="jadwal-spesialis"
              className="form-select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              <option value="">Pilih Spesialis</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label" htmlFor="jadwal-dokter">
              Dokter
            </label>
            <select
              id="jadwal-dokter"
              className="form-select"
              value={doctorSlug}
              disabled={!specialty}
              onChange={(e) => {
                setDoctorSlug(e.target.value);
                setDay("");
              }}
            >
              <option value="">
                {specialty ? "Pilih Dokter" : "Pilih spesialis dahulu"}
              </option>
              {filtered.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label" htmlFor="jadwal-hari">
              Pilihan Hari
            </label>
            <select
              id="jadwal-hari"
              className="form-select"
              value={day}
              disabled={!doctorSlug}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="">
                {doctorSlug ? "Pilih Hari" : "Pilih dokter dahulu"}
              </option>
              {(doctor?.schedule ?? []).map((s) => (
                <option key={s.day} value={s.day}>
                  {s.day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {doctor ? <HasilJadwal doctor={doctor} day={day} /> : null}
      </div>
    </div>
  );
}