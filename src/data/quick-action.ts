import { CONTACT, HEADER_CTAS } from "@/data/navigation";

/**
 * Isi bilah aksi cepat.
 *
 * PRD bagian 8.4 menyebut `QuickActionBar`, dan itu satu-satunya butir
 * Acceptance Criteria yang belum ada sama sekali. Isinya tidak ada di situs
 * acuan, jadi diambil dari komponen yang sudah ada dan bukan dikarang:
 *
 * - Dua tombol dari `HEADER_CTAS`, supaya isinya sama persis dengan yang
 *   sudah ada di header dan tidak muncul tombol yang tidak punya tujuan.
 * - WhatsApp dari `CONTACT`, karena itu sudah dipakai di topbar dan footer.
 *
 * Bentuk tiap butir disimpan sebagai data, bukan ditulis di dalam JSX, supaya
 * bisa diperiksa `tests/quick-action.test.ts` tanpa merender apa pun, dan
 * supaya komponen `QuickActionBar` tidak memuat daftar tautannya sendiri.
 */
export type QuickAction = {
  /** Nama yang tampil dan menjadi nama tautan yang terbaca pembaca layar. */
  label: string;
  /** Tujuan. Path internal untuk tombol, URL penuh untuk WhatsApp. */
  href: string;
  /** Ikon Bootstrap Icons. */
  icon: string;
  /**
   * Tautan keluar membuka tab baru dan butuh `rel="noopener noreferrer"`.
   * Tautan internal tidak, karena `Link` dari Next.js sudah mengurusnya.
   */
  external: boolean;
  /** Kelas tombol, mengikuti `HEADER_CTAS`. */
  className: string;
};

/** Ikon per label, supaya label boleh diubah tanpa membuat ikon tertukar. */
const IKON: Record<string, string> = {
  "Daftar Online": "bi-calendar-plus",
  "Administrasi Pasien": "bi-person-vcard",
  WhatsApp: "bi-whatsapp",
};

export const QUICK_ACTIONS: QuickAction[] = [
  ...HEADER_CTAS.map((c) => ({
    label: c.label,
    href: c.href,
    icon: IKON[c.label] ?? "bi-link-45deg",
    external: false,
    className: c.className,
  })),
  {
    label: "WhatsApp",
    href: CONTACT.whatsappHref,
    icon: IKON["WhatsApp"],
    external: true,
    className: "quick-action-wa",
  },
];