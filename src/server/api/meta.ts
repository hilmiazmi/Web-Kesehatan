/**
 * Konstanta yang menjelaskan bentuk API ke klien.
 *
 * Dipisah dari route handler supaya skrip migrasi, seed, dan snapshot bisa
 * mengikutinya tanpa mengimpor berkas yang penuh import Next.js.
 */

/**
 * Versi bentuk respons.
 *
 * Naikkan hanya kalau ada perubahan yang membuat klien lama salah membaca:
 * field yang dihapus, tipe yang berubah makna, atau struktur paginasi yang
 * diganti. Menambah field baru tidak perlu menaikkan versi, karena klien
 * mengabaikan field yang tidak dikenal.
 */
export const API_VERSION = "1";

/** Awalan path semua endpoint. */
export const ROUTE_PREFIX = "/api/v1";