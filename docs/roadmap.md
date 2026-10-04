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
| Halaman ter-prerender | 150 | berkas `.html` di `.next/server/app`, lewat `bun run cek:tautan` |
| Pola rute dinamis | 11 | `dynamicRoutes` di `.next/prerender-manifest.json` |
| Berkas tes | 35 | `bun run test` |
| Jumlah tes | 501 | `bun run test` |
| Rute internal unik | 63 | `collectNavPaths()` di `src/data/navigation.ts` |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 27 | `pgTable` di `src/server/db/schema.ts` |
| Route handler API | 42 | `src/app/api/v1/**/route.ts`, tidak termasuk catcher 404 |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |

Jumlah "halaman ter-prerender" pernah ditulis 160, lalu 154. Dua-duanya salah,
dan sekarang alasannya jelas.

160 adalah jumlah baris yang dicetak build, termasuk `/_global-error` dan
`/_not-found` yang bukan halaman untuk pengunjung. 154 adalah jumlah kunci
`routes` di `.next/prerender-manifest.json`, dan itu masih terlalu banyak karena
lima kuncinya bukan halaman: `/_global-error`, `/_not-found`, `/favicon.ico`,
`/robots.txt`, dan `/sitemap.xml`.

Angka yang benar adalah 150, yaitu berkas `.html` yang benar-benar ditulis di
`.next/server/app`. Lebih mudah diukur dan tidak perlu menebak apa yang
sepatnya dihitung. `bun run cek:tautan` menghitungnya langsung, jadi angka ini tidak
lagi perlu diperbarui tangan setiap kali ada rute baru.

Gerbang kualitas terakhir: typecheck bersih, `bun run lint` bersih,
`bun run test` 501 tes lulus, `bun run cek:konten` dan `bun run audit:teks`
lulus, `bun run build` sukses, dan `bun run cek:tautan` tidak menemukan tautan
mati, halaman tanpa tautan masuk, maupun halaman yang lupa masuk sitemap.

Alur CI sudah ada di `.github/workflows/gerbang.yml`. Ia menjalankan lint, tes,
`cek:konten`, `audit:teks`, build, lalu `cek:tautan` pada setiap push dan setiap
pull request, dengan `DATABASE_URL` dikosongkan agar semuanya berjalan pada mode
snapshot. `cek:tautan` sengaja diletakkan setelah build karena yang diperiksa
adalah HTML hasil prerender.

---

## 2. Kesesuaian dengan PRD

### P0 — Situs statis (fondasi)

| # | Butir PRD | Status | Bukti |
|---|---|---|---|
| 1 | Layout global: topbar, navbar, footer, back-to-top | selesai | keempatnya ada. Tombol kembali ke atas di `src/components/layout/BackToTop.tsx`, angka dan posisinya diukur dari situs acuan. Lihat 3.10 |
| 2 | Beranda dengan seluruh section | selesai | 13 section di `src/app/page.tsx`, urutannya sama dengan PRD 8.3 |
| 3 | Halaman konten dari tabel `pages` | selesai | 150 halaman hasil build |
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

**Sebagian, dan klaim sebelumnya di bagian ini terlalu cepat.** Tulisan
sebelumnya berbunyi "Butir 17 dan 18 selesai". Setengah dari itu benar.

Benar: sisi server sudah lengkap. Tujuh belas tabel punya CRUD lewat
`src/server/admin/`, inbox mencakup pendaftaran, registrasi MCU, kritik-saran,
WBS, serta respons survei, `POST /api/v1/auth/login` sudah ada, dan pemisahan
peran berlaku: `front_office` tidak bisa mengubah konten, `editor` tidak bisa
mengelola akun.

Salah: **tidak ada satu pun halaman panel admin.** Butir 17 PRD menyebut
"Login admin, manajemen: dokter, spesialis, jadwal, ..." dan itu permintaan
antarmuka, bukan permintaan API. Yang ada hanya route handler di
`src/app/api/v1/admin/*`. `find src/app -name page.tsx` yang menyentuh kata
`admin` mengembalikan nol hasil, dan tidak ada berkas `middleware.ts` maupun
`proxy.ts` yang melindungi halaman apa pun.

