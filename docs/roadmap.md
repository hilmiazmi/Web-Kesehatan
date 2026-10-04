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
| Halaman ter-prerender | 148 | `bun run cek:tautan`, berkas `.html` di `.next/server/app` tanpa dua halaman cadangan Next.js |
| Pola rute dinamis | 11 | `dynamicRoutes` di `.next/prerender-manifest.json` |
| Berkas tes | 42 | `bun run test` |
| Jumlah tes | 579 | `bun run test` |
| Rute internal dari catch-all | 30 | `collectNavPaths()` di `src/lib/nav-path.ts` |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 27 | `pgTable` di `src/server/db/schema.ts` |
| Route handler API | 44 | `src/app/api/v1/**/route.ts`, 43 endpoint dan catcher 404 |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |
| Halaman panel admin | 4 | `src/app/admin/**/page.tsx`, semuanya dinamis karena butuh sesi |

Jumlah "halaman ter-prerender" pernah ditulis 160, lalu 154, lalu 150. Dua-duanya
salah, dan sekarang alasannya jelas.

160 adalah jumlah baris yang dicetak build, termasuk `/_global-error` dan
`/_not-found` yang bukan halaman untuk pengunjung. 154 adalah jumlah kunci
`routes` di `.next/prerender-manifest.json`, dan itu masih terlalu banyak karena
lima kuncinya bukan halaman: `/_global-error`, `/_not-found`, `/favicon.ico`,
`/robots.txt`, dan `/sitemap.xml`.

150 adalah berkas `.html` yang benar-benar ditulis di `.next/server/app`. Dua
di antaranya tetap bukan halaman untuk pengunjung, yaitu `/_global-error` dan
`/_not-found`, jadi angka yang dipakai di mana-mana di dokumen ini adalah 148.
`bun run cek:tautan` menghitungnya langsung lewat daftar `BUKAN_HALAMAN`, jadi
angka ini tidak lagi perlu diperbarui tangan setiap kali ada rute baru.

Empat halaman panel admin tidak termasuk 148, dan itu memang benar. Semuanya
diserver saat diminta, bukan ditulis ke berkas HTML, karena isinya berbeda
setiap pengunjung. `bun run cek:tautan` tidak pernah melihatnya, dan tidak
perlu: `/admin` tidak boleh ada di sitemap maupun punya tautan masuk.


"Rute dari catch-all" 30, bukan 63 seperti tertulis sebelumnya di tabel ini.
Angka 30 diukur langsung dari `collectNavPaths()`, dan itulah yang dihitung: hanya
path yang dilayani `src/app/[...slug]/page.tsx`. Daun `/pelayanan/prioritas/*` dan
`/pelayanan/medis/*` sengaja tidak ikut karena sudah dilayani folder `[slug]`
masing-masing, dan sebelas pola dinamis dihitung terpisah di baris di atasnya.
Jadi 148 halaman tidak bisa dijumlahkan dari 30.

Gerbang kualitas terakhir: typecheck bersih, `bun run lint` bersih,
`bun run test` 579 tes lulus dari 42 berkas, `bun run cek:konten` dan
`bun run audit:teks` lulus, `bun run build` sukses, dan `bun run cek:tautan`
tidak menemukan tautan mati, halaman tanpa tautan masuk, maupun halaman yang
lupa masuk sitemap: 148 halaman, 148 tautan unik, 148 entri sitemap.

Alur CI berjalan dan sudah dipakai. `.github/workflows/gerbang.yml` menjalankan
lint, tes, `cek:konten`, `audit:teks`, build, lalu `cek:tautan` pada setiap push
dan setiap pull request, dengan `DATABASE_URL` dikosongkan agar semuanya berjalan
pada mode snapshot. `cek:tautan` sengaja diletakkan setelah build karena yang
diperiksa adalah HTML hasil prerender.

---

## 2. Kesesuaian dengan PRD

### P0 — Situs statis (fondasi)

| # | Butir PRD | Status | Bukti |
|---|---|---|---|
| 1 | Layout global: topbar, navbar, footer, back-to-top | selesai | keempatnya ada. Tombol kembali ke atas di `src/components/layout/BackToTop.tsx`, angka dan posisinya diukur dari situs acuan. Lihat 3.10 |
| 2 | Beranda dengan seluruh section | selesai | 13 section di `src/app/page.tsx`, urutannya sama dengan PRD 8.3 |
| 3 | Halaman konten dari tabel `pages` | selesai | ikut 148 halaman hasil build |
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

Satu temuan yang awalnya tidak diperbaiki dan sekarang sudah ditutup: panel
navigasi mobile tidak memakai `aria-hidden` maupun `inert` saat tertutup, jadi
tautan di dalamnya masih bisa dicapai Tab meskipun panelnya di luar layar.
Sekarang memakai `visibility: hidden`. Lihat 3.11.

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

