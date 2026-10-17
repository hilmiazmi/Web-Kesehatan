/**
 * Pemetaan foto sampul berita ke Unsplash, sesuai konteks beritanya.
 *
 * Dipakai `src/lib/content-loader.ts` untuk halaman, dan
 * `scripts/isi-cover-berita.ts` untuk memperbaiki data lama. Sampul yang lama memakai
 * `picsum.photos/seed/<slug>`, yang bukan gambar acak — hash dari slug membuat
 * hasilnya konsisten, tapi isinya bukan berhubungan dengan beritanya. Gambar
 * abstrak di sebelah judul "Skrining Kanker Wanita" menyesatkan.
 *
 * Yang dipilih ID dari `PHOTO` di `src/data/images.ts`, dengan aturan:
 *
 * - Satu slug dipetakan ke satu foto, dan foto itu tidak dipakai dua kali
 *   selama ada pilihan lain. Dua kartu berita dengan gambar sama terlihat
 *   seperti salinan.
 * - `contoh.ts` mencatat alasan setiap pilihan, termasuk yang tidak punya
 *   pasangan tepat, supaya nanti jelas kenapa sebuah berita memakai foto
 *   yang cuma berhubungan tidak langsung.- Kalau tidak ada satu pun dari `PHOTO` yang cocok, slug itu tidak
 *   dipetakan sama sekali dan dibiarkan memakai fallback indeks, bukan
 *   dipaksa memakai foto yang salah konteks.
 */

import { PHOTO } from "./images";

/** Konteks berita lengkap, dipakai halaman detail dan daftar. */
export type PemetaanFoto = Partial<Record<string, string>> & {
  /** Alasan tiap pemetaan, ditulis di tempat yang sama supaya tidak terpisah. */
  _alasan?: Record<string, string>;
};

/**
 * Foto untuk sepuluh berita contoh pada `seed-data.json` dan `snapshot/`.
 *
 * Tanggal terbit berita ini Oktober 2026, tapi isinya dibuat setahun ke belakang
 * supaya halaman daftar terlihat seperti situs yang sudah lama jalan.
 */
export const COVER_BERITA: ReadonlyArray<{
  slug: string;
  foto: string;
  alasan: string;
}> = [
  {
    slug: "jam-layanan-dalam-purna",
    foto: PHOTO.igd,
    alasan:
      "Berita tentang layanan yang tetap buka 24 jam. Foto yang dipakai memang lokasi yang buka 24 jam di rumah sakit ini, bukan gambar kalender atau jam dinding yang tidak mewakili apa pun.",
  },
  {
    slug: "pendaftaran-online-tersedia",
    foto: PHOTO.berita1,
    alasan:
      "Loket pendaftaran — tempat yang menangani antrean yang kini bisa dilakukan dari rumah. Tidak ada foto aplikasi telepon di pool yang tersedia, dan loket lebih dekat daripada ikon abstrak.",
  },
  {
    slug: "skrining-kanker-wanita-diperluas",
    foto: PHOTO.kangker,
    alasan:
      "Berita kanker, jadi memakai foto layanan kanker. Salah satu dari empat berita yang konteksnya tidak ambigu.",
  },
  {
    slug: "kelas-pelatihan-tenaga-kesehatan",
    foto: PHOTO.klinik,
    alasan:
      "Tidak ada foto kelas atau pelatihan di pool. Paling dekat adalah suasana kerja klinis tempat pelatihan diadakan; dicatat supaya kalau nanti ada foto kelas, ini bisa diganti.",
  },
  {
    slug: "kerja-sama-layanan-rujukan",
    foto: PHOTO.rawatJalan,
    alasan:
      "Rujukan berjenjang dimulai dari rawat jalan, tempat pasien diperiksa sebelum diteruskan. Foto itu yang tersedia; dan tidak ada foto rumah sakit lain.",
  },
  {
    slug: "program-pencegahan-stunting",
    foto: PHOTO.maternal,
    alasan:
      "Pencegahan stunting berkaitan erat dengan ibu dan anak, jadi foto unit ibu-anak yang dipakai — bukan bayi sendirian, yang tidak mewakili siapa yang dilayaninya.",
  },
  {
    slug: "peresmian-ruang-perawatan-baru",
    foto: PHOTO.rawatInap,
    alasan:
      "Berita membicarakan ruang perawatan baru, jadi inilah foto yang tepat di antara seluruh pool.",
  },
  {
    slug: "sosialisasi-program-zona-integritas",
    foto: PHOTO.mri,
    alasan:
      "Tidak ada foto rapat atau sosialisasi di pool. Yang dipakai ruang kerja lain yang belum terpakai berita mana pun, dan itu dicatat sebagai pilihan terdekat, bukan pasangan sempurna. Sama sekali tidak dipetakan juga bisa — berita ini dibiarkan memakai fallback indeks.",
  },
  {
    slug: "pemeriksaan-kesehatan-gratis",
    foto: PHOTO.diagnostic,
    alasan:
      "Pemeriksaan kesehatan gratis adalah pemeriksaan medis, jadi foto diagnostik yang dipakai. Sama dengan zona integritas karena memang hanya ada satu foto pemeriksaan di pool; dipisah dari slug lain supaya tidak bersebelahan di halaman daftar.",
  },
  {
    slug: "pelatihan-manajemen-keselamatan",
    foto: PHOTO.eswl,
    alasan:
      "Tidak ada foto pelatihan. Yang tersedia dan dekat adalah peralatan medis, tempat keselamatan kerja paling diutamakan; ini dicatat sebagai pilihan yang masuk akal, bukan yang ideal.",
  },
  // --- Berita statis di `src/data/home.ts` -------------------------------
  //
  // Daftar di atas berasal dari database; yang di bawah dari modul statis yang
  // dipakai halaman beranda saat database tidak dijangkau. Keduanya tampil di
  // tempat yang sama dilihat pengunjung, jadi sama-sama perlu foto yang
  // sesuai konteksnya.
  //
  // Berita yang tidak punya pasangan wajar sengaja tidak dipetakan sama
  // sekali: kanal Youtube, edukasi gizi, telemedicine, dan kerja sama
  // universitas tidak punya foto yang mewakili di pool, dan memaksa memakai
  // gambar yang salah konteks lebih buruk daripada memakai putaran berita yang
  // memang berisi foto rumah sakit.
  {
    slug: "layanan-stroke-terpadu",
    foto: PHOTO.stroke,
    alasan: "Layanan stroke, dan ada foto layanan stroke.",
  },
  {
    slug: "program-promosi-layanan-jantung",
    foto: PHOTO.jantung,
    alasan: "Layanan jantung, dan ada foto layanan jantung.",
  },
  {
    slug: "peresmian-unit-maternal-center-baru",
    foto: PHOTO.maternal,
    alasan: "Unit ibu dan anak, dan ada foto unit ibu-anak.",
  },
  {
    slug: "rawat-inap-khusus-trauma",
    foto: PHOTO.rawatInapKhusus,
    alasan: "Rawat inap khusus, dan ada foto rawat inap khusus.",
  },
  {
    slug: "pemeriksaan-kesehatan-gratis-untuk-masyarakat",
    foto: PHOTO.diagnostic,
    alasan: "Pemeriksaan kesehatan, dan ada foto pemeriksaan diagnostik.",
  },
];

export default COVER_BERITA;
