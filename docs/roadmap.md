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
| Halaman ter-prerender | 150 | `bun run cek:tautan`, berkas `.html` di `.next/server/app` tanpa dua halaman cadangan Next.js. Diukur 10 Oktober 2026; naik 2 dari 148 karena halaman unit `rawat-jalan` dan `rawat-inap` (8 Oktober 2026) |
| Pola rute dinamis | 11 | `dynamicRoutes` di `.next/prerender-manifest.json` |
| Berkas tes | 63 | `bun run test`, diukur 10 Oktober 2026 |
| Jumlah tes | 862 | `bun run test`, diukur 10 Oktober 2026 |
| Rute internal dari catch-all | 27 | `collectNavPaths()` di `src/lib/nav-path.ts`, diukur 10 Oktober 2026. Turun dari 30 setelah commit SKM/PPID/kapasitas-bed 8 Oktober 2026 yang menyentuh fungsi itu (kemungkinan pengecualian rute yang sudah punya folder sendiri) |
| Tabel terkelola di panel admin | 17 | `src/server/admin/registry.ts` |
| Tabel di skema database | 28 | `pgTable` di `src/server/db/schema.ts`, diukur 10 Oktober 2026 (plus 11 `pgEnum`) |
| Route handler API | 45 | `src/app/api/v1/**/route.ts`: 44 endpoint dan catcher 404. Naik 1 dari 44 karena `admissions` dari pemisahan rawat inap (`409012f`, 8 Oktober 2026) |
| Butir navigasi tingkat atas | 8 | `NAV_ITEMS` |
| Halaman panel admin | 7 | `src/app/admin/**/page.tsx`: 1 login + 6 di dalam `(panel)` (dasbor, akun, beds, inbox, pengaturan, records). Keenamnya dinamis karena butuh sesi |
| Halaman publik yang membaca database | 4 | `getPublicArticles()` di `src/lib/content-loader.ts`: `/berita`, `/berita/[slug]`, `/`, dan `sitemap.xml` |
| Migration terpasang di database uji | 6 | `bun run db:migrate`, terakhir `0005_slug_paket_mcu.sql`. Diukur 10 Oktober 2026 dari folder `drizzle/` |

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

Per 10 Oktober 2026 berkas HTML-nya 152 dan halamannya 150. Tambahan 2 dari
148 adalah halaman unit `rawat-jalan` dan `rawat-inap` dari commit 8 Oktober
2026 (`7ccb399`, `409012f`). Cara memeriksa: daftar berkas `.html` di
`.next/server/app`, kurangi `/_global-error` dan `/_not-found`.

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

Per 10 Oktober 2026 angkanya 27, bukan 30 lagi. Empat commit 8 Oktober 2026
(`b209dc6`, `fc58b52`, `109069c`, `8da7af2`) menyentuh `src/lib/nav-path.ts`,
sementara `src/data/navigation.ts` tidak berubah sejak 3 Oktober 2026, jadi
penurunnya ada di logika fungsi, kemungkinan pengecualian untuk path yang
sudah punya folder sendiri. Cara memeriksa ulang satu baris:

```bash
bun -e "const {collectNavPaths}=await import('./src/lib/nav-path.ts');console.log(collectNavPaths().length)"
```

Gerbang kualitas terakhir: typecheck bersih, `bun run lint` bersih,
`bun run test` 862 tes lulus dari 63 berkas, `bun run cek:konten` dan
`bun run audit:teks` lulus, `bun run build` sukses (169/169 halaman), dan
`bun run cek:tautan` tidak menemukan tautan mati, halaman tanpa tautan masuk,
maupun halaman yang lupa masuk sitemap: 150 halaman, 150 tautan unik,
149 entri sitemap. Diukur 10 Oktober 2026.

Database sungguhan sudah bisa dijalankan di mesin ini tanpa Docker, lewat
PostgreSQL 17.11 dari shim `mise`. menjalankan `db:migrate`, `db:seed`,
`db:status`, `cek:tulis`, dan `cek:admin` semuanya berhasil pada 5 Oktober 2026,
jadi tidak ada lagi klaim di dokumen ini yang bergantung pada database yang
belum pernah disentuh. Rinciannya ada di 3.18.

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

**Selesai diukur.** Angkanya sekarang ada, diukur dengan Lighthouse 13.5.0 dan
tiga kali jalankan per rute, lalu diambil mediannya. Satu kali jalankan tidak
cukup: selisih antar-jalankan di mesin ini mencapai 25 poin, jadi angka satu
jalankan lebih banyak menggambarkan beban mesin daripada halaman yang diukur.
Tiga jalankan lalu median, supaya perbandingan antar-rute berarti.

Perintah, tanpa menambah apa pun ke `package.json`:

```bash
bun run start --port 3412 &
npx --yes lighthouse@13.5.0 http://localhost:3412/berita \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=laporan.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
```

Dua jebakan yang sudah ditemukan dan harus diingat:

- **Hanya boleh dijalankan dalam mode snapshot.** `API_MODE=live` membuat
  `getPublicArticles()` mencoba membuka PostgreSQL pada setiap regenerate, dan
  halaman yang gagal dibaca sangat lambat dipindai. Auditnya jadi mengukur
  database, bukan halamannya.
- **`--throttling-method=simulate` adalah bawaan.** Setelah dimatikan, skornya
  jauh lebih tinggi dan tidak bisa dibandingkan dengan angka publik mana pun.
  Jangan memakai `--preset=desktop` tanpa alasan.

Hasil median dari tiga jalankan, perangkat seluler, throttling simulasi:

| Rute | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 64 | 97 | 100 | 100 |
| `/berita` | 83 | 100 | 100 | 100 |
| `/daftar-online` | 83 | 100 | 100 | 100 |
| `/tentang-kami` | 81 | 100 | 100 | 100 |
| `/jadwal-dokter` | 82 | 100 | 100 | 100 |
| `/pelayanan/mcu/reguler/paket-dasar-1` | 83 | 100 | 100 | 100 |

Acceptance Criteria butir 14 meminta aksesibilitas minimal 90 dan SEO minimal 90.
Keduanya terpenuhi di keenam rute, jadi butir 14 lulus. Performance tidak
meminta angka tertentu, tetapi harus disebut jujurnya: angkanya 64 sampai 83 dan
belum mencapai 90. Penyebabnya sudah diketahui dan persis, bukan perkiraan:
`lcp-breakdown-insight` menunjukkan `elementRenderDelay` sekitar 1,7 detik,
sementara waktu unduhan gambarnya sendiri hanya 440 milidetik. Yang mahal adalah
menunggu CSS. Ada empat gugus CSS render-blocking, 58 KiB bersama, dan yang
terbesar `bootstrap.min.css`. Menutupnya berarti menyisipkan CSS kritis ke dalam
HTML atau mengganti Bootstrap penuh dengan subset SCSS, dan keduanya butuh
dependensi baru, jadi tidak dikerjakan tanpa persetujuan.

Dua perbaikan nyata yang keluar dari audit ini:

- **`fetchpriority="high"` pada foto yang di-preload.** `next/image` menuliskan
  `<link rel="preload" as="image">`, tetapi tanpa `fetchpriority="high"`
  unduhan itu berjalan dengan prioritas normal. Pada `/` elemen LCP-nya adalah
  gambar slide hero, dan `lcp-discovery-insight` menandai `priorityHinted` sebagai
  gagal. Sekarang `Photo` mengirim `fetchPriority="high"` setiap kali `preload`
  aktif, dan `HeroSlider` untuk dua slide pertamanya. `priorityHinted` berubah dari
  `false` ke `true`, yang bisa diperiksa di laporan tanpa perlu menebak dari skor.
