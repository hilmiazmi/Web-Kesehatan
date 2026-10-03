/**
 * Bentuk data yang dipakai bersama oleh komponen panel admin.
 *
 * Dipisah dari komponen supaya tidak perlu mengimpor React hanya untuk memakai
 * satu tipe, dan supaya tes bisa mengimpornya tanpa menarik modul klien.
 */

/** Ringkasan satu tabel, cukup untuk sidebar dan pilihan pengurutan. */
export type TableSummary = {
  table: string;
  label: string;
  defaultOrder: string;
  deletable: boolean;
  searchColumns: readonly string[];
};

/**
 * Satu kolom tabel, sesuai bentuk yang dikirim `describeTables()`.
 *
 * `kind` sudah berupa nama string, bukan objek, karena panel hanya perlu
 * membedakan jenis input; daftar pilihan sudah terpisah di `choices`.
 */
export type FieldSummary = {
  column: string;
  label: string;
  kind: string;
  required: boolean;
  max_len: number;
  readonly: boolean;
  default: string | null;
  choices: readonly string[] | null;
};

/** Balasan `GET /api/v1/admin/records/{table}`. */
export type RecordPage = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  sort?: string;
  desc?: boolean;
};

/** Bentuk galat yang dikembalikan Route Handler admin. */
export type ApiFailure = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

/** Hasil sekali kirim form baris. */
export type HasilSimpan = {
  ok: boolean;
  pesan: string;
};