Artinya panel admin tidak bisa dipakai dari mana pun: tidak ada halaman login,
tidak ada dasbor, tidak ada layar manajemen. Sudah lewat produksi, dan masih
begitu. Lihat 3.12.

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

### 3.8 Halaman tanpa satu pun tautan masuk

**Sebagian selesai.** Delapan belas dari dua puluh sudah diperbaiki. Dua sisanya
masih terbuka dan butuh keputusan pemilik repo.

Kropl seluruh tautan internal dari `/` menemukan nol link mati dari 150 halaman.
Ketika hasilnya dibandingkan dengan halaman yang ter-prerender, ada dua puluh
yang tidak muncul sebagai tujuan tautan mana pun:

| Jumlah | Rute | Sebabnya | Status |
|---|---|---|---|
| 18 | `/informasi-publik/brosur/*` | `BrosurDirectory` hanya merender panel kategori yang sedang aktif, jadi HTML server hanya memuat tiga brosur dari kategori pertama. Delapan belas sisanya baru muncul setelah tab diklik, yaitu setelah JavaScript berjalan. | Selesai |
| 2 | `/laboratorium`, `/radiologi` | `DIAGNOSTIC_SERVICES` di `src/data/informasi.ts` memakai slug datar, sementara `NAV_ITEMS` menautkan ke `/pelayanan/diagnostik/laboratorium` dan `/pelayanan/diagnostik/radiologi`. Isi yang sama muncul di dua URL berbeda, dan yang datar tidak pernah ditautkan. | Menunggu keputusan |

Perbaikan delapan belas halaman brosur: semua panel sekarang dirender di server
dan yang tidak aktif diberi atribut `hidden`. HTML server memuat keempat panel
dan 21 tautan brosur, bukan satu panel dan tiga tautan.

`hidden` dipilih, bukan `display: none` di CSS, karena itu membuat atributnya ikut
terbaca teknologi bantu. `aria-controls` di keempat tab sekarang juga menunjuk
id yang benar-benar ada, yang sebelumnya harus dikosongkan di tab lain. Panel
tersembunyi sudah tidak bisa difokuskan, dibuktikan di peramban.

Dua URL ganda tidak bisa diselesaikan tanpa keputusan: menghapusnya berarti
menghapus rute, dan menggabungkan slug-nya berarti URL-nya tidak lagi cocok
dengan `DETAIL_CONTENT`. Selama belum diputuskan, keduanya sengaja
dikeluarkan dari sitemap supaya mesin pencari tidak diminta mengindeks isi yang
sama dua kali. Keduanya tetap menjawab 200 dan tetap diuji soal tautan mati.

### 3.9 Tidak ada sitemap.xml dan robots.txt

**Selesai.** Keduanya sebelumnya menjawab 404. Sekarang keduanya menjawab 200.

- `src/app/sitemap.ts` menghasilkan 148 entri. Daftar path-nya datang dari
  `collectSitemapPaths()` di `src/lib/sitemap.ts`, yang menggabungkan tiga
  sumber: pemindaian folder di `src/app` yang punya `page.tsx`, `collectNavPaths()`
  untuk catch-all `[...slug]`, dan modul data tiap route yang nilainya sama
  dengan `generateStaticParams`. Tidak ada satu pun path yang diketik manual,
  sesuai aturan yang sama seperti `NAV_ITEMS`.
- `src/app/robots.ts` menulis `Allow: /` dan `Disallow: /api/`, plus baris
  `Sitemap:` yang menunjuk ke `sitemap.xml`.
- `src/lib/site-url.ts` menyatukan pembacaan `NEXT_PUBLIC_SITE_URL` yang
  sebelumnya hanya ada di `layout.tsx`, jadi tiga berkas sekarang memakai satu
  sumber.

`metadataBase` tidak perlu keputusan baru: `layout.tsx` sudah menyetelnya dari
`NEXT_PUBLIC_SITE_URL`, dan nilainya diambil dari environment saat build. Di
localhost hasilnya `http://localhost:3000`, yang tidak merusak apa pun karena
kedua berkas hanya dibaca setelah situs benar-benar dipublikasikan.

`Disallow: /admin` sengaja TIDAK ditulis, padahal kelihatannya menggoda.
`/administrasi` adalah halaman publik yang sengaja ada di navbar, dan aturan
robots mencocokkan awalan, bukan segmen utuh, jadi `Disallow: /admin` ikut
memblokir `/administrasi`.

