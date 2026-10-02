import HeroSlider from "@/components/home/HeroSlider";
import DoctorSearchCard from "@/components/home/DoctorSearchCard";
import PriorityServices from "@/components/home/PriorityServices";
import FacilityTabs from "@/components/home/FacilityTabs";
import McuPackages from "@/components/home/McuPackages";
import NewsSection from "@/components/home/NewsSection";
import {
  AwardsSection,
  GallerySection,
} from "@/components/home/AwardsGallery";
import {
  FaqSection,
  InsuranceSection,
  RegistrationSection,
  SocialMediaSection,
  TestimonialsSection,
} from "@/components/home/HomeSections";
import "@/styles/home.css";

/**
 * Halaman Home.
 *
 * Urutan 13 section di sini mengikuti DOM situs referensi yang sudah
 * diverifikasi (docs/design-tokens-terverifikasi.md bagian 4), bukan
 * daftar di PRD bagian 8.3 — hasilnya sama, tapi urutan ini berasal dari
 * pengukuran langsung.
 *
 * Catatan: situs asli memakai `id="services"` dua kali (Akreditasi dan
 * Asuransi). Di sini ID-nya dibedakan menjadi `akreditasi` dan `asuransi`
 * agar anchor link tidak bentrok.
 */
export default function Home() {
  return (
    <>
      {/* Beranda tidak punya judul yang terlihat secara visual, jadi judul
          utama halaman ini disembunyikan saja. Tanpa elemen h1, struktur
          heading beranda mulai dari h2 dan buruk untuk pembaca layar serta
          mesin pencari. Kelas visually-hidden datang dari Bootstrap. */}
      <h1 className="visually-hidden">
        RSUD Contoh Sehat: Instalasi Gawat Darurat 24 Jam dan Layanan
        Terpadu
      </h1>

      <HeroSlider />
      <DoctorSearchCard />
      <PriorityServices />
      <FacilityTabs />
      <McuPackages />
      <NewsSection />
      <AwardsSection />
      <GallerySection />
      <RegistrationSection />
      <SocialMediaSection />
      <TestimonialsSection />
      <InsuranceSection />
      <FaqSection />
    </>
  );
}