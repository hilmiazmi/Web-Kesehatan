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
| Halaman ter-prerender | 154 | `routes` di `.next/prerender-manifest.json` |
| Pola rute dinamis | 11 | `dynamicRoutes` di `.next/prerender-manifest.json` |
| Berkas tes | 36 | `ls tests/*.test.ts \| wc -l` |
| Jumlah tes | 482 | `bun run test` |
| Rute dari catch-all | 30 | `collectNavPaths()` di `src/lib/nav-path.ts` |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 27 | `pgTable` di `src/server/db/schema.ts` |
| Route handler API | 43 | `src/app/api/v1/**/route.ts`, tidak termasuk catcher 404 |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |

Jumlah "halaman ter-prerender" sebelumnya ditulis 160. Angka itu adalah jumlah
baris yang dicetak build, termasuk `/_global-error` dan `/_not-found` yang bukan
halaman untuk pengunjung. Angka 154 di sini dihitung dari kunci `routes`, dan 11 pola
dinamis dihitung terpisah karena tiap pola menghasilkan banyak URL.


"Rute dari catch-all" 30 bukan 63 seperti tertulis sebelumnya. Angka 30 diukur
langsung dari `collectNavPaths()`, dan itulah yang dihitung: hanya path
yang dilayani `src/app/[...slug]/page.tsx`. Daun `/pelayanan/prioritas/*` dan
`/pelayanan/medis/*` sengaja tidak ikut karena sudah dilayani folder `[slug]`
masing-masing, dan sebelas pola dinamis dihitung terpisah di baris di atasnya.
Jadi 154 halaman tidak bisa dijumlahkan dari 30.

Gerbang kualitas terakhir: typecheck bersih, `bun run lint` bersih,
`bun run test` 482 tes lulus, `bun run cek:konten` dan `bun run audit:teks`
lulus, `bun run build` sukses.

Alur CI sudah ada di `.github/workflows/gerbang.yml`. Ia menjalankan lint, tes,
`cek:konten`, `audit:teks`, dan build pada setiap push dan setiap pull request,
dengan `DATABASE_URL` dikosongkan agar semuanya berjalan pada mode snapshot.

---

## 2. Kesesuaian dengan PRD

### P0 — Situs statis (fondasi)

| # | Butir PRD | Status | Bukti |
|---|---|---|---|
| 1 | Layout global: topbar, navbar, footer, back-to-top | sebagian | topbar, navbar, dan footer ada. Tombol kembali ke atas tidak ada. Lihat 3.10 |
| 2 | Beranda dengan seluruh section | selesai | 13 section di `src/app/page.tsx`, urutannya sama dengan PRD 8.3 |
| 3 | Halaman konten dari tabel `pages` | selesai | 154 halaman, lihat catatan di bagian 1 |
| 4 | Halaman detail template | selesai | layanan prioritas, fasilitas, MCU, berita |
| 5 | Galeri dengan lightbox | selesai | `src/components/ui/GalleryLightbox.tsx`, PR #25 |

### P1 — Fitur berbasis database

| # | Butir PRD | Status | Catatan |
|---|---|---|---|
| 6 | Cari jadwal dokter | selesai | spesialis, dokter, hari |
| 7 | Kapasitas bed | selesai | — |
| 8 | Berita dan artikel | selesai | daftar, detail, paginasi |
| 9 | FAQ accordion | selesai | 9 pertanyaan, section 13 beranda |
| 10 | Pencarian poliklinik | selesai | kotak pencarian teks plus daftar dokter per klinik, `src/lib/cari-klinik.ts`, commit `9484b7e` |

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

## 3. Riwayat dan sisa pekerjaan

Bagian ini sebelumnya hanya berisi pekerjaan yang belum selesai, diurut dari
yang paling mudah. Sekarang tiap butirnya diberi status, karena sebagian besar
sudah selesai dan pembaca perlu tahu mana yang memang masih terbuka. Yang
statusnya belum selesai ditulis terang-terangan di judulnya.

### 3.1 Empat unit medis tidak punya jalan masuk

**Selesai.** Keempat unit itu sudah ada di `NAV_ITEMS` pada `main`, di commit
`7087c99` yang masuk lewat PR #29.

Bagian ini sebelumnya menulis bahwa kerjaannya masih ada di branch
`feat/isi-halaman` pada commit `b0c1115` dan belum masuk `main`. Itu sudah
usang, jadi tidak dikerjakan ulang.