Hal ini tidak keluar dari daftar tautan karena ada penjaga: `scripts/cek-tautan.ts`
membandingkan hasil `collectSitemapPaths()` dengan berkas HTML yang benar-benar
ditulis build, dan kegagalannya menggagalkan CI. Sitemap yang tertinggal karena
rute dinamis baru jadi ketahuan saat itu juga.

Catatan versi: bagian ini sebelumnya menyebut `semuaRute()` di
`src/lib/semua-rute.ts` dan menyandarkan sitemap pada `HALAMAN_TETAP`, yaitu
daftar path yang diketik tangan. Pendekatan itu lebih rapuh: daftar manual bisa
basi tanpa ada yang memberi tahu, sedangkan pemindaian filesystem tidak bisa.
PR #37 upstream sudah menggantinya, jadi versi lama dihapus beserta
`tests/semua-rute.test.ts`-nya.

### 3.10 Tombol kembali ke atas tidak ada

**Selesai.** PRD bagian 8 butir 1 menyebut "layout global: topbar, navbar,
footer, back-to-top". Sekarang keempatnya ada.

Ternyata situs acuan punya tombol ini, jadi tidak perlu mengarang. Ukurannya
diambil dari CSS situs acuan `rsudpasarminggu.jakarta.go.id` pada 4 Oktober
2026, selector `.scroll-top` di `/v2/assets/css/main.css`, dan ambangnya dari
`main.js`:

| Yang diukur | Nilai |
|---|---|
| Ukuran | 40 x 40 px |
| Jarak dari tepi kanan dan bawah | 15 px dan 15 px |
| Radius | 4px |
| Warna | aksen `#1977cc`, sudah ada sebagai `--rs-accent` |
| Font ikon | 24 px |
| Transisi | 0.4s |
| Ambang muncul | `window.scrollY > 100` |
| Ikon | `bi bi-arrow-up-short` dari bootstrap-icons |

Semua angka itu dikunci oleh `tests/kembali-ke-atas.test.ts`, supaya tidak bisa
berubah diam-diam. Kalau memang perlu diubah, sumbernya harus diukur ulang lebih
dulu.

Tiga penyimpangan dari sumbernya, semuanya disengaja dan tercatat di kode:

1. **z-index 1199, bukan 99999.** Di repo ini ada dua lapisan penutup yang harus
   menang: panel navigasi off-canvas 1200 dan lightbox 10000. Dengan 99999 tombol
   tetap bisa diklik di atas keduanya, sehingga orang bisa menggulir halaman di
   belakang foto yang sedang dimuka, atau menekan tombol yang tidak melakukan
   apa yang diharapkan di ruang kosong panel navigasi.
2. **`href="#main-content"`, bukan `href="#"`.** Di situs acuan `href="#"` butuh
   `preventDefault()` di JavaScript, jadi tanpa JavaScript tombolnya hanya
   menambah tanda pagar di URL. Di sini targetnya benar-benar ada, dan tombol
   tetap berguna tanpa JavaScript. Tampilannya tidak berubah.
3. **Ada indikator fokus.** Tombol ini tautan, jadi harus bisa difokuskan
   keyboard, dan harus ada yang berubah saat itu terjadi. Situs acuan tidak
   memiliki apa pun untuk itu.

Catatan kecil: `.scroll-top` ada di `site.css`, bukan `home.css`, karena
komponennya dipasang di `layout.tsx` dan dipakai di seluruh halaman.

### 3.11 Panel navigasi mobile tidak bisa ditutup dengan mengetuk

**Belum diperbaiki. Navbar dibekukan pemilik repo.**

Ditemukan saat menguji tombol kembali ke atas di lebar 390px. Panel off-canvas
saat terbuka punya kotak 340px mulai dari x=50 sampai x=390, sedangkan tombol
hamburger ada di x=332 sampai x=378. Panelnya menutupi tombol sepenuhnya, jadi
mengetuk hamburger kedua kali tidak terjadi apa pun.

Diperiksa tiga jalan keluar lain, semuanya tidak ada:

