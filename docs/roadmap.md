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
| Berkas tes | 41 | `bun run test` |
| Jumlah tes | 564 | `bun run test` |
| Rute internal unik | 63 | `collectNavPaths()` di `src/data/navigation.ts` |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 27 | `pgTable` di `src/server/db/schema.ts` |
| Route handler API | 43 | `src/app/api/v1/**/route.ts`, termasuk catcher 404 |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |
| Halaman panel admin | 4 | `src/app/admin/**/page.tsx`, semuanya dinamis karena butuh sesi |

Jumlah "halaman ter-prerender" pernah ditulis 160, lalu 154. Dua-duanya salah,
dan sekarang alasannya jelas.

160 adalah jumlah baris yang dicetak build, termasuk `/_global-error` dan
`/_not-found` yang bukan halaman untuk pengunjung. 154 adalah jumlah kunci
`routes` di `.next/prerender-manifest.json`, dan itu masih terlalu banyak karena
lima kuncinya bukan halaman: `/_global-error`, `/_not-found`, `/favicon.ico`,
`/robots.txt`, dan `/sitemap.xml`.

Angka yang benar adalah 150, yaitu berkas `.html` yang benar-benar ditulis di
`.next/server/app`. Lebih mudah diukur dan tidak perlu menebak apa yang
sepatnya dihitung. `bun run cek:tautan` menghitungnya langsung, jadi angka ini
tidak lagi perlu diperbarui tangan setiap kali ada rute baru.

Empat halaman panel admin tidak termasuk 150, dan itu memang benar. Semuanya
diserver saat diminta, bukan ditulis ke berkas HTML, karena isinya berbeda
setiap pengunjung. `bun run cek:tautan` tidak pernah melihatnya, dan tidak
perlu: `/admin` tidak boleh ada di sitemap maupun punya tautan masuk.

Gerbang kualitas terakhir: typecheck bersih, `bun run lint` bersih,
`bun run test` 554 tes lulus dari 40 berkas, `bun run cek:konten` dan
`bun run audit:teks` lulus, `bun run build` sukses, dan `bun run cek:tautan`
tidak menemukan tautan mati, halaman tanpa tautan masuk, maupun halaman yang
lupa masuk sitemap.

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
| 11 | Daftar online (E-Pasien) | selesai. Alurnya persis seperti PRD butir 11: pilih dokter, pilih tanggal, pilih pembayaran, dapat nomor antrean, lalu modal konfirmasi. |
| 12 | Registrasi MCU | selesai |
| 13 | Kritik dan saran | selesai |
| 14 | WBS | selesai |
| 15 | Survei kepuasan | selesai |
| 16 | Karir | selesai |

### P3 — Panel admin

**Selesai.** PR #34 upstream menutup kedua sisinya, server dan antarmuka.

Butir 17 PRD meminta "Login admin, manajemen: dokter, spesialis, jadwal,
layanan/fasilitas, paket MCU, berita, penghargaan, galeri, hero slider,
testimoni, asuransi, FAQ, kapasitas bed, lowongan, dokumen, pengaturan situs".
Semuanya ada:

| Lapisan | Isi |
|---|---|
| Halaman | `/admin/login`, `/admin` (dasbor), `/admin/inbox/[kind]`, `/admin/records/[table]` |
| Komponen | `LoginForm`, `AdminShell`, `AdminNav`, `RecordManager`, `InboxManager`, `FormBaris`, `LogoutButton`, `nilai-form` |
| Gaya | `src/styles/admin.css` |

Gerbang sesi ada di dua tempat dan keduanya diperiksa:

- Halaman: `(panel)/layout.tsx` memanggil `readSession()` lalu
  `redirect("/admin/login")`. Diverifikasi di server produksi: `/admin`
  membalas 307 ke `/admin/login` tanpa sesi, dan `/admin/login` membalas 200.
- Route handler: keempat belas berkas di `src/app/api/v1/admin/**/route.ts`
  semuanya memanggil `requireSession()`. Dicek satu per satu, tidak ada yang
  lupa. Enam di antaranya juga memanggil `canEditContent`, jadi aturan peran di
  Acceptance Criteria butir 10 ditegakkan di jalur HTTP, bukan hanya di
  backside.

Tujuh belas tabel punya CRUD generik, bukan tujuh belas halaman. `registry.ts`
mendeskripsikan tiap tabel dan `RecordManager` merakit layar dari deskripsi itu.
Inbox mencakup lima pengajuan: pendaftaran, registrasi MCU, kritik-saran, WBS,
dan respons survei.

