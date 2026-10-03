import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { PPID_SUBPAGES } from "@/data/ppid";

/**
 * Halaman induk PPID.
 *
 * Daftar anak dibaca dari `PPID_SUBPAGES`, bukan dari `NAV_PPID_CHILDREN` di
 * `src/data/ppid-nav.ts`. Keduanya memuat 10 entri yang saling berkaitan, tapi
 * hanya satu yang perlu benar di sini: kalau submenu navbar berubah dan data
 * halaman tidak, isi halaman tetap harus sesuai dengan yang ditampilkan.
 */
export default function PpidPage() {
  return (
    <>
      <PageHeader
        title="PPID"
        subtitle="Pelayanan informasi publik di RSUD Contoh Sehat."
        trail={[{ label: "PPID" }]}
      />

      <section className="section">
        <div className="container">
          <p className="detail-lead">
            Daftar halaman di bawah memakai susunan yang sama dengan menu PPID
            pada navbar.
          </p>

          <ul className="detail-list">
            {PPID_SUBPAGES.map((p) => (
              <li key={p.slug}>
                <Link href={`/ppid/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>

          <p className="klinik-panel-hours mt-4">
            <i className="bi bi-info-circle" aria-hidden="true" />
            {/* Angka dihitung dari daftar yang benar-benar ditampilkan di
                atas, bukan dari submenu navigasi. Keduanya sekarang sama,
                tapi kalau nanti submenu berubah dan daftar halaman tidak,
                angka ini tidak ikut berbohong. */}
            {PPID_SUBPAGES.length} halaman tersedia.
          </p>
        </div>
      </section>
    </>
  );
}