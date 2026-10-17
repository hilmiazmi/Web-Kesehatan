import type { IsiHalaman } from "./types";

/**
 * Halaman "Survey Kepuasan Masyarakat".
 *
 * Isinya ditulis ulang supaya cocok dengan formulir yang benar-benar ada di
 * halaman ini. Semula halaman ini SurvivorIncomingtelling orang harus
 * mengambil tautan di loket atau menelepon, padahal form-nya sudah terpasang
 * di `/informasi-publik/skm` dan mengirim ke `POST /api/v1/survey-responses`.
 *
 * Lima pertanyaan pada blok "Isi survei" sengaja sama dengan lima pertanyaan
 * di `src/components/forms/survey-form.tsx`, dihitung dari satu daftar.
 */
export const SKM: Record<string, IsiHalaman> = {
  "informasi-publik/skm": {
    ringkas: "Nilai pelayanan yang baru saja Anda terima, supaya perbaikan berikutnya bisa tepat sasaran.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Survei ini cara rumah sakit mendengar langsung dari pasien dan keluarga. Hasilnya dibaca rutin oleh manajemen, dan penilaian rendah pada satu poin biasanya menjadi bahan tindakan perbaikan pada bulan berikutnya.",
      },
      {
        jenis: "statistik",
        judul: "Hasil survei bulan lalu",
        butir: [
          { label: "Pengisi", nilai: "412", ket: "Anonim, tanpa nama" },
          { label: "Skor rata-rata", nilai: "4,1", ket: "Skala 1 sampai 5" },
          { label: "Nilai terendah", nilai: "2,8", ket: "Kenyamanan ruang tunggu" },
          { label: "Unit paling tinggi", nilai: "4,6", ket: "Poliklinik Ibu dan Anak" },
        ],
        catatan: "Angka pada halaman ini adalah data fiktif untuk demo dan tidak mewakili kinerja nyata.",
      },
      { jenis: "sub", teks: "Apa yang dinilai" },
      {
        jenis: "daftar",
        ikon: "bi-ui-checks",
        butir: [
          "Kecepatan pelayanan, dari loket sampai selesai dilayani.",
          "Keramahan dan kesopanan petugas.",
          "Kejelasan informasi yang diberikan, termasuk perkiraan biaya dan waktu tunggu.",
          "Kebersihan dan kenyamanan ruang tunggu.",
          "Kesesuaian pelayanan dengan biaya yang dibayar.",
        ],
      },
      { jenis: "sub", teks: "Cara Mengisi" },
      {
        jenis: "langkah",
        butir: [
          "Isi formulir di bawah setelah selesai dilayani, selagi-Mo pengalaman masih segar.",
          "Beri nilai 1 sampai 5 pada setiap pertanyaan.",
          "Tulis komentar bila ada yang perlu dijelaskan, terutama bila ada nilai yang rendah.",
          "Kirimkan. Kode tiket yang muncul dipakai untuk memastikan jawaban Anda tercatat.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Arti setiap nilai",
        kolom: ["Nilai", "Arti", "Tindakan rumah sakit"],
        baris: [
          ["5", "Sangat baik", "Tidak ada tindak lanjut"],
          ["4", "Baik", "Dipantau, umum terjadi"],
          ["3", "Cukup", "Ditinjau pada tinjauan bulanan"],
          ["2", "Kurang", "Dicatat sebagai Usulan perbaikan"],
          ["1", "Sangat kurang", "Ditindaklanjuti pada siklus perbaikan berikutnya"],
        ],
        catatan: "Nilai 1 dan 2 selalu dibaca satu per satu, bukan hanya dirata-ratakan.",
      },
      { jenis: "sub", teks: "Yang Dikumpulkan dan Bukan Dikumpulkan" },
      {
        jenis: "daftar-tebal",
        butir: [
          {
            tebal: "Dikumpulkan",
            isi: "nilai per pertanyaan, unit layanan, dan komentar yang Anda tulis",
          },
          {
            tebal: "Tidak dikumpulkan",
            isi: "nama, nomor telepon, dan rekam medis. Isian itu tidak pernah ditanyakan",
          },
          {
            tebal: "Tidak ada penilaian",
            isi: "bobot nilai tidak diubah, jadi nilai 1 tidak lebih ringan daripada nilai 5",
          },
        ],
      },
      {
        jenis: "catatan",
        judul: "Survei bukan pengaduan",
        teks: "Survei menilai pelayanan secara umum. Keluhan yang perlu ditangani satu kasus masuk ke pengaduan, bukan jadi skor. Formulir kritik dan saran ada di halaman kontak.",
      },
      {
        jenis: "tautan",
        judul: "Keluhan yang perlu ditindaklanjuti",
        label: "Kritik dan saran",
        href: "/kontak",
        ket: "Diteruskan ke tim pengaduan yang terpisah dari petugas pelayanan.",
      },
    ],
  },
};
