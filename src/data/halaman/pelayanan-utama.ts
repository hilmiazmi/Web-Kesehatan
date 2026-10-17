import type { IsiHalaman } from "./types";

/**
 * Halaman induk di bawah menu "Pelayanan".
 *
 * Anak-anaknya punya route sendiri, jadi blok `tautan-anak` dipakai untuk
 * menautkan ke bawah tanpa menyalin ulang alamat yang sudah ada di
 * `src/data/navigation.ts`.
 */
export const PELAYANAN_UTAMA: Record<string, IsiHalaman> = {
  pelayanan: {
    ringkas:
      "Lima jalur layanan utama, semuanya dilayani dari satu gedung yang sama.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Menu pelayanan dibagi menurut cara pasien datang dan kebutuhan perawatannya, bukan menurut nama bagian.",
      },
      {
        jenis: "kartu",
        butir: [
          {
            // Ikon stethoscope tidak ada di bootstrap-icons 1.13.1, jadi
            // kelas itu merender kotak kosong. `bi-heart-pulse` ada di versi
            // itu dan maknanya sama untuk halaman poliklinik. Jalankan
            // `bun run subset-ikon` untuk melihat daftar ikon yang terpakai.
            ikon: "bi-heart-pulse",
            judul: "Poliklinik",
            isi: "Pemeriksaan oleh dokter spesialis tanpa perlu rawat inap.",
            href: "/pelayanan/poliklinik",
          },
          {
            ikon: "bi-heart-pulse",
            judul: "Layanan Prioritas",
            isi: "Enam layanan terpadu untuk kondisi yang ditangani lebih cepat.",
            href: "/pelayanan/prioritas",
          },
          {
            ikon: "bi-activity",
            judul: "Layanan Diagnostik",
            isi: "Laboratorium dan radiologi untuk memastikan diagnosis.",
            href: "/pelayanan/diagnostik",
          },
          {
            ikon: "bi-building",
            judul: "Layanan Medis",
            isi: "Gawat darurat, rawat jalan, rawat inap, dan inap khusus.",
            href: "/pelayanan/medis",
          },
          {
            ikon: "bi-clipboard2-pulse",
            judul: "MCU",
            isi: "Pemeriksaan kesehatan berkala untuk dewasa dan anak sekolah.",
            href: "/pelayanan/mcu",
          },
        ],
      },
      { jenis: "tautan-anak", judul: "Semua halaman pelayanan" },
    ],
  },

  "pelayanan/prioritas": {
    ringkas:
      "Enam layanan terpadu untuk kondisi yang menuntut penanganan lebih cepat.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Layanan terpadu menggabungkan poliklinik dan pemeriksaan penunjang dalam satu alur, supaya pasien tidak perlu mengambil rujukan ke luar.",
      },
      {
        jenis: "daftar",
        ikon: "bi-arrow-right-circle",
        butir: [
          "Jantung Terpadu, untuk pemeriksaan dan penanganan penyakit jantung.",
          "Kanker Terpadu, untuk deteksi dini dan terapi kanker.",
          "Medical Check Up, untuk pemeriksaan kesehatan berkala.",
          "Stroke Terpadu, untuk penanganan pasc.stroke yang tertata.",
          "Uro Nefrologi, untuk saluran kemih dan ginjal.",
          "Maternal Center, untuk kehamilan dan persalinan.",
        ],
      },
      { jenis: "tautan-anak" },
    ],
  },
};
