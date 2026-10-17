import { CONTACT } from "@/data/navigation";
import type { IsiHalaman } from "./types";

/** Halaman "Pengaduan Masyarakat". */
export const PENGADUAN: Record<string, IsiHalaman> = {
  "informasi-publik/pengaduan": {
    ringkas: "Cara menyampaikan keluhan terhadap pelayanan.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Pengaduan diterima setiap hari kerja, pukul 08.00 sampai 16.00. Setiap pengaduan dicatat, diberi nomor, dan ditindaklanjuti sampai dinyatakan selesai oleh pelapor.",
      },
      { jenis: "sub", teks: "Alur pengaduan" },
      {
        jenis: "langkah",
        butir: [
          "Mengirim pengaduan lewat salah satu kanal di bawah.",
          "Menyertakan nama, waktu, dan hal yang dikeluhkan.",
          "Menunggu konfirmasi penerimaan pengaduan beserta nomornya.",
          "Mengikuti perbaikan sampai pengaduan ditutup.",
        ],
      },
      { jenis: "sub", teks: "Kanal pengaduan" },
      {
        jenis: "daftar",
        ikon: "bi-telephone",
        butir: [
          "Telepon layanan pengaduan.",
          "Surel kepada bagian pelayanan.",
          "Datang langsung ke loket informasi.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Kontak pengaduan",
        kolom: ["Kanal", "Keterangan"],
        baris: [
          ["Telepon", CONTACT.phone],
          ["Surel", CONTACT.email],
        ],
      },
      {
        jenis: "catatan",
        teks:
          "Pengaduan yang memuat identitas jelas diprioritaskan karena bisa dikonfirmasi ulang. Pengaduan tanpa identitas tetap dibaca dan dipakai sebagai bahan evaluasi.",
      },
    ],
  },
};
