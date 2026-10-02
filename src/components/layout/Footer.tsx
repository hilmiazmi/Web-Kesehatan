import Link from "next/link";
import { CONTACT, SITE } from "@/data/navigation";

/** Logo-link dummy untuk "Link Terkait". Di situs asli berisi logo instansi
 *  pemerintah; karena aset resmi tidak disalin, dipakai placeholder teks. */
const RELATED_LINKS = [
  "PPID",
  "PANRB",
  "Kemenkes",
  "Pemerintah Provinsi Jakarta",
  "Dinkes DKI Jakarta",
];

/**
 * Footer.
 *
 * Susunannya mengikuti situs referensi: identitas di kiri, link terkait +
 * media pengaduan di tengah, blok lokasi di kanan, hak cipta di bawah.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-4">
            {/* Logo footer juga harus bisa diklik untuk kembali ke Home. */}
            <Link
              href="/"
              className="footer-identity-link"
              aria-label={`${SITE.name} - kembali ke halaman utama`}
            >
              <span className="logo-mark logo-mark-footer" aria-hidden="true">
                <i className="bi bi-plus-lg" />
              </span>
              <h3 className="footer-name">{SITE.name}</h3>
              <p className="footer-tagline">{SITE.tagline}</p>
            </Link>
            <div className="footer-identity">
              <address className="footer-address">
                Jl. Contoh No. 123, Jakarta Selatan, DKI Jakarta 12560
              </address>
            </div>
          </div>

          <div className="col-lg-4">
            <h4 className="footer-heading">Link Terkait</h4>
            <ul className="footer-related">
              {RELATED_LINKS.map((label) => (
                <li key={label}>
                  <span className="related-logo-placeholder">{label}</span>
                </li>
              ))}
            </ul>

            <h4 className="footer-heading mt-4">Media Pengaduan</h4>
            <div className="footer-complaint">
              <span className="related-logo-placeholder">Lapor</span>
            </div>
          </div>

          <div className="col-lg-4">
            <h4 className="footer-heading">Lokasi &amp; Kontak</h4>
            <ul className="footer-contact list-unstyled">
              <li>
                <i className="bi bi-telephone" aria-hidden="true" />{" "}
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </li>
              <li>
                <i className="bi bi-envelope" aria-hidden="true" />{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <i className="bi bi-clock" aria-hidden="true" /> Rawat jalan:{" "}
                Senin&ndash;Jumat 07.30&ndash;14.00
              </li>
              <li>
                <i className="bi bi-hospital" aria-hidden="true" /> IGD dan
                rawat inap: 24 jam
              </li>
            </ul>

            <div className="footer-map-placeholder" role="img" aria-label="Peta lokasi rumah sakit">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <span>Google Maps</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p className="mb-0">
            &copy; {year} {SITE.name}. Hak cipta dilindungi.
          </p>
          {/* Penanda wajib: proyek ini replika untuk belajar/portofolio, bukan
              situs resmi. PRD bagian 13 meminta penanda ini ada di footer. */}
          <p className="footer-disclaimer">
            Situs demo untuk keperluan pembelajaran dan portofolio. Bukan situs
            resmi rumah sakit pemerintah. Seluruh data pada halaman ini adalah
            data fiktif.
          </p>
          <ul className="footer-utility list-unstyled">
            <li>
              <Link href="/sitemap">Peta Situs</Link>
            </li>
            <li>
              <Link href="/kontak">Kontak</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}