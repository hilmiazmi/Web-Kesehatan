import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { PPID_SUBPAGES } from "@/data/ppid";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";

/**
 * Halaman induk PPID.
 *
 * Daftar anak dibaca dari `PPID_SUBPAGES`, data yang sama dengan
 * `NAV_PPID_CHILDREN`. Karena keduanya tidak bisa berbeda sumber, submenu
 * navbar dan isi halaman ini selalu sinkron.
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
            {NAV_PPID_CHILDREN.length} halaman tersedia.
          </p>
        </div>
      </section>
    </>
  );
}