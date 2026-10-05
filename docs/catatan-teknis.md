# Catatan teknis

Catatan singkat untuk keputusan yang tidak terlihat dari kode. Untuk daftar
pekerjaan dan statusnya, `docs/roadmap.md` yang jadi acuan. Berkas ini untuk
menjelaskan alasan suatu keputusan diambil, terutama yang tidak bisa dibuktikan
sendiri dengan membaca kode.

---

## `<title>` halaman generik menyebut nama rumah sakit dua kali

### Gejala

`layout.tsx` memasang template judul:

```
title: { template: "%s | RSUD Contoh Sehat" }
```

Jadi setiap halaman yang mengembalikan `metadata.title` sebagai string akan
dirender menjadi `<title>Judul | RSUD Contoh Sehat</title>`, dan nama rumah
sakit muncul **satu kali**, dari template.

`src/app/[...slug]/page.tsx` dulu mengembalikan `${title} - ${SITE.name}`.
Untuk halaman generic, `metadata.title` disusun dari label jejak halaman itu,
sehingga hasilnya seperti `Tentang Kami - RSUD Contoh Sehat`. Template lalu
menempelkan nama rumah sakit lagi, dan `<title>`-nya menjadi
`Tentang Kami - RSUD Contoh Sehat | RSUD Contoh Sehat`. Nama rumah sakit
muncul **dua kali**.

### Kenapa cuma route generic

Hanya `src/app/[...slug]/page.tsx` yang menambahkan nama itu. Seluruh repo
sudah diperiksa: `SITE.name` muncul juga di `opengraph-image.tsx` (`alt` dan
teks SVG), `Footer.tsx`, dan `Navbar.tsx`, tapi tidak satu pun dari sana menulis
`<title>`. Jadi sumber dobelnya satu, bukan beberapa.

### Cara menangkap

Dua bagian di `scripts/cek-tautan.ts`:

- `kemunculanNamaRS()` menghitung **kemunculan**, bukan posisi. Menghitung
  posisi akan salah, karena ada judul yang memang sah diawali nama rumah sakit.
- `JUDUL_BOLEH_DOBEL` adalah daftar halaman yang dikecualikan. Saat ini isinya
  cuma `/berita/rsud-contoh-sehat-terima-akreditasi-utama`, karena judul berita
  itu memang diawali nama rumah sakit dan itu benar.

Kalau `judulDobel` tidak kosong, `main()` menetapkan `gagal = true` lalu keluar
dengan kode 1. Jadi ini bukan peringatan, tapi gerbang yang menggagalkan build.

### Angka terverifikasi

Diukur pada 4 Oktober 2026, dari build yang sudah diperbaiki:

| Angka | Nilai | Cara diukur |
|---|---|---|
| Berkas HTML hasil build | 150 | `find .next/server/app -name '*.html'` |
| Halaman setelah abaikan dua halaman internal Next.js | 148 | `/_not-found` dan `/_global-error` diabaikan |
| Route yang dilayani catch-all | 30 | `collectNavPaths()` di `src/lib/nav-path.ts` |
| Judul dobel setelah diperbaiki | 1 | satu-satunya, dan memang ada di `JUDUL_BOLEH_DOBEL` |

Jadi 30 halaman generic yang tadinya dobel sekarang sudah bersih.

### Yang belum bisa direproduksi

Komentar di `src/app/[...slug]/page.tsx` menyebut **"31 dari 152 halaman"**.
Angka itu tidak bisa diulang. Yang terukur 30 dari 148. Dua-duanya mungkin
mengukur hal yang sedikit berbeda:

- **152** adalah jumlah HTML yang pernah ada, sebelum penghapusan halaman yatim
  oleh commit `48a34d2`. Sekarang jumlah HTML 150, dan 148 setelah pengabaian
  halaman internal.
- **31** mungkin menghitung 30 halaman generic ditambah satu halaman yang
  memang sah diawali nama rumah sakit. Kalau begitu, jumlah dobel yang
  sebenarnya tetap 30.

Angka di komentar sebaiknya diubah menjadi 30 dari 148, atau diberi catatan
bahwa itu hasil pengukuran lama. Selama tidak cocok, orang berikutnya akan
menghitung ulang lalu meragukan hasilnya.

### Status

**Sudah di-commit** di `422292e`. Perubahan itu ada di dua berkas:

| Berkas | Isi |
|---|---|
| `src/app/[...slug]/page.tsx` | `generateMetadata` mengembalikan judul polos, bukan `${title} - ${SITE.name}` |
| `scripts/cek-tautan.ts` | ditambah `kemunculanNamaRS` dan `JUDUL_BOLEH_DOBEL` |

`src/app/layout.tsx` **tidak** ikut berubah. Template `%s \| RSUD Contoh Sehat`
sudah ada di sana sejak commit `8fd77e5`, jadi tidak perlu disentuh. Ini yang
membuat perbaikannya cukup satu baris: hapus penambahan nama di satu tempat, dan
biarkan template yang menambahkannya.

