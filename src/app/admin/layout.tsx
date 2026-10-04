import type { Metadata } from "next";
import "@/styles/admin.css";

/**
 * Layout `/admin`: memuat stylesheet dan menandai halaman admin.
 *
 * `id="admin-halaman"` adalah penanda untuk CSS, bukan untuk gaya: stylesheet
 * memakai `body:has(#admin-halaman)` untuk menyembunyikan chrome publik hanya
 * di halaman admin, tanpa memindahkan berkas apa pun. Ditaruh di sini supaya
 * berlaku untuk login dan panel sekaligus; kalau ditaruh di komponen shell,
 * halaman login yang tidak memakai shell tetap menampilkan navbar publik.
 *
 * Tidak ada gate di sini. Halaman login harus bisa dibuka tanpa sesi, jadi
 * gate-nya ada di `(panel)/layout.tsx` yang hanya melingkupi halaman yang
 * memang butuh sesi. Kalau gate ditaruh di sini, login dan panel akan
 * saling mengarahkan selamanya.
 */

/**
 * Halaman admin tidak boleh masuk indeks mesin pencari.
 *
 * Ditaruh di layout terluar, bukan di `(panel)/layout.tsx`, supaya berlaku juga
 * untuk halaman login. `index: false` dan `follow: false` sekaligus, karena
 * kedua-duanya yang benar untuk panel: tidak ada yang perlu ditemukan lewat
 * pencarian, dan mengikuti tautan dari halaman login tidak pernah berguna.
 *
 * Kenapa ini `metadata` dan bukan `Disallow` di `robots.txt`. Aturan robots
 * mencegah perayap membaca halaman, tetapi URL-nya masih bisa muncul di hasil
 * pencarian sebagai judul tanpa isi. Untuk panel yang butuh sesi, itu sudah
 * cukup berbahaya: orang bisa terus membuka halaman login yang tidak ada
 * gunanya.
 *
 * Aturan robots juga tidak bisa dipakai karena akan memblokir `/administrasi`
 * sekalian. Aturan itu mencocokkan awalan, bukan segmen utuh.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div id="admin-halaman">{children}</div>;
}
