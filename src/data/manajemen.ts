/**
 * Susunan pimpinan.
 *
 * Sepenuhnya fiktif: nama, jabatan, pendidikan, dan riwayat dibuat sendiri
 * untuk mengisi tampilan, bukan menyalin data rumah sakit asli (PRD bagian 12
 * dan 13). Jabatan memakai bentuk yang lazim dipakai rumah sakit
 * pemerintah daerah.
 *
 * Roster dan uraian panjang dipisah menjadi dua berkas supaya keduanya tetap
 * enak dibaca: berkas 250 baris ke atas hampir selalu gagal ditulis utuh.
 * `src/data/manajemen-profil.ts` berisi uraian, dihubungkan lewat `slug` yang
 * sama di sini.
 */

export type Manager = {
  /** Dipakai untuk URL halaman profil, huruf kecil dan tanpa spasi. */
  slug: string;
  /** Nama lengkap dengan gelar akademis, persis seperti di kartu. */
  name: string;
  /** Jabatan, tanpa gelar akademis. */
  role: string;
  /** Satu kalimat yang tampil di bawah nama pada halaman profil. */
  ringkas: string;
};

/** Delapan pimpinan, urut dari-director ke kepala instalasi. */
export const MANAGEMENT: Manager[] = [
  {
    slug: "anita-prameswari",
    name: "dr. Anita Prameswari",
    role: "Direktur",
    ringkas: "Menanggung jawaban atas seluruh pelayanan di rumah sakit ini.",
  },
  {
    slug: "bimo-santoso",
    name: "dr. Bimo Santoso",
    role: "Wakil Direktur",
    ringkas: "Menggantikan direktur pada saat berhalangan tugas.",
  },
  {
    slug: "citra-ningrum",
    name: "dr. Citra Ningrum",
    role: "Kepala Bagian Pelayanan",
    ringkas: "Menyusun standar pelayanan dan mengatur alur rujukan.",
  },
  {
    slug: "deni-kurniawan",
    name: "dr. Deni Kurniawan",
    role: "Kepala Bagian Keuangan",
    ringkas: "Mengelola anggaran dan biaya pelayanan per pasien.",
  },
  {
    slug: "eka-mahendra",
    name: "dr. Eka Mahendra",
    role: "Kepala Bagian Sumber Daya Manusia",
    ringkas: "Mengurus rekrutmen, pendidikan, dan kesejahteraan tenaga.",
  },
  {
    slug: "farida-ramadhani",
    name: "dr. Farida Ramadhani",
    role: "Kepala Instalasi Gawat Darurat",
    ringkas: "Memimpin penanganan pasien gawat darurat sepanjang hari.",
  },
  {
    slug: "gilang-permana",
    name: "dr. Gilang Permana",
    role: "Kepala Instalasi Laboratorium",
    ringkas: "Menjaga ketepatan hasil laboratorium yang dipakai tenaga medis.",
  },
  {
    slug: "hana-puspita",
    name: "dr. Hana Puspita",
    role: "Kepala Instalasi Radiologi",
    ringkas: "Mengelola pemeriksaan pencitraan dan keamanannya.",
  },
];
