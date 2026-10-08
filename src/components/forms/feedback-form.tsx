"use client";

import { useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";

/**
 * Formulir kritik dan saran.
 *
 * Isinya dikirim ke `POST /api/v1/feedbacks`, dan hasilnya masuk ke inbox
 * admin. Endpoint itu sudah ada sejak awal, tapi tidak pernah ada formulirnya,
 * jadi tidak ada cara bagi pengunjung mengirim apa pun: kotak di panel admin
 * hanya bisa berisi baris dari `cek:tulis`.
 *
 * Nama, surel, dan telepon semuanya opsional, dan itu bukan kelalaian. Pesan
 * yang paling berguna justru sering datang dari orang yang tidak mau
 * kepada namanya, terutama untuk keluhan. Formulir memperlakukan ketiganya
 * sebagai opsional, dan endpoint-nya sudah begitu juga.
 */

async function beriTahu(pilihan: SweetAlertOptions): Promise<void> {
  const { default: Swal } = await import("sweetalert2");
  await Swal.fire(pilihan);
}

/** Jenis pesan, mengikuti enum `feedback_type`. */
const JENIS = [
  { nilai: "suggestion", label: "Saran perbaikan" },
  { nilai: "complaint", label: "Keluhan" },
  { nilai: "praise", label: "Apresiasi" },
  { nilai: "question", label: "Pertanyaan" },
] as const;

type Fields = {
  jenis: string;
  subjek: string;
  pesan: string;
  unit: string;
  nama: string;
  surel: string;
  telepon: string;
  website: string;
};

const INITIAL: Fields = {
  jenis: "suggestion",
  subjek: "",
  pesan: "",
  unit: "",
  nama: "",
  surel: "",
  telepon: "",
  website: "",
};

type GalatApi = {
  error?: { message?: string; fields?: Record<string, string> };
};

const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  message: "pesan",
  subject: "subjek",
  service_unit: "unit",
  name: "nama",
  email: "surel",
  phone: "telepon",
  feedback_type: "jenis",
};

/** Terjemahkan nama kolom server ke nama field formulir. */
export function petakanKolomServer(
  fields: Record<string, string>,
): Partial<Record<keyof Fields, string>> {
  const out: Partial<Record<keyof Fields, string>> = {};
  for (const [kolom, pesan] of Object.entries(fields)) {
    const field = KOLOM_KE_FIELD[kolom];
    if (field !== undefined) out[field] = pesan;
  }
  return out;
}

/**
 * Periksa isian sebelum dikirim.
 *
 * Hanya dua aturan yang ditegakkan di sini: pesan wajib dan cukup panjang,
 * dan surel harus berbentuk surel kalau diisi. Sisanya sengaja longgar agar
 * orang tidak berhenti di tengah hanya karena satu field opsional belum
 * sesuai. Batas panjang tetap dijaga supaya tidak mengirim 300 KB teks yang
 * ditolak server dengan pesan yang tidak jelas.
 */
export function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const pesan = v.pesan.trim();
  const surel = v.surel.trim();
  const telepon = v.telepon.replace(/[\s-]/g, "");

  if (pesan.length < 10) e.pesan = "Tuliskan pesan minimal 10 karakter.";
  if (pesan.length > 5000) e.pesan = "Pesan maksimal 5000 karakter.";
  if (v.subjek.trim().length > 220) e.subjek = "Subjek maksimal 220 karakter.";
  if (surel !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(surel)) {
    e.surel = "Format email tidak valid.";
  }
  if (telepon !== "" && !/^(\+62|62|0)\d{8,13}$/.test(telepon)) {
    e.telepon = "Nomor telepon tidak valid.";
  }

  return e;
}

/** Bentuk request yang dikirim ke `POST /api/v1/feedbacks`. */
export function buildPayload(v: Fields): Record<string, string> {
  const body: Record<string, string> = {
    feedback_type: v.jenis,
    message: v.pesan.trim(),
    // `website` ikut dikirim supaya kolom perangkap bot bekerja.
    website: v.website,
  };

  const opsional: Record<string, string> = {
    subject: v.subjek,
    service_unit: v.unit,
    name: v.nama,
    email: v.surel,
    phone: v.telepon,
  };
  for (const [kolom, nilai] of Object.entries(opsional)) {
    const bersih = nilai.trim();
    if (bersih !== "") body[kolom] = bersih;
  }

  return body;
}

