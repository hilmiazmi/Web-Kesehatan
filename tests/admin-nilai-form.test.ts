import { describe, expect, it } from "vitest";
import {
  keNilaiApi,
  keNilaiForm,
  kosongkanNilai,
} from "@/components/admin/nilai-form";
import type { FieldSummary } from "@/components/admin/types";

/**
 * Penerjemah nilai form panel admin.
 *
 * Form kelola tabel dibuat dari spec registry, dan nilai database tidak
 * selalu cocok dengan nilai input: `null` harus jadi teks kosong supaya
 * input terkontrol React tidak menerima `null`, dan integer yang kosong
 * harus jadi `null` supaya server membacanya sebagai kosong, bukan sebagai
 * angka yang salah ketik.
 */

function kolom(overrides: Partial<FieldSummary> = {}): FieldSummary {
  return {
    column: "judul",
    label: "Judul",
    kind: "short",
    required: false,
    max_len: 200,
    readonly: false,
    default: null,
    choices: null,
    ...overrides,
  };
}

describe("kosongkanNilai", () => {
  it("mengisi nilai bawaan dari spec", () => {
    const fields = [
      kolom({ column: "judul", default: "Tanpa judul" }),
      kolom({ column: "is_active", kind: "boolean", default: "true" }),
      kolom({ column: "is_pinned", kind: "boolean" }),
    ];

    expect(kosongkanNilai(fields)).toEqual({
      judul: "Tanpa judul",
      is_active: true,
      is_pinned: false,
    });
  });

  it("tidak menyertakan kolom baca-saja", () => {
    const fields = [kolom({ column: "id", readonly: true })];
    expect(kosongkanNilai(fields)).toEqual({});
  });
});

describe("keNilaiForm", () => {
  it("mengubah null database menjadi teks kosong", () => {
    const fields = [kolom({ column: "judul" })];
    expect(keNilaiForm(fields, { judul: null })).toEqual({ judul: "" });
  });

  it("mengubah boolean database menjadi boolean form", () => {
    const fields = [kolom({ column: "is_active", kind: "boolean" })];
    expect(keNilaiForm(fields, { is_active: true })).toEqual({ is_active: true });
    expect(keNilaiForm(fields, { is_active: "1" })).toEqual({ is_active: true });
    expect(keNilaiForm(fields, { is_active: 0 })).toEqual({ is_active: false });
  });

  it("mengubah angka dan tanggal menjadi teksnya", () => {
    const fields = [
      kolom({ column: "quota", kind: "integer" }),
      kolom({ column: "tanggal", kind: "date" }),
    ];
    expect(keNilaiForm(fields, { quota: 40, tanggal: "2026-10-05" })).toEqual({
      quota: "40",
      tanggal: "2026-10-05",
    });
  });

  it("memotong timestamp database menjadi tanggal kalender", () => {
    // Kolom tanggal dibaca sebagai timestamp penuh, sedangkan input date
    // hanya menerima YYYY-MM-DD. Tanpa pemotongan, input tampil kosong dan
    // nilai yang terkirim ditolak server karena melebihi 10 karakter.
    const fields = [kolom({ column: "tanggal", kind: "date" })];
    expect(keNilaiForm(fields, { tanggal: "2026-10-05T00:00:00" })).toEqual({
      tanggal: "2026-10-05",
    });
  });
});

describe("keNilaiApi", () => {
  it("mengirim teks apa adanya untuk jenis teks", () => {
    const fields = [kolom({ column: "judul" })];
    expect(keNilaiApi(fields, { judul: "Berita baru" })).toEqual({
      judul: "Berita baru",
    });
  });

  it("mengirim boolean sungguhan untuk checkbox", () => {
    const fields = [kolom({ column: "is_active", kind: "boolean" })];
    expect(keNilaiApi(fields, { is_active: true })).toEqual({ is_active: true });
    expect(keNilaiApi(fields, { is_active: false })).toEqual({ is_active: false });
  });

  it("mengirim null untuk angka yang dikosongkan", () => {
    // String kosong ditolak server sebagai angka yang salah, jadi yang
    // dikirim adalah `null` yang artinya kosongkan kolom.
    const fields = [kolom({ column: "quota", kind: "integer" })];
    expect(keNilaiApi(fields, { quota: "" })).toEqual({ quota: null });
    expect(keNilaiApi(fields, { quota: "40" })).toEqual({ quota: "40" });
  });

  it("tidak menyertakan kolom baca-saja", () => {
    const fields = [kolom({ column: "id", readonly: true })];
    expect(keNilaiApi(fields, { id: "abc" })).toEqual({});
  });
});