**Selesai. Dua puluh dari dua puluh sudah diperbaiki.**

Kontrol seluruh tautan internal dari `/` menemukan nol link mati dari 148 halaman.
Ketika hasilnya dibandingkan dengan halaman yang ter-prerender, ada dua puluh
yang tidak muncul sebagai tujuan tautan mana pun, dan dua puluh itu sudah tidak
lagi ada:

| Jumlah | Rute | Sebabnya | Status |
|---|---|---|---|
| 18 | `/informasi-publik/brosur/*` | `BrosurDirectory` hanya merender panel kategori yang sedang aktif, jadi HTML server hanya memuat tiga brosur dari kategori pertama. Delapan belas sisanya baru muncul setelah tab diklik, yaitu setelah JavaScript berjalan. | Selesai |
| 2 | `/laboratorium`, `/radiologi` | `DIAGNOSTIC_SERVICES` di `src/data/informasi.ts` memakai slug datar, sementara `NAV_ITEMS` menautkan ke `/pelayanan/diagnostik/laboratorium` dan `/pelayanan/diagnostik/radiologi`. Isi yang sama muncul di dua URL berbeda, dan yang datar tidak pernah ditautkan. | Selesai |

Perbaikan delapan belas halaman brosur: semua panel sekarang dirender di server
dan yang tidak aktif diberi atribut `hidden`. HTML server memuat keempat panel
dan 21 tautan brosur, bukan satu panel dan tiga tautan.

`hidden` dipilih, bukan `display: none` di CSS, karena itu membuat atributnya ikut
terbaca teknologi bantu. `aria-controls` di keempat tab sekarang juga menunjuk
id yang benar-benar ada, yang sebelumnya harus dikosongkan di tab lain. Panel
tersembunyi sudah tidak bisa difokuskan, dibuktikan di peramban.

Dua URL ganda itu diselesaikan dengan menghapus URL datarnya, yaitu folder
`src/app/laboratorium/` dan `src/app/radiologi/` beserta modul data dan tesnya.
URL kanonik `/pelayanan/diagnostik/<slug>` tetap ada dan sekarang jadi satu-
satunya. Menghapus lebih jujur daripada membiarkan dua URL hidup dan berharap yang
datar tidak pernah diketik orang.

Akibat penghapusan itu ikut dibereskan. `DIKECUALIKAN` di
`src/lib/sitemap.ts` serta `TANPA_TAUTAN_MASUK` dan `TANPA_SITEMAP` di
`scripts/cek-tautan.ts` masih memuat kedua path itu, dengan komentar yang
menyatakan keduanya "tetap menjawab 200". Pernyataan itu sudah tidak benar
setelah foldernya dihapus, jadi entri dibuang bersama foldernya. Keduanya
tidak pernah membuat gerbang gagal, karena keduanya hanya keanggotaan di daftar
rute dan rute yang sudah dihapus tidak pernah muncul di daftar itu.

Yang menggantikannya adalah penjaga di `tests/tautan-internal.test.ts`: kedua
alias itu harus membalas 404. Kalau suatu saat muncul lagi lewat filter halaman
generik, tes itu yang menangkapnya.

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
| Jarak dari tepi bawah | 15 px |
| Radius | 4px |
| Warna | aksen `#1977cc`, sudah ada sebagai `--rs-accent` |
| Font ikon | 24 px |
| Transisi | 0.4s |
| Ambang muncul | `window.scrollY > 100` |
| Ikon | `bi bi-arrow-up-short` dari bootstrap-icons |

Semua angka itu dikunci oleh `tests/kembali-ke-atas.test.ts`, supaya tidak bisa
berubah diam-diam. Kalau memang perlu diubah, sumbernya harus diukur ulang lebih
dulu.

Empat penyimpangan dari sumbernya, semuanya disengaja dan tercatat di kode:

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
4. **Tepi kiri, bukan tepi kanan.** Situs acuan mengukur 15px dari tepi kanan
   bawah. Nilai itu tidak bisa dipakai mentah di sini: bilah aksi cepat di
   3.14 juga melayang di pojok kanan bawah, dengan `z-index: 1020` di bawah
   1199 tombol ini. Kalau tombol tetap di kanan, dia menutupi butir paling
   bawah bilah aksi cepat dan memblokir kliknya. Jarak 15px tetap sama, yang
   dipindah hanya sisinya.

Butir keempat yang paling mudah dibatalkan tanpa sadar. Tidak ada di situs
acuan, jadi tidak ada yang bisa mengukurnya di sana; yang mengukurnya hanya
tumpang tindih dengan `.quick-action` di repo ini.

Catatan kecil: `.scroll-top` ada di `site.css`, bukan `home.css`, karena
komponennya dipasang di `layout.tsx` dan dipakai di seluruh halaman.

### 3.11 Panel navigasi mobile tidak bisa ditutup dengan mengetuk

