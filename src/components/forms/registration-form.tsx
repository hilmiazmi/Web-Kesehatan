"use client";

import { useState, type FormEvent } from "react";
import Swal from "sweetalert2";
import { SPECIALTIES } from "@/data/home";

/**
 * Formulir pendaftaran online.
 *
 * Validasi berjalan di sisi klien lewat fungsi `validate()` di bawah ini.
 * Belum ada Route Handler,
 * jadi `handleSubmit` baru menampilkan pemberitahuan bahwa backend sedang
 * disiapkan. Saat Route Handler `/api/registrations` siap (PRD bagian 6.4),
 * cukup ganti isi `handleSubmit` dengan fetch; aturan validasinya dipakai ulang.
 */

/**
 * Bentuk nilai formulir.
 *
 * Di-export supaya aturan validasinya bisa diuji langsung tanpa merender
 * komponen. Lihat `tests/registration-form.test.ts`.
 */
export type Fields = {
  nama: string;
  nik: string;
  telepon: string;
  email: string;
  spesialisasi: string;
  tanggal: string;
  metode: string;
  setuju: boolean;
};

const INITIAL: Fields = {
  nama: "",
  nik: "",
  telepon: "",
  email: "",
  spesialisasi: "",
  tanggal: "",
  metode: "jkn",
  setuju: false,
};

/**
 * Periksa satu set field dan kembalikan pesan error per field.
 *
 * Bentuknya sengaja imperative biasa, bukan objek aturan generik: TypeScript
 * bisa menebak tipe tiap field tanpa cast, dan kodenya lebih pendek.
 *
 * Di-export supaya bisa diuji tanpa merender komponen. Fungsi ini murni,
 * tidak menyentuh state React.
 */
export function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const digits = v.telepon.replace(/[\s-]/g, "");
  const today = new Date().toISOString().slice(0, 10);

  if (v.nama.trim().length < 3) e.nama = "Nama lengkap minimal 3 karakter.";
  if (!/^\d{16}$/.test(v.nik)) e.nik = "NIK harus 16 digit angka.";
  if (!/^(\+62|62|0)\d{8,13}$/.test(digits)) {
    e.telepon = "Nomor telepon tidak valid.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    e.email = "Format email tidak valid.";
  }
  if (!v.spesialisasi) e.spesialisasi = "Pilih spesialisasi.";
  if (!v.tanggal || v.tanggal < today) {
    e.tanggal = "Pilih tanggal yang tidak sudah lewat.";
  }
  if (!v.setuju) e.setuju = "Centang persetujuan terlebih dahulu.";

  return e;
}

export default function RegistrationForm() {
  const [values, setValues] = useState<Fields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Hapus pesan error begitu field disentuh lagi.
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const next = validate(values);
    setErrors(next);

    // Jangan lolos ke pemberitahuan sukses kalau masih ada field bermasalah.
    if (Object.keys(next).length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Formulir belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    Swal.fire({
      icon: "info",
      title: "Pendaftaran dicatat sementara",
      html:
        "Validasi formulir berhasil. <b>Penyimpanan ke server belum tersedia</b> " +
        "karena Route Handler <code>/api/registrations</code> masih dikerjakan " +
        "(PRD bagian 6.4). Data Anda tidak dikirim ke mana pun.",
      confirmButtonColor: "#1977cc",
    });
  }

  const err = (k: keyof Fields) =>
    errors[k] ? (
      <div className="invalid-feedback d-block" id={`err-${k}`}>
        {errors[k]}
      </div>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="nama">
            Nama Lengkap
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            className={`form-control${errors.nama ? " is-invalid" : ""}`}
            value={values.nama}
            onChange={(e) => set("nama", e.target.value)}
            aria-describedby={errors.nama ? "err-nama" : undefined}
            required
          />
          {err("nama")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="nik">
            NIK
          </label>
          <input
            id="nik"
            name="nik"
            type="text"
            inputMode="numeric"
            maxLength={16}
            placeholder="16 digit angka"
            className={`form-control${errors.nik ? " is-invalid" : ""}`}
            value={values.nik}
            onChange={(e) => set("nik", e.target.value.replace(/\D/g, ""))}
            aria-describedby={errors.nik ? "err-nik" : undefined}
            required
          />
          {err("nik")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="telepon">
            Nomor Telepon
          </label>
          <input
            id="telepon"
            name="telepon"
            type="tel"
            className={`form-control${errors.telepon ? " is-invalid" : ""}`}
            value={values.telepon}
            onChange={(e) => set("telepon", e.target.value)}
            aria-describedby={errors.telepon ? "err-telepon" : undefined}
            required
          />
          {err("telepon")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={`form-control${errors.email ? " is-invalid" : ""}`}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-describedby={errors.email ? "err-email" : undefined}
            required
          />
          {err("email")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="spesialisasi">
            Spesialisasi
          </label>
          <select
            id="spesialisasi"
            name="spesialisasi"
            className={`form-select${errors.spesialisasi ? " is-invalid" : ""}`}
            value={values.spesialisasi}
            onChange={(e) => set("spesialisasi", e.target.value)}
            aria-describedby={errors.spesialisasi ? "err-spesialisasi" : undefined}
            required
          >
            <option value="">Pilih Spesialisasi</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {err("spesialisasi")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="tanggal">
            Tanggal Rencana
          </label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            className={`form-control${errors.tanggal ? " is-invalid" : ""}`}
            value={values.tanggal}
            onChange={(e) => set("tanggal", e.target.value)}
            aria-describedby={errors.tanggal ? "err-tanggal" : undefined}
            required
          />
          {err("tanggal")}
        </div>

        <div className="col-12">
          <span className="form-label d-block">Metode Pembayaran</span>
          <div className="d-flex gap-4 flex-wrap">
            {[
              { v: "jkn", l: "JKN (BPJS)" },
              { v: "asuransi", l: "Asuransi Swasta" },
              { v: "mandiri", l: "Biaya Mandiri" },
            ].map((m) => (
              <div className="form-check" key={m.v}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="metode"
                  id={`metode-${m.v}`}
                  value={m.v}
                  checked={values.metode === m.v}
                  onChange={(e) => set("metode", e.target.value)}
                />
                <label className="form-check-label" htmlFor={`metode-${m.v}`}>
                  {m.l}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-12">
          <div className="form-check">
            <input
              className={`form-check-input${errors.setuju ? " is-invalid" : ""}`}
              type="checkbox"
              id="setuju"
              checked={values.setuju}
              onChange={(e) => set("setuju", e.target.checked)}
              aria-describedby={errors.setuju ? "err-setuju" : undefined}
            />
            <label className="form-check-label" htmlFor="setuju">
              Saya menyatakan data di atas benar dan bersedia mengikuti
              ketentuan pendaftaran rumah sakit.
            </label>
            {err("setuju")}
          </div>
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary">
            Kirim Pendaftaran
          </button>
        </div>
      </div>
    </form>
  );
}