### 3.2 Pencarian poliklinik

**Selesai.** Commit `9484b7e`.

Pemilik repo memutuskan untuk menambahkannya. Alasannya PRD Core Features
butir 10 menyebutnya, dan bentuknya jelas: mengetik nama klinik atau nama
dokter, lalu daftar menyaring sendiri.

Yang ditambahkan:

- `src/lib/cari-klinik.ts`, fungsi murni `cariKlinik()`. Dipisah dari
  komponen supaya aturannya bisa diuji tanpa merender apa pun.
- Kotak pencarian di `ClinicDirectory.tsx` dengan label terlihat, `role
  status` yang menyebut jumlah hasil, keadaan kosong, dan tombol kosongkan
  kata kunci.
- Seksi "Dokter" di dalam panel klinik, untuk memenuhi bagian "daftar dokter
  per poliklinik" di PRD.
- 25 tes di `tests/cari-klinik.test.ts`.

Penyimpangan yang harus dicatat: situs acuan tidak punya kotak pencarian, jadi
tidak ada satu pun angka warna, tinggi, atau radius yang bisa diambil dari sana.
Bentuknya mengikuti `.form-control` yang sudah dipakai di halaman lain.

### 3.3 Unggah gambar dari panel admin

**Diputuskan tidak dikerjakan.** Pemilik repo memilih tetap memakai URL saja.

Alasannya storage adapter berarti satu dependensi baru plus layanan baru,
sedangkan Acceptance Criteria menyebutnya hanya sebagai satu butir dari
kelompok non-fungsional. Admin memasukkan URL, dan `registry.ts` hanya
menerima `http` dan `https`.

Ini bukan bug dan tidak akan diperbaiki. Dicatat di sini supaya nanti
ketahuan bedanya dengan PRD, dan tidak terbaca sebagai pekerjaan yang tertinggal.

### 3.4 Acceptance Criteria belum pernah dicentang

**Selesai.** Verdict lengkap untuk enam belas butir PRD bagian 12 ditulis di
bagian 6 dokumen ini. PRD tidak diubah, karena itu berkas pemilik repo dan
pemilik sudah memilih verdict-nya diletakkan di sini.

### 3.5 Lighthouse belum pernah diukur

**Sebagian.** Bagian yang bisa diukur tanpa alat tambahan sudah diukur. Angka
Lighthouse sendiri belum ada.

Sudah diukur secara manual di peramban pada 28 rute:

| Yang diperiksa | Hasil |
|---|---|
| `img` tanpa `alt` | 0 |
| Form tanpa label terhubung ke input | 0 |
| `id` ganda | 0 |
| Tombol atau tautan tanpa nama yang bisa diakses | 0 |
| `nav` tanpa `aria-label` | 0 |
| Tepat satu `h1` per rute | 28 dari 28 |
| Lompatan tingkat heading | 0 |
| `lang="id"` | ada |
| `<main>` | ada di semua rute |
| Tautan lewati | ada, di urutan Tab pertama |

Kontras teks diukur dengan rumus WCAG dan `getComputedStyle`. Sebelas pola
awalnya gagal ambang 4.5:1, semuanya sudah diperbaiki pada commit `04c0d8d`.
Sisa dua pola ada di hero sliding: teks putih di atas foto dengan
`text-shadow`, bukan scrim. `text-shadow` tidak dihitung dalam WCAG, dan situs
acuan juga memakainya, jadi tidak diubah.

Navigasi keyboard: urutan Tab beranda logis, `outline` 3px ada di semua
elemen, dan lightbox punya `role="dialog"` plus `aria-modal`, memindahkan fokus
saat dibuka, menutup dengan Escape, dan mengembalikan fokus ke pemicunya.

Satu temuan yang tidak diperbaiki: panel navigasi mobile tidak memakai
`aria-hidden` maupun `inert` saat tertutup, jadi tautan di dalamnya masih bisa
dicapai Tab meskipun panelnya di luar layar. Navbar dibekukan pemilik repo.
Lihat bagian 5.

Lighthouse belum terpasang. Memasangnya berarti menambah dependensi, jadi
memerlukan persetujuan tersendiri.

### 3.6 Dua angka lebar navbar tidak cocok

**Selesai.** Sudah diukur di peramban oleh sesi lain, dan sekarang hanya satu
angka yang dipakai di dua tempat. Rinciannya ada di blok "NAVBAR BEKU"
pada `AGENTS.md`.

