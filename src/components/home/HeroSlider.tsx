"use client";

import Image from "next/image";
import Link from "next/link";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { HERO_SLIDES } from "@/data/home";
import { HERO_PHOTOS, photo } from "@/data/images";

/**
 * Hero slider (section 1).
 *
 * Swiper dengan autoplay dan pagination bulat, mengikuti perilaku slider di
 * situs referensi. Tinggi slide 303px (terverifikasi).
 *
 * Foto banner asli situs referensi tidak disalin karena hak cipta; diganti
 * foto stok Unsplash yang relevan dengan isi tiap slide.
 */
export default function HeroSlider() {
  return (
    <section className="slider section p-0" aria-label="Promosi layanan">
      <Swiper
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="swiperslider"
        a11y={{ enabled: true }}
      >
        {HERO_SLIDES.map((slide, i) => {
          const id = HERO_PHOTOS[i % HERO_PHOTOS.length];
          return (
            <SwiperSlide key={slide.title}>
              <div className="slide-slider">
                <Image
                  src={photo(id, 1280, 400)}
                  alt={slide.title}
                  fill
                  sizes="100vw"
                  /* Dua slide pertama diprioritaskan, bukan hanya slide
                     pertama. Swiper memakai loop dan autoplay 5 detik, jadi
                     slide kedua sudah tampil di viewport sebelum LCP diukur.
                     Hanya slide pertama yang diprioritaskan membuat slide
                     kedua dilaporkan sebagai LCP oleh next/image.
                     Slide ke-3 dan seterusnya dibiarkan lazy supaya tidak
                     jadi preload yang menumpuk. */
                  preload={i < 2}
                  /* Tanpa `fetchpriority="high"`, link preload gambar ini
                     diunduh dengan prioritas normal dan LCP bergeser ke
                     gambar yang bukan slide pertama. Dua slide pertama tetap
                     diprioritaskan, tiga sisanya dibiarkan lazy. */
                  fetchPriority={i < 2 ? "high" : undefined}
                  className="slide-img"
                />
                <div className="slide-overlay">
                  <h2>{slide.title}</h2>
                  <p>{slide.subtitle}</p>
                  <Link href="/daftar-online" className="btn btn-primary">
                    Daftar Online
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}