- **`target-size` masih gagal di beranda.** Bullets pagination Swiper berukuran
  8 x 8 piksel, dan Lighthouse meminta minimal 24 x 24. Ukuran itu bawaan
  Swiper dan sesuai hasil pengukuran, jadi tidak diubah. Skor aksesibilitas
  beranda 97, masih di atas ambang 90.

Satu temuan lain yang tercatat tapi tidak diperbaiki: `label-content-name-mismatch`
pada tautan logo di header. `aria-label` berbunyi "RSUD Contoh Sehat - kembali
ke halaman utama", sedangkan teks yang terlihat adalah "RSUD Contoh Sehat" dan
"Rumah Sehat Untuk Semua". WCAG 2.5.3 meminta nama yang bisa diakses memuat
teks yang terlihat. Perbaikannya ada di `Navbar.tsx`, yang dibekukan pemilik
repo, jadi tidak disentuh. Catatan ini ada supaya suatu saat diketahui begitu
tidak dianggap tertinggal.

Sudah diukur sebelumnya secara manual di peramban pada 28 rute:

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

### 3.6 Dua angka lebar navbar tidak cocok

**Selesai.** Sudah diukur di peramban oleh sesi lain, dan sekarang hanya satu
angka yang dipakai di dua tempat. Rinciannya ada di blok navbar pada
`AGENTS.md`.

### 3.7 Cacat navbar: pembekuan dicabut, tangga lebar dipakai

**Selesai. Pembekuan navbar dicabut atas permintaan pemilik repo, 6 Oktober
2026.**

Dulu bagian ini menulis bahwa tombol "Administrasi Pasien" terpotong pada lebar
1200 sampai 1495px dan sengaja diterima. Sekarang tidak berlaku lagi.

Penyebabnya satu baris header butuh `1496px` (logo 237 + nav 894 + CTA 341 +
padding 24), sedangkan viewport terkecil yang masih desktop adalah `1200px`.
Tiga pendekatan sudah dicoba:

- **Sembunyikan CTA di bawah 1496px.** Nav terdorong ke tepi kanan sampai
  menempel (`12px`) dan dua tombol utama hilang. Ditolak.
- **Mengecilkan nav supaya muat di 1200px.** Nav harus menyusut sekitar 33%
  supaya seluruhnya muat, dan huruf `15px` menjadi `10px`: tidak terbaca.
  Ditolak.
- **Paksa satu baris.** Sama saja tidak muat.

Yang dipakai sekarang adalah tangga lebar, diukur lewat CDP pada 1200, 1280,
1360, 1366, 1400, 1440, 1519, 1520, 1560, 1600, dan 1920px:

| Lebar | Tampilan |
|---|---|
| `1520px` ke atas | Satu baris penuh: logo + tagline, nav `15px`, CTA |
| `1360-1519px` | Satu baris kompak: logo merapat, nav `13.5px`, CTA ramping |
| `1200-1359px` | Dua baris: baris pertama logo dan CTA, baris kedua nav dipusatkan |
| Di bawah `1200px` | Hamburger + panel off-canvas (tidak berubah) |

Batas `1520px` dipakai, bukan `1496px`, supaya ada sisa sekitar 24px untuk
perbedaan metrik font antar mesin peramban: Zen memakai Gecko, Helium memakai
Chromium. Pada semua lebar di atas, `scrollWidth` sama dengan `clientWidth`,
jadi tidak ada gulir horizontal.

`tests/navbar-beku.test.ts` sudah dihapus atas permintaan pemilik repo, jadi
tidak ada lagi test yang mengunci angka navbar.

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

Perilaku panel itu sendiri tidak lagi dikunci tes: `tests/panel-nav-mobile.test.ts`
ikut dihapus bersama `tests/navbar-beku.test.ts` dan `tests/header-ctas.test.ts`
atas permintaan pemilik repo. Perilaku yang dijelaskan di atas masih bisa
diperiksa manual di peramban pada lebar 390px.

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
  akibatnya: penolakan membatalkan transaksi, jadi `taken` yang sudah dinaikkan
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

#### Perilaku database, dibuktikan

Perilaku database dibuktikan di `scripts/cek-tulis.ts`, yang ditambah tiga kasus:
pendaftaran ganda ditolak dengan pesan pasien, `taken` tidak berkurang setelah
penolakan, dan nomor sama dengan jadwal lain **tetap diterima** supaya index yang
kelewat lebar ikut ketahuan.

**Ketiganya sudah dijalankan** pada 5 Oktober 2026 terhadap PostgreSQL 17.11
lokal, dan ketiganya lulus. Keluarannya ada di 3.18. Yang terbukti secara
statis sebelum itu, dan tetap berlaku:

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
jalankan kedua sudah menghasilkan baris ganda. Migrasi pada cluster baru tidak
bermasalah karena `appointments` tidak pernah di-seed, tapi database yang sudah
pernah dipakai perlu dicek dulu sebelum migrate:

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

### 3.17 Halaman publik tidak pernah membaca database

**Selesai untuk berita, dan itu memang yang diminta Acceptance Criteria butir 9.**

Butir 9 berbunyi "Admin dapat menambah, mengubah, dan menghapus berita, dan
perubahannya tampil di situs publik". Separuh pertama sudah ada dari PR #34:
panel admin menulis ke tabel `articles`. Separuh kedua tidak ada sama sekali.
`/berita`, `/berita/[slug]`, dan kartu berita di beranda membaca modul statis
`src/data/home.ts`, jadi perubahan admin tidak pernah sampai ke pengunjung.

Yang ditambahkan:

- `src/lib/content-loader.ts`. Satu-satunya tempat yang tahu sumber berita
  publik. Urutannya: `API_MODE=live` dengan database hidup membaca tabel
  `articles`; `API_MODE=snapshot` membaca `ARTICLES`; mode live yang database-nya
  tidak terjangkau atau kuerinya gagal juga membaca `ARTICLES`, dengan
  peringatan di log.
- `getPublicArticles()` untuk daftar, `getPublicArticle(slug)` untuk detail, dan
  `fotoBerita()` untuk memilih foto.
- `tests/konten-loader.test.ts`, 27 tes.

Empat halaman tersambung, tidak tiga: `/berita`, `/berita/[slug]`, dan beranda.
Beranda ikut karena kalau tidak, `/berita` sudah menampilkan isi database
sementara kartu di section 6 masih menampilkan modul statis, jadi admin dan
pengunjung melihat dua isi berbeda untuk hal yang sama.

Lima keputusan yang tidak langsung terlihat dari kode:

**`dynamicParams` di `/berita/[slug]` dibiarkan `true`.** Sifat aslinya memang
`true`, jadi ini hanya ditulis eksplisit. Kalau diubah jadi `false` seperti
`src/app/[...slug]`, berita yang baru dibuat admin akan menjawab 404 padahal
barisnya ada. Yang `false` di `[...slug]` punya alasan lain: pathnya dibatasi
`NAV_ITEMS`, sedangkan `/berita/[slug]` memang harus terbuka untuk slug baru.

