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
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div id="admin-halaman">{children}</div>;
}
