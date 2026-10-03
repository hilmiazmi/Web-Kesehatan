import { CONTACT } from "@/data/navigation";

/**
 * Dua blok tambahan untuk halaman detail layanan.
 *
 * Keduanya mengikuti halaman detail di situs referensi yang memuat bingkai
 * video 640x360 dan tiga kanal kontak di bawah isi layanan. Lebar bingkai
 * 640x360 diukur lewat getComputedStyle, bukan ditebak.
 */

/**
 * Bingkai video.
 *
 * Isinya kotak netral, bukan pemutar YouTube sungguhan. Video milik rumah
 * sakit asli tidak boleh disalin (PRD bagian 12 dan 13), dan menyematkan
 * video orang lain akan menampilkan materi yang bukan isi situs ini.
 *
 * Kotak sengaja tanpa foto. Memakai foto stok di sini terlihat seperti
 * foto/newsletter yang salah pasang, karena warna dan subjeknya tidak ada
 * hubungannya dengan layanan yang sedang dibahas. Kotak abu-abu dengan
 * ikon play jauh lebih jujur soal apa yang belum tersedia.
 */
export function DetailVideo({ title }: { title: string }) {
  return (
    <figure className="detail-video">
      <div className="detail-video-box">
        <i className="bi bi-play-circle" aria-hidden="true" />
      </div>
      <figcaption>
        Video profil {title} belum tersedia pada versi demo ini.
      </figcaption>
    </figure>
  );
}

/**
 * Blok kontak di bawah isi layanan.
 *
 * Tiga kanal, urutan dan labelnya sama dengan footer: telepon, WhatsApp, dan
 * surel. Nilainya dibaca dari `CONTACT` supaya tidak ada nomor atau alamat
 * yang ditulis dua kali.
 */
export function DetailContact() {
  const kanal = [
    { icon: "bi-telephone", label: "Telepon", value: CONTACT.phone, href: CONTACT.phoneHref },
    { icon: "bi-whatsapp", label: "WhatsApp", value: CONTACT.whatsapp, href: CONTACT.whatsappHref },
    { icon: "bi-envelope", label: "Surel", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  ];

  return (
    <div className="detail-contact">
      <h2 className="detail-subheading">Hubungi Kami</h2>
      <ul>
        {kanal.map((k) => (
          <li key={k.label}>
            <i className={`bi ${k.icon}`} aria-hidden="true" />
            <a href={k.href}>{k.value}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