export default function FeedbackForm() {
  const [values, setValues] = useState<Fields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [kirim, setKirim] = useState(false);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const err = (k: keyof Fields) =>
    errors[k] ? (
      <div className="invalid-feedback d-block" id={`err-${k}`}>
        {errors[k]}
      </div>
    ) : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      await beriTahu({
        icon: "warning",
        title: "Pesan belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);

    try {
      const res = await fetch("/api/v1/feedbacks", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(buildPayload(values)),
      });

      const body = (await res.json()) as GalatApi & {
        data?: { ticket_code?: string; status?: string };
      };

      if (res.status === 201 && body.data) {
        await beriTahu({
          icon: "success",
          title: "Pesan terkirim",
          html:
            `Terima kasih. Kode tiket: <b>${body.data.ticket_code ?? "-"}</b><br>` +
            "Simpan kode ini untuk mengecek perkembangannya. Balasan kami " +
            "dikirim lewat surel kalau surel Anda diisi.",
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));

      await beriTahu({
        icon: "warning",
        title: "Pesan ditolak",
        text: body.error?.message ?? "Server menolak permintaan ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      await beriTahu({
        icon: "error",
        title: "Tidak bisa menghubungi server",
        text: "Pesan gagal dikirim. Periksa koneksi lalu coba lagi.",
        confirmButtonColor: "#1977cc",
      });
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-jenis">
            Jenis Pesan
          </label>
          <select
            id="fb-jenis"
            name="fb-jenis"
            className={`form-select${errors.jenis ? " is-invalid" : ""}`}
            value={values.jenis}
            onChange={(e) => set("jenis", e.target.value)}
            required
          >
            {JENIS.map((j) => (
              <option key={j.nilai} value={j.nilai}>
                {j.label}
              </option>
            ))}
          </select>
          {err("jenis")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-subjek">
            Subjek <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="fb-subjek"
            name="fb-subjek"
            type="text"
            maxLength={220}
            className={`form-control${errors.subjek ? " is-invalid" : ""}`}
            value={values.subjek}
            onChange={(e) => set("subjek", e.target.value)}
            aria-describedby={errors.subjek ? "err-subjek" : undefined}
          />
          {err("subjek")}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="fb-pesan">
            Pesan
          </label>
          <textarea
            id="fb-pesan"
            name="fb-pesan"
            rows={5}
            maxLength={5000}
            className={`form-control${errors.pesan ? " is-invalid" : ""}`}
            value={values.pesan}
            onChange={(e) => set("pesan", e.target.value)}
            aria-describedby={errors.pesan ? "err-pesan" : undefined}
            placeholder="Tuliskan keluhan, saran, atau pertanyaan Anda."
            required
          />
          {err("pesan")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-unit">
            Unit Layanan <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="fb-unit"
            name="fb-unit"
            type="text"
            maxLength={160}
            className={`form-control${errors.unit ? " is-invalid" : ""}`}
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="Poliklinik Umum, Laboratorium, Loket Pendaftaran"
          />
          {err("unit")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-nama">
            Nama <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="fb-nama"
            name="fb-nama"
            type="text"
            maxLength={160}
            className={`form-control${errors.nama ? " is-invalid" : ""}`}
            value={values.nama}
            onChange={(e) => set("nama", e.target.value)}
            autoComplete="name"
          />
          {err("nama")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-surel">
            Surel <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="fb-surel"
            name="fb-surel"
            type="email"
            className={`form-control${errors.surel ? " is-invalid" : ""}`}
            value={values.surel}
            onChange={(e) => set("surel", e.target.value)}
            aria-describedby={errors.surel ? "err-surel" : undefined}
            autoComplete="email"
          />
          {err("surel")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="fb-telepon">
            Telepon <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="fb-telepon"
            name="fb-telepon"
            type="tel"
            inputMode="numeric"
            className={`form-control${errors.telepon ? " is-invalid" : ""}`}
            value={values.telepon}
            onChange={(e) => set("telepon", e.target.value.replace(/[^\d+]/g, ""))}
            aria-describedby={errors.telepon ? "err-telepon" : undefined}
            autoComplete="tel"
            placeholder="08123456789"
          />
          {err("telepon")}
        </div>

        {/* Perangkap bot, sama seperti dua formulir lainnya. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="fb-website">Website</label>
          <input
            id="fb-website"
            name="fb-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Kirim Pesan"}
          </button>
        </div>
      </div>
    </form>
  );
}