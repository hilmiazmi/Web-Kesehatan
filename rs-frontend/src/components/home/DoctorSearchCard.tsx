"use client";

import { useState } from "react";
import Link from "next/link";
import { DOCTORS_BY_SPECIALTY, SPECIALTIES } from "@/data/home";

/**
 * Widget "Cari Jadwal Dokter" (section 2).
 *
 * Alur sesuai PRD bagian 5.1: pilih spesialisasi, lalu dropdown dokter terisi
 * sesuai spesialisasi itu, lalu pilih hari. Sumber data saat ini masih data
 * lokal di `src/data/home.ts`; saat backend PostgreSQL siap, bagian
 * `useEffect` ini diganti pemanggilan Route Handler `/api/schedules`
 * (rencana di PRD bagian 6.4).
 */
export default function DoctorSearchCard() {
  const [specialty, setSpecialty] = useState("");
  const [doctor, setDoctor] = useState("");
  const [day, setDay] = useState("");

  // Pilihan dokter jadi tidak berlaku begitu spesialisasi diganti.
  // Disesuaikan saat render, bukan di useEffect, mengikuti pola React
  // untuk state turunan.
  const [lastSpecialty, setLastSpecialty] = useState(specialty);
  if (specialty !== lastSpecialty) {
    setLastSpecialty(specialty);
    setDoctor("");
  }

  const doctorOptions = specialty ? (DOCTORS_BY_SPECIALTY[specialty] ?? []) : [];

  return (
    <section id="cari-dokter" className="dokter section pb-3">
      <div className="container position-relative cari-dokter mt-3">
        <div className="content row gy-4">
          <div className="col-md-12">
            <div className="row">
              <div className="card">
                <div className="card-title mb-0 text-start">
                  <h3 className="mx-3 mt-3 mb-2">Cari Jadwal Dokter</h3>
                </div>

                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 form-group">
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

                    <div className="col-md-4 form-group mt-3 mt-md-0">
                      <label className="form-label" htmlFor="dokter">
                        Dokter
                      </label>
                      <select
                        id="dokter"
                        name="dokter"
                        className="form-select"
                        value={doctor}
                        onChange={(e) => setDoctor(e.target.value)}
                        disabled={!specialty}
                      >
                        <option value="">
                          {specialty ? "Pilih Dokter" : "Pilih spesialis dahulu"}
                        </option>
                        {doctorOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 form-group mt-3 mt-md-0">
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
                        {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
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