### 3.7 Cacat navbar yang sengaja dibekukan

**Tetap ada dan sengaja diterima.** Pada lebar 1200 sampai 1495px tombol
"Administrasi Pasien" terpotong di tepi kanan.

Ini hasil keputusan pemilik repo untuk membekukan navbar, dan sudah tercatat
di `AGENTS.md`. Dicatat di sini supaya tidak mengejutkan saat diuji di laptop.

### 3.8 Dua puluh halaman tanpa satu pun tautan masuk

Kropl seluruh tautan internal dari `/` menemukan 134 halaman yang bisa
dibuka, 133 tautan unik, dan nol link mati. Tapi ketika hasilnya dibandingkan
dengan 154 halaman yang ter-prerender, ada dua puluh yang tidak muncul sebagai
tujuan tautan mana pun:

| Jumlah | Rute | Sebabnya |
|---|---|---|
| 18 | `/informasi-publik/brosur/*` | `BrosurDirectory` hanya merender panel kategori yang sedang aktif, jadi HTML server hanya memuat tiga brosur dari kategori pertama. Delapan belas sisanya baru muncul setelah tab diklik, yaitu setelah JavaScript berjalan. |
| 2 | `/laboratorium`, `/radiologi` | `DIAGNOSTIC_SERVICES` di `src/data/informasi.ts` memakai slug datar, sementara `NAV_ITEMS` menautkan ke `/pelayanan/diagnostik/laboratorium` dan `/pelayanan/diagnostik/radiologi`. Isi yang sama muncul di dua URL berbeda, dan yang datar tidak pernah ditautkan. |

Link mati tidak ada sama sekali, jadi Acceptance Criteria bagian fungsional
butir kedua belum sepenuhnya terpenuhi.

Perbaikan untuk delapan belas halaman brosur itu murah: render semua panel di
server, lalu sembunyikan yang tidak aktif dengan `hidden`. Itu juga pola
`tabpanel` yang benar untuk pembaca layar. Yang dua URL ganda tidak bisa
diselesaikan tanpa keputusan: menghapusnya berarti menghapus rute, dan
menggabungkan slug-nya berarti URL-nya tidak lagi cocok dengan `DETAIL_CONTENT`.

Belum dikerjakan. Perlu pemilik repo memilih.

### 3.9 Tidak ada sitemap.xml dan robots.txt

Keduanya menjawab 404. `src/app/sitemap.ts` dan `src/app/robots.ts` belum
ada.

Acceptance Criteria bagian non-fungsional menyebut Lighthouse SEO minimal 90.
Tanpa `sitemap.xml`, mesin pencari sulit menemukan 154 halaman dan
menautkannya satu sama lain. Ini juga bagian dari alasan kenapa 3.8 penting.

Belum dikerjakan karena keduanya berarti berkas baru dan keputusan soal
`metadataBase` untuk URL absolut. Kalau dikerjakan, keduanya sebaiknya masuk
alur CI yang sama.

### 3.10 Tombol kembali ke atas tidak ada

PRD bagian 8 butir 1 menyebut "layout global: topbar, navbar, footer,
back-to-top". Tiga yang pertama ada, yang keempat tidak.

Tidak ada berkas, komponen, atau aturan CSS untuk itu. Satu-satunya jejaknya
adalah komentar di `src/styles/site.css` yang menyebut "tombol kembali ke atas
memakai 9999", padahal angka 9999 dipakai `.skip-link`. Komentarnya sudah
dibetulkan dalam perubahan yang sama.

Bagian 2 menuliskannya sebagai "selesai" selama ini, padahal tidak ada.
Jadi ini masih perlu dibuat. Butuh komponen kecil plus aturan CSS, dan tidak
ada rujukan visual di situs acuan untuk diambil.

### 3.11 Bilah aksi cepat juga tidak pernah dibuat

`QuickActionBar` di PRD 8.4 tidak ada, sama seperti `BackToTop` di 3.10.
Layout hanya merender `Topbar`, `Navbar`, dan `Footer`, dan tidak ada kelas
CSS untuk bilah aksi cepat.

Inilah satu-satunya Acceptance Criteria yang gagal, yaitu butir 4 di bagian 6.
Back-to-top di 3.10 membuat butir 1 di bagian 2 hanya "sebagian", sedangkan
bilah aksi cepat membuat butir 4 gagal seluruhnya.