**Tiga halaman memakai `export const revalidate`.** Tanpa itu, `next build`
mem-prerender sekali dan perubahan admin baru terlihat setelah build
berikutnya, yang di VPS tidak pernah berjalan sendiri. `/berita` dan `/berita/[slug]`
60 detik, beranda 60 detik, `sitemap.xml` satu jam. Sitemap lambat karena isinya
hanya berubah saat berita ditambah atau dihapus, bukan saat berita diedit.

**Nol baris dari database diperlakukan sebagai "belum diisi", bukan "kosong".**
Database yang sudah hidup tapi belum di-seed mengembalikan nol baris, dan grid
berita yang kosong tidak punya satu pun tautan keluar, sehingga
Acceptance Criteria butir 6 ikut gagal. Konsekuensinya, kalau admin menghapus
seluruh isi tabel, pengunjung kembali melihat enam belas berita bawaan. Itu
pilihan yang lebih baik daripada halaman kosong, dan cara mengubahnya adalah
mengisi database.

**Slug yang tidak ada di database tidak langsung berarti 404.** `generateStaticParams`
masih membuat enam belas slug bawaan, dan `db:seed` mengisi sepuluh berita
dengan slug yang sama sekali berbeda. Kalau slug hilang dipecah menjadi 404,
enam belas halaman yang tadinya tampil akan hilang begitu `API_MODE` berubah ke
`live`. Jadi `getPublicArticle()` baru mengembalikan `null` kalau slug itu tidak
ada di database maupun di modul statis.

**Foto dari database tidak dioptimasi.** `next/image` hanya mau memuat host yang
terdaftar di `remotePatterns` pada `next.config.ts`, sedangkan admin boleh
memasukkan host `http` atau `https` apa pun. Tanpa `unoptimized`, satu URL dari
luar daftar itu menghasilkan permintaan ke `/_next/image` yang dijawab galat, dan
kartu berita tampil dengan kotak rusak. `Photo` sekarang menerima `unoptimized`,
dan `fotoBerita()` menyalakannya hanya untuk URL yang benar-benar berasal dari
database.

Yang **tidak** dikerjakan, dan alasannya bukan teknis:

- **Halaman lain tetap membaca modul statis.** Dokumen ini pernah menjanjikan
  "abstraksi data loader" untuk seluruh halaman publik. Setelah datanya
  dibandingkan, janji itu tidak bisa ditepati tanpa menguras halaman. Isi seed
  `scripts/seed-data.json` punya tujuh belas dokter dengan nama yang berbeda
  dari tiga puluh lebih dokter di `src/data/doctors.ts`, dan lima poliklinik
  terhadap dua puluh lima. Menyalakan mode live untuk halaman-halaman itu akan
  membuat situs lebih tipis, bukan lebih hidup. Pemilik repo memutuskan: cukup
  berita, karena itulah yang diminta butir 9.
- **Tabel selain `articles` masih tidak terjangkau halaman publik.** Daftar dan
  bentuk kuerinya sudah ada di `src/server/db/repo/content.ts`
  (`listDoctors`, `listPolyclinics`, `listServices`, `listMcuPackages`,
  `listDocuments`, `listJobs`, `findPage`, `loadHome`), jadi menambahkannya nanti
  tinggal menulis pemetaan. Yang belum ada adalah keputusan apakah isi database
  sudah cukup kaya untuk menggantikan modul statis.
- **`snapshot/articles.json` tidak dipakai loader.** Isinya muatan API, bukan
  bentuk modul data. Membacanya berarti memetakan dua lapis dan menyisakan dua
  sumber kebenaran untuk isi berita yang sama. `denganSnapshot()` tetap dipakai
  route handler, yang memang berbicara dalam bentuk API.

Bukti runtime, bukan cuma statis. Server produksi dijalankan dengan
`API_MODE=live` dan `DATABASE_URL` yang menunjuk ke port yang tidak ada
membuka PostgreSQL, lalu keempat rute diuji:

| Rute | Status | Isi |
|---|---|---|
| `/` | 200 | enam belas kartu berita dari data statis |
| `/berita` | 200 | enam belas kartu berita dari data statis |
| `/berita/layanan-stroke-terpadu` | 200 | lima paragraf dari data statis |
| `/berita/tidak-ada` | 404 | benar |

Dan `[konten] ... data statis dipakai` muncul di log sebanyak tujuh kali, jadi
fallback itu benar-benar berjalan, bukan hanya ada di atas kertas. Perintah
dan hasil lengkapnya ada di `docs/catatan-teknis.md`.

Sembilan mutasi dicoba terhadap `src/lib/content-loader.ts` dan kesembilannya
tertangkap, termasuk membuat foto database tetap dioptimasi, membiarkan tanggal
rusak ikut tampil, membungkam peringatan tanpa jejaknya, dan membuat loader
selalu mengembalikan data statis. Butir terakhir itu yang paling penting: tanpa
itu, butir 9 akan terlihat lulus karena semua tes fallback hijau, padahal tidak
satu pun halaman publik menyentuh database.

### 3.18 Dua klaim terakhir dibuktikan terhadap PostgreSQL sungguhan

**Selesai.** Soket Docker tidak ada di mesin ini, jadi versi sebelumnya
menulis bahwa `db:migrate` dan `cek:tulis` belum pernah bisa dijalankan.
Ternyata bukan begitu: PostgreSQL sudah ada di mesin sebagai milik pengguna,
hanya lewat shim `mise` yang tidak punya versi global. Dengan `PATH` diarahkan
langsung ke `~/.local/share/mise/installs/postgres/17.11/bin`, cluster lokal
bisa dijalankan tanpa Docker dan tanpa `sudo`.

Cluster-nya sengaja dibuat di `/tmp`, dengan nama service, user, kata sandi, dan
nama database yang sama persis dengan `docker-compose.yml`, supaya `DATABASE_URL`
yang dipakai tidak berbeda dari yang tertulis di dokumentasi.

Urutan yang berhasil, dan urutannya penting karena tiap langkah bergantung pada
langkah sebelumnya:

```bash
initdb -D /tmp/opencode/pgdata-loader -U rsud --locale=C.UTF-8 \
  --auth-local=trust --auth-host=scram-sha-256
# listen_addresses = '127.0.0.1', port 5432
pg_ctl -D /tmp/opencode/pgdata-loader -l logfile -o "-p 5432 -k /tmp/opencode" start

export DATABASE_URL='postgres://rsud:...@127.0.0.1:5432/rsud_contoh_sehat'
bun run db:migrate      # 4 migrasi, termasuk 0003_anti_ganda.sql
bun run db:seed
bun run db:status       # 27 tabel, 26 terisi
bun run cek:tulis
bun run cek:admin
```

Hasil yang tidak pernah bisa didapat tanpa database:

- **`db:migrate` berhasil.** Empat migrasi terpasang. Index
  `appointments_phone_schedule_unique` ada, dan `appointments` punya tujuh index
  termasuk yang tiga unique.
- **`cek:tulis` lulus.** Ini yang paling penting, karena inilah bukti tunggal
  bahwa klaim di 3.13 bukan lagi teori. Keluarannya persis seperti yang
  dijanjikan commit itu:
  - `pendaftaran ganda ditolak: Nomor ini sudah terdaftar untuk jadwal itu. Satu
    nomor hanya bisa satu antrean per jadwal.`
  - `kuota setelah pendaftaran ganda ditolak: 1 -> 1 (tidak berkurang, benar)`,
    jadi penolakan membatalkan transaksi dan `taken` yang sudah dinaikkan ikut
    kembali.
  - `nomor sama, jadwal lain: diterima`, jadi index `(phone, schedule_id)` tidak
    kelewat lebar.