**Selesai, sudah masuk `main`.** Navbar dibekukan pemilik repo, jadi perbaikannya
dikerjakan hanya atas izin khusus, dan hanya cacat mobile ini yang disentuh.

Ditemukan saat menguji tombol kembali ke atas di lebar 390px. Panel off-canvas
saat terbuka punya kotak 340px mulai dari x=50 sampai x=390, sedangkan tombol
hamburger ada di x=332 sampai x=378. Panelnya menutupi tombol sepenuhnya, jadi
mengetuk hamburger kedua kali tidak terjadi apa pun.

Keadaan awal sudah diperiksa dulu. Tiga jalan keluar lain dicoba, dan
ketiganya tidak ada:

| Jalan keluar | Hasil |
|---|---|
| Mengetuk di luar panel, misal x=25 | Tidak menutup. Tidak ada backdrop, dan ketukan jatuh ke isi halaman di belakang. |
| Menekan Escape | Tidak menutup. `Navbar.tsx` tidak punya penanganan `keydown`. |
| Tab ke tombol hamburger lalu Enter | Berhasil, karena `tabIndex` tombolnya 0 dan `onClick`-nya masih aktif. |

Jadi pengguna sentuh yang membuka menunya tidak bisa menutupnya lagi tanpa
memilih salah satu tautan di dalam. Pengguna keyboard tidak terpengaruh. Ketiga
baris tabel itu berubah setelah perbaikan, yang dijelaskan setelah tabel.

Ini bukan bug baru yang saya sebabkan, dan bukan racun dari tombol kembali ke
atas. Elemen yang menutupi ketukan adalah `<a>` di dalam `.navmenu`, yaitu
navbar itu sendiri, bukan racun dari tombol kembali ke atas. Tombol itu justru
dirancang supaya tidak menambah masalah: ia memakai `z-index: 1199`, tepat di
bawah panel 1200, sehingga tidak pernah melayang di atas panel.

Ada dua cacat mobile, dan keduanya ditutup dalam satu pekerjaan. Pertama, panel
tertutup yang isinya masih bisa dicapai tombol Tab. Kedua, panel yang menutupi
tombol hamburger sehingga pengguna sentuh tidak bisa menutupnya lagi.

Perbaikannya ada di navbar, jadi dikerjakan hanya dengan persetujuan pemilik
repo. Batas 1200px, lebar navmenu 894px, font 15px, dan posisi tombol hamburger
tetap seperti commit `a9b5fd5`, dan semuanya dikunci `tests/navbar-beku.test.ts`.

Panel yang tertutup memakai `visibility: hidden`, bukan hanya
`translateX(100%)`. Menggeser bukan menyembunyikan: 74 tautan di dalam
panel tetap bisa difokuskan padahal tidak terlihat, jadi Tab masuk ke menu yang
tidak kelihatan. `visibility` menutupnya tanpa JavaScript, jadi benar sejak
render pertama. `visibility` juga ikut masuk `transition`, karena nilainya
dianimasikan sebagai langkah diskret dan panel tetap terlihat sepanjang durasi
geser keluar.

Tiga cara menutup, dan ketiganya dipakai karena tidak ada satu pun yang cukup
sendiri: `.navmenu-backdrop` dengan `z-index: 1190` di bawah panel 1200, tombol
`.navmenu-close` di dalam panel, dan tombol Escape. Sambil panel terbuka, `body`
dapat kelas `navmenu-terbuka` dan `overflow: hidden`, tanpa itu halaman di
belakang panel masih bisa bergulir dan membuat orang mengira panelnya yang
bergerak.

Fokus kembali ke hamburger hanya setelah panel ditutup, dijaga ref
`pernahTerbuka`. Tanpa penjaga itu, `useEffect` berjalan sekali saat render
pertama dengan panel masih tertutup dan fokus melompat ke tombol menu, jadi
pembaca layar tidak lagi membacakan isi halaman.

Ada satu hal yang mudah pecah. `BackToTop` memakai `d-flex` dari Bootstrap yang
menulis `display: flex !important`, jadi
`display: none` pada tombol itu kalah dan tombol tetap terlihat di atas panel.
Karena itu `body.navmenu-terbuka .scroll-top` memakai `visibility: hidden`.
`z-index` tombol itu tidak disentuh, karena `tests/kembali-ke-atas.test.ts`
mengunci 1199 sebagai satu-satunya nilai.

Seluruh perilaku di atas dikunci `tests/panel-nav-mobile.test.ts`.

Catatan perubahan: versi sebelumnya bagian ini merekomendasikan atribut
`inert` sebagai perbaikannya. Pendekatan itu sudah dicabut, karena pemilik repo
menyelesaikan masalahnya dengan `visibility: hidden` ditambah tiga cara menutup,
dan `inert` tidak ada di navbar sekarang.

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

**Selesai. Di luar Acceptance Criteria, jadi tidak mengubah verdict butir 7.**

