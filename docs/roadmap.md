# Roadmap dan Status Progres

Dokumen ini menuliskan posisi proyek sekarang dan langkah berikutnya.

Perbedaannya dengan PRD di `prd-web-rumah-sakit.md`: PRD berisi apa yang
**diminta**, dokumen ini berisi apa yang **sudah ada dan sudah dibuktikan**.

Semua angka di bawah diukur dari isi repo, bukan dari ingatan. Kalau sebuah
angka belum bisa dibuktikan, dokumen ini menuliskannya sebagai belum diketahui,
bukan sebagai perkiraan.

---

## 1. Status saat ini

| Yang diukur | Nilai | Cara mengukur |
|---|---|---|
| Halaman ter-prerender | 160 | `bun run build` |
| Berkas tes | 31 | `bun run test` |
| Jumlah tes | 429 | `bun run test` |
| Rute internal unik | 63 | `collectNavPaths()` di `src/data/navigation.ts` |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 27 | `pgTable` di `src/server/db/schema.ts` |
| Route handler API | 42 | `src/app/api/v1/**/route.ts` |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |

Gerbang kualitas terakhir: `npx tsc --noEmit` bersih, `bun run lint` bersih,
`bun run test` 429 tes lulus, `bun run build` sukses.

Belum ada alur CI. Gerbang itu masih dijalankan manual, jadi bisa terlewat.
Lihat bagian 4.

---

## 2. Kesesuaian dengan PRD

### P0 — Situs statis (fondasi)

| # | Butir PRD | Status | Bukti |
|---|---|---|---|
| 1 | Layout global: topbar, navbar, footer, back-to-top | selesai | — |
| 2 | Beranda dengan seluruh section | selesai | 13 section di `src/app/page.tsx`, urutannya sama dengan PRD 8.3 |
| 3 | Halaman konten dari tabel `pages` | selesai | 160 halaman hasil build |
| 4 | Halaman detail template | selesai | layanan prioritas, fasilitas, MCU, berita |
| 5 | Galeri dengan lightbox | selesai | `src/components/ui/GalleryLightbox.tsx`, PR #25 |

### P1 — Fitur berbasis database

| # | Butir PRD | Status | Catatan |
|---|---|---|---|
| 6 | Cari jadwal dokter | selesai | spesialis, dokter, hari |
| 7 | Kapasitas bed | selesai | — |
| 8 | Berita dan artikel | selesai | daftar, detail, paginasi |
| 9 | FAQ accordion | selesai | 9 pertanyaan, section 13 beranda |
| 10 | Pencarian poliklinik | sebagian | direktori dan filter per klinik ada, kotak pencarian teks belum. Lihat 3.2 |

### P2 — Form dan transaksi

| # | Butir PRD | Status |
|---|---|---|
| 11 | Daftar online (E-Pasien) | selesai, termasuk nomor antrean |
| 12 | Registrasi MCU | selesai |
| 13 | Kritik dan saran | selesai |
| 14 | WBS | selesai |
| 15 | Survei kepuasan | selesai |
| 16 | Karir | selesai |

### P3 — Panel admin

Butir 17 dan 18 selesai. Tujuh belas tabel punya CRUD, dan inbox mencakup
pendaftaran, registrasi MCU, kritik-saran, WBS, serta respons survei.

Pemisahan peran berlaku: `front_office` tidak bisa mengubah konten, dan
`editor` tidak bisa mengelola akun.

### P4 — Pelengkap (opsional)

| # | Butir PRD | Status |
|---|---|---|
| 19 | Baca-nyaring | belum ada |
| 20 | Analytics GA4 | belum ada, dan PRD sendiri menyatakan dinonaktifkan secara bawaan |

Keduanya ditandai opsional di PRD, jadi tidak masuk daftar pekerjaan yang
wajib diselesaikan.

---

## 3. Yang belum selesai

Diurut dari yang paling mudah diselesaikan lebih dulu.

### 3.1 Empat unit medis tidak punya jalan masuk

Diagnostic Center, ESWL, MRI, dan Klinik Eksekutif sudah punya data, dan
halamannya juga sudah terbentuk. Tapi tidak ada satu pun tautan yang mengarah
ke sana.

Submenu, halaman indeks `/pelayanan/medis`, dan blok tautan anak di
`/informasi-publik/fasilitas` semuanya membaca dari `NAV_ITEMS`, dan keempat
unit itu tidak ada di sana. Halaman tanpa tautan hanya bisa dibuka lewat URL
yang diketik tangan.

Kerjaannya sudah ada di branch `feat/isi-halaman` pada commit `b0c1115`, belum
masuk `main`.

### 3.2 Pencarian poliklinik

PRD 8.3 tidak menyebut fitur ini, tetapi Core Features butir 10 menandainya
dengan tanda peringatan dan menyebut "pencarian poliklinik dan daftar dokter
per poliklinik".