Isi bilah aksi cepat tidak bisa ditebak. Kandidat yang paling masuk akal
mengambil isinya dari `HEADER_CTAS` ditambah WhatsApp, tapi itu masih
perkiraan, dan belum ada rujukan visual di situs acuan untuk diambil.

### 3.12 Tautan mati yang sudah diperbaiki, dan penjaganya

Ditemukan lewat crawl 160 tautan internal dari HTML hasil build: 157 membalas
200, satu membalas 404. Dua sisanya berkas `_next/static/chunks` yang basi
karena build diulang di tengah penelusuran, bukan tautan.

Tautan yang 404 itu tombol "Daftar Online" di `/radiologi` dan
`/laboratorium`, yang menunjuk `/register`. Halaman itu tidak ada. Sembilan
tempat lain sudah memakai `/daftar-online`.

Penyebabnya celah tes, bukan salah ketik. `tests/nav-path.test.ts` hanya
membaca tautan di `src/data/navigation.ts`, sedangkan `href` yang ditulis
langsung di komponen tidak ikut dibaca. Karena itu `tests/tautan-internal.test.ts`
sekarang menjaga dua arah: setiap literal `href` di `.tsx` harus punya halaman,
dan tidak boleh menunjuk `/api/`.

Pola yang sama berlaku untuk warna theme-color. PRD, bagian 8.2,
`docs/design-tokens-terverifikasi.md`, dan `AGENTS.md` sama-sama menautkan
`#1A77CC` ke `<meta name="theme-color">`, padahal meta itu tidak pernah ada di
HTML hasil build dan `--rs-accent-theme-color` adalah token mati. Penyebabnya
`themeColor` di `metadata` sudah deprecated sejak Next.js 14 dan dibuang tanpa
peringatan: tetap lolos typecheck, tapi tagnya tidak pernah muncul. Sekarang
dipakai lewat export `viewport`, dan `tests/theme-color.test.ts` menjaga token
CSS dengan meta itu tidak berbeda. Hasilnya 151 dari 152 halaman
ter-prerender memakai tag itu; sisanya `_global-error.html` yang memang
menggantikan root layout.

---

## 4. Langkah berikutnya

Tujuh langkah yang ada di versi sebelumnya sudah diselesaikan. Yang tersisa
hanya yang butuh keputusan pemilik repo atau perkakas yang belum dipasang.

1. **Putuskan dua URL ganda** di 3.8. Apakah `/laboratorium` dan `/radiologi`
   dihapus, atau slug `DIAGNOSTIC_SERVICES` diubah supaya hanya menyisakan
   `/pelayanan/diagnostik/*`. Menghapus rute tidak dilakukan tanpa persetujuan.
2. **Render semua panel brosur di server.** Murah, memperbaiki 3.8 sekaligus
   membuat pola `tabpanel` benar untuk pembaca layar.
3. **Buat `sitemap.xml` dan `robots.txt`.** Keduanya belum ada, lihat 3.9.
   Sebaiknya sekalian diuji di alur CI.
4. **Buat tombol kembali ke atas.** Lihat 3.10. Perlu komponen kecil dan tidak
   ada rujukan visual di situs acuan, jadi bentuknya harus diputuskan.
5. **Pasang Lighthouse** kalau angka SEO dan aksesibilitas ingin dibuktikan,
   bukan hanya diperkirakan. Memasangnya berarti menambah dependensi.
6. **Hubungkan formulir Pendaftaran Online ke `POST /api/v1/appointments`.**
   Endpoint-nya sudah lengkap, termasuk validasi sisi server, honeypot, rate
   limit, dan nomor tiket. Yang belum ada adalah formulir yang memanggilnya.
   Ini selisih yang paling besar antara PRD dan implementasi, dan
   rinciannya di bagian 6.
7. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

Butir 6 bukan pekerjaan kecil. Endpoint-nya menuntut `schedule_id`, yaitu UUID
jadwal dokter, sedangkan formulir sekarang hanya menanyakan tanggal.
Menyambungkannya berarti menambah langkah pilih dokter lalu pilih jam, dan itu
perubahan alur halaman, bukan sekadar mengganti satu pemanggilan.

---

## 5. Yang perlu diketahui sebelum lanjut

- **Navbar dibekukan.** Jangan diubah tanpa diminta pemilik repo.
  `tests/navbar-beku.test.ts` mengunci keadaan itu, dan sengaja gagal kalau
  navbar disentuh.
