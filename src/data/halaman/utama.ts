import { CONTACT, FOOTER_ADDRESS } from "@/data/navigation";
import { humanize, resolveTrail } from "@/lib/nav-path";
import { collectSitemapPaths } from "@/lib/sitemap";
import type { IsiHalaman } from "./types";

/**
 * Baris tabel peta situs, diturunkan dari sumber yang sama dengan
 * `sitemap.xml`.
 *
 * Sebelumnya memakai `collectNavPaths()` (30 halaman generik saja) sehingga
 * halaman indeks berfolder (`/berita`, `/ppid`, ...) dan seluruh halaman
 * detail `[slug]` (~110 URL) hilang dari tabel meski judulnya mengklaim
 * "seluruh halaman". Bentuk baris `[label, path]` dipertahankan supaya
 * render tabel dan `tests/halaman.test.ts` tidak berubah.
 */
const PETA_SITUS = collectSitemapPaths()
  .map((e) => {
    if (e.path === "/") return ["Beranda", "/"];
    const trail = resolveTrail(e.path);
    const segmen = e.path.split("/").filter(Boolean).at(-1) ?? "";
    const label = trail?.at(-1)?.label ?? humanize(segmen);
    return [label, e.path];
  })
  .sort((a, b) => String(a[1]).localeCompare(String(b[1]), "id"));

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
        teks: "Daftar di bawah sama isinya dengan sitemap.xml untuk mesin pencari.",
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