Satu tambahan dari sesi ini: `noindex` untuk halaman admin. Sebelumnya tidak
ada satu pun `robots: { index: false }` di repo, sehingga `/admin/login` boleh
terindeks. Sekarang ada di `src/app/admin/layout.tsx`, di layout terluar supaya
berlaku juga untuk halaman login. Diverifikasi di HTML yang tersaji:
`<meta name="robots" content="noindex, nofollow"/>`.

Tiga tes di `tests/admin-panel.test.ts` menjaganya: bahwa tandanya ada, bahwa
tandanya ada di layout terluar dan bukan di `(panel)` yang tidak melingkupi
halaman login, dan bahwa `robots.txt` tidak pernah memuat larangan yang menjadi
awalan dari `/administrasi`. Tes ketiga menguji hasil `robots()`, bukan teks
sumbernya, karena bentuk `disallow: ["/api/", "/admin"]` lolos dari pencarian
teks biasa.

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
dikeluarkan dari sitemap supaya mesin pencari tidak diminta mengindeks isi
yang sama dua kali. Keduanya tetap menjawab 200 dan tetap diuji soal tautan mati.

Catatan versi: saat versi ini ditulis, pemindai sitemap milik upstream sudah
mengambil setiap folder yang punya `page.tsx`, jadi tanpa daftar eksplisit kedua
URL ini otomatis ikut masuk dan keputusan "hanya yang kanonik" ikut hilang.
Daftarnya dikembalikan di `DIKECUALIKAN` pada `src/lib/sitemap.ts`, dan
`tests/sitemap.test.ts` menjaga kedua entri itu agar tidak hilang lagi.

### 3.9 Tidak ada sitemap.xml dan robots.txt

**Selesai, dan cara penyelesaiannya berubah setelah rebase.** PR #33 upstream
sudah membuat keduanya, jadi tidak lagi dikerjakan dari nol. Yang tersisa adalah
memperbaiki apa yang belum terpakai di sana.

- `src/app/sitemap.ts` menghasilkan 148 entri. Daftar path-nya datang dari
  `collectSitemapPaths()` di `src/lib/sitemap.ts`, yang menggabungkan tiga
  sumber: pemindaian folder di `src/app` yang punya `page.tsx`, `collectNavPaths()`
  untuk catch-all `[...slug]`, dan modul data tiap route yang nilainya sama
  dengan `generateStaticParams`. Tidak ada satu pun path yang diketik manual,
  sesuai aturan yang sama seperti `NAV_ITEMS`.

Catatan versi. Versi sebelumnya bagian ini memakai `semuaRute()` di
`src/lib/semua-rute.ts` dengan daftar `HALAMAN_TETAP` yang diketik tangan,
karena `collectNavPaths()` melewati path yang punya folder sendiri dan delapan
halaman ikut hilang dari peta situs. PR #37 upstream menutup celah itu dengan
memindai filesystem, dan pemindaian itu lebih baik daripada daftar manual:
route baru ikut masuk begitu foldernya dibuat, sedangkan daftar manual justru
bisa basi tanpa ada yang memberi tahu. Jadi `src/lib/semua-rute.ts` dan
`tests/semua-rute.test.ts`-nya dihapus. `bun run cek:tautan` tetap menangkap
hasilnya, hanya sekarang ia membandingkan `collectSitemapPaths()`.

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
memblokir `/administrasi`. Halaman admin sendiri ditandai `noindex` lewat
`metadata`, bukan lewat robots, dan alasannya ada di bagian P3: aturan robots
mencegah perayap membaca, tetapi URL-nya masih bisa muncul di hasil pencarian
sebagai judul tanpa isi.

Hal ini tidak keluar dari daftar tautan karena ada penjaga: `scripts/cek-tautan.ts`
membandingkan hasil `collectSitemapPaths()` dengan berkas HTML yang benar-benar
ditulis build, dan kegagalannya menggagalkan CI. Sitemap yang tertinggal karena
rute dinamis baru jadi ketahuan saat itu juga.


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

### 3.12 Panel admin dan formulir e-pasien: koreksi atas dua klaim yang salah

**Selesai. Dua-duanya hasil rebase ke upstream, bukan hasil kerjaan sesi ini.**

Bagian ini sebelumnya menuduh panel admin tidak ada sama sekali. Itu salah, dan
salah karena cara mengukurnya, bukan karena subjeknya.