- **.navbar belum pakai `aria-hidden` maupun `inert`.** Panel navigasi mobile
  tetap bisa dicapai Tab meski panelnya di luar layar. Ini satu-satunya temuan
  aksesibilitas yang belum diperbaiki, dan tidak bisa disentuh tanpa izin
  pemilik repo karena perbaikannya ada di navbar. Ini terpisah dari verdict
  Acceptance Criteria di bagian 6, dan tidak ikut dihitung di sana.
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

---

## 6. Verdict Acceptance Criteria PRD bagian 12

Pemilik repo memilih verdict ini ditulis di dokumen ini, bukan di PRD. PRD
bagian 12 dibiarkan apa adanya, kotak-kotaknya masih kosong. Kalau pemilik
ingin PRD ikut diperbarui, itu perubahan terpisah.

Enam belas butir dinilai satu per satu. Yang lulus ditulis "Lulus" beserta
buktinya, yang tidak lulus ditulis apa yang menggagalkan. Dihitung dari kotak
penanda di PRD bagian 12: empat di Fidelity UI/UX, enam di Fungsional, lima di
Non-fungsional, dan satu di Data dan etika. Tidak ada butir yang
dinilai lulus karena "sepertinya sudah ada".

### Fidelity UI/UX

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 1 | Urutan section Home sama dengan tabel 8.3 | Lulus | `src/app/page.tsx` merender 13 section. Urutannya dibandingkan satu per satu dengan tabel PRD 8.3: hero, cari jadwal, layanan prioritas, fasilitas, paket MCU, berita, penghargaan, galeri, pendaftaran, sosial media, testimoni, asuransi, FAQ. Cocok semua. |
| 2 | Navbar punya 3 tingkat dropdown dan berfungsi di desktop serta mobile | Lulus | `nav-path.ts` menelusuri tiga tingkat `children`. Dropdown diukur di peramban pada 1200, 1440, dan 1920px tanpa overflow. Panel off-canvas di mobile memakai batas 1200px yang sama. |
| 3 | Warna utama, font, ukuran, dan jarak dicocokkan dari pengukuran DevTools | Sebagian | Font, ukuran, dan jarak memang hasil pengukuran, tercatat di `docs/design-tokens-terverifikasi.md`. Tapi warna yang tertulis di butir ini `#1A77CC` berbeda dari warna yang dipakai kode `#1977cc`. Yang dipakai kode adalah hasil pengukuran; angka di butir ini keliru. Butirnya tidak ditulis lulus karena bunyinya tidak cocok dengan implementasi. |
| 4 | Topbar kontak, dua tombol CTA header, dan bilah aksi cepat ada | Sebagian | Topbar kontak ada. Dua tombol CTA header ada, `HEADER_CTAS` berisi "Daftar Online" dan "Administrasi Pasien". Bilah aksi cepat tidak ada; `QuickActionBar` di PRD 8.4 tidak pernah dibuat. Lihat 3.11. |

### Fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 5 | Memilih spesialis memfilter dropdown dokter; hasil jadwal tampil dengan status memuat | Lulus | `DoctorSearchCard` punya tiga state: spesialis, dokter, hari. Memilih spesialis mengisi daftar dokter. Dipakai `<select>` bawaan, bukan `react-select` seperti PRD 8.3 menulis, karena `react-select` memang terpasang tetapi belum dipakai. Perbedaan komponen, bukan perbedaan fungsi. |
| 6 | Semua halaman bisa dijangkau lewat link; tidak ada halaman yatim dan tidak ada link mati | Sebagian | Link mati nol dari 134 halaman yang dikropl. Link masuk juga ada untuk semua yang ditemukan. Tapi 18 halaman brosur dan 2 URL ganda tidak punya tautan masuk. Lihat 3.8. Tautan mati yang pernah ada sudah diperbaiki dan sekarang dijaga `tests/tautan-internal.test.ts`, lihat 3.12. |
| 7 | Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB | Gagal | Endpoint-nya benar-benar ada dan benar-benar menyimpan: `POST /api/v1/appointments` memvalidasi tujuh field, menghasilkan `ticket_code`, dan menulis ke database. Tapi formulir di `/daftar-online` tidak pernah memanggilnya. `handleSubmit` berhenti di pemberitahuan, dan berkasnya sendiri menjelaskan alasannya. Dari sisi pengunjung tidak ada yang tersimpan. |
| 8 | Form menolak input tidak valid di sisi server dan tahan terhadap spam sederhana | Sebagian | Sisi server sudah lengkap: `src/server/validation.ts` dipakai route appointments, honeypot dan rate limit dijalankan `src/server/api/form.ts` sebelum validasi. Yang belum ada adalah formulir yang mengirim datanya, jadi dua aturan itu belum pernah teruji dari jalur yang dipakai pengunjung. Butir 7 menjelaskan kenapa. |
| 9 | Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya tampil di situs publik | Gagal | Tujuh belas tabel punya CRUD di panel admin, termasuk berita. Tapi tidak satu pun halaman publik membaca dari API atau database; semuanya membaca modul di `src/data/`. Admin bisa mengubah baris di database dan halaman publik tetap menampilkan isi modul. Perubahan yang dilakukan admin tidak pernah terlihat pengunjung. |
| 10 | Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user | Lulus | `src/server/admin/registry.ts` memetakan aksi ke peran. Diverifikasi oleh tes di `tests/registry.test.ts`. |

