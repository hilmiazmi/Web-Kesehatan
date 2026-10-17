"use client";

import { surelValid, teleponFormValid } from "@/lib/validasi-umum";
import { useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";
import DatePicker from "@/components/ui/DatePicker";

/**
 * Formulir pelaporan Whistle Blowing System.
 *
 * Endpointnya `POST /api/v1/wbs-reports`, yang sudah ada dan sudah punya kotak
 * di inbox admin. Semula halaman PPID hanya menampilkan daftar isian dengan
 * tombol yang dimatikan, jadi tidak ada laporan yang bisa masuk dari mana pun.
 *
 * Dua aturan di sini mengikuti aturan yang sudah ada di backend, bukan
 * tambahan sendiri:
 *
 * 1. Laporan anonim harus benar-benar anonim. Saat centang "kirim tanpa
 *    identitas", kolom nama, surel, dan telepon dikosongkan dan tidak dikirim.
 *    Server juga mengabaikannya untuk laporan anonim, jadi tidak ada yang
 *    bocor, tapi kolomnya tidak pernah ikut terisi di mana pun.
 * 2. Kronologi wajib dan minimal 20 karakter. Laporan tanpa kronologi tidak
 *    bisa diperiksa, jadi tombol kirim ditahan di peramban lebih dulu supaya
 *    orang tahu lebih awal.
 */

async function beriTahu(pilihan: SweetAlertOptions): Promise<void> {
  const { default: Swal } = await import("sweetalert2");
  await Swal.fire(pilihan);
}

/** Tingkat keparahan, sesuai enum `wbs_severity`. */
const TINGKAT = [
  { nilai: "low", label: "Rendah", ket: "Tidak mengganggu pelayanan." },
  { nilai: "medium", label: "Sedang", ket: "Mengganggu sebagian pelayanan." },
  { nilai: "high", label: "Tinggi", ket: "Merugikan pasien, pegawai, atau dana rumah sakit." },
] as const;

export type Fields = {
  anonim: boolean;
  nama: string;
  surel: string;
  telepon: string;
  subjek: string;
  kronologi: string;
  tanggal: string;
  lokasi: string;
  unit: string;
  tingkat: string;
  bukti: string;
  website: string;
};

const INITIAL: Fields = {
  anonim: false,
  nama: "",
  surel: "",
  telepon: "",
  subjek: "",
  kronologi: "",
  tanggal: "",
  lokasi: "",
  unit: "",
  tingkat: "medium",
  bukti: "",
  website: "",
};

type GalatApi = {
  error?: { message?: string; fields?: Record<string, string> };
};

const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  subject: "subjek",
  description: "kronologi",
  incident_date: "tanggal",
  location: "lokasi",
  involved_unit: "unit",
  severity: "tingkat",
  reporter_name: "nama",
  reporter_email: "surel",
  reporter_phone: "telepon",
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
 * Yang diperiksa sama dengan batas di server: subjek 5 sampai 220 karakter dan
 * kronologi 20 sampai 10.000 karakter. Surel dan telepon hanya diperiksa kalau
 * laporan tidak anonim dan hanya kalau diisi, karena keduanya opsional.
 */
export function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const subjek = v.subjek.trim();
  const kronologi = v.kronologi.trim();
  const surel = v.surel.trim();
  const telepon = v.telepon.replace(/[\s-]/g, "");

  if (subjek.length < 5) e.subjek = "Subjek minimal 5 karakter.";
  if (subjek.length > 220) e.subjek = "Subjek maksimal 220 karakter.";
  if (kronologi.length < 20) e.kronologi = "Uraikan kejadian minimal 20 karakter.";
  if (kronologi.length > 10000) e.kronologi = "Uraian maksimal 10000 karakter.";

  if (!v.anonim) {
    if (surel !== "" && !surelValid(surel)) {
      e.surel = "Format email tidak valid.";
    }
    if (telepon !== "" && !teleponFormValid(telepon)) {
      e.telepon = "Nomor telepon tidak valid.";
    }
  }

  return e;
}