Koreksi lebih dulu, karena versi sebelumnya bagian ini menulis "Acceptance
Criteria butir 7 menyebut tidak bisa daftar ganda". Itu salah. Butir 7 di PRD
bagian 12 berbunyi "Pendaftaran E-Pasien menghasilkan nomor antrean dan
tersimpan di DB", dan kata "ganda" tidak muncul di seluruh PRD kecuali di
"deploy ganda Vercel + VPS" yang tidak ada hubungannya. Jadi butir 7 lulus, dan
yang tertulis di bagian ini adalah perbaikan di luar cakupan PRD, bukan
kekurangan terhadap PRD.

#### Yang dulunya bocor

`src/app/api/v1/appointments/route.ts` tidak punya satu pun pengecekan duplikat.
`createAppointment` hanya memeriksa jadwal ada, dokter cocok, jadwal aktif, hari
praktik cocok, dan kuota masih sisa. Tabel `appointments` punya unique index
pada `ticket_code` dan pada `(doctor_id, visit_date, queue_number)`, tapi tidak
pada `phone`, tidak pada `schedule_id`, dan tidak pada kombinasi apa pun yang
melibatkan pasien.

Konsekuensinya: satu orang menekan kirim dua kali, atau menyimpan halaman lalu
mengirim ulang, dan mendapat dua nomor antrean untuk slot yang sama. Untuk rumah
sakit fiktif ini tidak berbahaya. Untuk situs yang benar-benar dipakai, satu
nomor telepon bisa mengisi seluruh kuota satu dokter.

#### Keputusan bisnisnya, dan alasannya

Tiga bentuk "ganda" sudah dipetakan, dan masing-masing menuntut constraint yang
berbeda:

| Bentuk "ganda" | Constraint yang dibutuhkan | Konsekuensi |
|---|---|---|
| Telepon sama, jadwal sama | Unik pada `(phone, schedule_id)` | Paling sempit. Satu orang tetap boleh mendaftar di dua slot berbeda. |
| Telepon sama, dokter sama, tanggal sama | Unik pada `(phone, doctor_id, visit_date)` | Satu orang tidak bisa mengambil dua antrean ke dokter yang sama di hari yang sama. |
| Telepon sama, tanggal sama | Unik pada `(phone, visit_date)` | Paling luas. Satu nomor telepon hanya boleh satu pendaftaran sehari. |

**Dipilih yang paling sempit: `(phone, schedule_id)`.** Alasannya persis
kerusakannya yang teridentifikasi, yaitu "dua nomor antrean untuk slot yang
sama". Dua bentuk yang lebih luas akan ikut menolak kegiatan yang sah, misalnya
satu orang mengambil antrean di dua poliklinik pada hari yang sama. Memilih
bentuk paling sempit juga pilihan yang paling bisa dibalik: kalau nanti bisnisnya
berubah, index yang sekarang bisa dilepas tanpa menyentuh kode.

Keputusan kedua: pendaftaran kedua **ditolak**, bukan diterima lalu ditandai.
Yang kedua memerlukan kolom status tambahan, dan tidak bisa dijamin index selama
statusnya masih bisa berubah. Jadi ditolak adalah satu-satunya bentuk yang bisa
dibuktikan database.

PRD tidak menyinggung aturan ini sama sekali. Constraint ini hasil keputusan
teknis di dokumen ini, bukan tuntutan PRD, dan migration-nya menyatakan itu di
baris Comment pertama.

#### Yang ditambahkan

- `uniqueIndex("appointments_phone_schedule_unique")` pada
  `(phone, schedule_id)` di `src/server/db/schema.ts`, dibuat di
  `drizzle/0003_anti_ganda.sql`.
- `kePesanDaftarGanda()` di `src/server/db/repo/appointments.ts` memetakan
  pelanggaran index itu jadi `ApiError.badRequest` dengan pesan yang bisa dibaca
  pasien. Mengembalikan `null` untuk semua galat lain, jadi bug di jalur ini
  tidak ikut tertutupi sebagai "sudah terdaftar".
- Pemetaan itu dipasang melekat pada `insert`, di dalam `db.transaction`.
  consequent: penolakan membatalkan transaksi, jadi `taken` yang sudah dinaikkan
  di langkah pertama ikut kembali. Satu pendaftaran yang ditolak tidak memakan
  daya tampang.

Tiga keputusan yang tidak langsung terlihat, dan semuanya punya alasannya:

1. **Tidak ada `SELECT` pemeriksaan sebelum `INSERT`.** Pemetaan index
   menghasilkan pesan yang persis sama, jadi pemeriksaan awal hanya menambah satu
   query tanpa menambah informasi. Dan pemeriksaan awal tidak bisa menggantikan
   index: dua permintaan yang datang bersamaan bisa sama-sama lolos pemeriksaan,
   lalu sama-sama mendapat nomor antrean yang berbeda, dan hanya database yang
   bisa memastikan salah satunya ditolak.
