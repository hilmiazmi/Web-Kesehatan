"use client";

import { useState } from "react";
import type { FieldSummary } from "@/components/admin/types";
import type { NilaiForm } from "@/components/admin/nilai-form";

/**
 * Form tambah/ubah satu baris.
 *
 * Jenis inputnya diturunkan dari `kind` spec, bukan ditulis per tabel.
 * Menambah jenis field baru di registry berarti menambah satu cabang di sini,
 * dan jenis yang tidak dikenali jatuh ke input teks supaya data tetap bisa
 * disimpan, bukan membuat form berhenti total.
 *
 * State form disimpan lokal di sini. Induk hanya menerima hasil akhirnya lewat
 * `onSimpan`, dan mengirim kembali `galatField` dari server supaya pesan
 * validasi muncul di samping input yang salah.
 */
export default function FormBaris({
  fields,
  awal,
  galatField,
  sibuk,
  onBatal,
  onSimpan,
}: {
  fields: readonly FieldSummary[];
  awal: NilaiForm;
  galatField: Record<string, string>;
  sibuk: boolean;
  onBatal: () => void;
  onSimpan: (nilai: NilaiForm) => Promise<boolean>;
}) {
  const [nilai, setNilai] = useState<NilaiForm>(awal);

  const set = (column: string, value: string | boolean) => {
    setNilai((prev) => ({ ...prev, [column]: value }));
  };

  return (
    <form
      className="admin-panel admin-form mb-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSimpan(nilai);
      }}
      noValidate
    >
      <div className="admin-form-grid">
        {fields
          .filter((f) => !f.readonly)
          .map((f) => (
            <div key={f.column} className={lebar(f.kind) === 2 ? "admin-span-2" : undefined}>
              <label className="form-label" htmlFor={`admin-${f.column}`}>
                {f.label}
                {f.required ? (
                  <span className="admin-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                ) : null}
              </label>
              <Masukan field={f} nilai={nilai[f.column]} onUbah={(v) => set(f.column, v)} />
              {galatField[f.column] ? (
                <div className="invalid-feedback d-block" id={`admin-err-${f.column}`}>
                  {galatField[f.column]}
                </div>
              ) : null}
            </div>
          ))}
      </div>

      <div className="d-flex gap-2 mt-3">
        <button type="submit" className="btn btn-primary" disabled={sibuk}>
          {sibuk ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onBatal}
          disabled={sibuk}
        >
          Batal
        </button>
      </div>
    </form>
  );
}

/** Berapa kolom grid yang dipakai satu input. */
function lebar(kind: string): number {
  if (kind === "long" || kind === "markdown") return 2;
  return 1;
}

/** Satu input menurut jenisnya. */
function Masukan({
  field,
  nilai,
  onUbah,
}: {
  field: FieldSummary;
  nilai: string | boolean | undefined;
  onUbah: (v: string | boolean) => void;
}) {
  const id = `admin-${field.column}`;
  const teks = typeof nilai === "boolean" ? "" : (nilai ?? "");
  const umum = {
    id,
    maxLength: field.max_len > 0 ? field.max_len : undefined,
    required: field.required,
    "aria-describedby": undefined as string | undefined,
  };

  if (field.kind === "boolean") {
    return (
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          id={id}
          checked={nilai === true}
          onChange={(e) => onUbah(e.target.checked)}
        />
      </div>
    );
  }

  if (field.kind === "long") {
    return (
      <textarea
        {...umum}
        className="form-control"
        rows={3}
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
      />
    );
  }

  if (field.kind === "markdown") {
    return (
      <textarea
        {...umum}
        className="form-control font-monospace"
        rows={8}
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
      />
    );
  }

  if (field.kind === "choice") {
    return (
      <select
        id={id}
        className="form-select"
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
        required={field.required}
      >
        <option value="">Pilih {field.label}</option>
        {(field.choices ?? []).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === "date") {
    return (
      <input
        {...umum}
        className="form-control"
        type="date"
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
      />
    );
  }

  if (field.kind === "integer") {
    return (
      <input
        {...umum}
        className="form-control"
        type="number"
        step="1"
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
      />
    );
  }

  if (field.kind === "money") {
    return (
      <input
        {...umum}
        className="form-control"
        type="text"
        inputMode="decimal"
        value={teks}
        onChange={(e) => onUbah(e.target.value)}
      />
    );
  }

  // email, phone, url, slug, short, dan jenis lain yang belum dikenal.
  // Jenis yang belum dikenal jatuh ke teks supaya data tetap bisa dibaca dan
  // disimpan, bukan membuat form berhenti total.
  const tipe =
    field.kind === "email"
      ? "email"
      : field.kind === "url"
        ? "url"
        : field.kind === "phone"
          ? "tel"
          : "text";

  return (
    <input
      {...umum}
      className="form-control"
      type={tipe}
      value={teks}
      onChange={(e) => onUbah(e.target.value)}
    />
  );
}
