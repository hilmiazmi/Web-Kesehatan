import { CONTACT } from "@/data/navigation";
import type { IsiHalaman } from "./types";

/** Halaman "Aula" di bawah Informasi Publik. */
export const AULA: Record<string, IsiHalaman> = {
  "informasi-publik/aula": {
    ringkas:
      "Ruang acara yang dapat disewa untuk seminar, workshop, dan edukasi kesehatan.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "Aula dirancang untuk kegiatan yang butuh ruang luas, bukan ruang inap. Letaknya terpisah dari area perawatan supaya acara tidak mengganggu pasien.",
      },
      { jenis: "sub", teks: "Fasilitas yang tersedia" },
      {
        jenis: "daftar-tebal",
        butir: [
          {
            tebal: "Ruang luas dan nyaman",
            isi: "Kapasitas sampai 100 peserta, lengkap dengan kursi dan meja.",
          },
          {
            tebal: "Peralatan audio visual",
            isi: "Layar besar dan sistem suara untuk presentasi.",
          },
          {
            tebal: "Ruang persiapan",
            isi: "Ruang kecil di samping aula untuk pembicara dan panitia.",
          },
          {
            tebal: "Dukungan tim",
            isi: "Petugas membantu pengaturan dan pelaksanaan acara.",
          },
        ],
      },
      { jenis: "sub", teks: "Kegiatan yang dapat dilaksanakan" },
      {
        jenis: "daftar",
        ikon: "bi-calendar-event",
        butir: [
          "Seminar kesehatan dan edukasi masyarakat.",
          "Pertemuan profesional dan konferensi.",
          "Pelatihan bagi tenaga medis.",
          "Acara komunitas dan penyuluhan kesehatan.",
        ],
      },
      { jenis: "sub", teks: "Cara memesan" },
      {
        jenis: "langkah",
        butir: [
          "Menghubungi bagian informasi lewat salah satu kanal di bawah.",
          "Menyampaikan tanggal, perkiraan jumlah peserta, dan kebutuhan alat.",
          "Menunggu konfirmasi jadwal dan biaya sewa.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Kanal pemesanan",
        kolom: ["Kanal", "Keterangan"],
        baris: [
          ["Telepon", CONTACT.phone],
          ["Surel", CONTACT.email],
        ],
      },
    ],
  },
};
