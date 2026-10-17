"use client";

import { surelValid } from "@/lib/validasi-umum";
import { useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";

/**
 * Formulir survei kepuasan masyarakat.
 *
 * Endpointnya `POST /api/v1/survey-responses`, yang sudah ada dan sudah punya
 * tempat di panel admin. Semula halaman `/informasi-publik/skm` menyuruh
 * orang mengambil tautan di loket, jadi tidak ada satu pun jawaban yang bisa
 * masuk dari pengunjung.
 *
 * Skor tidak dikirim sebagai `overall_score`. Field itu dihitung ulang oleh
 * server dari jawaban yang dikirim, jadi kalau peramban mengirim angka sendiri
 * dan angkanya berbeda, rata-rata di panel jadi tidak sesuai dengan isian
 * yang dilihat orang. Kirim jawaban saja dan biarkan server yang menghitung.
 */

async function beriTahu(pilihan: SweetAlertOptions): Promise<void> {
  const { default: Swal } = await import("sweetalert2");
  await Swal.fire(pilihan);
}

/**
 * Satu pertanyaan survei.
 *
 * `kunci` dipakai sebagai nama field di `answers` pada database, jadi nilainya
 * ikut tersimpan sebagai kolom rekapitulasi di panel. Menubahnya berarti data
 * lama tidak ikut terbaca di grafik baru.
 */
export type Pertanyaan = {
  kunci: string;
  teks: string;
  /** Penjelasan singkat di bawah pertanyaan. */
  petunjuk?: string;
};

/**
 * Lima pertanyaan inti.
 *
 * Dipakai juga untuk menyusun blok "Apa yang dinilai" di
 * `src/data/halaman/skm.ts`, jadi teks yang tampil di halaman introduction dan
 * yang tampil di formulir tidak bisa berbeda.
 */
export const PERTANYAAN: readonly Pertanyaan[] = [
  { kunci: "kecepatan", teks: "Kecepatan pelayanan", petunjuk: "Dari loket sampai selesai dilayani." },
  { kunci: "keramahan", teks: "Keramahan petugas" },
  { kunci: "kejelasan", teks: "Kejelasan informasi", petunjuk: "Termasuk perkiraan biaya dan waktu tunggu." },
  { kunci: "kenyamanan", teks: "Kebersihan dan kenyamanan ruang tunggu" },
  { kunci: "biaya", teks: "Kesesuaian pelayanan dengan biaya yang dibayar" },
] as const;

export type Fields = {
  /** Nilai 0 berarti belum dinilai, jadi tidak ikut dikirim. */
  jawaban: Record<string, number>;
  unit: string;
  nama: string;
  surel: string;
  komentar: string;
  website: string;
};

const INITIAL: Fields = {
  jawaban: {},
  unit: "",
  nama: "",
  surel: "",
  komentar: "",
  website: "",
};

type GalatApi = {
  error?: { message?: string; fields?: Record<string, string> };
};

const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  answers: "jawaban",
  service_unit: "unit",
  respondent_name: "nama",
  respondent_email: "surel",
  comment: "komentar",
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
 * Yang wajib hanyalah satu: minimal satu pertanyaan dinilai. Server menerima
 * satu jawaban sampai tiga puluh, jadi memblokir orang yang hanya sempat menilai
 * satu hal akan membuat mereka berhentiimpan penilaian yang mereka punya.
 */
export function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const dinilai = PERTANYAAN.filter((p) => {
    const n = v.jawaban[p.kunci];
    return typeof n === "number" && n >= 1 && n <= 5;
  });

  if (dinilai.length === 0) e.jawaban = "Nilai minimal satu pertanyaan.";
  if (v.komentar.length > 2000) e.komentar = "Komentar maksimal 2000 karakter.";
  const surel = v.surel.trim();
  if (surel !== "" && !surelValid(surel)) {
    e.surel = "Format email tidak valid.";
  }

  return e;
}

/**
 * Bentuk request yang dikirim ke `POST /api/v1/survey-responses`.
 *
 * `jawaban` dikirim sebagai objek terpisah, bukanattendeejo diserialkan jadi
 * teks, karena server memvalidasinya sebagai objek angka. Pertanyaan yang
 * belum dinilai tidak dikirim sama sekali: server menghitung skor dari kunci
 * yang ada, dan mengirim `0` akan membuat satu pertanyaan bernilai nol ikut
 * menurunkan rata-rata.
 */
export function buildPayload(v: Fields): {
  answers: Record<string, number>;
  service_unit?: string;
  respondent_name?: string;
  respondent_email?: string;
  comment?: string;
  website: string;
} {
  const answers: Record<string, number> = {};
  for (const p of PERTANYAAN) {
    const n = v.jawaban[p.kunci];
    if (typeof n === "number" && n >= 1 && n <= 5) answers[p.kunci] = n;
  }

  const body: ReturnType<typeof buildPayload> = { answers, website: v.website };
  const opsional: Record<string, string> = {
    service_unit: v.unit,
    respondent_name: v.nama,
    respondent_email: v.surel,
    comment: v.komentar,
  };
  for (const [kolom, nilai] of Object.entries(opsional)) {
    const bersih = nilai.trim();
    if (bersih !== "") body[kolom as "service_unit"] = bersih;
  }

  return body;
}

