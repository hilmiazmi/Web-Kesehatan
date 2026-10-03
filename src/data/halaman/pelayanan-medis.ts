import type { IsiHalaman } from "./types";

/** Halaman induk "Layanan Diagnostik" dan "Layanan Medis". */
export const PELAYANAN_MEDIS: Record<string, IsiHalaman> = {
  "pelayanan/diagnostik": {
    ringkas:
      "Pemeriksaan penunjang yang dipakai dokter memastikan diagnosis tidak hanya ditegakkan dari perkiraan.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Diagnosis memerlukan data, bukan perkiraan. Dua unit penunjang di rumah sakit ini adalah laboratorium dan radiologi.",
      },
      {
        jenis: "daftar",
        ikon: "bi-droplet",
        butir: [
          "Laboratorium, untuk pemeriksaan darah, urine, dan bahan tubuh lainnya.",
          "Radiologi, untuk foto, tomografi, dan ultrasonografi.",
        ],
      },
      { jenis: "tautan-anak" },
    ],
  },

  "pelayanan/medis": {
    ringkas:
      "Delapan unit pelayanan medis, dari gawat darurat sampai ruang inap khusus.",
    blok: [
      {
        jenis: "daftar",
        ikon: "bi-activity",
        judul: "Instalasi Gawat Darurat",
        butir: [
          "Buka 24 jam, termasuk malam hari dan hari libur.",
          "Menangani kondisi yang tidak boleh ditunda.",
          "Dikerjakan oleh dokter spesialis yang sedang bertugas.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-door-open",
        judul: "Rawat Jalan",
        butir: [
          "Poliklinik spesialis buka Senin sampai Jumat, pukul 07.30 sampai 14.00.",
          "Pendaftaran langsung di loket atau lewat Daftar Online.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-hospital",
        judul: "Rawat Inap",
        butir: [
          "Untuk pasien yang perlu tinggal lebih dari dua hari.",
          "Kelas perawatan dari perawatan intensif sampai perawatan biasa.",
          "Kapasitas tidur dapat dilihat di halaman Kapasitas Bed.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-heart-pulse",
        judul: "Rawat Inap Khusus",
        butir: [
          "Kamar dengan isolasi untuk pasien yang perlu dipisahkan.",
          "Kamar dengan monitor khusus untuk pasien yang butuh pemantauan terus-menerus.",
        ],
      },
      // Empat unit di bawah ini urutannya sama dengan FACILITIES di
      // src/data/home.ts, bukan dengan urutan alfabet. Halaman indeks memakai
      // urutan data supaya daftar di sini dan di beranda tidak berbeda.
      {
        jenis: "daftar",
        ikon: "bi-clipboard2-pulse",
        judul: "Diagnostic Center",
        butir: [
          "Laboratorium klinik, radiologi, dan pencitraan.",
          "Kardiologi dan elektrokardiogram.",
          "Fisioterapi dan pemeriksaan fungsi tubuh.",
          "Konsultasi hasil pemeriksaan dengan dokter pemeriksa.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-droplet",
        judul: "ESWL",
        butir: [
          "Penanganan batu saluran kemih dengan gelombang kejut.",
          "Tanpa pembedahan, sehingga masa pemulihannya lebih singkat.",
          "Didampingi konsultasi dokter spesialis dan persiapan tindakan lebih dulu.",
          "Dilanjuti pemeriksaan ulang dan perawatan setelah tindakan.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-bounding-box",
        judul: "MRI",
        butir: [
          "Pemeriksaan otak, tulang dan sendi, tulang belakang, serta perut.",
          "Pemeriksaan dengan atau tanpa bahan kontras, menyesuaikan kebutuhan dokter pemeriksa.",
          "Hasil diinterpretasikan oleh radiologis.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-person-badge",
        judul: "Klinik Eksekutif",
        butir: [
          "Konsultasi langsung dengan dokter spesialis.",
          "Jadwal yang lebih fleksibel dibanding poliklinik reguler.",
          "Ruang tunggu terpisah dari pasien lain.",
          "Laporan hasil diserahkan langsung kepada pasien.",
        ],
      },
      { jenis: "tautan-anak" },
    ],
  },
};
