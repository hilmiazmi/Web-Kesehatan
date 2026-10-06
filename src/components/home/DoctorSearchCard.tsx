"use client";

import { useState } from "react";
import Link from "next/link";
import { SPECIALTIES } from "@/data/home";
import { DOCTORS, DOCTORS_BY_SPECIALTY } from "@/data/doctors";

/**
 * Widget "Cari Jadwal Dokter" (section 2).
 *
 * Alur sesuai PRD bagian 5.1: pilih spesialisasi, lalu dropdown dokter terisi
 * sesuai spesialisasi itu, lalu pilih hari. Daftar dokter diturunkan dari
 * `src/data/doctors.ts` supaya namanya sama dengan halaman dokter; saat backend
 * PostgreSQL siap, pemanggilan Route Handler `/api/v1/schedules` menggantikannya
 * (rencana di PRD bagian 6.4).
 */
export default function DoctorSearchCard() {
  const [specialty, setSpecialty] = useState("");
  const [doctor, setDoctor] = useState("");
  const [day, setDay] = useState("");

  // Pilihan dokter jadi tidak berlaku begitu spesialisasi diganti, dan pilihan
  // hari jadi tidak berlaku begitu dokternya diganti. Keduanya disesuaikan
  // saat render, bukan di useEffect, mengikuti pola React untuk state turunan.
  const [lastSpecialty, setLastSpecialty] = useState(specialty);
  if (specialty !== lastSpecialty) {
    setLastSpecialty(specialty);
    setDoctor("");
  }

  const doctorOptions = specialty ? (DOCTORS_BY_SPECIALTY[specialty] ?? []) : [];

  const dokterTerpilih = doctor
    ? DOCTORS.find((d) => d.name === doctor)
    : undefined;
  const [lastDoctor, setLastDoctor] = useState(doctor);
  if (doctor !== lastDoctor) {
    setLastDoctor(doctor);
    setDay("");
  }

  // Hari yang ditawarkan hanya hari praktik dokter yang dipilih, bukan semua
  // hari kerja. Tanpa ini pengunjung bisa memilih hari saat dokternya tidak
  // praktik, lalu menekan Daftar Online untuk jadwal yang tidak ada.
  const hariDokter = dokterTerpilih ? dokterTerpilih.schedule.map((s) => s.day) : [];

  // Tidak semua spesialisasi punya daftar dokter di data lokal. Kalau yang
  // dipilih tidak punya, dropdown-nya diberi tahu, bukan dibiarkan
  // aktif tapi kosong supaya pengunjung mengira ada pilihan yang gagal dimuat.
  const belumAdaDokter = Boolean(specialty) && doctorOptions.length === 0;

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
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                      >
                        <option value="">Pilih Spesialis</option>
                        {SPECIALTIES.map((s) => (
                          <option key={s} value={s}>
                            {s.toUpperCase()}
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
                        value={doctor}
                        onChange={(e) => setDoctor(e.target.value)}
                        disabled={!specialty || belumAdaDokter}
                      >
                        <option value="">
                          {!specialty
                            ? "Pilih spesialis dahulu"
                            : belumAdaDokter
                              ? "Data dokter belum tersedia"
                              : "Pilih Dokter"}
                        </option>
                        {doctorOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
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
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        disabled={!doctor}
                      >
                        <option value="">
                          {doctor ? "Pilih Hari" : "Pilih dokter dahulu"}
                        </option>
                        {hariDokter.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-12 d-flex gap-2 flex-wrap">
                      <Link
                         href="/daftar-online"
                        className={`btn btn-primary ${!day ? "disabled" : ""}`}
                        aria-disabled={!day}
                        onClick={(e) => {
                          if (!day) e.preventDefault();
                        }}
                      >
                        Daftar Online
                      </Link>
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