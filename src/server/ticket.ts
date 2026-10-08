import { randomInt } from "node:crypto";

/**
 * Kode tiket untuk formulir publik.
 *
 * Bentuknya awalan + satu garis hubung + delapan karakter acak, misalnya
 * `EP-7K2M9QX`. Awalan dipakai supaya kode bisa dibaca orang yang menerimanya
 * lewat SMS atau WhatsApp: `EP` langsung memberi tahu itu pendaftaran, bukan
 * pengaduan.
 *
 * Panjang selalu sama, jadi kolom `varchar(24)` tidak perlu berubah kalau
 * nanti ada jenis formulir baru.
 */
export const PREFIX = {
  appointment: "EP",
  // Rawat inap. Prefix sendiri supaya kode tiket rawat inap tidak tertukar
  // dengan pendaftaran rawat jalan di loket yang sama.
  admission: "RI",
  mcu: "MCU",
  feedback: "KS",
  wbs: "WBS",
  survey: "SKM",
} as const;

export type TicketKind = keyof typeof PREFIX;

/**
 * Alfabet untuk bagian acak kode tiket.
 *
 * Huruf I, O, 0, dan 1 sengaja tidak dipakai. Kode tiket sering dictate lewat
 * telepon, dan huruf yang mirip angka membuat salah dengar menjadi bug yang
 * sulit dilacak.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const RANDOM_LEN = 8;

/** Panjang kode yang dihasilkan: awalan, satu garis hubung, delapan karakter. */
export const TICKET_LENGTH = 3 + 8;

/** Hasilkan satu kode tiket untuk jenis yang diberikan. */
export function generateTicket(kind: TicketKind): string {
  const prefix = PREFIX[kind];
  let suffix = "";

  for (let i = 0; i < RANDOM_LEN; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `${prefix}-${suffix}`;
}

/**
 * Cocokkan kode tiket dengan bentuk yang diharapkan.
 *
 * Dipakai sebelum query database supaya kode plainly salah tidak sampai ke
 * database, dan supaya jawabannya 404 dengan pesan yang sama seperti kode yang
 * benar-benar tidak ada.
 */
export function isTicketShapeValid(code: string): boolean {
  return /^[A-Z]{1,4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(code);
}