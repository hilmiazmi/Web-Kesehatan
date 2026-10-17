import { ADMINISTRASI } from "./administrasi";
import { AULA } from "./aula";
import { BUDAYA_KESELAMATAN } from "./budaya-keselamatan";
import { DIKLAT_DETAIL } from "./diklat-detail";
import { DIKLAT_INDUK } from "./diklat-induk";
import { DOKUMEN } from "./dokumen";
import { INFORMASI_INDUK } from "./informasi-induk";
import { KARIR } from "./karir";
import { MCU } from "./mcu";
import { PELAYANAN_MEDIS } from "./pelayanan-medis";
import { PELAYANAN_UTAMA } from "./pelayanan-utama";
import { PENGADUAN } from "./pengaduan";
import { SKM } from "./skm";
import { TENTANG } from "./tentang";
import { UTAMA } from "./utama";
import { ZONA_MEDIA } from "./zona-media";
import { ZONA } from "./zona";
import type { IsiHalaman } from "./types";

export type { BlokHalaman, IsiHalaman } from "./types";

/**
 * Isi seluruh halaman generik, dikunci dengan path tanpa garis miring depan.
 *
 * Kunci di sini TIDAK ditulis manual di daftar terpisah: `tests/halaman.test.ts`
 * membandingkannya dengan hasil `collectNavPaths()` dari `src/lib/nav-path.ts`.
 * Menambah tautan di navigasi tanpa menambah isi akan membuat tes gagal, bukan
 * menghasilkan halaman kosong seperti sebelumnya.
 */
export const HALAMAN: Record<string, IsiHalaman> = {
  ...TENTANG,
  ...PELAYANAN_UTAMA,
  ...PELAYANAN_MEDIS,
  ...MCU,
  ...ADMINISTRASI,
  ...DIKLAT_INDUK,
  ...DIKLAT_DETAIL,
  ...INFORMASI_INDUK,
  ...AULA,
  ...KARIR,
  ...PENGADUAN,
  ...SKM,
  ...BUDAYA_KESELAMATAN,
  ...DOKUMEN,
  ...ZONA,
  ...ZONA_MEDIA,
  ...UTAMA,
};

/**
 * Isi satu halaman, atau `undefined` kalau path itu tidak punya isi.
 *
 * Dipakai `src/app/[...slug]/page.tsx`. Kalau `undefined`, halaman tersebut
 * masih menampilkan kotak kosong seperti sebelumnya; `tests/halaman.test.ts`
 * membuat supaya tidak ada path seperti itu.
 */
export function isiHalaman(pathname: string): IsiHalaman | undefined {
  return HALAMAN[pathname.replace(/^\//, "").replace(/\/$/, "")];
}
