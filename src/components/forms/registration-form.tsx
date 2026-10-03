"use client";

import { useEffect, useState, type FormEvent } from "react";
import Swal from "sweetalert2";

/**
 * Formulir pendaftaran online (E-Pasien).
 *
 * Alurnya mengikuti PRD bagian 5.2: pilih dokter, pilih tanggal kunjungan, pilih
 * slot jam, isi data diri, pilih cara pembayaran, lalu mendapat nomor antrean.
 *
 * Endpoint-nya `POST /api/v1/appointments`. Bentuk kirimannya bukan sama
 * dengan nama field di formulir ini, jadi penerjemahannya dilakukan di
 * `buildPayload` dan diuji terpisah: nama field API berbahasa Inggris, nama
 * field formulir berbahasa Indonesia.
 *
 * Slot jam diambil dari `GET /api/v1/schedules`, yang sudah memfilter jadwal
 * menurut hari praktik. Karena itu tanggal yang dipilih selalu cocok dengan
 * slot yang ditawarkan, dan validasi
 * tidak perlu menghitung sendiri hari apa.
 */

/** Bentuk nilai formulir. */
export type Fields = {
  nama: string;
  nik: string;
  telepon: string;
  email: string;
  /** UUID dokter, bukan namanya. */
  dokter: string;
  tanggal: string;
  /** UUID jadwal, bukan label jamnya. */
  slot: string;
  keluhan: string;
  metode: string;
  setuju: boolean;
  /**
   * Kolom perangkap bot, tidak pernah diisi manusia.
   *
   * Ada di `Fields` supaya nilainya ikut terkirim ke server, bukan supaya divalidasi.
   */
  website: string;
};

/** Cara pembayaran yang bisa dipilih di formulir. */
export type MetodePembayaran = "jkn" | "asuransi" | "mandiri";

/** Nilai enum `payment_type` di database. */
export type PaymentType = "general" | "bpjs" | "insurance";

/** Satu dokter dari `GET /api/v1/doctors`. */
export type Dokter = {
  id: string;
  full_name: string;
  title: string | null;
  specialty?: string;
};

/** Satu jadwal dari `GET /api/v1/schedules`. */
export type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  room: string | null;
  polyclinic: string;
  quota: number;
  note: string | null;
  /** Hanya terisi kalau jadwalnya diminta untuk satu tanggal tertentu. */
  remaining?: number;
};

/** Hasil `POST /api/v1/appointments` kalau diminta. */
export type Konfirmasi = {
  ticket_code: string;
  queue_number: number;
  patient_name: string;
  doctor_name: string;
  specialty: string | null;
  polyclinic: string;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  status: string;
  remaining_quota: number | null;
};

/** Bentuk galat yang dikembalikan endpoint `handle`. */
type GalatApi = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

const INITIAL: Fields = {
  nama: "",
  nik: "",
  telepon: "",
  email: "",
  dokter: "",
  tanggal: "",
  slot: "",
  keluhan: "",
  metode: "jkn",
  setuju: false,
  website: "",
};

/**
 * Tanggal hari ini dalam waktu setempat, bentuk `YYYY-MM-DD`.
 *
 * Sengaja tidak memakai `toISOString()`: itu menghasilkan tanggal dalam UTC.
 * WIB tujuh jam di depan UTC, jadi antara pukul 00:00 dan 06:59 waktu
 * setempat tanggal UTC masih kemarin. Formulir lalu menerima booking
 * kemarin sebagai "tidak sudah lewat".
 */
function tanggalHariIni(): string {
  const d = new Date();
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

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
  const today = tanggalHariIni();

  if (v.nama.trim().length < 3) e.nama = "Nama lengkap minimal 3 karakter.";
  if (v.nama.trim().length > 160) e.nama = "Nama lengkap maksimal 160 karakter.";
  if (!/^\d{16}$/.test(v.nik)) e.nik = "NIK harus 16 digit angka.";
  if (!/^(\+62|62|0)\d{8,13}$/.test(digits)) {
    e.telepon = "Nomor telepon tidak valid.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    e.email = "Format email tidak valid.";
  }
  if (!v.dokter) e.dokter = "Pilih dokter.";
  if (!v.tanggal || v.tanggal < today) {
    e.tanggal = "Pilih tanggal yang tidak sudah lewat.";
  }
  if (!v.slot) e.slot = "Pilih jam kunjungan.";
  if (v.keluhan.length > 1000) e.keluhan = "Keluhan maksimal 1000 karakter.";
  if (!v.setuju) e.setuju = "Centang persetujuan terlebih dahulu.";

  return e;
}