### Non-fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 11 | Build produksi sukses tanpa error TypeScript atau lint | Lulus | Typecheck bersih, `bun run lint` bersih, `bun run build` 0 galat dan 0 peringatan. Sekarang juga dijalankan otomatis di `.github/workflows/gerbang.yml`. |
| 12 | Situs berjalan identik di Vercel dan VPS dengan hanya perbedaan environment variable | Tidak bisa dibuktikan | Hanya satu lingkungan yang pernah diuji, yaitu lokal. Kedua target memakai adapter snapshot dan adapter live, jadi perbedaan perilakunya disengaja dan belum pernah dibandingkan. Membuktikannya butuh dua lingkungan nyata. |
| 13 | Unggah gambar admin berfungsi di kedua lingkungan lewat storage adapter | Tidak diterapkan | Tidak ada fitur unggah gambar sama sekali. Admin memasukkan URL, dan `registry.ts` hanya menerima `http` dan `https`. Pemilik repo sudah memutuskan untuk tidak mengerjakannya. Lihat 3.3. |
| 14 | Lighthouse mobile: aksesibilitas minimal 90, SEO minimal 90 | Belum diukur | Lighthouse belum pernah dijalankan, dan belum dipasang. Yang sudah diukur manual di peramban adalah kontras, `alt`, label form, urutan heading, dan navigasi keyboard, dan semuanya sudah bersih kecuali dua pola di hero sliding. Lihat 3.5. |
| 15 | Tidak ada script pihak ketiga yang aktif secara bawaan | Lulus | Pencarian `googletagmanager`, `google-analytics`, `gtag`, `sharethis`, `hotjar`, dan `clarity` di `src/` dan `next.config.ts` mengembalikan nol hasil. Embed Instagram juga tidak dipakai; seksi sosial media memakai kartu statis, sama seperti yang PRD 8.3 minta. |

### Data dan etika

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 16 | Tidak ada logo, foto, nama dokter, testimoni, atau kontak asli dari situs referensi | Lulus | Seluruh isi karangan sendiri. Foto berasal dari Unsplash dan picsum, dan keduanya terdaftar di `remotePatterns` pada `next.config.ts`. Nama dokter, testimoni, dan nomor kontak semuanya karangan; lihat `src/data/doctors.ts` dan `src/data/navigation.ts`. |

### Ringkasan

| Verdict | Jumlah | Nomor butir |
|---|---|---|
| Lulus | 7 | 1, 2, 5, 10, 11, 15, 16 |
| Sebagian | 4 | 3, 4, 6, 8 |
| Belum bisa dibuktikan | 1 | 12 |
| Belum diukur | 1 | 14 |
| Gagal | 2 | 7, 9 |
| Tidak diterapkan atas keputusan pemilik | 1 | 13 |

Jumlahnya enam belas, sama dengan jumlah kotak penanda di PRD bagian 12.

Dua yang gagal adalah butir 7 dan butir 9. Keduanya punya sebab yang sama:
backend-nya lengkap, tapi tidak ada jalur dari antarmuka yang memakainya.
Butir 13 dihitung terpisah karena tidak diterapkan atas keputusan pemilik,
bukan karena gagal.

Butir yang paling layak dikerjakan berikutnya adalah butir 7, karena endpoint-nya
sudah ada dan lengkap. Yang penghalangnya hanya bentuk formulir: endpoint
menuntut `schedule_id`, sedangkan formulir sekarang belum menanyakan dokter
maupun jam.