- **`cek:admin` lulus** pada dua puluh satu pemeriksaan: akun, peran, sesi,
  dasbor, survei per unit, dan pendaftaran per hari.

Content loader dari 3.17 juga diuji terhadap database yang benar-benar berisi
berita, bukan cuma database yang ditolak:

| Yang diperiksa | Hasil |
|---|---|
| `/` di mode live | sepuluh kartu berita dari `articles`, bukan enam belas dari modul statis |
| `/berita` di mode live | sepuluh kartu, tanggal dan tautannya dari database |
| `/berita/<slug database>` | 200, judul dan tanggal dari database |
| `/berita/<slug modul statis>` | 200, dilayani data statis, tidak hilang |
| `/berita/tidak-ada` | 404 |
| `sitemap.xml` | 158 URL, memuat slug database dan slug statis sekaligus |

Bukti yang paling menentukan untuk Acceptance Criteria butir 9: satu baris
`articles` diubah langsung di PostgreSQL, lalu `/`, `/berita`, dan
`/berita/[slug]` menampilkan judul baru, ringkasan baru, dan foto dari `cover_url`
baru. Jadi urutan "admin mengubah, pengunjung melihat" terbukti utuh, bukan
hanya "halaman membaca database".

Dua temuan yang muncul karena pengujian ini dan tidak akan terlihat tanpa
database:

**`revalidate` bukan "selalu tampil dalam 60 detik".** Permintaan pertama yang
jatuh tempo setelah jendela `revalidate` masih menyajikan isi lama, dan
regenerasi berjalan di belakangnya. Isi baru muncul pada permintaan berikutnya.
Jadi mengukur satu kali saja setelah menunggu 61 detik akan menyimpulkan
"salah" padahal benar. Tiga putaran dengan jeda 20 detik mencatat perubahan pada
putaran kedua.

**`unoptimized` memang diperlukan, dan sekarang bisa dibuktikan.** `cover_url`
diubah ke host yang tidak terdaftar di `remotePatterns`, yaitu
`contoh-host-tak-terdaftar.test`. Dua hal diukur terpisah:

```text
/_next/image?url=https://contoh-host-tak-terdaftar.test/...   -> 400
src pada <img> di HTML hasil render                          -> https://contoh-host-tak-terdaftar.test/foto/admin.jpg
```

Perkakas optimasi memang menolak host itu, jadi mode tanpa `unoptimized` akan
menampilkan kotak rusak. Karena `fotoBerita()` menyalakannya, `src` ditulis apa
adanya dan `/_next/image` tidak pernah dipanggil.

Satu jebakan kecil yang tercatat karena sempat membuang waktu: `db:snapshot` menulis
enam berkas yang berbeda dari versi yang di-commit, padahal isinya identik.
Lima `documents__*.json` hanya berbeda indentasi, satu `manifest.json` hanya berbeda urutan kunci. `cek:konten` tetap lulus karena ia mem-parse JSON, bukan
membandingkan teks. Berkas snapshot sudah dikembalikan; dicatat supaya
`db:snapshot` tidak dipakai sebagai alat deteksi perubahan isi.

### 3.19 Warna aksen dan font diverifikasi dari CSS situs acuan

**Selesai.** Seluruh token di `docs/design-tokens-terverifikasi.md` awalnya
dihitung dengan `getComputedStyle()` di peramban. Pengukuran itu benar, tapi
hanya satu orang yang bisa mengulangnya, dan hasilnya tersimpan sebagai angka
di dokumen, bukan sebagai bukti yang bisa diperiksa ulang.

Ternyata stylesheet situs acuan sendiri bisa dibaca langsung, dan isinya
mengjawab pertanyaan yang paling sering ditanyakan: warna aksennya yang benar
mana.

```bash
curl -s https://rsudpasarminggu.jakarta.go.id/ > acuan.html
curl -s https://rsudpasarminggu.jakarta.go.id/v2/assets/css/main.css > main.css
curl -s https://rsudpasarminggu.jakarta.go.id/v2/assets/css/style.css > style.css
grep -n "accent-color" main.css
```

Hasilnya:

```css
/* Color for headings, subheadings and title throughout the website */
--accent-color: #1977cc;
```

Jadi tiga hal yang tadinya perdebatan atau tebakan.

**Warna aksen di kode benar, angka di PRD yang keliru.** `main.css` milik mereka
memakai `#1977cc`. `#1a77cc` tidak muncul satu kali pun di seluruh `main.css`
maupun `style.css`. `themeColor` di `layout.tsx` memang memakai `#1a77cc`, dan
itu nilai meta, bukan warna aksen. Dua-duanya ada di repo dan keduanya benar,
tetapi hanya satu yang warna aksen. Itulah sebabnya butir 3 di bagian 6 tetap
ditulis "Sebagian": hurufnya memang tidak cocok, dan sekarang buktinya bahwa
selisihnya ada di PRD.

**Font Poppins bukan pilihan terdekat, tapi nilai yang mereka pakai.** Token
mereka berbunyi begini:

```css
--default-font: "Roboto", system-ui, ... ;
--heading-font: "Poppins", sans-serif ;
--nav-font: "Raleway", sans-serif ;
```

Poppins dipakai untuk judul. Repo ini memakai Poppins untuk judul, label form,
dan body. Untuk judul berarti cocok persis. Untuk body dan navigasi berarti ada
dua substitusi, dan itu sudah tercatat di `tokens.css` sebagai keputusan, bukan
sebagai pengukuran.

**Bootstrap 5.3.3 yang dipakai repo ini cocok dengan milik mereka.**
`bootstrap.min.css` di situs acuan besarnya 232.803 byte, dan paket npm
`bootstrap@5.3.3` juga 232.803 byte. Itu bukan bukti bahwa versinya sama, tapi
membuat penggunaan Bootstrap penuh di repo ini masuk akal sebagai pilihan yang
mengikuti acuan.

Satu angka yang **tidak** ada di CSS mereka: `height: 303px` untuk hero.
Kemungkinan besar itu datang dari elemen yang diberi tinggi lewat atribut atau
grid, bukan dari deklarasi CSS. Ini justru menguatkan cara pengukuran yang
didokumentasikan di `AGENTS.md`, yaitu `getBoundingClientRect()` dan
`getComputedStyle()`, karena membaca stylesheet saja tidak akan menemukannya.

Catatan cara mengunduh: `urllib.request` ke host ini timeout, sementara `curl`
langsung berhasil. Kalau ada yang gagal, ganti ke `curl` sebelum menyimpulkan
situsnya tidak bisa dibaca.

---


### 3.20 Penjaga teks tidak pernah membaca folder `docs`

**Selesai.** `scripts/audit-teks.ts` adalah satu-satunya pemeriksaan otomatis
untuk teks rusak, dan `AGENTS.md` mencatat bahwa masalah itu nyata: menulis ke
berkas kadang menghasilkan karakter asing. Skrip itu secara eksplisit melewati
folder `docs`.

Akibatnya `docs/design-tokens-terverifikasi.md` memuat karakter Korea di dalam
kalimat biasa, di baris yang sudah ada jauh sebelum loader berita dikerjakan.
Karakter itu tidak merusak apa pun saat build, tidak muncul di mana pun kecuali
dokumen, dan karena tidak ada yang memeriksa `docs/`, tidak ada yang pernah
melihatnya.