| Jalan keluar | Hasil |
|---|---|
| Mengetuk di luar panel, misal x=25 | Tidak menutup. Tidak ada backdrop, dan ketukan jatuh ke isi halaman di belakang. |
| Menekan Escape | Tidak menutup. `Navbar.tsx` tidak punya penanganan `keydown`. |
| Tab ke tombol hamburger lalu Enter | Berhasil, karena `tabIndex` tombolnya 0 dan `onClick`-nya masih aktif. |

Jadi pengguna sentuh yang membuka menunya tidak bisa menutupnya lagi tanpa
memilih salah satu tautan di dalam. Pengguna keyboard tidak terpengaruh.

Ini bukan bug baru yang saya sebabkan, dan bukan racun dari tombol kembali ke
atas. Elemen yang menutupi ketukan adalah `<a>` di dalam `.navmenu`, yaitu
navbar itu sendiri, yang tidak disentuh dalam perubahan mana pun di sesi ini.
Tombol kembali ke atas justru dirancang supaya tidak menambah masalah: ia memakai
`z-index: 1199`, tepat di bawah panel 1200, sehingga tidak pernah melayang di
atas panel.

Perbaikannya ada di navbar, jadi tidak dikerjakan tanpa persetujuan pemilik repo.

### 3.12 Tidak ada halaman panel admin sama sekali

**Belum dikerjakan. Butuh keputusan pemilik repo soal ruang lingkup.**

Ini ditemukan saat menulis `robots.ts`, karena `./admin` yang ada di `src/app`
ternyata hanya `src/app/api/v1/admin`, yaitu route handler, bukan halaman.

Yang benar-benar ada:

- `src/server/admin/records.ts` dan modul lain di sana, untuk tujuh belas tabel.
- `src/server/admin/accounts.ts` dengan `hashPassword` dan `verifyPassword`.
- `POST /api/v1/auth/login` di `src/app/api/v1/auth/login/route.ts`, beserta
  `src/server/auth/session.ts`.
- `src/app/api/v1/admin/*`, dua puluh route handler.

Yang tidak ada:

- Halaman login. Tidak ada `src/app/admin`, tidak ada `src/app/login`.
- Dasbor atau layar manajemen apa pun. `find src/app -name page.tsx` yang
  menyentuh kata `admin` mengembalikan nol hasil.
- `middleware.ts` atau `proxy.ts`. Tidak ada satu pun berkas itu di repo, jadi
  tidak ada lapisan yang menjaga halaman admin.

Butir 17 PRD meminta "Login admin, manajemen: dokter, spesialis, jadwal,
layanan/fasilitas, paket MCU, berita, penghargaan, galeri, hero slider,
testimoni, asuransi, FAQ, kapasitas bed, lowongan, dokumen, pengaturan situs".
Delapan belas dari sembilan belas butir itu adalah permintaan antarmuka.

Konsekuensinya sudah muncul di Acceptance Criteria: butir 9 gagal, dan butir 10
lulus tanpa pengujian dari sisi pengguna karena tidak ada layar yang bisa
memakai aturan peran itu. Penyebabnya sama dengan butir 7 dan butir 9: backend
lengkap, tidak ada jalur dari antarmuka yang memakainya.

Membuat panel admin adalah pekerjaan besar dan bukan pengikut butir 3.10, jadi
tidak dikerjakan di sesi ini. Perlu diperlakukan sebagai pekerjaan tersendiri,
dan hanya masuk akal kalau halaman publik mulai membaca dari database, karena
selain 3.12 itu masih ada butir 9 yang gagal atas sebab yang sama.

## 4. Langkah berikutnya

Tujuh langkah versi sebelumnya sudah diselesaikan; empat di antaranya selesai
pada sesi terakhir ini. Yang tersisa hanya yang butuh keputusan pemilik repo,
perkakas yang belum dipasang, atau pekerjaan yang memang besar.

1. **Hubungkan formulir Pendaftaran Online ke `POST /api/v1/appointments`.**
   Ini yang paling layak dan paling jelas. Endpoint-nya sudah lengkap,
   termasuk validasi sisi server, honeypot, rate limit, dan nomor tiket. Yang
   belum ada adalah formulir yang memanggilnya. Ini selisih terbesar antara PRD
   dan implementasi, dan rinciannya di bagian 6.
