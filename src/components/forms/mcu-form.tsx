"use client";

import { surelValid, teleponFormValid } from "@/lib/validasi-umum";
import { useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";

/**
 * Formulir pendaftaran medical check up.
 *
 * Endpointnya `POST /api/v1/mcu-registrations`. Halaman paket sebelumnya hanya
 * mengarahkan orang ke `/daftar-online` dengan pesan supaya nama paket
 * disebutkan di loket, karena belum ada formulir MCU sama sekali. Endpointnya
 * sudah ada dan sudah bisa menyimpan.
 *
 * Paket dikirim lewat `slug`, bukan id, dan endpoint mencari slug itu di
 * database. Karena itu slug halaman paket dan slug di `mcu_packages` harus
 * sama; `tests/mcu-form.test.ts` membacanya dari dua sumber itu.
 */

async function beriTahu(pilihan: SweetAlertOptions): Promise<void> {
  const { default: Swal } = await import("sweetalert2");
  await Swal.fire(pilihan);
}

/** Batas peserta, sama dengan CHECK `participant_count` di database. */
const PESERTA_MAKS = 50;

export type Fields = {
  nama: string;
  telepon: string;
  surel: string;
  perusahaan: string;
  gender: string;
  lahir: string;
  tanggal: string;
  peserta: string;
  catatan: string;
  website: string;
};

const INITIAL: Fields = {
  nama: "",
  telepon: "",
  surel: "",
  perusahaan: "",
  gender: "",
  lahir: "",
  tanggal: "",
  peserta: "1",
  catatan: "",
  website: "",
};

type GalatApi = {
  error?: { message?: string; fields?: Record<string, string> };
};

const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  name: "nama",
  phone: "telepon",
  email: "surel",
  company_name: "perusahaan",
  gender: "gender",
  birth_date: "lahir",
  preferred_date: "tanggal",
  participant_count: "peserta",
  notes: "catatan",
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
 * Satu peserta adalah jumlah yang wajar untuk satu formulir. Formulir rawat
 * jalan tidak menanyakan jumlah orang sama sekali, jadi tanpa nilai bawaan
 * di sini orang akan mengira jumlah peserta ikut berarti jumlah kunjungan.
 */
export function validate(v: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  const surel = v.surel.trim();
  const telepon = v.telepon.replace(/[\s-]/g, "");
  const peserta = Number(v.peserta);

  if (v.nama.trim().length < 3) e.nama = "Nama pemohon minimal 3 karakter.";
  if (v.nama.trim().length > 160) e.nama = "Nama pemohon maksimal 160 karakter.";
  if (!teleponFormValid(telepon)) {
    e.telepon = "Nomor telepon tidak valid.";
  }
  if (surel !== "" && !surelValid(surel)) {
    e.surel = "Format email tidak valid.";
  }
  if (v.perusahaan.trim().length > 180) {
    e.perusahaan = "Nama perusahaan maksimal 180 karakter.";
  }
  if (v.catatan.length > 1000) e.catatan = "Catatan maksimal 1000 karakter.";

  if (!Number.isInteger(peserta) || peserta < 1 || peserta > PESERTA_MAKS) {
    e.peserta = `Jumlah peserta harus antara 1 dan ${PESERTA_MAKS}.`;
  }

  return e;
}

/**
 * Bentuk request yang dikirim ke `POST /api/v1/mcu-registrations`.
 *
 * `participant_count` dikirim sebagai teks, bukan angka, karena endpoint
 * membacanya dengan `angka(body, ...)`, yang menerima keduanya. Yang penting
 * `package` selalu ada: endpoint mencari paket dengan slug itu dan menjawab
 * 404 kalau tidak ditemukan.
 *
 * Field yang kosong tidak dikirim, supaya `birth_date` dan `preferred_date`
 * yang kosong dibaca server sebagai "tidak diisi", bukan sebagai tanggal yang
 * tidak valid.
 */
export function buildPayload(v: Fields, slugPaket: string): Record<string, string> {
  const body: Record<string, string> = {
    package: slugPaket,
    name: v.nama.trim(),
    phone: v.telepon.trim(),
    participant_count: v.peserta.trim(),
    // `website` ikut dikirim supaya kolom perangkap bot bekerja.
    website: v.website,
  };

  const opsional: Record<string, string> = {
    email: v.surel,
    company_name: v.perusahaan,
    gender: v.gender,
    birth_date: v.lahir,
    preferred_date: v.tanggal,
    notes: v.catatan,
  };
  for (const [kolom, nilai] of Object.entries(opsional)) {
    const bersih = nilai.trim();
    if (bersih !== "") body[kolom] = bersih;
  }

  return body;
}

export default function McuForm({ slugPaket, namaPaket }: { slugPaket: string; namaPaket: string }) {
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
        title: "Pendaftaran belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);

    try {
      const res = await fetch("/api/v1/mcu-registrations", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(buildPayload(values, slugPaket)),
      });

      const body = (await res.json()) as GalatApi & {
        data?: { ticket_code?: string; participant_count?: number };
      };

      if (res.status === 201 && body.data) {
        await beriTahu({
          icon: "success",
          title: "Pendaftaran diterima",
          html:
            `Kode tiket: <b>${body.data.ticket_code ?? "-"}</b><br>` +
            `Paket ${namaPaket}, ${body.data.participant_count ?? 1} peserta.<br>` +
            "Petugas menghubungi Anda untuk memastikan jadwal dan persiapannya.",
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));

      await beriTahu({
        icon: "warning",
        title: "Pendaftaran ditolak",
        text: body.error?.message ?? "Server menolak pendaftaran ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      await beriTahu({
        icon: "error",
        title: "Tidak bisa menghubungi server",
        text: "Pendaftaran gagal dikirim. Periksa koneksi lalu coba lagi.",
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
          <label className="form-label" htmlFor="mcu-nama">
            Nama pemohon
          </label>
          <input
            id="mcu-nama"
            name="mcu-nama"
            type="text"
            maxLength={160}
            className={`form-control${errors.nama ? " is-invalid" : ""}`}
            value={values.nama}
            onChange={(e) => set("nama", e.target.value)}
            autoComplete="name"
            required
          />
          {errors.nama ? (
            <div className="invalid-feedback d-block">{errors.nama}</div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="mcu-telepon">
            Nomor telepon
          </label>
          <input
            id="mcu-telepon"
            name="mcu-telepon"
            type="tel"
            className={`form-control${errors.telepon ? " is-invalid" : ""}`}
            value={values.telepon}
            onChange={(e) => set("telepon", e.target.value.replace(/[^\d+]/g, ""))}
            aria-describedby={errors.telepon ? "err-mcu-telepon" : undefined}
            autoComplete="tel"
            placeholder="08123456789"
            required
          />
          {errors.telepon ? (
            <div className="invalid-feedback d-block" id="err-mcu-telepon">
              {errors.telepon}
            </div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="mcu-surel">
            Surel <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="mcu-surel"
            name="mcu-surel"
            type="email"
            className={`form-control${errors.surel ? " is-invalid" : ""}`}
            value={values.surel}
            onChange={(e) => set("surel", e.target.value)}
            aria-describedby={errors.surel ? "err-mcu-surel" : undefined}
            autoComplete="email"
          />
          {errors.surel ? (
            <div className="invalid-feedback d-block" id="err-mcu-surel">
              {errors.surel}
            </div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="mcu-perusahaan">
            Instansi atau perusahaan{" "}
            <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="mcu-perusahaan"
            name="mcu-perusahaan"
            type="text"
            maxLength={180}
            className={`form-control${errors.perusahaan ? " is-invalid" : ""}`}
            value={values.perusahaan}
            onChange={(e) => set("perusahaan", e.target.value)}
            autoComplete="organization"
          />
          {errors.perusahaan ? (
            <div className="invalid-feedback d-block">{errors.perusahaan}</div>
          ) : null}
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="mcu-gender">
            Jenis kelamin <span className="text-body-secondary">(opsional)</span>
          </label>
          <select
            id="mcu-gender"
            name="mcu-gender"
            className="form-select"
            value={values.gender}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Tidak diisi</option>
            <option value="male">Pria</option>
            <option value="female">Wanita</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="mcu-peserta">
            Jumlah peserta
          </label>
          <input
            id="mcu-peserta"
            name="mcu-peserta"
            type="number"
            min={1}
            max={PESERTA_MAKS}
            className={`form-control${errors.peserta ? " is-invalid" : ""}`}
            value={values.peserta}
            onChange={(e) => set("peserta", e.target.value)}
            aria-describedby={errors.peserta ? "err-mcu-peserta" : undefined}
            required
          />
          {errors.peserta ? (
            <div className="invalid-feedback d-block" id="err-mcu-peserta">
              {errors.peserta}
            </div>
          ) : (
            <div className="form-text">Satu peserta untuk satu orang.</div>
          )}
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="mcu-tanggal">
            Tanggal pemeriksaan yang diinginkan{" "}
            <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="mcu-tanggal"
            name="mcu-tanggal"
            type="date"
            className="form-control"
            value={values.tanggal}
            onChange={(e) => set("tanggal", e.target.value)}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="mcu-lahir">
            Tanggal lahir <span className="text-body-secondary">(opsional)</span>
          </label>
          <input
            id="mcu-lahir"
            name="mcu-lahir"
            type="date"
            className="form-control"
            value={values.lahir}
            onChange={(e) => set("lahir", e.target.value)}
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="mcu-catatan">
            Catatan <span className="text-body-secondary">(opsional)</span>
          </label>
          <textarea
            id="mcu-catatan"
            name="mcu-catatan"
            rows={3}
            maxLength={1000}
            className={`form-control${errors.catatan ? " is-invalid" : ""}`}
            value={values.catatan}
            onChange={(e) => set("catatan", e.target.value)}
            aria-describedby={errors.catatan ? "err-mcu-catatan" : undefined}
            placeholder="Kebutuhan khusus, hasil pemeriksaan sebelumnya, atau keterangan lain."
          />
          {errors.catatan ? (
            <div className="invalid-feedback d-block" id="err-mcu-catatan">
              {errors.catatan}
            </div>
          ) : null}
        </div>

        {/* Perangkap bot, sama seperti empat formulir lainnya. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="mcu-website">Website</label>
          <input
            id="mcu-website"
            name="mcu-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Daftar Paket Ini"}
          </button>
        </div>
      </div>
    </form>
  );
}