Perbaikannya dua bagian.

**`docs` ikut ditelusuri.** Daftar folder yang dilewati sekarang jadi konstanta
`DILEWATI`, isinya tetap empat: `node_modules`, `.next`, `.git`, `archive`.
Dipisah jadi konstanta supaya bisa dikunci tes; sebelumnya ditulis inline di
dalam `if`, yang hampir tidak mungkin diperiksa dari luar.

**PRD dikecualikan lewat nama berkas, bukan lewat folder.** Foldernya ikut
diperiksa, tapi dua PRD dilewati sebagai berkas. Alasannya teknis dan nyata:
tanda centangnya memakai U+FE0F, dan menghapus selector itu berarti mengubah
berkas pemilik repo demi supaya audit sendiri terlihat bersih. Kalau `docs`
dilewati lewat folder demi menghindari U+FE0F itu, celah yang asli akan tetap
terbuka dan tidak ada yang mengetahuinya.

Empat karakter asing juga ikut dibersihkan di
`docs/design-tokens-terverifikasi.md`: satu huruf Korea, satu kata Arab, tiga
section sign, dan tiga emoji dengan selector. Semuanya salah ketik yang tidak
pernah diperiksa karena berkas itu tidak pernah dibaca audit.

`tests/audit-docs.test.ts`, empat tes, mengunci empat hal: `docs` ada di daftar
target, `DILEWATI` tetap empat dan tidak memuat `docs`, kedua PRD dikecualikan
lewat `BERKAS_PEMILIK`, dan tiga berkas lain di `docs` tidak dikecualikan. Lima
mutasi dicoba dan empat tertangkap; mutasi kelima memang tidak mengubah
perilaku apa pun, jadi lolos dengan benar.

Sekarang `bun run audit:teks` membaca 260 berkas, bukan 255.

---

### 3.21 Pekerjaan 8-10 Oktober 2026: admin, isi halaman, dan aksesibilitas

**Sebagian besar selesai; satu eksperimen masih berjalan di working tree.**
Rincian harian ada di `docs/HANDOFF.md`. Yang dicatat di sini hanya yang
mengubah angka atau keputusan di dokumen ini.

Yang masuk `main` 8-9 Oktober: layar pengaturan situs dan layar akun panel
(`6b0d223`, `c154306`), isi SKM/PPID/kapasitas-bed (`b209dc6`, `fc58b52`,
`109069c`), pemisahan rawat inap dari rawat jalan (`409012f`), halaman unit
rawat jalan plus data 54 dokter (`7ccb399`), refactor `src/lib/validasi-umum.ts`
yang dipakai enam formulir, 25 tes integrasi `tests/admin-endpoint.test.ts`,
skor aksesibilitas Lighthouse 100 di empat halaman, kalibrasi scrim hero
(`85701dc`, alfa 0.55, rasio 4.76-5.19), skrip backup berkala (`b2f0f40`),
penutup CLS daftar online (`e7cdcb6`), dan `e2e/alur-db.test.ts` untuk login
sampai kritik terlacak.

Dua halaman unit baru (`rawat-jalan`, `rawat-inap`) menaikkan hitungan bagian 1 dari 148 ke 150. Empat commit yang menyentuh `src/lib/nav-path.ts`
menurunkan catch-all dari 30 ke 27. Tes naik 640 ke 856, berkas 46 ke 62.

**Eksperimen mutasi foto dekoratif, selesai 10 Oktober 2026.**
Commit `12ae10a` membuat `alt` kosong berarti dekoratif yang dinyatakan
(`role="presentation"` + `aria-hidden="true"`), supaya bisa dibedakan dari
gambar yang lupa diberi alternatif teks. Pemilik repo lalu menguji dua arah:
mutasi `dekoratif()` menjadi selalu `true` ditambah pemeriksaan
`terlaluDisembunyikan` di `e2e/a11y.test.ts`. Hasilnya: mutasi tertangkap
(56 gambar ber-`alt` ikut tersembunyi, tes gagal seperti dirancang), dan
tanpa mutasi panel mobile lolos. Fungsi sudah dikembalikan ke logika semula
(`ab26e25`), pemeriksaannya dipertajam (`c3e53b9`), dan E2E a11y hijau 5/5.
Typo komentar yang ikut terlihat (`Fatanya`, `Propi-nya`, `sighted`)
dibersihkan sesi ini.

**Satu catatan proses.** Selama 10 Oktober repo dibangun paralel oleh dua
sesi, dan satu jalan E2E sempat memakai `.next` yang sedang ditimpa build
lain: hasil pertamanya mustahil (panel mobile gagal total, tes mutasi lolos
padahal mutasi aktif). Jalan ulang setelah build utuh memberi hasil yang
masuk akal. Pelajaran: hasil E2E hanya sah bila tidak ada build lain yang
berjalan bersamaan; `ls .next/BUILD_ID` sebelum menyimpulkan.

### 3.22 Checking penuh dan sinkronisasi angka (10 Oktober 2026, sesi riset)

**Peran sesi ini:** teman riset, bukan feature work. Tidak ada perubahan
kode; hanya dokumen (`docs/roadmap.md`, `README.md`) ditambah satu entri
`HANDOFF.md`. Sebelumnya sesi ini juga menutup PR #45 (pulihkan penanda
dekoratif + perkuat tes a11y, sudah merge) dan membersihkan branch-nya.

**Yang ditemukan dari membandingkan dokumen dengan repo:**

* Tes: dokumen menulis 856/62, realita 862/63 (`tests/kunci-build.test.ts`
  menambah 6 tes). `README` ikut basi di hari yang sama ia diluruskan.
* Halaman panel admin: bagian 1 menulis 4, realita 7 berkas `page.tsx`
  (1 login + 6 di dalam `(panel)`). `HANDOFF.md` bagian 2 sudah menulis 7
  sejak lama; yang tertinggal hanya tabel bagian 1.
* Route API: bagian 1 menulis 44, realita 45 berkas (44 endpoint +
  catcher). Kenaikannya dari `admissions` milik `409012f` (8 Oktober),
  jadi tertinggal dua hari.
* Bagian 5 mengklaim `tests/panel-nav-mobile.test.ts` mengunci perilaku
  panel. **Berkas itu tidak ada di repo.** Yang mengunci adalah E2E di
  `e2e/a11y.test.ts`. Klaimnya diperbaiki ke yang benar; ini kelas
  kesalahan yang sama dengan yang pernah dibersihkan di 3.12.
* Butir 6 bagian 6 masih menulis 148/148/148; realita 150/150/149.
  Verdict tetap Lulus, hanya angkanya yang diperbarui.

**Yang diverifikasi tetap benar:** catch-all 27, migrasi 6, tabel 28,
enum 11, tanpa TODO/FIXME di kode, `bun audit` tanpa temuan baru,
tidak ada PR terbuka, tidak ada branch basi.

---

## 4. Langkah berikutnya

Empat belas langkah versi sebelumnya sudah diselesaikan. Yang terakhir adalah
constraint anti-pendaftaran ganda di 3.13, content loader berita di 3.17, ukuran
Lighthouse di 3.5, pembuktian terhadap database sungguhan di 3.18, verifikasi
token dari CSS acuan di 3.19, dan Perluasan cakupan audit teks di 3.20.

Yang tersisa dua butir optional di bawah, plus dua temuan 10 Oktober
yang sebaiknya didahulukan karena menyangkut kebenaran `main`, bukan selera.

