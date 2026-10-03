"use client";

import { A11y, Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

/**
 * Carousel kartu untuk section beranda.
 *
 * Angka-angka di sini bukan tebakan, semuanya diukur dari situs referensi
 * dengan getComputedStyle():
 *
 * - Slide terlihat 1 / 2 / 2 / 4 pada lebar 390 / 576 / 768 / 992 px.
 * - Jarak antar slide 25px, konstan di semua lebar.
 * - Tombol navigasi lingkaran 40px dengan latar rgba(42, 37, 54, 0.5).
 * - Bullet pagination 8px, bulat, warna rgb(64, 112, 244).
 *
 * Testimoni berbeda: satu slide penuh yang berganti sendiri, jadi
 * `slidesPerView` dan `autoplay` bisa ditetapkan lewat props.
 *
 * Setiap kartu dikirim sebagai children dari komponen server, jadi isi kartu
 * tetap bisa memakai komponen server tanpa ikut menjadi client.
 *
 * `role="region"` wajib ada bersama `aria-label`. Tanpa role itu, `aria-label`
 * menempel pada elemen generik yang tidak slammed boleh punya label, sehingga
 * nama section, misalnya "Testimoni pasien", tidak pernah diumumkan
 * pembaca layar. `tabIndex` tidak perlu: Swiper sudah menyediakan tombol navigasi asli,
 * jadi tidak ada area yang hanya bisa digulir dengan keyboard.
 */
export default function CardCarousel({
  children,
  label,
  className = "",
  slidesPerView,
  autoplay = false,
  showNavigation = true,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  /** Bila diisi, dipakai di semua lebar dan mengabaikan breakpoint responsif. */
  slidesPerView?: number;
  /** Berganti sendiri seperti slider testimoni di situs referensi. */
  autoplay?: boolean;
  /** Testimoni di situs referensi tidak memakai tombol navigasi. */
  showNavigation?: boolean;
}) {
  const slides = Array.isArray(children) ? children : [children];

  const modules = [A11y, Pagination];
  if (showNavigation) modules.push(Navigation);
  if (autoplay) modules.push(Autoplay);

  return (
    <div className={`container slide-container ${className}`}>
      <Swiper
        modules={modules}
        // watchOverflow menyembunyikan tombol dan bullet sendiri kalau semua
        // slide sudah muat, jadi section dengan kartu sedikit tetap rapi.
        watchOverflow
        spaceBetween={25}
        slidesPerView={slidesPerView ?? 1}
        navigation={showNavigation}
        pagination={{ clickable: true }}
        autoplay={autoplay ? { delay: 5000, disableOnInteraction: false } : false}
        breakpoints={
          slidesPerView
            ? undefined
            : { 576: { slidesPerView: 2 }, 992: { slidesPerView: 4 } }
        }
        role="region"
        aria-label={label}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>{slide}</SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}