import { FACILITIES } from "@/data/home";
import { DIAGNOSTIC_SERVICES } from "@/data/informasi";
import type { IsiHalaman } from "./types";

/** Ikon per unit, dipakai ulang oleh kedua halaman di berkas ini. */
const IKON: Record<string, string> = {
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

/** Halaman induk "Layanan Diagnostik" dan "Layanan Medis". */
export const PELAYANAN_MEDIS: Record<string, IsiHalaman> = {
  "pelayanan/diagnostik": {
    ringkas:
      "Pemeriksaan penunjang yang dipakai dokter memastikan diagnosis tidak hanya ditegakkan dari perkiraan.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Diagnosis memerlukan data, bukan perkiraan. Dua unit penunjang di rumah sakit ini adalah laboratorium dan radiologi. Keduanya bekerja sama dengan dokter pemeriksa: laboratorium menyediakan angka, radiologi memperlihatkan bentuk dan letak, dan keputusan akhirnya tetap milik dokter yang memeriksa pasien secara langsung.",
      },
      {
        jenis: "paragraf",
        teks:
          "Karena keduanya berada di dalam satu gedung, pemeriksaan penunjang tidak menuntut pasien berpindah ke tempat lain. Hasilnya juga kembali ke satu berkas yang sama, sehingga riwayat pemeriksaan bisa dibaca utuh.",
      },
      { jenis: "sub", teks: "Kapan penunjang dibutuhkan" },
      {
        jenis: "daftar",
        ikon: "bi-clipboard2-pulse",
        butir: [
          "Pemeriksaan darah untuk memantau gula darah, lemak, fungsi ginjal, dan fungsi hati.",
          "Rontgen dan tomografi untuk melihat tulang, paru, dan rongga perut.",
          "Ultrasonografi untuk menilai perut, ginjal, dan jaringan lunak.",
          "Mamografi untuk pemeriksaan awal Payudara.",
        ],
      },
      {
        jenis: "kartu",
        judul: "Dua unit penunjang",
        butir: DIAGNOSTIC_SERVICES.map((d) => ({
          ikon: IKON[d.slug] ?? "bi-building",
          judul: d.title,
          isi: d.description,
          href: `/pelayanan/diagnostik/${d.slug}`,
        })),
      },
      { jenis: "sub", teks: "Persiapan sebelum pemeriksaan" },
      {
        jenis: "langkah",
        butir: [
          "Bawa surat rujukan dari dokter atau klinik tujuan bila pemeriksaan memerlukannya.",
          "Puasa delapan sampai dua belas jam untuk pemeriksaan darah yang menuntut kondisi itu. Pemeriksaan lain tidak perlu dipersiapakan.",
          "Sebutkan alergi dan obat yang sedang dipakai pada saat pendaftaran.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Hasil tidak selalu siap pada hari yang sama",
        teks:
          "Rontgen bisa langsung selesai, sedangkan tomografi dan pemeriksaan patologi memerlukan waktu tambahan. Petugas memberi tahu perkiraan waktu pengambilan hasil saat pendaftaran.",
      },
    ],
  },

  "pelayanan/medis": {
    ringkas:
      "Delapan unit pelayanan medis, dari gawat darurat sampai ruang inap khusus.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Unit di bawah ini melayani pasien sesuai kondisinya, bukan sesuai urutan datang. Kondisi yang tidak boleh ditunda ditangani lebih dulu di instalasi gawat darurat, sedangkan kebutuhan yang bisa dijadwalkan ditangani di rawat jalan.",
      },
      { jenis: "sub", teks: "Alur masuk layanan" },
      {
        jenis: "langkah",
        butir: [
          "Kondisi darurat datang langsung ke instalasi gawat darurat tanpa pendaftaran online.",
          "Kondisi yang tidak darurat dijadwalkan lewat Daftar Online supaya jam dokter diketahui lebih dulu.",
          "Perawatan inap dimulai setelah dokter memutuskan perlunya pasien tinggal.",
        ],
      },
      {
        jenis: "kartu",
        judul: "Seluruh unit",
        butir: FACILITIES.map((f) => ({
          ikon: IKON[f.slug] ?? "bi-building",
          judul: f.title,
          isi: f.description,
          href: `/pelayanan/medis/${f.slug}`,
        })),
      },
      {
        jenis: "catatan",
        judul: "Jam layanan",
        teks:
          "Instalasi gawat darurat buka 24 jam termasuk malam hari dan hari libur. Unit lain buka Senin sampai Jumat pukul 07.30 sampai 14.00.",
      },
    ],
  },
};
