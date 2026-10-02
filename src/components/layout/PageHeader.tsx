import Link from "next/link";
import { CONTACT } from "@/data/navigation";

/**
 * Kepala halaman untuk semua halaman selain Home.
 *
 * Menghasilkan breadcrumb + judul, mengikuti pola situs referensi. Dipakai
 * bersama oleh halaman detail berita, layanan, MCU, dan halaman umum.
 */
export default function PageHeader({
  title,
  subtitle,
  trail,
}: {
  title: string;
  subtitle?: string;
  /** Remah roti selain Home, mis. [{ label: "Berita", href: "/berita" }]. */
  trail?: { label: string; href?: string }[];
}) {
  const crumbs = [{ label: "Home", href: "/" }, ...(trail ?? [])];

  return (
    <header className="page-header">
      <div className="container">
        <nav aria-label="Remah roti">
          <ol className="breadcrumb">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li
                  key={c.label}
                  className={`breadcrumb-item${last ? " active" : ""}`}
                  aria-current={last ? "page" : undefined}
                >
                  {last || !c.href ? (
                    c.label
                  ) : (
                    <Link href={c.href}>{c.label}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <h1>{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}

        <p className="page-help">
          Butuh informasi lebih lanjut? Hubungi kami di{" "}
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>.
        </p>
      </div>
    </header>
  );
}