Yang ada sekarang di `src/components/pelayanan/ClinicDirectory.tsx` adalah
daftar dengan filter per klinik, bukan pencarian teks.

Perlu keputusan: apakah fitur ini memang dituntut. Menambahkannya berarti satu
alur baru yang belum punya rujukan visual di situs acuan.

### 3.3 Unggah gambar dari panel admin

Acceptance Criteria bagian non-fungsional menyebut "unggah gambar admin
berfungsi di kedua lingkungan (storage adapter)". Kode ini tidak punya unggah
gambar sama sekali.

Admin memasukkan URL, dan `registry.ts` hanya menerima `http` dan `https`.

Ini bukan bug, tetapi perbedaan desain yang belum dicatat di PRD. Perlu
keputusan: tetap memakai URL, atau menambah storage adapter.

### 3.4 Acceptance Criteria belum pernah dicentang

Semua kotak di PRD bagian 12 masih kosong, termasuk butir yang sudah terbukti
terpenuhi.

Dua pilihan: mencentang yang memang sudah terbukti, atau memindahkan daftar itu
ke dokumen ini supaya jelas mana yang sudah diperiksa.

### 3.5 Lighthouse belum pernah diukur

Acceptance Criteria menyebut aksesibilitas minimal 90 dan SEO minimal 90. Angka
itu belum pernah diukur.

Yang bisa diukur tanpa alat tambahan: kontras teks, `alt` setiap gambar, label
form yang terhubung ke input, urutan heading, dan navigasi keyboard.

Lighthouse sendiri belum terpasang. Memasangnya berarti menambah dependensi,
jadi perlu persetujuan lebih dulu.

### 3.6 Dua angka lebar navbar tidak cocok

AGENTS.md menyebut delapan butir nav membutuhkan 894px, dan satu baris
membutuhkan 1496px. Komentar di `src/styles/site.css` menyebut 767px.

Kedua angka itu tidak bisa dibuktikan tanpa peramban, dan tidak ada satu pun
yang mengikat keduanya.

Perlu pengukuran ulang di peramban, lalu satu angka yang dipakai di dua tempat.

### 3.7 Cacat navbar yang sengaja dibekukan

Pada lebar 1200-1499px tombol "Administrasi Pasien" terpotong di tepi kanan.

Ini hasil keputusan pemilik repo untuk membekukan navbar, dan sudah tercatat
di `AGENTS.md`. Dicatat di sini supaya tidak mengejutkan saat diuji di laptop.

---

## 4. Langkah berikutnya

Diurut dari yang paling murah dan paling berguna.

1. **Pull request empat unit medis.** Kerjaannya sudah ada di `b0c1115`.
   Cukup menyusun ulang di atas `main` terbaru, lalu mengirimkannya.
2. **Pengukuran navbar di peramban.** Mengganti dua angka yang tidak cocok di
   3.6. Cukup satu sesi peramban, tanpa mengubah kode.
3. **Audit aksesibilitas manual.** Periksa kontras, `alt`, label form, urutan
   heading, dan navigasi keyboard pada beranda, jadwal dokter, daftar online,
   serta panel admin.
4. **Putuskan tiga hal yang tertunda.** Yaitu 3.2, 3.3, dan 3.4. Semuanya
   butuh keputusan pemilik, sehingga menundanya menyisakan ketidaksesuaian
   dengan PRD.
5. **Nilai lulus atau tidak untuk setiap Acceptance Criteria.** Yang bisa
   dibuktikan ditulis centang, yang tidak ditulis apa yang menggagalkan.
6. **Alur CI untuk gerbang.** Satu berkas alur kerja yang menjalankan `lint`,
   `test`, dan `build` pada setiap push. Ini bagian yang paling sederhana dan
   paling jarang menimbulkan masalah.
7. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

---

## 5. Yang perlu diketahui sebelum lanjut

- **Navbar dibekukan.** Jangan diubah tanpa diminta pemilik repo.
  `tests/navbar-beku.test.ts` mengunci keadaan itu, dan sengaja gagal kalau
  navbar disentuh.
- **Data di `src/data/` masih lokal.** Halaman membaca dari modul data, bukan
  dari API. Route handler sudah ada di `src/app/api/v1/`, dan semua path di luar
  sana dijawab 404 oleh catcher di `src/app/api/v1/[...path]/route.ts`.
- **Host gambar harus terdaftar di `next.config.ts`.** Host baru akan ditolak
  `next/image`.
- **`archive/` hanya baca.** Jangan diperbaiki atau dipindahkan.
- **Sumber kebenaran rute adalah `collectNavPaths()`.** Tautan baru yang tidak
  ada di `NAV_ITEMS`, `HEADER_CTAS`, atau `FOOTER_LINKS` akan menjawab 404.
- **Cara menambahkan tautan baru** adalah menambahkannya ke salah satu dari
  ketiga array itu, bukan menulis daftar path di tempat lain.
