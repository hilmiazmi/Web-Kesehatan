/**
 * Uraian profil tiap pimpinan.
 *
 * Dihubungkan dengan `MANAGEMENT` di `src/data/manajemen.ts` lewat `slug`.
 * Seluruh isinya fiktif dan tidak merujuk rumah sakit mana pun.
 */

/** Riwayat jabatan, ditulis sebagai "Jabatan, tahun mulai - tahun selesai". */
export type ProfilManager = {
  /** Jenjang pendidikan formal, dari yang tertinggi. */
  pendidikan: string[];
  /** Jabatan yang pernah dipegang, dari yang terbaru. */
  riwayat: string[];
  /** Topik yang menjadi fokus kerja. */
  fokus: string[];
};

/**
 * Delapan profil, satu untuk tiap anggota `MANAGEMENT`.
 *
 *uelles: `Record` dengan kunci `string`, bukan indeks berbasis nomor, supaya
 * menambah atau membukar}pimprofil tidak membuat profil lain bergeser.
 */
export const PROFIL_MANAJEMEN: Record<string, ProfilManager> = {
  "anita-prameswari": {
    pendidikan: ["Dokter, Universitas Indonesia, 2008", "Magister Kesehatan Masyarakat, 2014"],
    riwayat: ["Direktur, 2021 - sekarang", "Kepala Bagian Pelayanan Medis, 2016 - 2021"],
    fokus: ["Mutu pelayanan", "Keselamatan pasien", "Rujukan antar daerah"],
  },

  "bimo-santoso": {
    pendidikan: ["Dokter, Universitas Airlangga, 2010", "Magister Manajemen Kesehatan, 2017"],
    riwayat: ["Wakil Direktur, 2021 - sekarang", "Kepala Instalasi Bedah Sentral, 2017 - 2021"],
    fokus: ["Efisiensi pelayanan", "Pengadaan barang dan jasa", "Pelaporan keuangan"],
  },

  "citra-ningrum": {
    pendidikan: ["Dokter, Universitas Gadjah Mada, 2012", "Magister Kesehatan Masyarakat, 2018"],
    riwayat: ["Kepala Bagian Pelayanan, 2020 - sekarang", "Kepala Poliklinik, 2016 - 2020"],
    fokus: ["Standar pelayanan", "Alur rujukan", "Jam layanan poliklinik"],
  },

  "deni-kurniawan": {
    pendidikan: ["Dokter, Universitas Diponegoro, 2011", "Akuntansi Publik, 2019"],
    riwayat: ["Kepala Bagian Keuangan, 2020 - sekarang", "Analis Keuangan, 2016 - 2020"],
    fokus: ["Anggaran berbasis kinerja", "Tarif pelayanan", "Pengawasan belanja"],
  },

  "eka-mahendra": {
    pendidikan: ["Dokter, Universitas Gadjah Mada, 2013", "Magister Manajemen Sumber Daya Manusia, 2019"],
    riwayat: ["Kepala Bagian SDM, 2019 - sekarang", "Kepala Unit Diklat, 2016 - 2019"],
    fokus: ["Rekrutmen", "Pendidikan tenaga", "Kesejahteraan karyawan"],
  },

  "farida-ramadhani": {
    pendidikan: ["Dokter, Universitas Brawijaya, 2009", "Sertifikat Gawat Darurat, 2015"],
    riwayat: ["Kepala Instalasi Gawat Darurat, 2018 - sekarang", "Dokter Gawat Darurat, 2014 - 2018"],
    fokus: ["Triage pasien", "Penanganan kegawatdaruratan", "Siaga 24 jam"],
  },

  "gilang-permana": {
    pendidikan: ["Dokter, Universitas Trisakti, 2014", "Sertifikat Patologi Klinik, 2018"],
    riwayat: ["Kepala Instalasi Laboratorium, 2020 - sekarang", "Patologi Klinik, 2016 - 2020"],
    fokus: ["Ketepatan hasil laboratorium", "Kontrol mutu", "Keselamatan laboratorium"],
  },

  "hana-puspita": {
    pendidikan: ["Dokter, Universitas Indonesia, 2015", "Sertifikat Radiologi, 2019"],
    riwayat: ["Kepala Instalasi Radiologi, 2021 - sekarang", "Radiografer, 2016 - 2021"],
    fokus: ["Pemeriksaan pencitraan", "Dosis radiasi", "Keselamatan radiasi"],
  },
};