2. **`23505` dipetakan jadi 400 di sini, dan tetap jadi 500 di lapisan admin.**
   Di admin bentrok unique memang bug pada program, jadi 500 dengan detail di
   log adalah jawaban yang benar. Di sini bentrok jadwal adalah jawaban yang
   benar untuk permintaan yang memang salah. Pemetaan global tidak bisa dipakai
   untuk keduanya, jadi `mapDbError` tidak boleh diubah.
3. **`schedule_id` yang `NULL` tidak saling memblokir.** Di PostgreSQL `NULL`
   pada unique index tidak pernah dianggap sama dengan `NULL` lain. `schedule_id`
   bisa `NULL` kalau admin sudah menghapus jadwalnya, dan tanpa jadwal tidak ada
   slot yang sama untuk diblokir.

#### Yang belum bisa dibuktikan tanpa database

Perilaku database dibuktikan di `scripts/cek-tulis.ts`, yang ditambah tiga kasus:
pendaftaran ganda ditolak dengan pesan pasien, `taken` tidak berkurang setelah
penolakan, dan nomor sama dengan jadwal lain **tetap diterima** supaya index yang
kelewat lebar ikut ketahuan.

**Ketiganya belum dijalankan.** Database lokal tidak terjangkau dari lingkungan
penulisan dokumen ini, dan `docker compose up -d postgres` tidak bisa dijalankan
karena socket Docker tidak diizinkan. Yang sudah terbukti secara statis:

- Statement di `drizzle/0003_anti_ganda.sql` sama dengan yang di-generate
  `bun run db:generate`, hanya dibungkus ke dua baris.
- Setiap tag di `drizzle/meta/_journal.json` punya berkas `.sql` yang sesuai, dan
  rantai `prevId` snapshot tidak putus.
- `appointments` ada di `TABEL_RUNTIME` di `scripts/seed-data.ts`, jadi tidak
  pernah ikut di-seed. Instalasi baru selalu punya nol baris pendaftaran, jadi
  `CREATE UNIQUE INDEX` pasti berhasil di sana.

Yang **bisa** memblokir migrasi adalah database pengembangan yang sudah
memperoleh baris ganda. Jalur yang paling mungkin: `cek:tulis` versi lama memakai
telepon tetap `081234567890` untuk jadwal yang sama di setiap jalannya, jadi
jalankan kedua sudah menghasilkan baris ganda. Deteksi dulu sebelum migrate:

```sql
SELECT phone, schedule_id, count(*)
  FROM appointments
 WHERE schedule_id IS NOT NULL
 GROUP BY phone, schedule_id
HAVING count(*) > 1;
```

Kalau keluar baris, migrasi akan gagal dengan pesan dari PostgreSQL, dan itu memang
yang diharapkan: data ganda harus dibersihkan lebih dulu, bukan dipotong diam-diam.
Menghapus baris perlu keputusan pemilik repo, jadi tidak dilakukan di sini.

#### Satu jebakan yang mungkin besar nanti

`kolomUnique()` menebak nama kolom dari nama constraint, jadi
`appointments_phone_schedule_unique` terbaca sebagai kolom `schedule`.
`tabrakanUnik()` di `src/server/admin/records.ts` memakai tebakan itu untuk
menampilkan "Nilai ini sudah dipakai" di field yang salah.

Hari ini itu tidak terjangkau: `appointments` tidak ada di registry admin, dan
inbox hanya menulis `status` serta `admin_note`, keduanya bukan bagian index baru.
Kalau suatu saat admin boleh mengubah `phone` atau `schedule_id` dari panel,
`tabrakanUnik()` perlu tahu constraint ini lebih dulu.

### 3.14 Bilah aksi cepat juga tidak pernah dibuat

**Selesai.** Ini terakhir satu-satunya Acceptance Criteria yang gagal, yaitu
butir 4 di bagian 6. Sekarang layout merender `Topbar`, `Navbar`, `Footer`,
`QuickActionBar`, dan `BackToTop`.

Isinya tidak ada di situs acuan, jadi tidak ada yang bisa diukur. Yang dipakai
lima komponen yang sudah ada, bukan tebakan: dua tombol dari `HEADER_CTAS`
supaya isinya sama persis dengan yang sudah ada di header, ditambah WhatsApp
dari `CONTACT` karena itu sudah dipakai di topbar dan footer. Kalau
`HEADER_CTAS` berubah, isi bilah ini ikut berubah tanpa perlu disentuh.

Bentuk tiap butir ditulis sebagai data di `src/data/quick-action.ts`, bukan di
dalam JSX, supaya `tests/quick-action.test.ts` bisa memeriksanya tanpa merender
apa pun dan supaya komponennya sendiri tidak memuat daftar tautannya.

