import type { FieldSummary } from "@/components/admin/types";

/**
 * Nilai satu form baris.
 *
 * Semua disimpan sebagai teks, kecuali checkbox boolean yang memang boolean.
 * Server menerima teks untuk hampir semua jenis dan mengonversinya sendiri
 * (`coerce` di `src/server/admin/records.ts`), jadi form tidak perlu tahu cara
 * mengurai angka atau tanggal.
 */
export type NilaiForm = Record<string, string | boolean>;

/**
 * Nilai awal form baris baru.
 *
 * Field yang punya `default` diisi dari sana, termasuk checkbox boolean yang
 * memakai `"true"` sebagai tandanya. Field `readonly` tidak ikut, karena
 * server mengabaikannya dan mengirimnya hanya menambah ukuran body.
 */
export function kosongkanNilai(fields: readonly FieldSummary[]): NilaiForm {
  const out: NilaiForm = {};
  for (const f of fields) {
    if (f.readonly) continue;
    if (f.kind === "boolean") {
      out[f.column] = f.default === "true";
    } else {
      out[f.column] = f.default ?? "";
    }
  }
  return out;
}

/**
 * Nilai form dari baris yang sudah ada di database.
 *
 * Nilai `null` dari database menjadi teks kosong, supaya input terkontrol
 * React tidak menerima `null`. Boolean database menjadi boolean form, dan
 * angka atau tanggal menjadi teksnya.
 */
export function keNilaiForm(
  fields: readonly FieldSummary[],
  baris: Record<string, unknown>,
): NilaiForm {
  const out: NilaiForm = {};
  for (const f of fields) {
    if (f.readonly) continue;
    const raw = baris[f.column];
    if (f.kind === "boolean") {
      out[f.column] = raw === true || raw === "true" || raw === "1" || raw === 1;
    } else if (raw === null || raw === undefined) {
      out[f.column] = "";
    } else if (f.kind === "date" && typeof raw === "string") {
      // Database menyimpan tanggal sebagai timestamp penuh
      // (`2026-10-04T00:00:00`), sedangkan `<input type="date">` hanya
      // menerima `YYYY-MM-DD`. Tanpa pemotongan ini, input tampil kosong dan
      // nilai yang terkirim ditolak server karena melebihi 10 karakter.
      const cocok = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      out[f.column] = cocok ? cocok[1] : String(raw);
    } else {
      out[f.column] = String(raw);
    }
  }
  return out;
}

/**
 * Nilai form menjadi body `POST`/`PATCH`.
 *
 * Isinya teks apa adanya, dengan tiga pengecualian yang mengikuti perilaku
 * `coerce` di server:
 *
 * - boolean dikirim sebagai boolean sungguhan;
 * - integer dan money yang kosong dikirim sebagai `null` (artinya kosongkan),
 *   karena string kosong ditolak server sebagai "harus bilangan bulat";
 * - field `readonly` tidak ikut dikirim.
 */
export function keNilaiApi(
  fields: readonly FieldSummary[],
  nilai: NilaiForm,
): Record<string, string | boolean | number | null> {
  const out: Record<string, string | boolean | number | null> = {};
  for (const f of fields) {
    if (f.readonly) continue;
    const raw = nilai[f.column];
    if (f.kind === "boolean") {
      out[f.column] = raw === true;
    } else if ((f.kind === "integer" || f.kind === "money") && String(raw ?? "").trim() === "") {
      out[f.column] = null;
    } else {
      out[f.column] = String(raw ?? "");
    }
  }
  return out;
}
