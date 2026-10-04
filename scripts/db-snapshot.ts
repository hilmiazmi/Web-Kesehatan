/**
 * Tulis ulang `snapshot/*.json` dari database yang sedang berjalan.
 *
 * Snapshot adalah salinan baca endpoint publik ke berkas JSON, dipakai ketika
 * database tidak tersedia: build pratinjau di Vercel tidak boleh menyentuh
 * database produksi, dan domain yang diarahkan ke cadangan harus tetap bisa
 * menampilkan isi situs yang sebenarnya.
 *
 * Isi setiap berkas adalah muatan yang akan dibaca `denganSnapshot`, yaitu
 * objek yang di dalam route handler dibungkus `ok()`. Amplop `data` tidak ikut
 * disimpan, karena `denganSnapshot` meneruskan hasilnya ke `ok()` sekali lagi.
 * Menyimpan amplop di sini akan menghasilkan `{ "data": { "data": ... } }`.
 *
 * Nama berkasnya dihitung oleh `snapshotKey()`, fungsi yang sama dengan yang
 * dipakai pembacaan. Dua implementasi terpisah dari aturan yang sama akan
 * berbeda pada segmen pertama yang tidak ditandai `__` saja.
 *
 * ```bash
 * DATABASE_URL=postgres://... bun run db:snapshot
 * ```
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, dbOrNull, type Db } from "@/server/db/client";
import { snapshotKey } from "@/server/api/snapshot";
import { loadBedSummary, listBeds } from "@/server/db/repo/beds";
import {
  findArticle,
  findDocument,
  findJob,
  findMcuPackage,
  findPage,
  findService,
  listArticles,
  listDoctors,
  listDocuments,
  listJobs,
  listMcuPackages,
  listPolyclinics,
  listPublishedPageSlugs,
  listSchedules,
  listServices,
  listSpecialties,
  loadHome,
  loadSettings,
  type ArticleSummary,
} from "@/server/db/repo/content";

/** Direktori tujuan, relatif terhadap akar proyek. */
const DIREKTORI = path.join(process.cwd(), "snapshot");

/** Nama berkas manifest di dalam direktori snapshot. */
const MANIFEST = "manifest.json";

/**
 * Jumlah baris berita yang diambil per satu permintaan ke database.
 *
 * Endpoint berita dibatasi 24 baris, tapi snapshot ingin seluruh isi supaya
 * halaman detail semua berita ikut terbawa.
 */
const UKURAN_BERITA = 100;

/** Kunci rute dan cara mengambil isinya. */
type Pengambil = (db: Db) => Promise<unknown>;

async function kumpulkan(db: Db): Promise<[string, unknown][]> {
  const rute: [string, unknown][] = [];

  const tambah = async (ruteApi: string, ambil: Pengambil): Promise<void> => {
    rute.push([ruteApi, await ambil(db)]);
  };

  // Koleksi
  await tambah("/home", loadHome);
  await tambah("/specialties", (d) => listSpecialties(d));
  await tambah("/polyclinics", listPolyclinics);
  await tambah("/doctors", (d) => listDoctors(d, { specialty: null }));
  await tambah("/services", (d) => listServices(d, { type: null, section: null }));
  await tambah("/mcu/packages", (d) => listMcuPackages(d, null));
  await tambah("/documents", (d) => listDocuments(d, null));
  await tambah("/jobs", listJobs);
  await tambah("/settings/public", loadSettings);

  // Ringkasan tempat tidur. `observed_at` adalah waktu pengukuran, jadi angkanya
  // benar pada saat snapshot ditulis dan tidak lagi setelahnya. Itu sebabnya
  // snapshot tidak pernah dipakai untuk menampilkan ketersediaan kamar secara
  // resmi, hanya untuk pratinjau.
  await tambah("/beds", async (d) => ({
    summary: await loadBedSummary(d),
    items: await listBeds(d),
  }));

  // Daftar berita dipaginasikan supaya seluruh isi bisa terbawa, bukan hanya
  // halaman pertama.
  const berita = await ambilSemuaBerita(db);
  rute.push([
    "/articles",
    {
      items: berita.items,
      total: berita.total,
      page: 1,
      page_size: UKURAN_BERITA,
      pages: Math.max(1, Math.ceil(berita.total / UKURAN_BERITA)),
    },
  ]);

  // Halaman detail. Slug diambil dari daftar di atas, bukan dari seed, supaya
  // baris yang ditambahkan lewat panel admin ikut terbawa.
  for (const ringkasan of berita.items) {
    const baris = await findArticle(db, ringkasan.slug);
    if (baris !== null) rute.push([`/articles/${ringkasan.slug}`, baris]);
  }

  for (const ringkasan of await listServices(db, { type: null, section: null })) {
    const baris = await findService(db, ringkasan.slug);
    if (baris !== null) rute.push([`/services/${ringkasan.slug}`, baris]);
  }

  for (const slug of await listPublishedPageSlugs(db)) {
    const baris = await findPage(db, slug);
    if (baris !== null) rute.push([`/pages/${slug}`, baris]);
  }

  for (const ringkasan of await listMcuPackages(db, null)) {
    const baris = await findMcuPackage(db, ringkasan.slug);
    if (baris !== null) rute.push([`/mcu/packages/${ringkasan.slug}`, baris]);
  }

  for (const ringkasan of await listJobs(db)) {
    const baris = await findJob(db, ringkasan.slug);
    if (baris !== null) rute.push([`/jobs/${ringkasan.slug}`, baris]);
  }

  // Dokumen ikut dapat halaman detail, sama seperti berita, lowongan, dan
  // layanan. Slug diambil dari daftar, bukan dari seed, supaya dokumen yang
  // ditambahkan lewat panel admin ikut terbawa.
  for (const ringkasan of await listDocuments(db, null)) {
    const baris = await findDocument(db, ringkasan.slug);
    if (baris !== null) rute.push([`/documents/${ringkasan.slug}`, baris]);
  }

  // Jadwal praktik per dokter tidak berubah terhadap tanggal permintaan, jadi
  // aman di-snapshot. Endpoint jadwal per tanggal tidak ikut karena isinya
  // memang berbeda tiap hari, dan sisa kuota untuk tanggal tertentu akan basi
  // begitu lewat.
  for (const dokter of await listDoctors(db, { specialty: null })) {
    rute.push([
      `/doctors/${dokter.id}/schedules`,
      await listSchedules(db, { doctorId: dokter.id }),
    ]);
  }

  return rute;
}