Yang benar sekarang: panel admin lengkap, dengan halaman login, dasbor, lima
layar inbox, dan layar manajemen untuk tujuh belas tabel. Gerbang sesinya juga
nyata: `/admin` membalas 307 ke `/admin/login` tanpa sesi, dan keempat belas
route handler admin semuanya memanggil `requireSession()`.

Kesalahannya punya satu sebab yang sama, dan bentuknya mudah terulang:

1. **Tree yang diukur basi.** Pemeriksaan dilakukan di tree sebelum PR #34
   upstream masuk, ketika `src/app/admin` memang belum ada. Setelah rebase
   berkasnya ada dan ter-track di git, dan `next dev` menyajikan `/admin/login`
   dengan 200. Hanya pemeriksaan di build lama yang menyimpulkan tidak ada.
2. **Build yang diukur basi.** `next build` yang seharusnya mendahului tidak
   pernah jalan. Penyebabnya `pkill -f next-server` memakai pola yang juga ada
   di baris perintah shell itu sendiri, jadi shell membunuh dirinya sendiri
   sebelum sampai ke `bun run build`. `rm -rf .next` tidak sempat dijalankan dan
   build lama tetap tersaji.
3. **Log build yang dibaca juga basi**, dan `tail -40` pada pohon rute memotong
   bagian atasnya, jadi `/admin` yang ada di urutan awal tidak terlihat sama
   sekali.

Ketiganya satu arah: semua pengukuran dijalankan terhadap keadaan yang tidak
lagi berlaku. Semuanya bisa ditutup dengan satu pertanyaan yang tidak sempat
ditanyakan, yaitu apakah build ini dibangun dari tree sekarang.

Konsekuensinya nyata. `/admin/login` sempat hampir ditulis ulang sebagai
temuan "`/admin` tidak ada di build", karena membalas 404 dari build basi.
Temuan itu kelihatan sangat meyakinkan karena 404 memang jawaban yang benar
untuk build yang memang tidak punya rute tersebut.

### 3.13 Pendaftaran E-Pasien tidak menolak pendaftaran ganda

**Di luar Acceptance Criteria. Dicatat karena bisa jadi bocor, bukan karena
PRD memintanya.**

Koreksi lebih dulu, karena versi sebelumnya bagian ini menulis "Acceptance
Criteria butir 7 menyebut tidak bisa daftar ganda". Itu salah. Butir 7 di PRD
bagian 12 berbunyi "Pendaftaran E-Pasien menghasilkan nomor antrean dan
tersimpan di DB", dan kata "ganda" tidak muncul di seluruh PRD kecuali di
"deploy ganda Vercel + VPS" yang tidak ada hubungannya. Jadi butir 7 lulus,
dan yang tertulis di sini bukan kekurangan terhadap PRD.

Yang tetap benar adalah pengamatannya: endpoint-nya tidak menolak pendaftaran
yang sama dua kali.

Ditemukan saat menulis ulang bagian P2, setelah formulir terhubung ke API di
PR #34 upstream.

Yang sudah benar dan terverifikasi:

- Formulir mengambil dokter dari `GET /api/v1/doctors`.
- Formulir mengambil slot jam dari `GET /api/v1/schedules`.
- Formulir mengirim `POST /api/v1/appointments` dengan `schedule_id`, persis
  seperti yang dituntut endpoint.
- Nomor antrean kembali ke pengguna setelah berhasil.
- Kuota dicek dengan benar. `createAppointment` memakai penghitung atomik
  `INSERT ... ON CONFLICT DO UPDATE ... RETURNING taken` di dalam transaksi,
  jadi dua permintaan bersamaan tidak mendapat nomor antrean yang sama. Unique
  index `(doctor_id, visit_date, queue_number)` jadi pengaman kedua.

Yang tidak ada: apa pun yang menolak pasien yang sama mendaftar dua kali.

Di `src/app/api/v1/appointments/route.ts` tidak ada satu pun pengecekan
duplikat. `createAppointment` di `src/server/db/repo/appointments.ts` hanya
memeriksa jadwal ada, dokter cocok, jadwal aktif, hari praktik cocok, dan kuota
masih sisa. Tabel `appointments` punya unique index pada `ticket_code` dan pada
`(doctor_id, visit_date, queue_number)`, tapi tidak pada `phone`, tidak pada
`schedule_id`, dan tidak pada kombinasi apa pun yang melibatkan pasien.