Tautannya dijaga. Setiap `href` di `QUICK_ACTIONS` diuji dengan
`hasOwnRoute()`, jadi butir yang menunjuk halaman yang tidak ada akan membuat
tes gagal, bukan jadi tautan mati diam-diam seperti yang terjadi di 3.15.

Sengaja disembunyikan di bawah 768px. Ruang vertikal di layar kecil sempit,
dan tombol `Daftar Online` sudah ada menapak di header.

### 3.15 Tautan mati yang sudah diperbaiki, dan penjaganya

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

### 3.16 Alur kerja gerbang: kesimpulan sebelumnya salah

**Selesai dan berjalan. Versi bagian ini sebelumnya menyatakan sebaliknya, dan
pernyataannya salah.**

Versi sebelumnya menulis "belum pernah berhasil sekali pun", dengan bukti
"dua belas run, dua belas `failure`, semuanya 0 detik" dan "`jobs` run kosong".
Bukti itu pernah benar, tapi tidak lagi, dan tidak pernah diselidiki sampai
sekarang. Hasil yang benar per 4 Oktober 2026:

| Workflow | Sukses | Gagal |
|---|---|---|
| `Gerbang` | 15 | 1 |
| `pages-build-deployment` | 4 | 0 |

Tabel itu foto pada satu titik, diukur sebelum commit yang memuat koreksi ini
masuk. Setiap push sesudahnya menambah angka sukses, jadi bacalah sebagai catatan
pada waktu itu, bukan angka yang selalu benar. Yang tidak berubah adalah
polanya: sejak penyebabnya diperbaiki, tidak ada satu pun run `Gerbang` yang
gagal.

Satu-satunya kegagalan adalah push dari commit `699b923` pada 4 Oktober 2026
pukul 07:52 UTC, yang gagal dalam 0 detik dengan pesan `This run likely failed
because of a workflow file issue`. Penyebabnya diketahui dan bukan kekurangan
Actions: branch itu masih berisi versi lama roadmap yang bentrok dengan
`main`, jadi berkas workflow-nya memang tidak bisa dipakai. Push berikutnya ke
branch yang sama, dengan isi yang sudah benar, berhasil penuh.

Bukti bahwa alurnya benar-benar bekerja, bukan hanya tidak error: run
`37187189691` pada PR #37 menjalankan sembilan langkah kerja dan semuanya
`success`, yaitu `Ambil kode`, `Pasang bun`, `Pasang dependensi`, `Lint`, `Tes`,
`Snapshot dan route saling cocok`, `Audit teks`, `Build produksi`, dan
`Kontrol tautan dan kelengkapan sitemap`. Langkah terakhirnya mencetak
`148 halaman, 148 tautan unik, 148 entri sitemap` di runner, bukan di mesin
lokal.

Konsekuensinya untuk dokumen ini. Bagian 1 dan bagian 4 pernah menulis bahwa
gerbang hanya bisa dijalankan manual. Itu tidak benar lagi. `bun run lint`,
`bun run test`, `bun run cek:konten`, `bun run audit:teks`, `bun run build`,
dan `bun run cek:tautan` sekarang berjalan otomatis pada setiap push dan
setiap pull request, dengan `DATABASE_URL` dikosongkan agar semuanya berjalan
pada mode snapshot.

Yang masih perlu diketahui: `bun run cek:tulis` dan `bun run cek:admin` tidak
ada di alur CI, karena keduanya butuh Postgres hidup sementara alur itu
menjalankan segalanya pada mode snapshot. Keduanya masih gerbang manual.

---

## 4. Langkah berikutnya