1. **Workflow `E2E ber-database` yang merah di `main`, diperbaiki sesi ini.**
   Gagal 8 push berturut-turut sejak 9 Oktober, selalu di langkah `db:seed`
   dengan `AUTH_SECRET wajib diisi dan minimal 32 karakter`. Penyebabnya dua
   lapis yang hilang, ketahuan satu per satu dari log CI. Lapis pertama:
   langkah `Siapkan skema dan data contoh` hanya menyetel `DATABASE_URL`,
   sedangkan `AUTH_SECRET` cuma ada di langkah Playwright. `db:seed` memanggil
   `config()` penuh lewat `dbOrNull()`, jadi validasi auth ikut berjalan
   padahal seed tidak menyentuh auth sama sekali. Lapis kedua, setelah yang
   pertama diperbaiki: `isiAdmin` di `scripts/db-seed.ts` memvalidasi
   `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` sebelum memeriksa admin sudah ada,
   jadi seed butuh keduanya walau database sudah terisi. Perbaikannya tambah
   ketiga variabel dummy di langkah seed (database CI sekali pakai dan dibuang
   tiap run); `config()` tidak dilemahkan. Terbukti run CI `38033040538`:
   migrasi sukses, seed mengisi 20 tabel, E2E alur-db lulus. `main` hijau
   penuh pertama kalinya (Gerbang + E2E ber-database + pages-build).
2. **Angka basi di `README.md`, diluruskan sesi ini.** Sempat ditulis 856
   tes di 62 berkas, lalu basi lagi di hari yang sama karena
   `tests/kunci-build.test.ts` menambah 6 tes. Sekarang menulis 862
   tes di 63 berkas, 150 halaman dari 152 berkas HTML, dan `169/169`.
   Route 45 berkas (44 endpoint + catcher; naik 1 oleh `admissions` dari
   `409012f`) dan tabel 28 memang sudah benar dan tidak diubah.
   Pelajaran angkanya ada di masukan riset di bawah: angka tanpa tanggal
   dan tanpa commit bersamaan akan basi lagi.

### Masukan riset 10 Oktober 2026

Hasil checking penuh sesi ini (tidak ada perubahan kode, hanya dokumen).
Gerbang diukur ulang di worktree bersih pada `f6224aa` (`89ff6e9` hanya
menyentuh dokumen, jadi keadaan kode sama): typecheck 0, lint 0, unit
862/63, `audit:teks` BERSIH 318 berkas, build 169/169, `cek:tautan`
150/150/149, E2E a11y 5/5. `cek:konten` tidak bisa jalan di mesin ini
(PostgreSQL menolak koneksi). Tidak ada PR terbuka, tidak ada branch basi,
`bun audit` tidak menemukan kerentanan baru (tetap 2 rantai perkembangan
yang sudah diterima di L-1).

1. **Deploy produksi adalah satu-satunya pekerjaan besar yang tersisa.**
   Semua butir wajib sudah lulus; butir 12 ("identik di Vercel dan VPS")
   tidak akan pernah bisa dibuktikan tanpa dua lingkungan nyata. Urutan
   konkretnya: domain dan DNS dulu, `ADMIN_ORIGIN=https://...` di dashboard
   platform, backup database sebelum `db:migrate` di VPS (peringatan ini
   sudah ada di `DEPLOY-VPS.md` bagian 4), lalu uji asap homepage + login
   + satu pendaftaran. Sampai itu terjadi, butir 12 tetap "tidak bisa
   dibuktikan" dan itu jujur, bukan utang.
2. **Kunci build paralel punya satu celah, dan cara menutupnya yang naif
   justru berbahaya.** `test:e2e` hanya *menunggu* kunci lalu melepasnya
   tanpa memegang: build yang mulai sesudah `tunggu` selesai tetap bisa
   menimpa `.next` selama E2E berjalan. Tetapi menutupnya dengan
   `posttest:e2e` akan gagal tepat saat paling dibutuhkan, karena bun
   tidak menjalankan hook `post` kalau skripnya gagal (terbukti:
   `POST-GAGAL` tidak pernah tercetak saat skrip keluar 3). Setiap E2E
   yang benar-benar merah akan meninggalkan kunci dan memblokir semua
   build 20 menit. Rekomendasi: lepas kunci dari `globalTeardown`
   Playwright, yang tetap jalan saat tes gagal. Belum diterapkan karena
   berkasnya sedang dikerjakan sesi lain.
3. **Angka di dokumen basi dua kali dalam sehari yang sama.**
   `README` diluruskan ke 856/62 lalu langsung basi oleh commit
   kunci-build. Aturannya sederhana: setiap commit yang menambah tes,
   rute, halaman, tabel, atau migrasi harus ikut memutakhirkan angka di
   `README` dan bagian 1 dokumen ini dalam commit yang sama, beserta
   tanggal ukurnya. Angka tanpa tanggal adalah tebakan yang menunggu
   waktu untuk salah.
4. **Sisa manual tidak bertambah dan tidak berkurang:** penilaian mata
   atas panel off-canvas dan dialog SweetAlert2, plus uji pembaca layar
   dan kontras di luar hero. E2E a11y sekarang mengunci perilaku panel
   (buka, tutup, Escape, fokus), jadi yang tersisa murni visual dan
   audio, bukan fungsi.

Yang tersisa dua butir, dan keduanya optional.

1. **Naikkan Performance di atas 90 kalau itu dikehendaki.** Angkanya sekarang
   64 sampai 83 dan penyebabnya sudah terukur, bukan karangan: CSS
   render-blocking 58 KiB dengan `elementRenderDelay` sekitar 1,7 detik. Dua
   cara memperbaikinya, inlining CSS kritis dan mengganti Bootstrap penuh dengan
   subset SCSS, sama-sama berarti menambah dependensi. Butir 14 tidak meminta
   angka Performance, jadi ini opsional.
2. **Baca-nyaring dan analytics** dikerjakan kalau diminta. Keduanya opsional
   di PRD.

Daftar ini tidak lagi punya butir wajib. Butir satu-satunya yang tadinya
wajib, yaitu menjalankan migrasi dan `cek:tulis` terhadap PostgreSQL sungguhan,
sudah selesai pada 5 Oktober 2026. Lihat 3.18.

Keduanya optional. Kalau pemilik repo menganggap tidak perlu, tidak ada yang
rusak: tidak ada Acceptance Criteria yang gagal karena salah satunya.

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

- **Navbar tidak lagi dibekukan.** Pembekuan dicabut pemilik repo 6 Oktober
  2026, dan `tests/navbar-beku.test.ts` dihapus. Navbar sekarang memakai tangga
  lebar yang dijelaskan di 3.7: satu baris penuh di `1520px` ke atas, satu baris
  kompak di `1360-1519px`, dua baris di `1200-1359px`, dan hamburger + panel
  off-canvas di bawah `1200px`. Angka pengukurannya ada di `AGENTS.md`.
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
  sekarang. Perilakunya dikunci tes E2E di `e2e/a11y.test.ts` (panel tertutup
  tidak bisa difokus, panel terbuka bisa dimasuki, Escape menutup dan
  mengembalikan fokus). Berkas `tests/panel-nav-mobile.test.ts` tidak ada di
  repo; yang mengunci adalah E2E tersebut, bukan berkas unit.
  Jangan menutup panel dengan `inert` tanpa izin pemilik repo, dan
  jangan menghapus `visibility: hidden`: menggeser dengan `translateX(100%)`
  bukan menyembunyikan, sehingga 74 tautan di dalam panel tetap bisa difokuskan.
