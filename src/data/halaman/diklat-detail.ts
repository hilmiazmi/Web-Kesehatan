import { GALLERY_PHOTOS, photo } from "@/data/images";
import type { IsiHalaman } from "./types";

/** Halaman "Kemahasiswaan", "Penelitian", dan "Kaji Banding". */
export const DIKLAT_DETAIL: Record<string, IsiHalaman> = {
  "diklat/kemahasiswaan": {
    ringkas:
      "Pendidikan klinik, praktik magang, dan penempatan koas di rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Rumah sakit ini menerima mahasiswa praktik dan koas dari perguruan tinggi yang bekerja sama dengannya. Selama praktik, mahasiswa berada di bawah pengawasan dokter penanggung jawab dan tidak menangani pasien sendirian.",
      },
      {
        jenis: "daftar",
        ikon: "bi-mortarboard",
        judul: "Bentuk kegiatan",
        butir: [
          "Praktik klinik kedokteran untuk mahasiswa kedokteran.",
          "Praktik kebidanan dan keperawatan.",
          "Penempatan koas di bawah supervision dokter.",
          "Magang administrasi rumah sakit untuk mahasiswa kesehatan masyarakat.",
        ],
      },
      { jenis: "sub", teks: "Syarat sebelum mulai praktik" },
      {
        jenis: "daftar",
        ikon: "bi-check2",
        butir: [
          "Surat pengantar dari perguruan tinggi.",
          "Surat keterangan sehat untuk mahasiswa.",
          "Fotokopi kartu identitas dan kartu Rencana Studi.",
        ],
      },
      {
        jenis: "galeri",
        foto: GALLERY_PHOTOS.slice(0, 4).map((id) => ({
          src: photo(id, 1200, 800),
          alt: "Kegiatan pendidikan di RSUD Contoh Sehat",
        })),
      },
    ],
  },

  "diklat/penelitian": {
    ringkas:
      "Izin penelitian bagi peneliti dan institusi yang memakai data rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Penelitian yang memakai data pasien memerlukan izin tertulis lebih dulu. Data yang diberikan selalu tanpa identitas pasien.",
      },
      {
        jenis: "langkah",
        judul: "Alur pengajuan",
        butir: [
          "Mengirim surat pengantar berisi tujuan dan rencana penelitian.",
          "Menunggu persetujuan dari komite.",
          "Menjalankan penelitian sesuai jadwal yang disetujui.",
          "Mengirim laporan hasil penelitian ke rumah sakit.",
        ],
      },
      { jenis: "sub", teks: "Hal yang perlu disiapkan" },
      {
        jenis: "daftar",
        ikon: "bi-file-earmark-text",
        butir: [
          "Proposal penelitian yang memuat tujuan dan metode.",
          "Surat persetujuan etik dari institusi pengusul.",
          "Jadwal pengambilan data yang tidak mengganggu pelayanan.",
        ],
      },
    ],
  },

  "diklat/kaji-banding": {
    ringkas:
      "Kunjangan belajar ke rumah sakit lain dan penerimaan tamu belajar.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Kaji banding dilakukan untuk belajar langsung dari praktik yang sudah berjalan di tempat lain. Rombongan yang datang maupun yang berangkat selalu didampingi bagian yang membidangi.",
      },
      {
        jenis: "daftar",
        ikon: "bi-people",
        judul: "Bentuk kegiatan",
        butir: [
          "Kunjungan belajar ke rumah sakit lain.",
          "Penerimaan tamu belajar dari instansi lain.",
        ],
      },
      { jenis: "sub", teks: "Mengajukan kunjungan" },
      {
        jenis: "langkah",
        butir: [
          "Mengirim surat permohonan berisi tujuan dan jumlah rombongan.",
          "Menyepakati jadwal dan unit yang akan dikunjungi.",
          "Melaksanakan kunjungan sesuai jadwal yang disepakati.",
        ],
      },
    ],
  },
};