2. **Putuskan dua URL ganda** di 3.8. Apakah `/laboratorium` dan `/radiologi`
   dihapus, atau slug `DIAGNOSTIC_SERVICES` diubah supaya hanya menyisakan
   `/pelayanan/diagnostik/*`. Menghapus rute tidak dilakukan tanpa persetujuan.
3. **Putuskan ruang lingkup panel admin** di 3.12. Ada sisi server yang lengkap
   untuk tujuh belas tabel, tapi nol halaman. Perlu diputuskan apakah panelnya
   mau dibuat, dan kalau ya, seberapa luas.
4. **Perbaiki panel navigasi mobile** di 3.11, kalau pemilik repo mengizinkan
   menyentuh navbar. Perbaikannya kecil: satu backdrop, atau satu penanganan
   Escape, atau menggeser panel supaya tidak menutupi hamburger.
5. **Pasang Lighthouse** kalau angka SEO dan aksesibilitas ingin dibuktikan,
   bukan hanya diperkirakan. Memasangnya berarti menambah dependensi.
6. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

Butir 1 bukan pekerjaan kecil. Endpoint-nya menuntut `schedule_id`, yaitu UUID
jadwal dokter, sedangkan formulir sekarang hanya menanyakan tanggal.
Menyambungkannya berarti menambah langkah pilih dokter lalu pilih jam, dan itu
perubahan alur halaman, bukan sekadar mengganti satu pemanggilan.

---

## 5. Yang perlu diketahui sebelum lanjut

- **Navbar dibekukan.** Jangan diubah tanpa diminta pemilik repo.
  `tests/navbar-beku.test.ts` mengunci keadaan itu, dan sengaja gagal kalau
  navbar disentuh. Sekarang navbar juga punya cacat yang diketahui: panelnya
  tidak bisa ditutup dengan mengetuk, lihat 3.11. Cacat itu sengaja tidak
  disentuh, bukan terlewat.
- **`collectSitemapPaths()` di `src/lib/sitemap.ts` adalah sumber sitemap.**
  Ia memindai folder `src/app` dari filesystem, jadi route baru ikut masuk
  begitu foldernya dibuat dan tidak bisa basi seperti daftar manual. Modul ini
  berasal dari PR #37 upstream, bukan dari versi `semuaRute()` yang sebelumnya
  dipakai repo ini. `bun run cek:tautan` tetap menjadi penjaganya di CI,
  dengan membandingkan hasilnya dengan berkas HTML hasil build.
- **Angka terukur dikunci oleh tes, bukan oleh komentar.** `tests/kembali-ke-atas.test.ts`
  mengunci ukuran, posisi, warna, dan ambang tombol kembali ke atas. Kalau
  angkanya memang harus berubah, ukur ulang di situs acuan lebih dulu, catat
  tanggalnya di komentar CSS, lalu perbarui tesnya. Mengubah angka supaya cocok
  dengan mata saja membuat tes itu berbohong.
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
| 4 | Topbar kontak, dua tombol CTA header, dan bilah aksi cepat ada | Sebagian | Topbar kontak ada. Dua tombol CTA header ada, `HEADER_CTAS` berisi "Daftar Online" dan "Administrasi Pasien". Bilah aksi cepat tidak ada; `QuickActionBar` di PRD 8.4 tidak pernah dibuat. |

### Fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 5 | Memilih spesialis memfilter dropdown dokter; hasil jadwal tampil dengan status memuat | Lulus | `DoctorSearchCard` punya tiga state: spesialis, dokter, hari. Memilih spesialis mengisi daftar dokter. Dipakai `<select>` bawaan, bukan `react-select` seperti PRD 8.3 menulis, karena `react-select` memang terpasang tetapi belum dipakai. Perbedaan komponen, bukan perbedaan fungsi. |
| 6 | Semua halaman bisa dijangkau lewat link; tidak ada halaman yatim dan tidak ada link mati | Sebagian | Link mati nol dari 150 halaman. Link masuk juga ada untuk 148 halaman. Sisanya dua URL ganda, `/laboratorium` dan `/radiologi`, yang isinya sama persis dengan `/pelayanan/diagnostik/*` dan tidak pernah ditautkan. Delapan belas halaman brosur yang dulu yatim sudah diperbaiki dengan merender semua panel di server. `bun run cek:tautan` sekarang menjaga jenis kesalahan ini di CI. Lihat 3.8. |
| 7 | Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB | Gagal | Endpoint-nya benar-benar ada dan benar-benar menyimpan: `POST /api/v1/appointments` memvalidasi tujuh field, menghasilkan `ticket_code`, dan menulis ke database. Tapi formulir di `/daftar-online` tidak pernah memanggilnya. `handleSubmit` berhenti di pemberitahuan, dan berkasnya sendiri menjelaskan alasannya. Dari sisi pengunjung tidak ada yang tersimpan. |
| 8 | Form menolak input tidak valid di sisi server dan tahan terhadap spam sederhana | Sebagian | Sisi server sudah lengkap: `src/server/validation.ts` dipakai route appointments, honeypot dan rate limit dijalankan `src/server/api/form.ts` sebelum validasi. Yang belum ada adalah formulir yang mengirim datanya, jadi dua aturan itu belum pernah teruji dari jalur yang dipakai pengunjung. Butir 7 menjelaskan kenapa. |
| 9 | Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya tampil di situs publik | Gagal | Ada dua sebab yang menumpuk, dan keduanya independen. Pertama, tidak satu pun halaman publik membaca dari API atau database; semuanya membaca modul di `src/data/`. Kedua, tidak ada halaman panel admin sama sekali, jadi tidak ada tempat untuk melakukan perubahan itu dari antarmuka. Admin bisa mengubah baris di database lewat API, dan halaman publik tetap menampilkan isi modul. Perubahan itu tidak pernah terlihat pengunjung. Lihat 3.12. |
| 10 | Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user | Lulus | `src/server/admin/registry.ts` memetakan aksi ke peran. Diverifikasi oleh tes di `tests/registry.test.ts`. Perlu dicatat bahwa aturan ini baru diuji di tingkat server: tidak ada layar yang bisa memakainya, karena panel admin tidak punya halaman sama sekali. Jadi yang lulus adalah aturan aksesnya, bukan pengalaman penggunanya. Lihat 3.12. |

### Non-fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 11 | Build produksi sukses tanpa error TypeScript atau lint | Lulus | Typecheck bersih, `bun run lint` bersih, `bun run build` 0 galat dan 0 peringatan. Sekarang juga dijalankan otomatis di `.github/workflows/gerbang.yml`. |
| 12 | Situs berjalan identik di Vercel dan VPS dengan hanya perbedaan environment variable | Tidak bisa dibuktikan | Hanya satu lingkungan yang pernah diuji, yaitu lokal. Kedua target memakai adapter snapshot dan adapter live, jadi perbedaan perilakunya disengaja dan belum pernah dibandingkan. Membuktikannya butuh dua lingkungan nyata. |
| 13 | Unggah gambar admin berfungsi di kedua lingkungan lewat storage adapter | Tidak diterapkan | Tidak ada fitur unggah gambar sama sekali. Admin memasukkan URL, dan `registry.ts` hanya menerima `http` dan `https`. Pemilik repo sudah memutuskan untuk tidak mengerjakannya. Lihat 3.3. |
| 14 | Lighthouse mobile: aksesibilitas minimal 90, SEO minimal 90 | Belum diukur | Lighthouse belum pernah dijalankan, dan belum dipasang. Yang sudah diukur manual di peramban adalah kontras, `alt`, label form, urutan heading, dan navigasi keyboard, dan semuanya sudah bersih kecuali dua pola di hero sliding. Sekarang `sitemap.xml` dan `robots.txt` sudah ada, jadi skor SEO punya dasar yang lebih baik, tapi angkanya tetap belum diukur. Lihat 3.5 dan 3.9. |
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

Butir 10 lulus, tapi perlu dibaca bersama 3.12: aturannya benar dan sudah
diuji di server, sedangkan tidak ada layar yang bisa memakainya. Jadi butir itu
lulus secara harfiah dan belum lulus secara praktis.

Butir yang paling layak dikerjakan berikutnya adalah butir 7, karena endpoint-nya
sudah ada dan lengkap. Yang penghalangnya hanya bentuk formulir: endpoint
menuntut `schedule_id`, sedangkan formulir sekarang belum menanyakan dokter
maupun jam.
