/**
 * Isi panjang untuk halaman detail: layanan prioritas, fasilitas medis,
 * dan diagnostik.
 *
 * Kunci setiap entri adalah `slug` yang sama dengan array identitas di
 * `src/data/home.ts`, supaya halaman detail tidak perlu mencari datanya
 * sendiri.
 *
 * Foto, angka, dan nama tenaga medis tidak diambil dari rumah sakit asli
 * (PRD bagian 12 dan 13), jadi seluruh teks di sini dibuat sendiri.
 */

export type DetailContent = {
  /**
   * Butir layanan. Setiap butir satu frasa pendek supaya mudah dipindai,
   * bukan paragraf panjang.
   */
  points: string[];
};

export const DETAIL_CONTENT: Record<string, DetailContent> = {
  "jantung-terpadu": {
    points: [
      "Konsultasi dokter spesialis jantung",
      "Elektrokardiogram",
      "Ekocardiografi",
      "Kateterisasi jantung",
      "Perawatan jantung koroner",
      "Kontrol setelah tindakan",
    ],
  },
  "kanker-terpadu": {
    points: [
      "Konsultasi dokter spesialis onkologi",
      "Pemeriksaan biopsi",
      "Kemoterapi",
      "Radioterapi",
      "Penyuluhan risiko kanker",
      "Perawatan paliatif",
    ],
  },
  "medical-check-up": {
    points: [
      "Pemeriksaan fisik",
      "Pemeriksaan darah",
      "Rontgen toraks",
      "Pemeriksaan mata",
      "Pempendengaran",
      "Konsultasi dokter",
      "Laporan hasil tertulis",
    ],
  },
  "stroke-terpadu": {
    points: [
      "Penanganan darurat tiga jam pertama",
      "Pencitraan otak",
      "Konsultasi dokter spesialis saraf",
      "Fisioterapi dan terapi okupasi",
      "Kontrol faktor risiko",
      "Pendampingan keluarga",
    ],
  },
  "uro-nefrologi": {
    points: [
      "Konsultasi dokter spesialis ginjal",
      "Pemeriksaan fungsi ginjal",
      "Tindakan batu saluran kemih",
      "Litototripsi gelombang kejut",
      "Perawatan ginjal kronis",
      "Pelatihan mandiri di rumah",
    ],
  },
  "maternal-center": {
    points: [
      "Konsultasi dokter spesialis kandungan",
      "Pemeriksaan kehamilan",
      "Persalinan",
      "Perawatan nifas",
      "Pemeriksaan bayi baru lahir",
      "Kelas ibu hamil",
    ],
  },
  "instalasi-gawat-darurat": {
    points: [
      "Triage dan penanganan segera",
      "Penerimaan kasus kritis",
      "Pemeriksaan dan stabilisasi",
      "Rujukan ke bangsal bila perlu",
      "Observasi dan monitoring",
      "Layanan tanpa henti",
    ],
  },
  "rawat-jalan": {
    points: [
      "Konsultasi dokter spesialis",
      "Pemeriksaan dan diagnosis",
      "Resep obat dan apotek",
      "Tindakan ringan",
      "Kontrol penyakit kronis",
      "Konsultasi lanjutan",
    ],
  },
  "rawat-inap": {
    points: [
      "Kamar perawatan kelas dan kelas khusus",
      "Perawatan 24 jam",
      "Pemeriksaan harian oleh dokter",
      "Layanan kebutuhan khusus",
      "Konsultasi gizi",
      "Discharge planning",
    ],
  },
  "rawat-inap-khusus": {
    points: [
      "Kamar perawatan khusus",
      "Perawatan intensif",
      "Monitoring kontinu",
      "Dokter penanggung jawab",
      "Perawatan multidisiplin",
      "Rehabilitasi sebelum pulang",
    ],
  },
  "diagnostic-center": {
    points: [
      "Laboratorium klinik",
      "Radiologi dan imaging",
      "Kardiologi dan EKG",
      "Fisioterapi",
      "Pemeriksaan fungsi tubuh",
      "Konsultasi hasil",
    ],
  },
  "eswl": {
    points: [
      "Konsultasi dokter spesialis",
      "Persiapan tindakan",
      "Gelombang kejut tanpa pembedahan",
      "Pemeriksaan ulang",
      "Perawatan pasca tindakan",
    ],
  },
  "mri": {
    points: [
      "MRI otak",
      "MRI tulang dan sendi",
      "MRI tulang belakang",
      "MRI perut",
      "Persiapan dan kontras",
      "Interpretasi oleh radiologis",
    ],
  },
  "klinik-eksekutif": {
    points: [
      "Konsultasi langsung dokter spesialis",
      "Jadwal lebih fleksibel",
      "Ruang tunggu terpisah",
      "Laporan hasil langsung",
    ],
  },
  "laboratorium": {
    points: [
      "Darah lengkap dan rutin",
      "Kimia darah dan serologi",
      "Mikrobiologi",
      "Serologi",
      "Patologi",
      "Tes cepat",
    ],
  },
  "radiologi": {
    points: [
      "Rontgen",
      "Computed tomography",
      "Ultrasonografi",
      "Mamografi",
      "Fluoroskopi",
      "Kontrol hasil radiologi",
    ],
  },
};

/**
 * Kalimat penutup yang dipakai bersama di semua halaman detail.
 *
 * Ditulis di satu tempat supaya enam layanan prioritas, delapan fasilitas,
 * dan dua layanan diagnostik memakai kalimat yang sama, dan supaya tidak ada
 * teks panjang yang harus ditulis ulang di banyak berkas.
 */
export const DETAIL_INTRO_TAIL =
  "Pemeriksaan dan penanganan dilakukan oleh tenaga medis berlisensi.";
