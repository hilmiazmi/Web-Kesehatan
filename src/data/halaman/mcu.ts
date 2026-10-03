import { formatIDR } from "@/lib/format";
import { MCU_HOLIDAY_PACKAGES, MCU_PACKAGES } from "@/data/home";
import type { IsiHalaman } from "./types";

/**
 * Halaman "MCU" beserta kedua jalur paketnya.
 *
 * Tabel paket disusun dari `MCU_PACKAGES` dan `MCU_HOLIDAY_PACKAGES`, bukan
 * ditulis ulang di sini. Kalau harga atau isi paket berubah, tabel ikut
 * berubah tanpa perlu disentuh.
 */
export const MCU: Record<string, IsiHalaman> = {
  "pelayanan/mcu": {
    ringkas:
      "Pemeriksaan kesehatan berkala, tersedia dalam dua jalur paket.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "MCU bisa dilakukan tanpa alasan sakit tertentu, biasanya diminta oleh perusahaan atau untuk keperluan administratif.",
      },
      {
        jenis: "daftar",
        ikon: "bi-clipboard2-check",
        butir: [
          "Paket Reguler, delapan paket pemeriksaan umum dan pemeriksaan yang diminta perusahaan.",
          "Paket Health Meets Holiday, lima paket untuk anak sekolah.",
        ],
      },
      { jenis: "tautan-anak", judul: "Pilih jalur paket" },
    ],
  },

  "pelayanan/mcu/reguler": {
    ringkas:
      "Delapan paket pemeriksaan umum, dari yang paling dasar sampai yang paling lengkap.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Paket disusun bertingkat. Setiap paket memuat seluruh isi paket sebelumnya, lalu menambah pemeriksaan baru.",
      },
      {
        jenis: "tabel",
        judul: "Daftar paket",
        kolom: ["Paket", "Harga", "Isi pemeriksaan"],
        baris: MCU_PACKAGES.map((p) => [
          p.title,
          formatIDR(p.price),
          p.items.join(", "),
        ]),
      },
      {
        jenis: "tautan-anak",
        judul: "Rincian isi tiap paket",
      },
    ],
  },

  "pelayanan/mcu/holiday": {
    ringkas:
      "Lima paket untuk anak sekolah, termasuk dua paket skrining kanker.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Paket Health Meets Holiday dibuat untuk kebutuhan sekolah dan tersedia pada musim libur sekolah.",
      },
      {
        jenis: "tabel",
        judul: "Daftar paket",
        kolom: ["Paket", "Harga", "Isi pemeriksaan"],
        baris: MCU_HOLIDAY_PACKAGES.map((p) => [
          p.title,
          formatIDR(p.price),
          p.items.join(", "),
        ]),
      },
      {
        jenis: "tautan-anak",
        judul: "Rincian isi tiap paket",
      },
    ],
  },
};
