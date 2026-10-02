import { CONTACT, SOCIALS } from "@/data/navigation";

/**
 * Topbar "Kontak Kami".
 *
 * Latar biru aksen, nomor telepon/WhatsApp/email di kiri, ikon sosial media
 * di kanan ( disembunyikan di layar kecil, mengikuti `d-none d-md-flex` ).
 */
export default function Topbar() {
  return (
    <div className="topbar d-flex align-items-center">
      <div className="container-fluid d-flex justify-content-center justify-content-md-between header-nav-menu">
        <div className="contact-info d-flex align-items-center">
          <div className="text-contact text-white m-2">
            <span>Kontak Kami</span>
          </div>
          <a href={CONTACT.phoneHref} className="phone text-white m-2">
            <i className="bi bi-phone" aria-hidden="true" />{" "}
            <span>{CONTACT.phone}</span>
          </a>
          <a
            href={CONTACT.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hp text-white m-2"
          >
            <i className="bi bi-whatsapp" aria-hidden="true" />{" "}
            <span>{CONTACT.whatsapp}</span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className="email text-white m-2">
            <i className="bi bi-envelope" aria-hidden="true" />{" "}
            <span>{CONTACT.email}</span>
          </a>
        </div>

        <div className="social-links d-none d-md-flex align-items-center">
          {SOCIALS.map((s) => (
            <a
              key={s.icon}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
            >
              <i className={`bi ${s.icon}`} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}