/**
 * Terjemahkan cara pembayaran di formulir ke nilai enum di database.
 *
 * Nilai yang tidak dikenal menjadi `general`, bukan gagal: kalau ada opsi
 * baru yang belum diterjemahkan, pendaftaran tetap bisa jalan dan tercatat
 * sebagai biaya mandiri, yang paling sering benar.
 */
export function paymentTypeFor(metode: string): PaymentType {
  if (metode === "jkn") return "bpjs";
  if (metode === "asuransi") return "insurance";
  return "general";
}

/**
 * Bentuk request yang dikirim ke `POST /api/v1/appointments`.
 *
 * Field yang tidak ada di formulir sengaja tidak dikirim, bukan dikirim sebagai
 * string kosong: server membaca `""` sebagai "tidak diisi" untuk field opsional,
 * jadi kosongkan sama saja. `website` justru ikut kirim supaya kolom perangkap
 * bot bekerja.
 */
export function buildPayload(v: Fields): Record<string, string> {
  const body: Record<string, string> = {
    patient_name: v.nama.trim(),
    nik: v.nik,
    phone: v.telepon.trim(),
    email: v.email.trim(),
    payment_type: paymentTypeFor(v.metode),
    visit_date: v.tanggal,
    schedule_id: v.slot,
    website: v.website,
  };

  const keluhan = v.keluhan.trim();
  if (keluhan !== "") body.complaint = keluhan;

  return body;
}

/**
 * Terjemahkan nama field di galat server ke nama field di formulir.
 *
 * Server memakai nama kolom database, formulir memakai bahasa Indonesia.
 * Pemetaan ditulis sebagai tabel satu arah supaya ada nama yang lupa dipetakan
 * akan terlihat oleh tes, bukan lolos diam-diam.
 */
const KOLOM_KE_FIELD: Record<string, keyof Fields> = {
  patient_name: "nama",
  nik: "nik",
  phone: "telepon",
  email: "email",
  visit_date: "tanggal",
  schedule_id: "slot",
  complaint: "keluhan",
  payment_type: "metode",
};

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
 * Jam dari `"08:00:00"` jadi `"08.00"`.
 *
 * Format titik sudah dipakai seluruh halaman lain, dan kolom database
 * menyimpan detik yang tidak pernah ditampilkan ke pengunjung.
 */
export function waktuPendek(waktu: string | null): string {
  if (!waktu) return "";
  return waktu.slice(0, 5).replace(":", ".");
}

/** Label satu opsi dokter di dropdown. */
export function labelDokter(d: Dokter): string {
  const depan = [d.title, d.full_name].filter(Boolean).join(" ");
  return d.specialty ? `${depan} — ${d.specialty}` : depan;
}

/**
 * Label satu opsi slot di dropdown.
 *
 * Slot yang kuotanya habis tetap ditampilkan, dengan penanda "penuh", karena
 * menyembunyikannya membuat pengunjung mengira dokter itu tidak praktik pada
 * tanggal tersebut.
 */
export function labelSlot(s: Slot): string {
  const jam = `${waktuPendek(s.start_time)}-${waktuPendek(s.end_time)}`;
  const bagian = [jam, s.polyclinic];
  if (s.room) bagian.push(`Ruang ${s.room}`);
  if (s.note) bagian.push(s.note);
  return `${bagian.join(" · ")}${slotPenuh(s) ? " (penuh)" : ""}`;
}

/** Sisa kuota saat ini, atau `null` kalau angka sisa kuota tidak diketahui. */
export function sisaSlot(s: Slot): number | null {
  return typeof s.remaining === "number" ? s.remaining : null;
}

/** Slot yang kuotanya sudah habis tidak boleh dipilih. */
export function slotPenuh(s: Slot): boolean {
  const sisa = sisaSlot(s);
  return sisa !== null && sisa <= 0;
}