/**
 * Bentuk request yang dikirim ke `POST /api/v1/wbs-reports`.
 *
 * Saat anonim, ketiga kolom identitas tidak dikirim sama sekali. Server
 * mengabaikannya untuk laporan anonim, jadi mengirim string kosong tidak
 * berbahaya, tapi tidak mengirimnya menutup jalan bagi kode di masa depan untuk
 * ikut membacanya tanpa sengaja.
 *
 * Kolom bukti tidak punya kolom sendiri di endpoint, jadi digabungkan ke
 * uraian kejadian, bukan dibuang. Endpoint `POST /api/v1/wbs-reports` hanya
 * menyimpan satu kolom `description`, dan isian yang hilang tanpa pemberitahuan
 * adalah isian yang tidak bisa dibantah pelapor nanti.
 */
export function buildPayload(v: Fields): Record<string, string | boolean> {
  const bukti = v.bukti.trim();
  const uraian =
    bukti === ""
      ? v.kronologi.trim()
      : `${v.kronologi.trim()}\n\nBukti atau keterangan:\n${bukti}`;

  const body: Record<string, string | boolean> = {
    is_anonymous: v.anonim,
    subject: v.subjek.trim(),
    description: uraian,
    severity: v.tingkat,
    // `website` ikut dikirim supaya kolom perangkap bot bekerja.
    website: v.website,
  };

  if (v.tanggal !== "") body["incident_date"] = v.tanggal;

  const opsional: Record<string, string> = {
    location: v.lokasi,
    involved_unit: v.unit,
  };
  for (const [kolom, nilai] of Object.entries(opsional)) {
    const bersih = nilai.trim();
    if (bersih !== "") body[kolom] = bersih;
  }

  if (!v.anonim) {
    const identitas: Record<string, string> = {
      reporter_name: v.nama,
      reporter_email: v.surel,
      reporter_phone: v.telepon,
    };
    for (const [kolom, nilai] of Object.entries(identitas)) {
      const bersih = nilai.trim();
      if (bersih !== "") body[kolom] = bersih;
    }
  }

  return body;
}

