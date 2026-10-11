import { headers } from "next/headers";
import { config } from "@/server/config";

/**
 * Proto yang dipakai menurut header `x-forwarded-proto`.
 *
 * Header ini bisa bernilai ganda ketika di depannya ada rantai proksi yang
 * MENAMBAH ke header yang dikirim klien alih-alih menimpanya: klien mengirim
 * `http`, proksi TLS menambahkan `https`, dan yang sampai ke aplikasi menjadi
 * `http, https`.
 *
 * Karena itu nilai pertama tidak dipakai — ia bisa berasal dari klien, dan
 * klien boleh mengirim `http` supaya aplikasi mengira koneksinya tidak
 * terenkripsi. Yang dipakai: aman kalau ADA satu saja nilai `https`.
 *
 * Arah kesalahan pilihan itu juga yang paling tidak berbahaya. Kalau seseorang
 * memaksa `https`, akibatnya cookie bertanda `Secure` padahal koneksinya http —
 * itu sama dengan keadaan yang sudah ada sekarang, bukan kebocoran baru.
 * Sebaliknya kalau nilai pertama yang menentukan, satu header yang dikirim
 * klien sudah cukup untuk membuat cookie sesi terbit tanpa `Secure` tepat saat
 * pengunjung memakai HTTPS.
 *
 * Nilai kosong atau header yang tidak ada jatuh ke `http`.
 *
 * @param nilai Isi header mentah, boleh `null`.
 */
export function protoPilihan(nilai: string | null): string {
  const daftar = (nilai ?? "")
    .split(",")
    .map((bagian) => bagian.trim().toLowerCase())
    .filter((bagian) => bagian !== "");

  if (daftar.includes("https")) return "https";
  return daftar[0] ?? "http";
}

/**
 * Apakah koneksi pengunjung benar-benar terenkripsi.
 *
 * `config().adminOrigin` saja tidak cukup, karena ia menyebutkan ke mana
 * tautan admin ditulis, bukan bagaimana pengunjung datang. Di belakang proksi
 * yang mengakhiri TLS — Cloudflare, Coolify, nginx — aplikasi menerima `http`
 * dari proksi, sedangkan pengunjung memakai `https`. Terbukti di produksi
 * 10 Oktober 2026: cookie sesi terbit tanpa atribut `Secure` karena
 * `adminOrigin` bernilai `http://localhost:3000`.
 *
 * Dua sumber dihitung dengan ATAU, bukan salah satu:
 *
 * 1. `adminOrigin` yang `https://` — operator yang menyetelnya dengan https
 *    memang memakai TLS.
 * 2. `x-forwarded-proto` yang memuat `https` — yang dikirim proksi untuk
 *    koneksi asli. Pembacaannya lewat `protoPilihan()`, yang tidak jatuh ke
 *    nilai pertama agar klien tidak ikut menentukan.
 *
 * Tanpa sumber ke-2, satu-satunya cara memperbaiki kasus di atas adalah
 * mengubah `ADMIN_ORIGIN` menjadi `https://<domain-publik>`, yang berarti
 * menebak domain saat menulis kontainer. `x-forwarded-proto` justru
 * dikirim tunnel dan Coolify secara bawaan, tanpa konfigurasi.
 *
 * Keterbatasan yang jujur: header ini hanya dipercaya karena aplikasi ini
 * memang didesain berjalan di belakang proksi. Kalau ada yang bisa mengakses
 * container secara langsung tanpa proksi (misalnya port yang bocor), ia bisa
 * mengirim `x-forwarded-proto: https` palsu. Akibatnya hanyalah cookie yang
 * bertanda `Secure` pada koneksi yang tidak dienkripsi — sama seperti
 * keadaan sekarang, jadi tidak ada yang memburuk.
 */
export async function koneksiTerenskripsi(): Promise<boolean> {
  if (config().adminOrigin.startsWith("https://")) return true;

  try {
    const h = await headers();
    return protoPilihan(h.get("x-forwarded-proto")) === "https";
  } catch {
    // Dipanggil di luar konteks permintaan (misalnya tes): pakai konfigurasi
    // saja alih-alih melempar galat ke seluruh alur login.
    return false;
  }
}
