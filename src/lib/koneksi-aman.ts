import { headers } from "next/headers";
import { config } from "@/server/config";

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
 * 2. `x-forwarded-proto: https` — yang dikirim proksi untuk koneksi asli.
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
    const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
    return proto === "https";
  } catch {
    // Dipanggil di luar konteks permintaan (misalnya tes): pakai konfigurasi
    // saja alih-alih melempar galat ke seluruh alur login.
    return false;
  }
}