/** Label nilai 1 sampai 5, sama dengan tabel "Arti setiap nilai" di halaman. */
const LABEL_NILAI = ["", "Sangat kurang", "Kurang", "Cukup", "Baik", "Sangat baik"];

export default function SurveyForm() {
  const [values, setValues] = useState<Fields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [kirim, setKirim] = useState(false);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      await beriTahu({
        icon: "warning",
        title: "Survei belum diisi",
        text: "Beri nilai minimal satu pertanyaan sebelum mengirim.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);

    try {
      const res = await fetch("/api/v1/survey-responses", {
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
          title: "Terima kasih sudah menilai",
          html: `Jawaban Anda tercatat dengan kode <b>${body.data.ticket_code ?? "-"}</b>.`,
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));

      await beriTahu({
        icon: "warning",
        title: "Jawaban ditolak",
        text: body.error?.message ?? "Server menolak jawaban ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      await beriTahu({
        icon: "error",
        title: "Tidak bisa menghubungi server",
        text: "Jawaban gagal dikirim. Periksa koneksi lalu coba lagi.",
        confirmButtonColor: "#1977cc",
      });
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        {PERTANYAAN.map((p) => {
          const nilai = values.jawaban[p.kunci] ?? 0;
          const id = `skm-${p.kunci}`;
          return (
            <div className="col-12" key={p.kunci}>
              <fieldset className="skm-pertanyaan">
                <legend className="form-label" id={`${id}-label`}>
                  {p.teks}
                </legend>
                {p.petunjuk ? (
                  <p className="form-text mt-0 mb-2" id={`${id}-petunjuk`}>
                    {p.petunjuk}
                  </p>
                ) : null}
                <div
                  className="skm-skala"
                  role="radiogroup"
                  aria-labelledby={`${id}-label`}
                  aria-describedby={p.petunjuk ? `${id}-petunjuk` : undefined}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div className="form-check" key={n}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name={p.kunci}
                        id={`${id}-${n}`}
                        value={n}
                        checked={nilai === n}
                        onChange={() =>
                          setValues((prev) => ({
                            ...prev,
                            jawaban: { ...prev.jawaban, [p.kunci]: n },
                          }))
                        }
                        disabled={kirim}
                        aria-label={`${p.teks}: ${LABEL_NILAI[n]}`}
                      />
                      <label className="form-check-label" htmlFor={`${id}-${n}`}>
                        {n}
                        <span className="skm-skala-nama">{LABEL_NILAI[n]}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          );
        })}

        {errors.jawaban ? (
          <div className="col-12">
            <div className="invalid-feedback d-block" id="err-jawaban">
              {errors.jawaban}
            </div>
          </div>
        ) : null}

        <div className="col-md-6">
          <label className="form-label" htmlFor="skm-unit">
            Unit Layanan <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="skm-unit"
            name="skm-unit"
            type="text"
            maxLength={160}
            className={`form-control${errors.unit ? " is-invalid" : ""}`}
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="Poliklinik Umum, Laboratorium"
          />
          {errors.unit ? (
            <div className="invalid-feedback d-block">{errors.unit}</div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="skm-nama">
            Nama <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="skm-nama"
            name="skm-nama"
            type="text"
            maxLength={160}
            className={`form-control${errors.nama ? " is-invalid" : ""}`}
            value={values.nama}
            onChange={(e) => set("nama", e.target.value)}
            autoComplete="name"
          />
          {errors.nama ? (
            <div className="invalid-feedback d-block">{errors.nama}</div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="skm-surel">
            Surel <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="skm-surel"
            name="skm-surel"
            type="email"
            className={`form-control${errors.surel ? " is-invalid" : ""}`}
            value={values.surel}
            onChange={(e) => set("surel", e.target.value)}
            aria-describedby={errors.surel ? "err-surel" : undefined}
            autoComplete="email"
          />
          {errors.surel ? (
            <div className="invalid-feedback d-block" id="err-surel">
              {errors.surel}
            </div>
          ) : null}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="skm-komentar">
            Komentar <span className="text-body-secondary">(opsional)</span>
          </label>
          <textarea
            id="skm-komentar"
            name="skm-komentar"
            rows={4}
            maxLength={2000}
            className={`form-control${errors.komentar ? " is-invalid" : ""}`}
            value={values.komentar}
            onChange={(e) => set("komentar", e.target.value)}
            aria-describedby={errors.komentar ? "err-komentar" : undefined}
            placeholder="Bila ada yang perlu dijelaskan, tulis di sini. Kolom ini dibaca orang, bukan hanya angka."
          />
          {errors.komentar ? (
            <div className="invalid-feedback d-block" id="err-komentar">
              {errors.komentar}
            </div>
          ) : null}
        </div>

        {/* Perangkap bot, sama seperti dua formulir lainnya. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="skm-website">Website</label>
          <input
            id="skm-website"
            name="skm-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Kirim Penilaian"}
          </button>
        </div>
      </div>
    </form>
  );
}