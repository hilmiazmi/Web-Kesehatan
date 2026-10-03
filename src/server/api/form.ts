import { ApiError } from "./error";
import { limitRequest } from "./rate-limit";
import { dbOrNull, type Db } from "../db/client";
import { generateTicket, type TicketKind } from "../ticket";
import { Errors, isHoneypotTrap, readJsonBody } from "../validation";

/**
 * Kerangka bersama untuk endpoint formulir dari pengunjung.
 *
 * Lima endpoint punya urutan yang sama, dan urutannya penting: batasi lebih
 * dulu, baru periksa honeypot, baru validasi, baru tulis. Menukar dua langkah
 * pertama berarti honeypot dan rate limit dilewati tepat saat bot paling
 * banyak mengirim.
 */

/** Bentuk balasan honeypot: kode tiket yang sengaja tidak ada di database. */
export type HoneypotAnswer = { ticket_code: string; status: "received" };

/**
 * Jalankan satu endpoint formulir.
 *
 * Honeypot dijawab dengan kode tiket palsu, bukan dengan penolakan. Bot yang
 * mendapat 400 akan belajar field mana yang membuatnya ditolak lalu berhenti
 * mengirim field itu pada percobaan berikutnya, sehingga honeypot justru
 * berhenti berguna sejak percobaan pertama.
 */
export async function jalankanForm<T>(
  request: Request,
  namaEndpoint: string,
  prefix: TicketKind,
  langkah: (db: Db, body: Record<string, unknown>) => Promise<T>,
): Promise<T | HoneypotAnswer> {
  limitRequest(request.headers, namaEndpoint);

  const body = await readJsonBody(request);

  if (isHoneypotTrap(String(body.website ?? ""))) {
    return { ticket_code: generateTicket(prefix), status: "received" };
  }

  const db = dbOrNull();

  // Endpoint formulir tidak punya jalur snapshot: menulis ke snapshot berarti
  // melaporkan berhasil tanpa menyimpan apa pun, dan pengunjung akan menyimpan
  // kode tiket yang tidak pernah bisa dipakai untuk mengecek status.
  if (db === null) throw ApiError.internal("formulir butuh database");

  return langkah(db, body);
}

/** Baca field body sebagai teks; field yang bukan teks dianggap kosong. */
export function isi(body: Record<string, unknown>, nama: string): string {
  const nilai = body[nama];
  return typeof nilai === "string" ? nilai : "";
}

/** Baca field body sebagai teks opsional; kosong menjadi `null`. */
export function isiOpsional(body: Record<string, unknown>, nama: string): string | null {
  const teks = isi(body, nama).trim();
  return teks === "" ? null : teks;
}

/**
 * Baca field body sebagai bilangan bulat, atau `null` kalau tidak dikirim.
 *
 * String seperti `"7"` diterima karena `<input type="number">` mengirim
 * teksnya. Nilai yang bukan bilangan juga menjadi `null`, bukan galat, supaya
 * pemanggil yang sendiri punya aturan bisa memutuskan: misalnya jumlah
 * peserta yang tidak dikirim berarti satu, bukan berarti galat.
 */
export function angka(body: Record<string, unknown>, nama: string): number | null {
  const nilai = body[nama];
  if (typeof nilai === "number" && Number.isFinite(nilai)) return nilai;
  if (typeof nilai !== "string" || !/^-?\d+$/.test(nilai.trim())) return null;
  return Number(nilai.trim());
}

/** Baca field body sebagai boolean; hanya `true` yang dianggap benar. */
export function benar(body: Record<string, unknown>, nama: string): boolean {
  return body[nama] === true;
}

/** Lempar hasil validasi kalau ada satu saja field yang gagal. */
export function selesaikan(errors: Errors): void {
  if (!errors.isEmpty) throw errors.toApiError();
}