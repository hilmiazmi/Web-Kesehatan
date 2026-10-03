/**
 * Anak halaman PPID untuk navigasi.
 *
 * PPID punya route sendiri di `src/app/ppid/`, jadi `collectNavPaths()`
 * melewati subtree ini dan hanya mendaftarkan halaman induknya.
 */

export type PpidNavItem = {
  label: string;
  href: string;
};

export const NAV_PPID_CHILDREN: PpidNavItem[] = [
  { label: "Badan Publik", href: "/ppid/badan-publik" },
  { label: "Cari Informasi", href: "/ppid/cari-informasi" },
  { label: "Formulir Permohonan Informasi", href: "/ppid/form-permohonan-informasi" },
  { label: "Formulir Pengajuan Keberatan", href: "/ppid/form-pengajuan-keberatan" },
  { label: "Form Whistle Blowing System", href: "/ppid/form-whistle-blowing-system" },
  { label: "Kanal Informasi", href: "/ppid/kanal-informasi" },
  { label: "Kanal Pengaduan", href: "/ppid/kanal-pengaduan" },
  { label: "Laporan PPID", href: "/ppid/laporan-ppid" },
  { label: "Standar Operasional Prosedur PPID", href: "/ppid/spo-ppid" },
  { label: "Waktu dan Biaya Layanan", href: "/ppid/waktu-dan-biaya-layanan" },
];