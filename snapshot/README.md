# Snapshot konten

Salinan respons API yang dipakai saat database tidak bisa dihubungi:

* **Pratinjau di Vercel.** Build tidak boleh menyentuh database produksi.
* **Cadangan saat VPS mati.** Tanpa berkas-berkas ini, domain yang
  diarahkan ke Vercel hanya bisa menampilkan data dummy.

## Isi

`manifest.json` memetakan path API ke nama berkas:

```json
{
  "api_version": "v1",
  "generated_at": "2026-10-03T02:19:48Z",
  "count": 79,
  "routes": { "/doctors": "doctors.json", "/pages/kontak": "pages__kontak.json" }
}
```

Satu berkas per path, namanya diturunkan dari path dengan mengganti `/`
jadi `__`. Tidak ada subdirektori, jadi `..` tidak mungkin muncul di nama
berkas dan handler tidak bisa keluar dari direktori ini.

Bentuk isi berkas sama dengan balasan endpoint, termasuk amplop `data`.
Frontend tidak perlu tahu sedang membaca API sungguhan atau snapshot.

## Membuat ulang

```bash
DATABASE_URL=... AUTH_SECRET=... bun run db:snapshot
```

Berkas yang rutenya sudah hilang ikut dihapus, jadi halaman yang dihapus di
panel admin tidak akan selamanya masih ada di sini.

## Field yang berubah setiap pembuatan ulang

Snapshot **belum bisa direproduksi ulang persis**. Beberapa field memang
berubah walaupun isinya tidak disentuh:

| Field | Contoh | Kenapa berubah |
| --- | --- | --- |
| `id` pada tabel selain `doctors` | uuid acak | Masih datang dari `gen_random_uuid()` |
| `published_at` pada berita | `2026-09-28 02:19:48+00` | Seed menghitung tanggalnya relatif terhadap waktu sekarang |
| `observed_at` pada tempat tidur | waktu ukur | Waktu pengukuran, bukan bagian dari isi |
| `generated_at` pada manifest | waktu | Waktu penulisan berkas |

Id dokter sengaja dibuat tetap (tertulis di `scripts/seed-data.json`) karena id
itu muncul di nama berkasnya. Kalau tidak, setiap seeding mengganti nama berkas tanpa
ada hubungannya dengan perubahan isi.

Akibatnya, diff setelah pembuatan ulang selalu besar. Jalankan `db:snapshot`
secara sengaja, bukan setiap kali deploy, dan baca selisihnya di bagian
`data` berkas, bukan di nama berkasnya.

## Batas yang disengaja

Snapshot tidak bisa menjawab:

* filter (`?specialty=`, `?category=`, `?type=`) — mode pratinjau selalu
  mengembalikan daftar lengkap
* halaman kedua (`?page=2`)
* jadwal untuk tanggal tertentu (`?date=`), karena isinya memang berubah
  tiap hari
* ketersediaan kamar secara resmi, karena angkanya hanya benar pada saat
  pengukuran

Mode pratinjau karena itu hanya boleh menampilkan, tidak boleh menerima
kiriman. Formulir dinonaktifkan di mode itu.