/** Bentuk hasil satu pembacaan API. */
type Muat<T> = {
  /** Kunci permintaan, supaya hasil lama tidak dipakai untuk permintaan baru. */
  kunci: string;
  status: "memuat" | "siap" | "gagal";
  data: T;
};

const KUNCI_DOKTER = "dokter";

/**
 * Ambil satu amplop `{ data }` dari API.
 *
 * Dilempar kalau statusnya bukan 2xx supaya pemanggil bisa membedakan "kosong"
 * dari "gagal". Tanpa itu, halaman yang gagal memuat akan tampil sebagai
 * daftar kosong, dan pengunjung mengira tidak ada dokter yang bisa dipilih.
 */
async function ambilJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { data: T };
  return body.data;
}

export default function RegistrationForm() {
  const [values, setValues] = useState<Fields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [dokter, setDokter] = useState<Muat<Dokter[]>>({
    kunci: "",
    status: "memuat",
    data: [],
  });
  const [slot, setSlot] = useState<Muat<Slot[]>>({ kunci: "", status: "memuat", data: [] });
  const [kirim, setKirim] = useState(false);

  // Daftar dokter tidak bergantung pada pilihan lain, jadi dibaca sekali.
  useEffect(() => {
    let hidup = true;

    ambilJson<Dokter[]>("/api/v1/doctors")
      .then((data) => {
        if (hidup) setDokter({ kunci: KUNCI_DOKTER, status: "siap", data });
      })
      .catch(() => {
        if (hidup) setDokter({ kunci: KUNCI_DOKTER, status: "gagal", data: [] });
      });

    return () => {
      hidup = false;
    };
  }, []);

  // Slot bergantung pada dokter dan tanggal, jadi dibaca ulang setiap kali
  // salah satu berubah. Keduanya diturunkan jadi nilai biasa lebih dulu supaya
  //-effect tidak ikut depend ke objek `values` seluruhnya.
  const idDokter = values.dokter;
  const hariKunjungan = values.tanggal;
  const kunciSlot = `${idDokter}|${hariKunjungan}`;

  useEffect(() => {
    if (idDokter === "" || hariKunjungan === "") return;

    let hidup = true;
    const qs = new URLSearchParams({ doctor: idDokter, date: hariKunjungan });

    ambilJson<{ items: Slot[] }>(`/api/v1/schedules?${qs.toString()}`)
      .then((body) => {
        if (hidup) setSlot({ kunci: kunciSlot, status: "siap", data: body.items ?? [] });
      })
      .catch(() => {
        if (hidup) setSlot({ kunci: kunciSlot, status: "gagal", data: [] });
      });

    return () => {
      hidup = false;
    };
  }, [idDokter, hariKunjungan, kunciSlot]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Hapus pesan error begitu field disentuh lagi.
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /**
   * Slot yang sedang dibaca.
   *
   * Kalau kunci hasil baca berbeda dengan kunci yang sedang dibutuhkan,
   * pembacaan lama dianggap "sedang memuat" tanpa menulis state di mana pun:
   * menulis state saat render dilarang aturan `set-state-in-render`.
   */
  const sudahLengkap = values.dokter !== "" && values.tanggal !== "";
  const slotView: Muat<Slot[]> =
    slot.kunci === kunciSlot
      ? slot
      : { kunci: kunciSlot, status: sudahLengkap ? "memuat" : "siap", data: [] };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const next = validate(values);
    setErrors(next);

    // Jangan lolos ke pengiriman kalau masih ada field bermasalah.
    if (Object.keys(next).length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Formulir belum lengkap",
        text: "Periksa kembali bagian yang ditandai merah.",
        confirmButtonColor: "#1977cc",
      });
      return;
    }

    setKirim(true);

    try {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(buildPayload(values)),
      });

      const body = (await res.json()) as GalatApi & { data?: Konfirmasi };

      if (res.status === 201 && body.data) {
        Swal.fire({
          icon: "success",
          title: "Pendaftaran berhasil",
          html:
            `Nomor antrean Anda <b>${body.data.queue_number}</b>.<br>` +
            `Kode tiket: <b>${body.data.ticket_code}</b><br>` +
            `${body.data.doctor_name} — ${body.data.polyclinic}, mulai ${waktuPendek(body.data.start_time)}.`,
          confirmButtonColor: "#1977cc",
        });
        setValues(INITIAL);
        return;
      }

      // Galat validasi server menyebut nama fieldnya, jadi pesan bisa
      // muncul di samping field yang salah, bukan cuma di modal.
      if (body.error?.fields) setErrors(petakanKolomServer(body.error.fields));

      Swal.fire({
        icon: "warning",
        title: "Pendaftaran ditolak",
        text: body.error?.message ?? "Server menolak permintaan ini.",
        confirmButtonColor: "#1977cc",
      });
    } catch {
      Swal.fire({
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
      <div className="invalid-feedback d-block" id={`err-${k}`}>
        {errors[k]}
      </div>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="dokter">
            Dokter
          </label>
          <select
            id="dokter"
            name="dokter"
            className={`form-select${errors.dokter ? " is-invalid" : ""}`}
            value={values.dokter}
            onChange={(e) => set("dokter", e.target.value)}
            aria-describedby={errors.dokter ? "err-dokter" : undefined}
            disabled={dokter.status !== "siap"}
            required
          >
            <option value="">
              {dokter.status === "memuat"
                ? "Memuat daftar dokter..."
                : dokter.status === "gagal"
                  ? "Daftar dokter gagal dimuat"
                  : "Pilih Dokter"}
            </option>
            {dokter.data.map((d) => (
              <option key={d.id} value={d.id}>
                {labelDokter(d)}
              </option>
            ))}
          </select>
          {err("dokter")}
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="tanggal">
            Tanggal Rencana
          </label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            min={tanggalHariIni()}
            className={`form-control${errors.tanggal ? " is-invalid" : ""}`}
            value={values.tanggal}
            onChange={(e) => {
              // Slot milik tanggal lama tidak berlaku lagi, jadi ikut
              // dikosongkan supaya tidak pernah terkirim ke server.
              setValues((prev) => ({ ...prev, tanggal: e.target.value, slot: "" }));
              setErrors((prev) => ({ ...prev, tanggal: undefined, slot: undefined }));
            }}
            aria-describedby={errors.tanggal ? "err-tanggal" : undefined}
            required
          />
          {err("tanggal")}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="slot">
            Jam Kunjungan
          </label>
          <select
            id="slot"
            name="slot"
            className={`form-select${errors.slot ? " is-invalid" : ""}`}
            value={values.slot}
            onChange={(e) => set("slot", e.target.value)}
            aria-describedby={errors.slot ? "err-slot" : undefined}
            disabled={!values.dokter || !values.tanggal || slotView.status !== "siap"}
            required
          >
            <option value="">
              {!values.dokter
                ? "Pilih dokter dan tanggal terlebih dahulu"
                : !values.tanggal
                  ? "Pilih tanggal terlebih dahulu"
                  : slotView.status === "memuat"
                    ? "Memuat jam yang tersedia..."
                    : slotView.status === "gagal"
                      ? "Jam yang tersedia gagal dimuat"
                      : slotView.data.length === 0
                        ? "Dokter ini tidak praktik pada tanggal tersebut"
                        : "Pilih Jam"}
            </option>
            {slotView.data.map((s) => (
              <option key={s.id} value={s.id} disabled={slotPenuh(s)}>
                {labelSlot(s)}
              </option>
            ))}
          </select>
          {err("slot")}
        </div>

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

        <div className="col-12">
          <label className="form-label" htmlFor="keluhan">
            Keluhan <span className="text-body-secondary">(opsional)</span>
          </label>
          <textarea
            id="keluhan"
            name="keluhan"
            rows={3}
            maxLength={1000}
            className={`form-control${errors.keluhan ? " is-invalid" : ""}`}
            value={values.keluhan}
            onChange={(e) => set("keluhan", e.target.value)}
            aria-describedby={errors.keluhan ? "err-keluhan" : undefined}
          />
          {err("keluhan")}
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

        {/*
          Kolom perangkap bot. `visually-hidden` menyembunyikannya dari
          mata dan dari urutan tab, tapi tidak menghapus dari DOM, sehingga
          pembaca layar yang membacakan isi formulir tetap membacanya kosong
          dan robot yang mengisi setiap isian akan tersingkir.
        */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={kirim}>
            {kirim ? "Mengirim..." : "Kirim Pendaftaran"}
          </button>
        </div>
      </div>
    </form>
  );
}