- **Halaman publik membaca database hanya untuk berita.** `/berita`,
  `/berita/[slug]`, dan beranda memakai `getPublicArticles()` dan
  `getPublicArticle()` dari `src/lib/content-loader.ts`. Sisanya masih membaca
  modul di `src/data/`, dan itu keputusan yang disengaja, bukan pekerjaan yang
  tertinggal. Alasannya ada di 3.17: isi seed database lebih tipis daripada isi
  modul statis, jadi menyalakannya akan mengurangi isi halaman.
- **Cara menambahkan sumber berita baru** adalah menambahkannya ke
  `getPublicArticles()` atau `getPublicArticle()`, bukan menulis pembacaan
  database langsung di dalam page component.
- **Snapshot JSON bukan sumber halaman.** `snapshot/*.json` berisi muatan API
  dan hanya dibaca `denganSnapshot()` dari route handler. Page component dan
  loader membaca database langsung, atau modul statis kalau database tidak ada.
- **Route handler sudah ada di `src/app/api/v1/`**, dan semua path di luar sana
  dijawab 404 oleh catcher di `src/app/api/v1/[...path]/route.ts`.
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
| 3 | Warna utama, font, ukuran, dan jarak dicocokkan dari pengukuran DevTools | Sebagian | Semua yang diminta butir ini memang hasil pengukuran, dan sekarang bisa diperiksa langsung di CSS milik situs acuan sendiri, bukan hanya lewat `getComputedStyle()`. Font, ukuran, dan jarak tercatat di `docs/design-tokens-terverifikasi.md`. Satu-satunya yang tidak cocok adalah angka warnanya: butir ini menulis `#1A77CC`, kode memakai `#1977cc`. Sekarang terbukti bahwa angka di butir inilah yang keliru, bukan kodenya. `v2/assets/css/main.css` di situs acuan mendeklarasikan `--accent-color: #1977cc`, dan `#1a77cc` tidak muncul satu kali pun di seluruh `main.css` maupun `style.css` miliknya. `themeColor` di `layout.tsx` memang memakai `#1a77cc`, dan itu nilai meta bukan warna aksen. Font juga terkonfirmasi: `--heading-font` di acuan adalah `"Poppins", sans-serif`, sama dengan yang dipakai repo ini, jadi penggantian Gotham ke Poppins mengikuti nilai yang mereka pakai untuk judul dan bukan perkiraan. Lihat 3.19. |
| 4 | Topbar kontak, dua tombol CTA header, dan bilah aksi cepat ada | Lulus | Ketiganya ada. Topbar kontak dari `Topbar.tsx`, dua tombol CTA header dari `HEADER_CTAS` berisi "Daftar Online" dan "Administrasi Pasien", dan bilah aksi cepat dari `QuickActionBar.tsx`. Isi bilah aksi cepat diambil dari `HEADER_CTAS` ditambah WhatsApp dari `CONTACT`, lalu setiap `href`-nya diuji dengan `hasOwnRoute()`. Lihat 3.14. |

### Fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 5 | Memilih spesialis memfilter dropdown dokter; hasil jadwal tampil dengan status memuat | Lulus | `DoctorSearchCard` punya tiga state: spesialis, dokter, hari. Memilih spesialis mengisi daftar dokter. Dipakai `<select>` bawaan, bukan `react-select` seperti PRD 8.3 menulis, karena `react-select` memang terpasang tetapi belum dipakai. Perbedaan komponen, bukan perbedaan fungsi. |
| 6 | Semua halaman bisa dijangkau lewat link; tidak ada halaman yatim dan tidak ada link mati | Lulus | `bun run cek:tautan` melaporkan 150 halaman, 150 tautan unik, dan 149 entri sitemap, tanpa tautan mati dan tanpa halaman tanpa tautan masuk. Tiga cacat yang pernah ada sudah ditutup: 18 halaman brosur dulu yatim karena `BrosurDirectory` hanya merender panel kategori yang sedang aktif, dan dua URL ganda diduplikasi. Lihat 3.8. |
| 7 | Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB | Lulus | PR #34 upstream menyambungkan formulir ke endpointnya. `registration-form.tsx` mengambil dokter dari `GET /api/v1/doctors`, mengambil slot jam dari `GET /api/v1/schedules`, lalu mengirim `POST /api/v1/appointments` dengan `schedule_id`. Nomor antrean dikembalikan dan ditampilkan ke pengguna. Penghitung kuota memakai `INSERT ... ON CONFLICT DO UPDATE ... RETURNING taken` di dalam transaksi, jadi dua permintaan bersamaan tidak mendapat nomor yang sama, dan unique index `(doctor_id, visit_date, queue_number)` jadi pengaman kedua. Bukti tegen database sungguhan: `db:migrate`, `db:seed`, dan `cek:tulis` dijalankan pada PostgreSQL 17.11 lokal, dan pendaftaran ganda ditolak dengan pesan pasien sementara kuota tidak berkurang. Lihat 3.18. |
| 8 | Form menolak input tidak valid di sisi server dan tahan terhadap spam sederhana | Lulus | Sisi server lengkap: `src/server/validation.ts` dipakai route appointments, honeypot dan rate limit dijalankan `src/server/api/form.ts` sebelum validasi. Sekarang jalur itu benar-benar dipakai pengunjung, karena formulir sudah mengirim datanya (lihat butir 7). Penghitung rate limit dikosongkan setelah formulir tersimpan, dan ada tesnya: `tests/form-rate-limit.test.ts` serta `tests/registration-form.test.ts` mengunci aturan pemetaan field dan penerjemahannya. |
| 9 | Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya tampil di situs publik | Lulus | `src/lib/content-loader.ts` membaca tabel `articles` saat `API_MODE=live`, dan kembali ke `ARTICLES` saat mode snapshot atau database tidak terjangkau. Dipakai oleh `/berita`, `/berita/[slug]`, beranda, dan `sitemap.xml`. `revalidate` 60 detik pada tiga halaman itu supaya perubahan admin tidak menunggu build berikutnya, dan `dynamicParams` dibiarkan `true` supaya slug baru dari panel admin dilayani. Bukti runtime ada di 3.17: dengan `API_MODE=live` dan database yang tidak terjangkau, keempat rute tetap menjawab 200 dengan isi data statis dan 404 untuk slug asing. 27 tes di `tests/konten-loader.test.ts`, sembilan mutasi dicoba dan kesembilannya tertangkap. Halaman selain berita tetap membaca modul statis, dan itu disengaja: butir ini menyebut berita, dan isi seed database untuk dokter dan poliklinik lebih tipis daripada modul statis. Lihat 3.17. |
| 10 | Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user | Lulus | `src/server/admin/registry.ts` memetakan aksi ke peran, dan tes `tests/registry.test.ts` mengunci pemetaannya. Sekarang aturan itu juga ditegakkan di jalur HTTP, bukan hanya di backside: delapan dari empat belas route handler admin meneruskan peran ke `requireSession()`, jadi permintaan dari peran yang salah ditolak sebelum menyentuh database. Panel adminnya juga sudah ada, jadi aturannya bisa dipakai dari antarmuka. |