export default function WbsForm() {
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
        title: "Laporan belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);

    try {
      const res = await fetch("/api/v1/wbs-reports", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(buildPayload(values)),
      });

      const body = (await res.json()) as GalatApi & {
        data?: { ticket_code?: string; anonymous?: boolean };
      };

      if (res.status === 201 && body.data) {
        await beriTahu({
          icon: "success",
          title: "Laporan diterima",
          html:
            `Kode tiket: <b>${body.data.ticket_code ?? "-"}</b><br>` +
            (body.data.anonymous === true
              ? "Laporan tercatat tanpa identitas. Simpan kode ini untuk mengecek perkembangannya."
              : "Simpan kode ini untuk mengecek perkembangan laporan."),
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));

      await beriTahu({
        icon: "warning",
        title: "Laporan ditolak",
        text: body.error?.message ?? "Server menolak laporan ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      await beriTahu({
        icon: "error",
        title: "Tidak bisa menghubungi server",
        text: "Laporan gagal dikirim. Periksa koneksi lalu coba lagi.",
        confirmButtonColor: "#1977cc",
      });
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-12">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="wbs-anonim"
              checked={values.anonim}
              onChange={(e) => {
                set("anonim", e.target.checked);
                // Identitas dikosongkan begitu laporan jadi anonim, bukan
                // disembunyikan saja. Kalau hanya disembunyikan, isian lama
                // masih ada di state dan ikut terkirim kalau centangnya
                // dibatalkan tanpa sengaja.
                if (e.target.checked) {
                  setValues((prev) => ({ ...prev, nama: "", surel: "", telepon: "" }));
                  setErrors((prev) => ({
                    ...prev,
                    nama: undefined,
                    surel: undefined,
                    telepon: undefined,
                  }));
                }
              }}
              disabled={kirim}
            />
            <label className="form-check-label" htmlFor="wbs-anonim">
              Kirim laporan tanpa identitas
            </label>
          </div>
          <div className="form-text">
            Nama, surel, dan telepon dikosongkan dan tidak dikirim. Laporan
            tanpa identitas tetap diperiksa, tetapi hasilnya tidak bisa dibalas
            lewat surel.
          </div>
        </div>

        {!values.anonim ? (
          <>
            <div className="col-md-6">
              <label className="form-label" htmlFor="wbs-nama">
                Nama pelapor <span className="text-body-secondary">(opsional)</span>
              </label>
              <input
                id="wbs-nama"
                name="wbs-nama"
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
              <label className="form-label" htmlFor="wbs-surel">
                Surel <span className="text-body-secondary">(opsional)</span>
              </label>
              <input
                id="wbs-surel"
                name="wbs-surel"
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

            <div className="col-md-6">
              <label className="form-label" htmlFor="wbs-telepon">
                Telepon <span className="text-body-secondary">(opsional)</span>
              </label>
              <input
                id="wbs-telepon"
                name="wbs-telepon"
                type="tel"
                className={`form-control${errors.telepon ? " is-invalid" : ""}`}
                value={values.telepon}
                onChange={(e) => set("telepon", e.target.value.replace(/[^\d+]/g, ""))}
                aria-describedby={errors.telepon ? "err-telepon" : undefined}
                autoComplete="tel"
                placeholder="08123456789"
              />
              {errors.telepon ? (
                <div className="invalid-feedback d-block" id="err-telepon">
                  {errors.telepon}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="col-12">
          <label className="form-label" htmlFor="wbs-subjek">
            Subjek laporan
          </label>
          <input
            id="wbs-subjek"
            name="wbs-subjek"
            type="text"
            maxLength={220}
            className={`form-control${errors.subjek ? " is-invalid" : ""}`}
            value={values.subjek}
            onChange={(e) => set("subjek", e.target.value)}
            aria-describedby={errors.subjek ? "err-subjek" : undefined}
            required
          />
          {errors.subjek ? (
            <div className="invalid-feedback d-block" id="err-subjek">
              {errors.subjek}
            </div>
          ) : null}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="wbs-kronologi">
            Uraian kejadian
          </label>
          <textarea
            id="wbs-kronologi"
            name="wbs-kronologi"
            rows={6}
            maxLength={10000}
            className={`form-control${errors.kronologi ? " is-invalid" : ""}`}
            value={values.kronologi}
            onChange={(e) => set("kronologi", e.target.value)}
            aria-describedby={errors.kronologi ? "err-kronologi" : undefined}
            placeholder="Tuliskan kronologi: kapan, di mana, siapa yang terlibat, dan apa yang terjadi."
            required
          />
          {errors.kronologi ? (
            <div className="invalid-feedback d-block" id="err-kronologi">
              {errors.kronologi}
            </div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="wbs-tanggal">
            Tanggal kejadian{" "}
            <span className="text-body-secondary">(opsional)</span>
          </label>
          <DatePicker id="wbs-tanggal" nilai={values.tanggal} hariBoleh={[]} onUbah={(iso) => set("tanggal", iso)} />
          {errors.tanggal ? (
            <div className="invalid-feedback d-block">{errors.tanggal}</div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="wbs-tingkat">
            Tingkat keparahan
          </label>
          <select
            id="wbs-tingkat"
            name="wbs-tingkat"
            className="form-select"
            value={values.tingkat}
            onChange={(e) => set("tingkat", e.target.value)}
          >
            {TINGKAT.map((t) => (
              <option key={t.nilai} value={t.nilai}>
                {t.label} — {t.ket}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="wbs-lokasi">
            Tempat kejadian <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="wbs-lokasi"
            name="wbs-lokasi"
            type="text"
            maxLength={180}
            className="form-control"
            value={values.lokasi}
            onChange={(e) => set("lokasi", e.target.value)}
            placeholder="Loket pendaftaran, ruang inap, atau bagian luar"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="wbs-unit">
            Unit yang terlibat <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="wbs-unit"
            name="wbs-unit"
            type="text"
            maxLength={160}
            className="form-control"
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="wbs-bukti">
            Bukti atau keterangan saksi{" "}
            <span className="text-body-secondary">(opsional)</span>
          </label>
          <textarea
            id="wbs-bukti"
            name="wbs-bukti"
            rows={3}
            maxLength={2000}
            className="form-control"
            value={values.bukti}
            onChange={(e) => set("bukti", e.target.value)}
            placeholder="Dokumen, foto, atau nama saksi. Keterangan ini ikut dibaca petugas lewat kolom kronologi."
          />
          <div className="form-text">
            Isian ini digabungkan ke uraian kejadian saat laporan dikirim,
            karena endpoint menyimpan satu kolom uraian.
          </div>
        </div>

        {/* Perangkap bot, sama seperti tiga formulir lainnya. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="wbs-website">Website</label>
          <input
            id="wbs-website"
            name="wbs-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </div>
      </div>
    </form>
  );
}