/**
 * Semua baris berita, dengan mengambil halaman demi halaman.
 *
 * `total` diambil dari respons pertama karena `count(*) over ()` dihitung
 * sebelum `LIMIT`, jadi nilainya benar di halaman mana pun.
 */
async function ambilSemuaBerita(
  db: Db,
): Promise<{ items: ArticleSummary[]; total: number }> {
  const pertama = await listArticles(db, { limit: UKURAN_BERITA, offset: 0, category: null });
  const items = [...pertama.items];
  const total = pertama.total;

  const halamanMaks = Math.max(1, Math.ceil(total / UKURAN_BERITA));

  for (let halaman = 1; halaman < halamanMaks; halaman += 1) {
    const berikutnya = await listArticles(db, {
      limit: UKURAN_BERITA,
      offset: halaman * UKURAN_BERITA,
      category: null,
    });

    items.push(...berikutnya.items);
  }

  return { items, total };
}

async function main(): Promise<void> {
  const db = dbOrNull();
  if (db === null) {
    console.error(
      "Snapshot butuh database. Isi DATABASE_URL lalu jalankan ulang.",
    );
    process.exit(1);
  }

  const rute = await kumpulkan(db!);
  await mkdir(DIREKTORI, { recursive: true });

  const peta: Record<string, string> = {};

  for (const [ruteApi, nilai] of rute) {
    const nama = `${snapshotKey(ruteApi)}.json`;
    peta[ruteApi] = nama;

    await writeFile(
      path.join(DIREKTORI, nama),
      `${JSON.stringify(nilai, null, 1)}\n`,
      "utf8",
    );
  }

  // Manifest sengaja tidak memakai cap waktu. Nilai seperti `dibuat_pada` selalu
  // berubah setiap kali skrip ini dijalankan, sehingga `bun run db:snapshot`
  // selalu meninggalkan working tree kotor dengan selisih yang tidak membawa
  // informasi apa pun. Nilai itu juga tidak pernah dibaca siapa pun, jadi satu-
  // satunya efeknya adalah membuat skrip pemeriksaan terlihat sudah rusak.
  //
  // Kalau suatu saat cap waktu memang dibutuhkan, tempatnya ada di pesan commit,
  // bukan di berkas hasil generate.
  const manifest = {
    versi: 1,
    jumlah: Object.keys(peta).length,
    rute: peta,
  };

  await writeFile(
    path.join(DIREKTORI, MANIFEST),
    `${JSON.stringify(manifest, null, 1)}\n`,
    "utf8",
  );

  await bersihkan(Object.values(peta));

  await closeDb();
  console.log(`selesai: ${Object.keys(peta).length} rute ditulis ke snapshot/`);
}

/**
 * Hapus berkas snapshot yang rutenya sudah tidak ada.
 *
 * Tanpa ini, halaman yang dihapus di panel admin akan tetap muncul di pratinjau
 * selamanya, karena berkasnya masih ada dan `denganSnapshot` tidak pernah
 * bertanya ke database untuk memastikan.
 */
async function bersihkan(tersisa: string[]): Promise<void> {
  const yangTersisa = new Set(tersisa);

  for (const entri of await readdir(DIREKTORI)) {
    if (entri === MANIFEST || !entri.endsWith(".json")) continue;
    if (yangTersisa.has(entri)) continue;

    await rm(path.join(DIREKTORI, entri));
    console.log(`dihapus: ${entri}`);
  }
}

await main();