Kalau suatu saat dibalik, `generateMetadata` harus mengembalikan objek dengan
`default` dan `template`, bukan judul polos. Yang sekarang dipakai adalah pola
`template` di `layout.tsx`, jadi keduanya tidak boleh hidup bersamaan.

---

## Foto berita dari database sengaja tidak dioptimasi

### Gejala

Admin mengisi kolom `cover_url` di `/admin/records/articles` dengan URL dari
host mana pun. Halaman `/berita` lalu menampilkan foto itu, dan gambarnya
rusak: kotak kosong dengan ikon gambar silang.

### Sebabnya

`next/image` hanya memuat host yang terdaftar di `remotePatterns` pada
`next.config.ts`. Repo ini mendaftarkan Unsplash dan picsum saja, karena itu
satu-satunya host yang memang dipakai `src/data/images.ts`. `registry.ts`
menerima `http` dan `https` apa pun untuk `cover_url`, jadi keduanya tidak
sepadan.

Yang terjadi di peramban: `next/image` menuliskan `src="/_next/image?url=..."`,
permintaan itu masuk ke perkakas optimasi, perkakasnya menolak host yang tidak
terdaftar, dan hasilnya galat. Bukan gambar yang gagal dimuat dari host aslinya,
tetapi permintaan ke server sendiri yang ditolak.

### Kenapa tidak menambah host-nya

Host tidak bisa diprediksi. `remotePatterns` memang ada sebagai daftar putih
justru supaya server tidak ikut mengambil URL dari mana pun. Membuka lebar
daftar itu hanya untuk satu kolom membatalkan maksud daftar putihnya.

### Yang dipakai

`Photo` sekarang menerima prop `unoptimized`, dan `fotoBerita()` menyalakannya
hanya untuk URL yang benar-benar berasal dari database. Dengan `unoptimized`,
komponen menulis `src` apa adanya ke `img` dan permintaan ke `/_next/image`
tidak pernah dibuat, jadi daftar host tidak berlaku lagi. Foto stok dari
`src/data/images.ts` tetap dioptimasi seperti sebelumnya.

Konsekuensinya foto dari database tidak dapat dioptimasi: tidak ada resize
otomatis, tidak ada format WebP, dan ukurannya sebesar berkas yang diunggah
admin. Itu trade-off yang diterima secara sadar, karena foto rusak sama sekali
lebih buruk daripada foto besar.

### Cara memastikan tidak rusak lagi

Ada tes di `tests/konten-loader.test.ts` yang menuntut `fotoBerita()`
mengembalikan `unoptimized: true` tepat ketika `imageUrl` terisi, dan `false`
saat tidak. Mengubahnya jadi selalu `false` membuat tes itu gagal.

---

## Database tidak terjangkau bukan alasan halaman kosong

### Gejala

`API_MODE=live`, tapi `DATABASE_URL` menunjuk ke PostgreSQL yang tidak ada, atau
`next build` dijalankan di lingkungan tanpa environment sama sekali. Halaman
berita tetap harus punya isi.

### Keputusan

`getPublicArticles()` dan `getPublicArticle()` mengembalikan data statis di dua
keadaan yang berbeda, dan keduanya tercatat di log:

1. `API_MODE=snapshot`. Ini yang dipakai CI dan pratinjau Vercel. `dbOrNull()`
   mengembalikan `null` dan database tidak pernah disentuh sama sekali.
2. Mode live, tapi koneksi gagal. `koneksiKonten()` menangkap galat dari
   `dbOrNull()`, termasuk galat konfigurasi "`DATABASE_URL` wajib diisi", dan
   `peringatkan()` menuliskannya sebagai satu baris.

Alasan keduanya adalah sama: halaman publik harus punya isi, dan isi itu harus
dapat dipratinjau tanpa PostgreSQL. Yang tidak boleh terjadi adalah fallback
yang diam-diam, karena begitu `API_MODE=live` bisa berhenti membaca database
tanpa ada yang tahu.

### Peringatan yang disengaja

Satu baris per kegagalan, dan isinya nama operasi serta pesan galat, tidak
pernah nilai environment. `DATABASE_URL` tidak boleh masuk log, jadi pesan dari
`postgres.js` yang menyebut nama basis data tidak ikut ditulis; yang ditulis
cuma pesan operatornya.

### Bukti bahwa fallback-nya jalan

Server produksi dijalankan dengan `API_MODE=live` dan `DATABASE_URL` yang
menunjuk ke port tertutup, lalu keempat rute diuji:

```text
/                                     200   enam belas kartu berita
/berita                               200   enam belas kartu berita
/berita/layanan-stroke-terpadu        200   lima paragraf
/berita/tidak-ada                     404
```

`[konten] ... data statis dipakai` muncul tujuh kali di log. Kalau fallback-nya
tidak berjalan, keempatnya akan 500.
