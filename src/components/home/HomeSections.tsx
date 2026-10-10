import Link from "next/link";
import Photo from "@/components/ui/Photo";
import CardCarousel from "@/components/ui/CardCarousel";
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
    <section id="pendaftaran" className="section">
      {/* Situs referensi tidak memakai sub-judul di section ini
          (`section-title pb-0` hanya berisi h2). */}
      <div className="container section-title pb-0">
        <h2>Pendaftaran</h2>
      </div>

      <div className="container">
        <div className="row gy-4 gx-4">
          {/* Ketiga kanal menaut ke halaman Daftar Online (lihat
              REGISTRATION_OPTIONS): tidak ada lagi kartu mati berbentuk span. */}
          {REGISTRATION_OPTIONS.map((o) => (
            <div className="col-md-4" key={o.title}>
              {/* Di bawah lipatan: tanpa prefetch (hemat RSC, lihat Footer). */}
              <Link
                href={o.href}
                className="registrasi-card text-decoration-none"
                prefetch={false}
              >
                <i className={`bi ${o.icon}`} aria-hidden="true" />
                <h3 className="registrasi-title">{o.title}</h3>
                <p className="registrasi-desc">{o.description}</p>
              </Link>
            </div>
          ))}
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
    <section id="sosial-media" className="section light-background">
      <div className="container section-title pb-0">
        <h2>Sosial Media</h2>
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

/**
 * Section 11 — "Patient Experience" (testimoni). Teks karangan sendiri.
 *
 * Di situs referensi ini slider penuh yang berganti sendiri, satu testimoni
 * pada satu waktu, tanpa tombol navigasi dan hanya bullet pagination.
 */
export function TestimonialsSection() {
  return (
    <section id="testimoni" className="testimonials section">
      <div className="container">
        <div className="row align-items-center gy-4">
          {/* Pembagian kolom 5/7 mengikuti situs referensi (col-lg-5 info,
              col-lg-7 slider). Judulnya tetap h2, bukan h3 seperti di situs
              asal, supaya outline heading halaman tetap berurutan untuk
              pembaca layar. */}
          <div className="col-lg-5">
            <h2 className="testimonials-title">Patient Experience</h2>
            <p className="testimonials-sub">
              Cerita penuh inspirasi dari mereka yang telah mempercayai kami
            </p>
          </div>

          <div className="col-lg-7">
            <CardCarousel
              label="Testimoni pasien"
              className="testimonial-carousel"
              slidesPerView={1}
              autoplay
              showNavigation={false}
            >
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
            </CardCarousel>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section 12 — "Asuransi". Nama mitra generik, bukan logo asli. */
export function InsuranceSection() {
  return (
    <section id="asuransi" className="section light-background">
      <div className="container section-title pb-0">
        <h2>Asuransi</h2>
      </div>

      <CardCarousel label="Mitra asuransi yang dilayani">
        {INSURANCES.map((name) => (
          <div
            className="insurance-item"
            role="img"
            aria-label={`Mitra ${name}`}
            key={name}
          >
            <i className="bi bi-shield-plus" aria-hidden="true" />
            <span>{name}</span>
          </div>
        ))}
      </CardCarousel>
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
    <section id="faq" className="section light-background">
      <div className="container section-title pb-0">
        <h2>Frequently Asked Questions</h2>
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