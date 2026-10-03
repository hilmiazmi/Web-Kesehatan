/**
 * Data daftar poliklinik.
 *
 * SEMUA ISI DI SINI FIKTIF (PRD bagian 9). Bentuknya mengikuti tabel
 * `polyclinics` di PRD bagian 7 (name, slug, description, location), ditambah
 * `specialty` dan `icon` untuk kebutuhan tampilan.
 *
 * `specialty` HARUS persis sama dengan salah satu nilai `SPECIALTIES` di
 * `src/data/home.ts`; dipakai untuk mencocokkan dokter di `src/data/doctors.ts`.
 *
 * Saat backend siap, ganti array ini dengan pemanggilan Route Handler
 * (PRD bagian 6.4).
 */

export type Poliklinik = {
  slug: string;
  name: string;
  /** Nama spesialisasi, sama persis dengan isi SPECIALTIES. */
  specialty: string;
  description: string;
  location: string;
  /** Kelas Bootstrap Icons. */
  icon: string;
};

export const POLIKLINIK: Poliklinik[] = [
  {
    slug: "anak",
    name: "Poliklinik Anak",
    specialty: "Anak",
    description: "Pemeriksaan tumbuh kembang, imunisasi, dan penyakit anak.",
    location: "Gedung A, Lantai 1",
    icon: "bi-emoji-smile",
  },
  {
    slug: "penyakit-dalam",
    name: "Poliklinik Penyakit Dalam",
    specialty: "Penyakit Dalam",
    description:
      "Penanganan penyakit organ dalam pada orang dewasa, termasuk diabetes dan hipertensi.",
    location: "Gedung A, Lantai 2",
    icon: "bi-clipboard2-pulse",
  },
  {
    slug: "jantung",
    name: "Poliklinik Jantung",
    specialty: "Jantung",
    description: "Konsultasi dan pemeriksaan kesehatan jantung dan pembuluh darah.",
    location: "Gedung B, Lantai 1",
    icon: "bi-heart-pulse",
  },
  {
    slug: "kebidanan-kandungan",
    name: "Poliklinik Kebidanan dan Kandungan",
    specialty: "Kebidanan dan Kandungan",
    description:
      "Pemeriksaan kehamilan, persalinan, dan kesehatan reproduksi wanita.",
    location: "Gedung B, Lantai 2",
    icon: "bi-gender-female",
  },
  {
    slug: "bedah-umum",
    name: "Poliklinik Bedah Umum",
    specialty: "Bedah Umum",
    description: "Konsultasi sebelum dan sesudah tindakan bedah umum.",
    location: "Gedung A, Lantai 3",
    icon: "bi-bandaid",
  },
  {
    slug: "saraf",
    name: "Poliklinik Saraf",
    specialty: "Saraf",
    description: "Penanganan gangguan saraf, nyeri kepala, dan pasca stroke.",
    location: "Gedung B, Lantai 3",
    icon: "bi-activity",
  },
  {
    slug: "mata",
    name: "Poliklinik Mata",
    specialty: "Mata",
    description: "Pemeriksaan penglihatan dan penanganan penyakit mata.",
    location: "Gedung C, Lantai 1",
    icon: "bi-eye",
  },
  {
    slug: "tht",
    name: "Poliklinik THT",
    specialty: "THT",
    description: "Pemeriksaan telinga, hidung, dan tenggorokan.",
    location: "Gedung C, Lantai 1",
    icon: "bi-ear",
  },
  {
    slug: "kulit-kelamin",
    name: "Poliklinik Kulit dan Kelamin",
    specialty: "Kulit dan Kelamin",
    description: "Penanganan penyakit kulit, rambut, kuku, dan kelamin.",
    location: "Gedung C, Lantai 2",
    icon: "bi-droplet",
  },
  {
    slug: "paru",
    name: "Poliklinik Paru",
    specialty: "Paru",
    description: "Pemeriksaan dan terapi gangguan pernapasan dan paru.",
    location: "Gedung C, Lantai 2",
    icon: "bi-lungs",
  },
  {
    slug: "ortopedi",
    name: "Poliklinik Ortopedi",
    specialty: "Ortopedi",
    description: "Penanganan tulang, sendi, dan cedera otot.",
    location: "Gedung A, Lantai 3",
    icon: "bi-person-walking",
  },
  {
    slug: "gizi-klinik",
    name: "Poliklinik Gizi Klinik",
    specialty: "Gizi Klinik",
    description: "Konsultasi gizi dan perencanaan diet sesuai kondisi pasien.",
    location: "Gedung D, Lantai 1",
    icon: "bi-egg-fried",
  },
];