Catatan terbuka untuk butir 6: kedelapan belas halaman brosur dulu yatim karena
`BrosurDirectory` hanya merender panel kategori yang sedang aktif, sehingga
tautannya baru muncul setelah tab diklik. Sekarang semua panel dirender di server
dan yang tidak aktif diberi atribut `hidden`. Dua URL ganda, `/laboratorium` dan
`/radiologi`, dulu hidup berdampingan dengan `/pelayanan/diagnostik/<slug>` dan
tidak pernah ditautkan; keduanya sekarang dihapus, jadi isinya tidak lagi
diminta dua kali oleh mesin pencari.

Catatan terbuka untuk butir 10: versi sebelumnya bagian ini menulis ada enam
route admin yang tidak meneruskan peran sama sekali, termasuk `inbox/[kind]/[id]`
yang menulis tanpa pemeriksaan. Itu sudah diperbaiki. Sekarang keempat belas
route di `src/app/api/v1/admin` memanggil `requireSession()`, dan enam route yang
menulis konten atau mengelola user memakai fungsi peran (`canEditContent` atau
`canManageUsers`), bukan sekadar memeriksa sesi. `inbox/[kind]/[id]` tetap memakai
`requireSession()` tanpa peran karena route itu hanya mengubah status pesan
masuk, yang memang pekerjaan front office, dan tidak ada endpoint mana pun yang
mengubah isi pesan.

Kesemuanya dikunci `tests/peran-admin.test.ts`, termasuk urutannya: pemeriksaan
sesi harus muncul sebelum `dbOrNull()`. Urutan itu penting karena `dbOrNull()`
hanya membuka koneksi, jadi permintaan tanpa sesi tetap akan sampai ke kueri
kalau pemeriksaannya diletakkan setelahnya. Jalur itu memang tidak terlihat
selama pengujian dengan database kosong, karena `dbOrNull()` mengembalikan `null`
di mode snapshot dan menutup jalur lebih dulu.

### Non-fungsional

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 11 | Build produksi sukses tanpa error TypeScript atau lint | Lulus | Typecheck bersih, `bun run lint` bersih, `bun run build` 0 galat dan 0 peringatan. Sekarang juga dijalankan otomatis di `.github/workflows/gerbang.yml`. |
| 12 | Situs berjalan identik di Vercel dan VPS dengan hanya perbedaan environment variable | Tidak bisa dibuktikan | Hanya satu lingkungan yang pernah diuji, yaitu lokal. Kedua target memakai adapter snapshot dan adapter live, jadi perbedaan perilakunya disengaja dan belum pernah dibandingkan. Membuktikannya butuh dua lingkungan nyata. |
| 13 | Unggah gambar admin berfungsi di kedua lingkungan lewat storage adapter | Tidak diterapkan | Tidak ada fitur unggah gambar sama sekali. Admin memasukkan URL, dan `registry.ts` hanya menerima `http` dan `https`. Pemilik repo sudah memutuskan untuk tidak mengerjakannya. Lihat 3.3. |
| 14 | Lighthouse mobile: aksesibilitas minimal 90, SEO minimal 90 | Lulus | Diukur dengan Lighthouse 13.5.0 pada mode seluler dengan throttling simulasi, median dari tiga jalankan per rute. Accessibility 97 sampai 100 dan SEO 100 di enam rute: `/`, `/berita`, `/daftar-online`, `/tentang-kami`, `/jadwal-dokter`, dan `/pelayanan/mcu/reguler/paket-dasar-1`. Keduanya di atas ambang 90. Performance 64 sampai 83, jadi tidak mencapai 90; butir ini tidak meminta angka Performance, dan penyebabnya sudah terukur, yaitu CSS render-blocking 58 KiB dengan `elementRenderDelay` sekitar 1,7 detik. Dua perbaikan keluar dari audit ini: `fetchpriority="high"` pada foto yang di-preload, yang mengubah `priorityHinted` di laporan dari `false` ke `true`. Lihat 3.5. |
| 15 | Tidak ada script pihak ketiga yang aktif secara bawaan | Lulus | Pencarian `googletagmanager`, `google-analytics`, `gtag`, `sharethis`, `hotjar`, dan `clarity` di `src/` dan `next.config.ts` mengembalikan nol hasil. Embed Instagram juga tidak dipakai; seksi sosial media memakai kartu statis, sama seperti yang PRD 8.3 minta. |

### Data dan etika

| # | Butir | Verdict | Bukti atau sebab gagal |
|---|---|---|---|
| 16 | Tidak ada logo, foto, nama dokter, testimoni, atau kontak asli dari situs referensi | Lulus | Seluruh isi karangan sendiri. Foto berasal dari Unsplash dan picsum, dan keduanya terdaftar di `remotePatterns` pada `next.config.ts`. Nama dokter, testimoni, dan nomor kontak semuanya karangan; lihat `src/data/doctors.ts` dan `src/data/navigation.ts`. |

### Ringkasan

| Verdict | Jumlah | Nomor butir |
|---|---|---|
| Lulus | 13 | 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16 |
| Sebagian | 1 | 3 |
| Belum bisa dibuktikan | 1 | 12 |
| Tidak diterapkan atas keputusan pemilik | 1 | 13 |

Jumlahnya enam belas, sama dengan jumlah kotak penanda di PRD bagian 12.

Dua butir naik pada versi ini: butir 9 dan butir 14. Keduanya karena pekerjaan
yang sama-sama selesai di sesi ini, yaitu content loader berita di 3.17 dan
ukuran Lighthouse di 3.5. Butir 9 sebelumnya ditulis gagal karena tidak satu
pun halaman publik membaca dari database; sekarang `/berita`, `/berita/[slug]`,
dan beranda membacanya, dengan fallback ke modul statis saat mode snapshot.
Butir 14 sebelumnya ditulis "belum diukur" karena Lighthouse belum pernah
dijalankan; sekarang angkanya ada dan kedua ambangnya terpenuhi.

Tidak ada butir yang turun pada versi ini.

Catatan jujur soal butir 9 dan butir 14, supaya tidak dibaca lebih tinggi dari
yang mestinya. Butir 9 lulus untuk berita, bukan untuk seluruh halaman publik:
butir itu menyebut berita, dan halaman lain tetap membaca modul statis karena isi
seed database-nya lebih tipis. Butir 14 lulus pada aksesibilitas dan SEO;
Performance-nya 64 sampai 83 dan belum mencapai 90, dan butir itu tidak
meminta angka Performance.

Butir 13 dihitung terpisah karena tidak diterapkan atas keputusan pemilik,
bukan karena gagal.

Perubahan terbesar sejak versi dokumen ini adalah butir 7 dan butir 8. Keduanya
pernah gagal dengan sebab yang sama persis: backend lengkap, tapi formulirnya
tidak pernah memanggilnya. Keduanya sudah lulus setelah PR #34 upstream. Butir 7
pernah ditulis gagal karena mengukur `handleSubmit` di tree yang sudah basi,
sama seperti panel admin di 3.12.

Catatan terakhir. Dokumen ini tadinya memuat beberapa kalimat yang membaca
"belum terbukti" untuk hal yang ternyata hanya belum punya alat. Setelah
PostgreSQL lokal berhasil dijalankan pada 5 Oktober 2026, tidak ada lagi klaim
di dokumen ini yang bergantung pada database yang belum disentuh. Kalau nanti
ada kalimat serupa, periksa dulu apakah memang tidak bisa dijalankan, atau
cuma tidak ada PostgreSQL-nya di mesin itu.
