import Link from "next/link";
import Photo from "@/components/ui/Photo";
import { SOCIALS } from "@/data/navigation";
import {
  FAQS,
  INSURANCES,
  REGISTRATION_OPTIONS,
  TESTIMONIALS,
} from "@/data/home";
import { TESTIMONIAL_PHOTOS, photo } from "@/data/images";

/** Section 9 — "Pendaftaran": tiga tombol JAKSEHAT, JKN, E-Pasien. */
export function RegistrationSection() {
  return (
    <section id="pendaftaran" className="pendaftaran section">
      <div className="container section-title pb-4">
        <h2>Pendaftaran</h2>
        <p>&quot;Pilih cara mendaftar yang sesuai dengan kebutuhan Anda&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-4 gx-4">
          {REGISTRATION_OPTIONS.map((o) => {
            const inner = (
              <>
                <i className={`bi ${o.icon}`} aria-hidden="true" />
                <h3 className="registrasi-title">{o.title}</h3>
                <p className="registrasi-desc">{o.description}</p>
              </>
            );
            return (
              <div className="col-md-4" key={o.title}>
                {o.href.startsWith("/") ? (
                  <Link href={o.href} className="registrasi-card text-decoration-none">
                    {inner}
                  </Link>
                ) : (
                  <span className="registrasi-card">{inner}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Section 10 — "Sosial Media".
 *
 * Catatan penting: pada situs referensi bagian ini RENDER KOSONG karena embed
 * Instagram tidak termuat (iframe diblokir atau sudah mati). Placeholder
 * dipakai, dan PRD bagian 12 melarang script pihak ketiga aktif secara default.
 */
export function SocialMediaSection() {
  return (
    <section id="sosial-media" className="about section light-background">
      <div className="container section-title pb-4">
        <h2>Sosial Media</h2>
        <p>&quot;Ikuti kanal resmi kami untuk informasi terbaru&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-3 gx-3">
          {SOCIALS.map((s) => (
            <div className="col-6 col-lg-3" key={s.icon}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-card"
              >
                <i className={`bi ${s.icon}`} aria-hidden="true" />
                <span>{s.label}</span>
                <small>Kanal resmi</small>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Section 11 — "Patient Experience" (testimoni). Teks karangan sendiri. */
export function TestimonialsSection() {
  return (
    <section id="testimoni" className="testimonials section">
      <div className="container">
        <div className="row align-items-center gy-4">
          <div className="col-lg-4">
            <h2 className="testimonials-title">Patient Experience</h2>
            <p className="testimonials-sub">
              Cerita penuh inspirasi dari mereka yang telah mempercayai kami
            </p>
          </div>

          <div className="col-lg-8">
            <div className="testimonial-slider" role="region" aria-label="Testimoni pasien" tabIndex={0}>
              {TESTIMONIALS.map((t, i) => (
                <figure className="testimonial" key={t.name}>
                  <div className="testimonial-body">
                    <i className="bi bi-quote" aria-hidden="true" />
                    <blockquote>{t.quote}</blockquote>
                  </div>
                  <figcaption className="testimonial-person">
                      <Photo
                        src={photo(
                          TESTIMONIAL_PHOTOS[i % TESTIMONIAL_PHOTOS.length],
                          120,
                          120
                        )}
                        alt={t.name}
                        sizes="46px"
                        height={46}
                        radius="circle"
                      />
                    <div>
                      <strong>{t.name}</strong>
                      <span>{t.role}</span>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 12 — "Asuransi". Nama mitra generik, bukan logo asli. */
export function InsuranceSection() {
  return (
    <section id="asuransi" className="asuransi section light-background">
      <div className="container section-title pb-4">
        <h2>Asuransi</h2>
        <p>&quot;Mitra asuransi yang kami layani&quot;</p>
      </div>

      <div className="container">
        <div className="row gy-4 gx-4">
          {INSURANCES.map((name) => (
            <div className="col-6 col-md-4 col-lg-3" key={name}>
              <div className="insurance-item" role="img" aria-label={`Mitra ${name}`}>
                <i className="bi bi-shield-plus" aria-hidden="true" />
                <span>{name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Section 13 — FAQ accordion. 9 pertanyaan, sesuai PRD bagian 9.
 *
 * Sifatnya detail native `<details>`, jadi tetap berfungsi tanpa JavaScript.
 */
export function FaqSection() {
  return (
    <section id="faq" className="faq section light-background">
      <div className="container section-title pb-4">
        <h2>Frequently Asked Questions</h2>
        <p>&quot;Pertanyaan yang sering diajukan&quot;</p>
      </div>

      <div className="container">
        <div className="faq-list">
          {FAQS.map((f) => (
            <details className="faq-item" key={f.question}>
              <summary>
                <span>{f.question}</span>
                <i className="bi bi-plus-lg" aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{f.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}