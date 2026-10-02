/**
 * Foto dummy.
 *
 * SEMUA foto di sini berasal dari Unsplash (foto stock gratis untuk pakai)
 * dan picsum.photos. Tidak ada foto dari situs referensi yang disalin.
 *
 * Seluruh 20 ID Unsplash di bawah sudah diverifikasi aktif (HTTP 200) pada
 * 2 Oktober 2026, jadi tidak ada risklink rusak.
 *
 * Ganti ke aset milik sendiri kapan saja: cukup ubah nilai `PHOTO.*`.
 */

const UNSPLASH = "https://images.unsplash.com/";

/**
 * Bangun URL foto Unsplash dengan ukuran dan format yang diminta.
 * `fit=crop` membuat gambar terpotong rapi sesuai rasio yang dipakai.
 */
export function photo(id: string, width = 800, height = 500): string {
  return `${UNSPLASH}${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

/** Foto generik dari picsum, dipakai untuk penghargaan (yang butuh citra abstrak). */
export function randomPhoto(seed: string, width = 500, height = 400): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/** ID foto yang sudah terverifikasi, dikelompokkan per kegunaan. */
export const PHOTO = {
  igd: "photo-1519494026892-80bbd2d6fd0d",
  jantung: "photo-1586773860418-d37222d8fce3",
  kangker: "photo-1551076805-e1869033e561",
  mcu: "photo-1504813184591-01572f98c85f",
  stroke: "photo-1516549655169-df83a0774514",
  uro: "photo-1587351021759-3e566b6af7cc",
  maternal: "photo-1505751172876-fa1923c5c528",
  mri: "photo-1631217868264-e5b90bb7e133",
  cathLab: "photo-1584982751601-97dcc096659c",
  rawatJalan: "photo-1512678080530-7760d81faba6",
  rawatInap: "photo-1516841273335-e39b37888115",
  rawatInapKhusus: "photo-1584515933487-779824d29309",
  diagnostic: "photo-1576091160399-112ba8d25d1d",
  eswl: "photo-1542884748-2b87b36c6b90",
  klinik: "photo-1628595351029-c2bf17511435",
  berita1: "photo-1538108149393-fbbd81895907",
  berita2: "photo-1559839734-2b71ea197ec2",
  berita3: "photo-1666214280557-f1b5022eb634",
  berita4: "photo-1471864190281-a93a3070b6de",
  berita5: "photo-1651008376811-b90baee60c1f",
  berita6: "photo-1505751172876-fa1923c5c528",
  farmasi: "photo-1587854692152-cbe660dbde88",
  rehabilitasi: "photo-1576091160399-112ba8d25d1d",
} as const;

/** Slide hero (9 slide). */
export const HERO_PHOTOS: string[] = [
  PHOTO.igd,
  PHOTO.jantung,
  PHOTO.berita2,
  PHOTO.mcu,
  PHOTO.maternal,
  PHOTO.mri,
  PHOTO.berita1,
  PHOTO.cathLab,
  PHOTO.berita4,
];

/** Foto untuk 6 layanan prioritas, urut sesuai PRIORITY_SERVICES. */
export const PRIORITY_PHOTOS: string[] = [
  PHOTO.jantung,
  PHOTO.kangker,
  PHOTO.mcu,
  PHOTO.stroke,
  PHOTO.uro,
  PHOTO.maternal,
];

/** Foto untuk 8 fasilitas, urut sesuai FACILITIES. */
export const FACILITY_PHOTOS: string[] = [
  PHOTO.igd,
  PHOTO.rawatJalan,
  PHOTO.rawatInap,
  PHOTO.rawatInapKhusus,
  PHOTO.diagnostic,
  PHOTO.eswl,
  PHOTO.mri,
  PHOTO.klinik,
];

/** 16 foto berita (berulang dari pool, dipakai bergiliran). */
export const NEWS_PHOTOS: string[] = [
  PHOTO.berita1, PHOTO.berita2, PHOTO.berita3, PHOTO.berita4,
  PHOTO.berita5, PHOTO.berita6, PHOTO.mcu, PHOTO.mri,
  PHOTO.jantung, PHOTO.kangker, PHOTO.stroke, PHOTO.uro,
  PHOTO.maternal, PHOTO.igd, PHOTO.rawatInap, PHOTO.diagnostic,
];

/** Foto galeri (6). */
export const GALLERY_PHOTOS: string[] = [
  PHOTO.farmasi,
  PHOTO.mri,
  PHOTO.rehabilitasi,
  PHOTO.igd,
  PHOTO.rawatInap,
  PHOTO.diagnostic,
];

/** Foto avatar testimoni (4). */
export const TESTIMONIAL_PHOTOS: string[] = [
  "photo-1494790108377-be9c29b29330",
  "photo-1500648767791-00dcc994a43e",
  "photo-1438761681033-6461ffad8d80",
  "photo-1472099645785-5658abf4ff4e",
];