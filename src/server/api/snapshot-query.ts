/**
 * Penyaring dan pemotong muatan snapshot.
 *
 * Snapshot menyimpan hasil satu kueri dengan parameter tertentu, jadi isinya
 * belum tentu sama dengan yang diminta rute saat ini. `denganSnapshot()`
 * sendiri tidak bisa memutuskan: ia tidak tahu filter apa pun yang akan
 * dikerjakan kueri aslinya.
 *
 * Tanpa penerapan di sini, mode `API_MODE=snapshot` menjawab 200 dengan isi
 * yang tidak sesuai permintaan. Contoh yang sudah terukur: `/api/v1/articles`
 * dengan `?category=kerjasama` mengembalikan sepuluh artikel yang kategorinya
 * `kegiatan`, `pelayanan`, dan `program`. Tidak satu pun `kerjasama`.
 *
 * Pennapasan di sini memakai kesamaan nilai persis, sama seperti SQL di
 * `src/server/db/repo/content.ts`. Kalau suatu saat SQL berubah jadi
 * `ILIKE` atau perbandingan sebagian, fungsi ini harus diubah bersama,
 * karena tidak ada yang mengikat keduanya.
 */

/** Syarat penyaringan. Nilai `null` berarti "jangan saring kolom ini". */
export type Syarat = Record<string, string | null>;

/** Bentuk muatan snapshot yang perlu dibaca: daftar polos, atau amplop ber`items`. */
type Baris = Record<string, unknown>;

/**
 * Ambil daftar baris dari muatan snapshot.
 *
 * Dua bentuk muncul di repo: `/doctors` menyimpan daftar polos, sedangkan
 * `/articles` menyimpan amplop `{ items, total, page, page_size, pages }`.
 * Keduanya harus bisa dibaca, jadi bentuknya diperiksa di sini.
 */
function barisDari(muatan: unknown): Baris[] {
  if (Array.isArray(muatan)) return muatan as Baris[];
  if (muatan !== null && typeof muatan === "object") {
    const isi = (muatan as { items?: unknown }).items;
    if (Array.isArray(isi)) return isi as Baris[];
  }
  return [];
}

/** Buang syarat yang bernilai `null` supaya tidak ikut dibandingkan. */
function syaratAktif(syarat: Syarat): [string, string][] {
  return Object.entries(syarat).filter(
    (entry): entry is [string, string] => entry[1] !== null
  );
}

/**
 * Saring baris dengan kesamaan nilai persis.
 *
 * Hasil kosong itu jawaban yang benar, bukan tanda gagal: `/articles` dengan
 * kategori yang memang tidak ada harus mengembalikan `total: 0`, bukan
 * seluruh tabel.
 */
export function saring<T>(muatan: unknown, syarat: Syarat): T[] {
  const semua = barisDari(muatan);
  const aktif = syaratAktif(syarat);
  if (aktif.length === 0) return semua as T[];
  return semua.filter((baris) =>
    aktif.every(([kolom, nilai]) => baris[kolom] === nilai)
  ) as T[];
}

/**
 * Saring lalu potong ke satu halaman.
 *
 * `total` dihitung setelah penyaringan dan sebelum pemotongan, karena itu
 * jumlah baris yang cocok di seluruh tabel. Menghitungnya setelah pemotongan
 * membuat halaman kedua melaporkan `total` sebesar ukuran halamannya, dan
 * jumlah halaman ikut salah.
 */
export function satuHalaman<T>(
  muatan: unknown,
  syarat: Syarat,
  posisi: { limit: number; offset: number }
): { items: T[]; total: number } {
  const cocok = saring(muatan, syarat);
  return {
    items: cocok.slice(posisi.offset, posisi.offset + posisi.limit) as T[],
    total: cocok.length,
  };
}