Sembilan langkah versi sebelumnya sudah diselesaikan. Empat di antaranya selesai
pada sesi terakhir ini, dua di antaranya selesai oleh upstream tanpa ikut saya
(peta situs di PR #33, panel admin dan formulir e-pasien di PR #34), dan satu
lagi berstatus "menunggu keputusan" yang sekarang sudah diputuskan dan dikerjakan,
yaitu dua URL ganda di 3.8 dan constraint anti-pendaftaran ganda di 3.13.

Yang tersisa hanya yang butuh keputusan pemilik repo atau perkakas yang belum
dipasang. Urutannya dari yang paling jelas.

1. **Jalankan `db:migrate` lalu `cek:tulis` di mesin yang punya database.**
   Constraint anti-pendaftaran ganda sudah ditulis dan diuji secara statis, tapi
   belum pernah dijalankan terhadap PostgreSQL sungguhan. Perintah dan kueri
   pendeteksinya ada di 3.13. Ini satu-satunya bagian dari pekerjaan ini yang
   belum terbukti.
2. **Pasang Lighthouse** kalau angka SEO dan aksesibilitas ingin dibuktikan,
   bukan hanya diperkirakan. Memasangnya berarti menambah dependensi. Ini
   satu-satunya butir di bagian 6 yang statusnya "belum diukur", jadi setiap
   klaim tentang aksesibilitas di dokumen ini masih perkiraan.
3. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

Butir 1 satu-satunya yang bukan pilihan. Index-nya sudah ditulis dan tidak
menyentuh data, jadi tidak ada yang rusak kalau belum dijalankan, tapi klaim
"pendaftaran ganda ditolak" belum terbukti sampai `db:migrate` dan `cek:tulis`
berhasil.

Butir 2 dan 3 optional. Kalau pemilik repo menganggap tidak perlu, tidak ada yang
rusak: tidak ada Acceptance Criteria yang gagal karena keduanya. Butir 14 di
bagian 6 memang berstatus "belum diukur", dan itu sudah tertulis begitu sejak
versi sebelumnya.

Yang **tidak** ada di daftar ini, karena sudah selesai atau sudah gugur:

- **Hubungkan formulir ke `POST /api/v1/appointments`**. Sudah di PR #34. Batas
  anti-pendaftaran ganda yang menyelesaikannya ada di 3.13.
- **Buat `sitemap.xml` dan `robots.txt`**. Sudah di PR #33, lalu diperluas di
  sesi ini karena versinya kehilangan delapan halaman.
- **Buat tombol kembali ke atas**. Sudah di PR #34, lalu diukur ulang dan
  dikunci di 3.10.
- **Buat bilah aksi cepat**. Selesai di sesi ini, lihat 3.14. Butir 4 bagian 6
  tidak lagi gagal karena ini.
- **Render semua panel brosur di server**. Sudah di PR #34, lihat 3.8.
- **Hapus `/laboratorium` dan `/radiologi`**. Sudah di sesi ini dengan persetujuan
  pemilik repo. URL kanoniknya tetap ada.
- **Putuskan ruang lingkup panel admin**. Tidak perlu diputuskan, panelnya
  sudah ada dan lengkap. Lihat koreksinya di 3.12.
- **Tambahkan constraint anti-pendaftaran ganda**. Selesai, bentuk paling sempit
  `(phone, schedule_id)`. Lihat 3.13.

## 5. Yang perlu diketahui sebelum lanjut

- **Navbar dibekuan.** Jangan diubah tanpa diminta pemilik repo.
  `tests/navbar-beku.test.ts` mengunci keadaan itu, dan sengaja gagal kalau
  navbar disentuh. Pengecualiannya satu: panel off-canvas mobile, dengan
  persetujuan pemilik repo, dan perbaikannya dijelaskan di 3.11. Perbaikan itu
  sudah masuk `main`. Semua aturan barunya hanya ada di dalam
  `@media (max-width: 1199.98px)`, jadi keadaan desktop tidak tersentuh.
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
- **Panel navigasi mobile ditutup tanpa `inert`.** Versi sebelumnya bagian ini
  menyebut atribut `inert` plus `aria-hidden`. Pendekatan itu sudah dicabut,
  karena pemilik repo menyelesaikan masalahnya dengan `visibility: hidden` pada
  panel tertutup ditambah tiga cara menutup, dan `inert` tidak ada di navbar
  sekarang. `tests/panel-nav-mobile.test.ts` mengunci seluruh perilaku itu.
  Jangan menutup panel dengan `inert` tanpa izin pemilik repo, dan
  jangan menghapus `visibility: hidden`: menggeser dengan `translateX(100%)`
  bukan menyembunyikan, sehingga 74 tautan di dalam panel tetap bisa difokuskan.
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
| 4 | Topbar kontak, dua tombol CTA header, dan bilah aksi cepat ada | Lulus | Ketiganya ada. Topbar kontak dari `Topbar.tsx`, dua tombol CTA header dari `HEADER_CTAS` berisi "Daftar Online" dan "Administrasi Pasien", dan bilah aksi cepat dari `QuickActionBar.tsx`. Isi bilah aksi cepat diambil dari `HEADER_CTAS` ditambah WhatsApp dari `CONTACT`, lalu setiap `href`-nya diuji dengan `hasOwnRoute()`. Lihat 3.14. |

### Fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 5 | Memilih spesialis memfilter dropdown dokter; hasil jadwal tampil dengan status memuat | Lulus | `DoctorSearchCard` punya tiga state: spesialis, dokter, hari. Memilih spesialis mengisi daftar dokter. Dipakai `<select>` bawaan, bukan `react-select` seperti PRD 8.3 menulis, karena `react-select` memang terpasang tetapi belum dipakai. Perbedaan komponen, bukan perbedaan fungsi. |
| 6 | Semua halaman bisa dijangkau lewat link; tidak ada halaman yatim dan tidak ada link mati | Lulus | `bun run cek:tautan` melaporkan 148 halaman, 148 tautan unik, dan 148 entri sitemap, tanpa tautan mati dan tanpa halaman tanpa tautan masuk. Tiga cacat yang pernah ada sudah ditutup: 18 halaman brosur dulu yatim karena `BrosurDirectory` hanya merender panel kategori yang sedang aktif, dan dua URL ganda diduplikasi. Lihat 3.8. |
| 7 | Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB | Lulus | PR #34 upstream menyambungkan formulir ke endpointnya. `registration-form.tsx` mengambil dokter dari `GET /api/v1/doctors`, mengambil slot jam dari `GET /api/v1/schedules`, lalu mengirim `POST /api/v1/appointments` dengan `schedule_id`. Nomor antrean dikembalikan dan ditampilkan ke pengguna. Penghitung kuota memakai `INSERT ... ON CONFLICT DO UPDATE ... RETURNING taken` di dalam transaksi, jadi dua permintaan bersamaan tidak mendapat nomor yang sama, dan unique index `(doctor_id, visit_date, queue_number)` jadi pengaman kedua. |
| 8 | Form menolak input tidak valid di sisi server dan tahan terhadap spam sederhana | Lulus | Sisi server lengkap: `src/server/validation.ts` dipakai route appointments, honeypot dan rate limit dijalankan `src/server/api/form.ts` sebelum validasi. Sekarang jalur itu benar-benar dipakai pengunjung, karena formulir sudah mengirim datanya (lihat butir 7). Penghitung rate limit dikosongkan setelah formulir tersimpan, dan ada tesnya: `tests/form-rate-limit.test.ts` serta `tests/registration-form.test.ts` mengunci aturan pemetaan field dan penerjemahannya. |
| 9 | Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya tampil di situs publik | Gagal | Satu sebabnya, dan sekarang tinggal satu. Panel admin-nya ada dan berfungsi, jadi separuh pertama butir ini sudah bisa dilakukan: admin bisa menambah, mengubah, dan menghapus berita lewat `/admin/records/[table]`. Tapi tidak satu pun halaman publik membaca dari database. Dari 18 halaman yang ada, 17 masih membaca modul di `src/data/`, dan satu-satunya yang membaca server adalah dasbor admin itu sendiri. Admin mengubah baris berita di database, lalu halaman `/berita` tetap menampilkan isi modul. Perubahan itu tidak pernah terlihat pengunjung. |
| 10 | Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user | Lulus | `src/server/admin/registry.ts` memetakan aksi ke peran, dan tes `tests/registry.test.ts` mengunci pemetaannya. Sekarang aturan itu juga ditegakkan di jalur HTTP, bukan hanya di backside: delapan dari empat belas route handler admin meneruskan peran ke `requireSession()`, jadi permintaan dari peran yang salah ditolak sebelum menyentuh database. Panel adminnya juga sudah ada, jadi aturannya bisa dipakai dari antarmuka. |

Catatan terbuka untuk butir 6: kedelapan belas halaman brosur dulu yatim karena
`BrosurDirectory` hanya merender panel kategori yang sedang aktif, sehingga
tautannya baru muncul setelah tab diklik. Sekarang semua panel dirender di server
dan yang tidak aktif diberi atribut `hidden`. Dua URL ganda, `/laboratorium` dan
`/radiologi`, dulu hidup berdampingan dengan `/pelayanan/diagnostik/<slug>` dan
tidak pernah ditautkan; keduanya sekarang dihapus, jadi isinya tidak lagi
diminta dua kali oleh mesin pencari.

Catatan terbuka untuk butir 10: enam route admin lainnya tidak meneruskan
peran sama sekali. Lima di antaranya hanya membaca (`stats`, `tables`,
`appointments-per-day`, `survey-by-unit`, dan `inbox/[kind]`), jadi risikonya
kecil. Yang keenam, `inbox/[kind]/[id]`, menulis dan tidak punya pemeriksaan
peran. Itu bukan alasan butir 10 gagal, karena butirnya bicara soal
`front_office` dan `editor` sedangkan route inbox tidak menyentuh konten sama
sekali. `records` punya dua lapis: route-nya meneruskan peran, dan `rolehanya()`
dipanggil lagi di `src/server/admin/records.ts`.

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
| Lulus | 11 | 1, 2, 4, 5, 6, 7, 8, 10, 11, 15, 16 |
| Sebagian | 1 | 3 |
| Belum bisa dibuktikan | 1 | 12 |
| Belum diukur | 1 | 14 |
| Gagal | 1 | 9 |
| Tidak diterapkan atas keputusan pemilik | 1 | 13 |

Jumlahnya enam belas, sama dengan jumlah kotak penanda di PRD bagian 12.

Dua butir naik pada versi ini: butir 4 dan butir 6. Keduanya karena pekerjaan
yang sama-sama selesai di sesi ini, yaitu bilah aksi cepat di 3.14 dan
penghapusan dua URL ganda di 3.8. Butir 4 sebelumnya ditulis gagal karena
`QuickActionBar` benar-benar belum ada; butir 6 sebelumnya ditulis sebagian
karena dua halaman itu tidak pernah ditautkan.

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
