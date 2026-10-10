import Link from "next/link";
import {
  CONTACT,
  FOOTER_ADDRESS,
  FOOTER_LINKS,
  FOOTER_RELATED,
  SITE,
} from "@/data/navigation";

/**
 * Footer.
 *
 * Susunan kolom mengikuti situs referensi yang sudah diukur: identitas di
 * kiri (3 dari 12), link terkait dan media pengaduan di tengah (6 dari 12),
 * lokasi di kanan (3 dari 12).
 *
 * Di situs referensi tiap logo pada "Link Terkait" adalah tautan ke instansi
 * lain. Logo resmi tidak disalin, jadi tempat logo dipakai link internal yang
 * benar-benar ada di situs ini; lebih berguna daripada kotak teks mati.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-3">
            {/* Logo footer juga harus bisa diklik untuk kembali ke Home. */}
            {/*
              Seluruh tautan footer memakai `prefetch={false}`. Footer selalu
              di bawah lipatan, dan Next akan mengambil RSC setiap tautan
              yang masuk viewport — puluhan permintaan untuk tautan yang
              jarang diklik, berebut bandwidth dengan LCP di jaringan lambat.
              Navigasi tetap bekerja, hanya tanpa pra-ambil.
            */}
            <Link
              href="/"
              className="footer-identity-link"
              prefetch={false}
            >
              <span className="logo-mark logo-mark-footer" aria-hidden="true">
                <i className="bi bi-plus-lg" />
              </span>
              <h2 className="footer-name">{SITE.name}</h2>
              <p className="footer-tagline">{SITE.tagline}</p>
            </Link>
            <address className="footer-address">
              {FOOTER_ADDRESS.map((baris) => (
                <span key={baris}>{baris}</span>
              ))}
            </address>
          </div>

          <div className="col-lg-6">
            <h3 className="footer-heading">Link Terkait</h3>
            <ul className="footer-related">
              {FOOTER_RELATED.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="related-tile" prefetch={false}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="footer-heading mt-4">Media Pengaduan</h3>
            <ul className="footer-related footer-related-single">
              <li>
                <Link
                  href="/informasi-publik/pengaduan"
                  className="related-tile"
                  prefetch={false}
                >
                  <i className="bi bi-chat-square-text" aria-hidden="true" />
                  <span>Lapor Pengaduan</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-lg-3">
            <h3 className="footer-heading">Lokasi</h3>
            <div
              className="footer-map-placeholder"
              role="img"
              aria-label="Peta lokasi rumah sakit"
            >
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <span>Peta tidak ditampilkan</span>
            </div>
            <ul className="footer-contact list-unstyled mt-3">
              <li>
                <strong>Telepon:</strong>{" "}
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </li>
              <li>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <strong>Rawat jalan:</strong> Senin sampai Jumat, 07.30 sampai
                14.00
              </li>
              <li>
                <strong>IGD dan rawat inap:</strong> 24 jam
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p className="mb-0">
            &copy; {year} {SITE.name}. Hak cipta dilindungi.
          </p>
          {/* Penanda wajib: proyek ini replika untuk belajar dan portofolio,
              bukan situs resmi. PRD bagian 13 meminta penanda ini ada. */}
          <p className="footer-disclaimer">
            Situs demo untuk keperluan pembelajaran dan portofolio. Bukan situs
            resmi rumah sakit pemerintah. Seluruh data pada halaman ini adalah
            data fiktif.
          </p>
          <ul className="footer-utility list-unstyled">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} prefetch={false}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
