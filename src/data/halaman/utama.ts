import {
  RUANG_RAWAT,
  bedTerisi,
  bedTersedia,
  bedTotal,
} from "@/data/kapasitas-bed";
import { CONTACT, FOOTER_ADDRESS } from "@/data/navigation";
import { collectNavPaths, humanize, resolveTrail } from "@/lib/nav-path";
import type { IsiHalaman } from "./types";

/** Baris tabel sitemap, diturunkan dari pohon navigasi. */
const PETA_SITUS = collectNavPaths()
  .map((p) => {
    const path = "/" + p.slug.join("/");
    const trail = resolveTrail(path);
    const label = trail?.at(-1)?.label ?? humanize(p.slug.at(-1) ?? "");
    return [label, path];
  })
  .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "id"));

/** Halaman "Kapasitas Bed". */
export const KAPASITAS_BED: Record<string, IsiHalaman> = {
  "kapasitas-bed": {
    ringkas: "Ringkasan tempat tidur yang tersedia.",
    blok: [
      {
        jenis: "statistik",
        butir: [
          { label: "Total tempat tidur", nilai: String(bedTotal()) },
          { label: "Tersedia", nilai: String(bedTersedia()) },
          { label: "Terisi", nilai: String(bedTerisi()) },
          { label: "Ruang rawat inap", nilai: String(RUANG_RAWAT.length) },
        ],
        catatan: "Angka pada halaman ini adalah data fiktif untuk demo.",
      },
      {
        jenis: "tabel",
        judul: "Rincian per ruang",
        kolom: ["Ruang", "Kelas", "Total", "Terisi", "Tersedia"],
        baris: RUANG_RAWAT.map((r) => [
          r.nama,
          r.kelas,
          String(r.total),
          String(r.terisi),
          String(r.total - r.terisi),
        ]),
      },
      {
        jenis: "catatan",
        teks: "Ketersediaan tempat tidur berubah setiap jam.",
      },
    ],
  },
};

/** Halaman "Kontak" dan "Peta Situs". */
export const UTAMA: Record<string, IsiHalaman> = {
  kontak: {
    ringkas: "Alamat dan kanal kontak.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Kantor informasi menerima kunjungan langsung.",
      },
      {
        jenis: "daftar",
        ikon: "bi-geo-alt",
        judul: "Alamat",
        butir: FOOTER_ADDRESS,
      },
      {
        jenis: "tabel",
        judul: "Kanal kontak",
        kolom: ["Kanal", "Keterangan"],
        baris: [
          ["Telepon", CONTACT.phone],
          ["Surel", CONTACT.email],
          ["Rawat jalan", "Senin sampai Jumat, 07.30 sampai 14.00"],
          ["Gawat darurat", "Buka 24 jam"],
        ],
      },
    ],
  },

  sitemap: {
    ringkas: "Daftar seluruh halaman yang ada di situs ini.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Daftar di bawah diambil dari menu navigasi.",
      },
      {
        jenis: "tabel",
        judul: "Semua halaman",
        kolom: ["Halaman", "Alamat"],
        baris: PETA_SITUS,
      },
    ],
  },
};
