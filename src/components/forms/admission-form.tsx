"use client";

import { teleponFormValid } from "@/lib/validasi-umum";
import { useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";
import DatePicker from "@/components/ui/DatePicker";
import { isoHariIni } from "@/lib/jadwal";

/**
 * Formulir permintaan rawat inap.
 *
 * Sengaja terpisah dari `registration-form.tsx`. Dua layanan ini tidak punya
 * masalah yang sama: rawat jalan memilih dokter dan jam tertentu sehingga
 * perlu kalender yang hanya membuka hari praktik. Rawat inap tidak memilih
 * dokter sama sekali; yang dipilih adalah kelas perawatan dan perkiraan lama
 * inap. Memakai satu formulir untuk keduanya akan memaksa salah satu dari
 * keduanya punya field yang tidak pernah dipakai.
 *
 * Endpointnya `POST /api/v1/admissions`, terpisah dari
 * `POST /api/v1/appointments`, dan kode tiket-nya berawalan `RI` supaya tidak
 * tertukar di loket yang sama.
 */

async function beriTahu(pilihan: SweetAlertOptions): Promise<void> {
  const { default: Swal } = await import("sweetalert2");
  await Swal.fire(pilihan);
}

/** Kelas perawatan beserta perkiraan biaya per malam, dari API. */
const KELAS = [
  { nilai: "intensive", label: "Intensive Care", ket: "Pemantauan terus-menerus, untuk pasien yang butuh instability tinggi." },
  { nilai: "intermediate", label: "Intermediate Care", ket: "Perawatan setengah, antara perawatan biasa dan intensive." },
  { nilai: "regular", label: "Perawatan Reguler", ket: "Kamar biasa dengan kunjungan dokter harian." },
  { nilai: "private", label: "Kelas Privat", ket: "Satu kamar satu pasien, dengan fasilitas tambahan." },
] as const;

const BIAYA: Record<string, number> = {
  intensive: 3_500_000,
  intermediate: 2_200_000,
  regular: 1_400_000,
  private: 5_000_000,
};

type Fields = {
  nama: string;
  nik: string;
  telepon: string;
  email: string;
  alamat: string;
  kelas: string;
  tanggal: string;
  malam: string;
  rujukan: string;
  keluhan: string;
  metode: string;
  setuju: boolean;
  website: string;
};

const INITIAL: Fields = {
  nama: "",
  nik: "",
  telepon: "",
  email: "",
  alamat: "",
  kelas: "",
  tanggal: "",
  malam: "1",
  rujukan: "",
  keluhan: "",
  metode: "jkn",
  setuju: false,
  website: "",
};

type GalatApi = {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  patient_name: "nama",
  nik: "nik",
  phone: "telepon",
  email: "email",
  address: "alamat",
  requested_class: "kelas",
  entry_date: "tanggal",
  estimated_nights: "malam",
  referral_source: "rujukan",
  complaint: "keluhan",
  payment_type: "metode",
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

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function AdmissionForm() {
  const [values, setValues] = useState<Fields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [kirim, setKirim] = useState(false);

  /**
   * Tanggal hari ini untuk dibandingkan dengan tanggal yang dipilih.
   *
   * Dihitung saat render, bukan disimpan dalam effect: nilai ini hanya
   * berubah ketika halaman dimuat ulang, jadi menyimpannya di state hanya
   * menambah render kedua tanpa menambah informasi. `DatePicker` melakukan
   * hal yang sama secara terpisah.
   */
  const hariIni = isoHariIni();

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const perkiraan = values.kelas ? (BIAYA[values.kelas] ?? 0) * Number(values.malam || 0) : 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const next: Partial<Record<keyof Fields, string>> = {};
    if (values.nama.trim().length < 3) next.nama = "Nama lengkap minimal 3 karakter.";
    if (!/^\d{16}$/.test(values.nik)) next.nik = "NIK harus 16 digit angka.";
    if (!teleponFormValid(values.telepon)) {
      next.telepon = "Nomor telepon tidak valid.";
    }
    if (!values.kelas) next.kelas = "Pilih kelas perawatan.";
    if (!values.tanggal || values.tanggal < hariIni) {
      next.tanggal = "Pilih tanggal yang tidak sudah lewat.";
    }
    const malam = Number(values.malam);
    if (!Number.isInteger(malam) || malam < 1 || malam > 30) {
      next.malam = "Jumlah malam harus antara 1 dan 30.";
    }
    if (!values.setuju) next.setuju = "Centang persetujuan terlebih dahulu.";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      await beriTahu({
        icon: "warning",
        title: "Formulir belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);
    try {
      const res = await fetch("/api/v1/admissions", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          patient_name: values.nama.trim(),
          nik: values.nik,
          phone: values.telepon.trim(),
          email: values.email.trim(),
          address: values.alamat.trim() || undefined,
          referral_source: values.rujukan.trim() || undefined,
          complaint: values.keluhan.trim() || undefined,
          requested_class: values.kelas,
          entry_date: values.tanggal,
          estimated_nights: String(malam),
          payment_type:
            values.metode === "jkn" ? "bpjs" : values.metode === "asuransi" ? "insurance" : "general",
          website: values.website,
        }),
      });

      const body = (await res.json()) as GalatApi & {
        data?: {
          ticket_code: string;
          requested_class: string;
          estimated_nights: number;
          estimated_cost_per_night: number;
        };
      };

      if (res.status === 201 && body.data) {
        const label = KELAS.find((k) => k.nilai === body.data?.requested_class)?.label ?? "";
        await beriTahu({
          icon: "success",
          title: "Permintaan rawat inap terkirim",
          html:
            `Kode tiket: <b>${body.data.ticket_code}</b><br>` +
            `Kelas: ${label}, ${body.data.estimated_nights} malam.<br>` +
            `Perkiraan biaya kamar ${rupiah.format(body.data.estimated_cost_per_night)} per malam. ` +
            `Petugas menghubungi Anda untuk memastikan waktu masuk.`,
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));
      await beriTahu({
        icon: "warning",
        title: "Permintaan ditolak",
        text: body.error?.message ?? "Server menolak permintaan ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      await beriTahu({
        icon: "error",
        title: "Tidak bisa menghubungi server",
        text: "Permintaan gagal dikirim. Periksa koneksi lalu coba lagi.",
        confirmButtonColor: "#1977cc",
      });
    } finally {
      setKirim(false);
    }
  }

  const err = (k: keyof Fields) =>
    errors[k] ? (
      <div className="invalid-feedback d-block" id={`err-inap-${k}`}>
        {errors[k]}
      </div>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-12">
          <span className="form-label d-block">Kelas Perawatan</span>
          <div className="row g-2">
            {KELAS.map((k) => (
              <div className="col-md-6" key={k.nilai}>
                <label className={`kelas-pilih ${values.kelas === k.nilai ? "dipilih" : ""}`}>
                  <input
                    type="radio"
                    name="kelas"
                    className="visually-hidden"
                    value={k.nilai}
                    checked={values.kelas === k.nilai}
                    onChange={() => set("kelas", k.nilai)}
                  />
                  <span className="kelas-pilih-nama">{k.label}</span>
                  <span className="kelas-pilih-ket">{k.ket}</span>
                  <span className="kelas-pilih-biaya">
                    {rupiah.format(BIAYA[k.nilai] ?? 0)} per malam
                  </span>
                </label>
              </div>
            ))}
          </div>
          {err("kelas")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-tanggal">
            Rencana Tanggal Masuk
          </label>
          <DatePicker
            id="inap-tanggal"
            nilai={values.tanggal}
            hariBoleh={[]}
            onUbah={(iso) => set("tanggal", iso)}
          />
          {err("tanggal")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-malam">
            Perkiraan Lama Inap (malam)
          </label>
          <input
            id="inap-malam"
            name="malam"
            type="number"
            min={1}
            max={30}
            className={`form-control${errors.malam ? " is-invalid" : ""}`}
            value={values.malam}
            onChange={(e) => set("malam", e.target.value)}
          />
          {err("malam")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-nama">
            Nama Lengkap
          </label>
          <input
            id="inap-nama"
            type="text"
            className={`form-control${errors.nama ? " is-invalid" : ""}`}
            value={values.nama}
            onChange={(e) => set("nama", e.target.value)}
          />
          {err("nama")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-nik">
            NIK
          </label>
          <input
            id="inap-nik"
            inputMode="numeric"
            maxLength={16}
            placeholder="16 digit angka"
            className={`form-control${errors.nik ? " is-invalid" : ""}`}
            value={values.nik}
            onChange={(e) => set("nik", e.target.value.replace(/\D/g, ""))}
          />
          {err("nik")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-telepon">
            Nomor Telepon
          </label>
          <input
            id="inap-telepon"
            type="tel"
            inputMode="numeric"
            maxLength={15}
            placeholder="08123456789"
            className={`form-control${errors.telepon ? " is-invalid" : ""}`}
            value={values.telepon}
            onChange={(e) => set("telepon", e.target.value.replace(/[^\d+]/g, ""))}
          />
          {err("telepon")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-email">
            Email
          </label>
          <input
            id="inap-email"
            type="email"
            className="form-control"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="inap-rujukan">
            Asal Rujukan
          </label>
          <input
            id="inap-rujukan"
            type="text"
            placeholder="Poliklinik, IGD, atau rujukan luar"
            className="form-control"
            value={values.rujukan}
            onChange={(e) => set("rujukan", e.target.value)}
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="inap-alamat">
            Alamat
          </label>
          <input
            id="inap-alamat"
            type="text"
            className="form-control"
            value={values.alamat}
            onChange={(e) => set("alamat", e.target.value)}
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="inap-keluhan">
            Keluhan <span className="text-body-secondary">(opsional)</span>
          </label>
          <textarea
            id="inap-keluhan"
            rows={3}
            maxLength={1000}
            className="form-control"
            value={values.keluhan}
            onChange={(e) => set("keluhan", e.target.value)}
          />
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
                  name="metode-inap"
                  id={`metode-inap-${m.v}`}
                  value={m.v}
                  checked={values.metode === m.v}
                  onChange={() => set("metode", m.v)}
                />
                <label className="form-check-label" htmlFor={`metode-inap-${m.v}`}>
                  {m.l}
                </label>
              </div>
            ))}
          </div>
        </div>

        {perkiraan > 0 ? (
          <div className="col-12">
            <p className="form-konteks mb-0">
              Perkiraan biaya {Number(values.malam)} malam pada kelas terpilih:{" "}
              <strong>{rupiah.format(perkiraan)}</strong>. Angka ini perkiraan;
              biaya sebenarnya ditentukan petugas sesuai kondisi pasien.
            </p>
          </div>
        ) : null}

        <div className="col-12">
          <div className="form-check">
            <input
              className={`form-check-input${errors.setuju ? " is-invalid" : ""}`}
              type="checkbox"
              id="setuju-inap"
              checked={values.setuju}
              onChange={(e) => set("setuju", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="setuju-inap">
              Saya menyatakan data di atas benar dan bersedia mengikuti ketentuan
              pendaftaran rawat inap rumah sakit.
            </label>
            {err("setuju")}
          </div>
        </div>

        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="website-inap">Website</label>
          <input
            id="website-inap"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Kirim Permintaan"}
          </button>
        </div>
      </div>
    </form>
  );
}