Konsekuensinya bisa dilakukan orang: satu orang menekan kirim dua kali, atau
menyimpan halaman lalu mengirim ulang, dan mendapat dua nomor antrean untuk slot
yang sama. Untuk rumah sakit fiktif ini tidak berbahaya. Untuk situs yang
benar-benar dipakai, satu nomor telepon bisa mengisi seluruh kuota satu dokter.

Kenapa tidak langsung dikerjakan: "ganda" itu definisi bisnis, bukan teknis,
dan PRD tidak menyinggunginya sama sekali. Menambahkan constraint tanpa
keputusan pemilik repo berarti mengarang aturan yang tidak diminta.
Setidaknya tiga bentuk yang berbeda masuk akal, dan masing-masing menuntut
constraint yang berbeda.

| Bentuk "ganda" | Constraint yang dibutuhkan | Konsekuensi |
|---|---|---|
| Telepon sama, jadwal sama | Unik pada `(phone, schedule_id)` | Paling sempit. Satu orang tetap boleh mendaftar di dua slot berbeda. |
| Telepon sama, dokter sama, tanggal sama | Unik pada `(phone, doctor_id, visit_date)` | Satu orang tidak bisa mengambil dua antrean ke dokter yang sama di hari yang sama. |
| Telepon sama, tanggal sama | Unik pada `(phone, visit_date)` | Paling luas. Satu orang hanya boleh satu pendaftaran sehari. |

Semuanya juga butuh keputusan kedua: apa yang terjadi kalau pendaftaran kedua
ditolak. Menampilkan pesan "sudah terdaftar" sudah jelas. Yang belum jelas
adalah apakah pendaftaran kedua harus **ditolak** atau **diterima lalu
ditandai**, karena yang kedua memerlukan kolom status tambahan dan tidak bisa
dijamin constraint database selama statusnya bisa berubah.

---

## 4. Langkah berikutnya

Sembilan langkah versi sebelumnya sudah diselesaikan. Empat di antaranya selesai
pada sesi terakhir ini, dan dua di antaranya selesai oleh upstream tanpa ikut
saya: peta situs di PR #33, panel admin dan formulir e-pasien di PR #34.

Yang tersisa hanya yang butuh keputusan pemilik repo atau perkakas yang belum
dipasang. Urutannya dari yang paling jelas.

1. **Putuskan apa yang menghitung sebagai pendaftaran ganda** di 3.13, lalu
   tambahkan constraint-nya. PRD tidak menyebut aturan ini, jadi tidak mendesak.
   Setelah keputusannya pekerjaannya kecil: satu unique index, satu migration,
   satu pesan galat.
2. **Putuskan dua URL ganda** di 3.8. Apakah `/laboratorium` dan `/radiologi`
   dihapus, atau slug `DIAGNOSTIC_SERVICES` diubah supaya hanya menyisakan
   `/pelayanan/diagnostik/*`. Menghapus rute tidak dilakukan tanpa persetujuan.
3. **Perbaiki panel navigasi mobile** di 3.11, kalau pemilik repo mengizinkan
   menyentuh navbar. Perbaikannya kecil: satu backdrop, atau satu penanganan
   Escape, atau menggeser panel supaya tidak menutupi hamburger. Yang sekarang
   terjadi adalah pengguna sentuh yang membuka menu tidak bisa menutupnya lagi
   tanpa memilih salah satu tautan di dalamnya.
4. **Pasang Lighthouse** kalau angka SEO dan aksesibilitas ingin dibuktikan,
   bukan hanya diperkirakan. Memasangnya berarti menambah dependensi. Ini
   satu-satunya butir di bagian 6 yang statusnya "belum diukur", jadi setiap
   klaim tentang aksesibilitas di dokumen ini masih perkiraan.
5. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

Butir 1 optional. Kalau pemilik repo menganggap tidak perlu, tidak ada yang rusak:
butir 7 tetap lulus dan tidak ada Acceptance Criteria yang gagal karena ini.
Kalau mau dikerjakan, tiga bentuk "ganda" yang berbeda sudah dipetakan di 3.13,
jadi yang dibutuhkan hanya memilih satu baris.

Yang **tidak** ada di daftar ini, karena sudah selesai atau sudah gugur:

- **Hubungkan formulir ke `POST /api/v1/appointments`**. Sudah di PR #34. Tinggal
  butir 1 di atas.
