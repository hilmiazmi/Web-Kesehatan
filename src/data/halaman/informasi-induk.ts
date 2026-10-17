import { FACILITIES } from "@/data/home";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import type { IsiHalaman } from "./types";

/**
 * Ikon per unit. `FACILITIES` dan `DIAGNOSTIC_SERVICES` tidak menyimpan ikon,
 * jadi pemetaannya ada di sini. Semua ikon di sini perlu benar-benar ada di
 * bootstrap-icons; kalau salah nama, kartu akan tampil tanpa ikon karena
 * `<i>` tidak pernah gagal diam-diam.
 */
const IKON_FASILITAS: Record<string, string> = {
  "instalasi-gawat-darurat": "bi-activity",
  "rawat-jalan": "bi-door-open",
  "rawat-inap": "bi-hospital",
  "rawat-inap-khusus": "bi-heart-pulse",
  "diagnostic-center": "bi-clipboard2-pulse",
  eswl: "bi-droplet",
  mri: "bi-bounding-box",
  "klinik-eksekutif": "bi-person-badge",
  laboratorium: "bi-eyedropper",
  radiologi: "bi-bounding-box-circles",
};

/** Halaman induk "Informasi Publik" dan halaman "Fasilitas". */
export const INFORMASI_INDUK: Record<string, IsiHalaman> = {
  "informasi-publik": {
    ringkas:
      "Informasi terbuka untuk umum, dari fasilitas sampai lowongan kerja.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Semua halaman di bawah ini terbuka tanpa perlu login. Isinya dokumen dan penjelasan yang memang ditujukan untuk dibaca publik, bukan arsip internal.",
      },
      {
        jenis: "paragraf",
        teks:
          "Kalau yang dicari adalah layanan medis, mulai dari halaman Pelayanan. Kalau yang dicari adalah dokumen resmi, jabatan, atau cara menghubungi rumah sakit, lanjutkan ke daftar di bawah.",
      },
      { jenis: "tautan-anak", judul: "Semua informasi publik" },
    ],
  },

  "informasi-publik/fasilitas": {
    ringkas:
      "Sepuluh unit dan fasilitas pendukung yang tersedia di rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Fasilitas dibagi menurut cara pasien memakainya, supaya mudah dicari saat dibutuhkan. Delapan unit medis melayani langsung, dua unit penunjang memastikan diagnosisnya tepat.",
      },
      {
        // Kartu, bukan blok `daftar`. Blok `daftar` hanya menghasilkan teks
        // tanpa tautan, jadi daftar unit di sini pernah tampil sebagai
        // paragraf murni tanpa satu pun pintu masuk ke halaman detailnya.
        // `tautan-anak` juga tidak bisa dipakai karena halaman ini tidak punya
        // anak di pohon navigasi.
        jenis: "kartu",
        judul: "Semua unit",
        butir: [
          ...FACILITIES.map((f) => ({
            ikon: IKON_FASILITAS[f.slug] ?? "bi-building",
            judul: f.title,
            isi: f.description,
            href: `/pelayanan/medis/${f.slug}`,
          })),
          ...DIAGNOSTIC_SERVICES.map((d) => ({
            ikon: IKON_FASILITAS[d.slug] ?? "bi-building",
            judul: d.title,
            isi: d.description,
            href: `/pelayanan/diagnostik/${d.slug}`,
          })),
        ],
      },
      {
        jenis: "catatan",
        judul: "Jam layanan",
        teks:
          "Gawat darurat buka 24 jam. Poliklinik dan unit penunjang buka Senin sampai Jumat, pukul 07.30 sampai 14.00, kecuali hari libur nasional.",
      },
    ],
  },
};