- **Buat `sitemap.xml` dan `robots.txt`**. Sudah di PR #33, lalu diperluas di
  sesi ini karena versinya kehilangan delapan halaman.
- **Buat tombol kembali ke atas**. Selesai di sesi ini, lihat 3.10.
- **Render semua panel brosur di server**. Selesai di sesi ini, lihat 3.8.
- **Putuskan ruang lingkup panel admin**. Tidak perlu diputuskan, panelnya
  sudah ada dan lengkap. Lihat koreksinya di 3.12.

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
| 7 | Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB | Lulus | PR #34 upstream menyambungkan formulir ke endpointnya. `registration-form.tsx` mengambil dokter dari `GET /api/v1/doctors`, mengambil slot jam dari `GET /api/v1/schedules`, lalu mengirim `POST /api/v1/appointments` dengan `schedule_id`. Nomor antrean dikembalikan dan ditampilkan ke pengguna. Penghitung kuota memakai `INSERT ... ON CONFLICT DO UPDATE ... RETURNING taken` di dalam transaksi, jadi dua permintaan bersamaan tidak mendapat nomor yang sama, dan unique index `(doctor_id, visit_date, queue_number)` jadi pengaman kedua. |
| 8 | Form menolak input tidak valid di sisi server dan tahan terhadap spam sederhana | Lulus | Sisi server lengkap: `src/server/validation.ts` dipakai route appointments, honeypot dan rate limit dijalankan `src/server/api/form.ts` sebelum validasi. Sekarang jalur itu benar-benar dipakai pengunjung, karena formulir sudah mengirim datanya (lihat butir 7). Penghitung rate limit dikosongkan setelah formulir tersimpan, dan ada tesnya: `tests/form-rate-limit.test.ts` serta `tests/registration-form.test.ts` mengunci aturan pemetaan field dan penerjemahannya. |
| 9 | Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya tampil di situs publik | Gagal | Satu sebabnya, dan sekarang tinggal satu. Panel admin-nya ada dan berfungsi, jadi separuh pertama butir ini sudah bisa dilakukan: admin bisa menambah, mengubah, dan menghapus berita lewat `/admin/records/[table]`. Tapi tidak satu pun halaman publik membaca dari database. Dari 18 halaman yang ada, 17 masih membaca modul di `src/data/`, dan satu-satunya yang membaca server adalah dasbor admin itu sendiri. Admin mengubah baris berita di database, lalu halaman `/berita` tetap menampilkan isi modul. Perubahan itu tidak pernah terlihat pengunjung. |
| 10 | Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user | Lulus | `src/server/admin/registry.ts` memetakan aksi ke peran, dan tes `tests/registry.test.ts` mengunci pemetaannya. Sekarang aturan itu juga ditegakkan di jalur HTTP, bukan hanya di backside: enam route handler admin memanggil `requireSession(canEditContent)`, jadi permintaan dari peran yang salah ditolak sebelum menyentuh database. Panel admin-nya juga sudah ada, jadi aturannya bisa dipakai dari antarmuka. |

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
| Lulus | 9 | 1, 2, 5, 7, 8, 10, 11, 15, 16 |
| Sebagian | 3 | 3, 4, 6 |
| Belum bisa dibuktikan | 1 | 12 |
| Belum diukur | 1 | 14 |
| Gagal | 1 | 9 |
| Tidak diterapkan atas keputusan pemilik | 1 | 13 |

Jumlahnya enam belas, sama dengan jumlah kotak penanda di PRD bagian 12.

Satu yang gagal adalah butir 9, dan sebabnya sekarang tunggal: tidak satu pun
halaman publik membaca dari database. Panel admin-nya sudah ada, jadi separuh
pertama butir itu bisa dilakukan. Yang tersisa adalah separuh kedua, yaitu
menampilkan hasil perubahan itu ke pengunjung, dan itu bukan pekerjaan panel
admin melainkan pekerjaan seluruh halaman publik sekaligus.

Butir 13 dihitung terpisah karena tidak diterapkan atas keputusan pemilik,
bukan karena gagal.

Perubahan terbesar sejak versi dokumen ini adalah butir 7 dan butir 8. Keduanya
pernah gagal dengan sebab yang sama persis: backend lengkap, tapi formulirnya
tidak pernah memanggilnya. Keduanya sudah lulus setelah PR #34 upstream. Butir 7
pernah ditulis gagal karena mengukur `handleSubmit` di tree yang sudah basi,
sama seperti panel admin di 3.12.
