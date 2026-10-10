# Changelog

Riwayat perubahan Web-Kesehatan, **disusun otomatis dari subjek commit** pada
`main` sampai `f1ebe60` (10 Oktober 2026), lalu dirapikan. Belum ada tag atau rilis
bernomor di repo (`git tag` kosong), jadi pengelompokan per **tanggal**, bukan
per versi. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/)
secara longgar.

Cara membaca:

- **Ditambahkan**: commit berjenis `feat`, ditulis lengkap.
- **Optimasi**: commit `perf`.
- **Perbaikan**: hanya yang berlingkup keamanan, auth, a11y, dependensi, deploy,
  SEO, atau admin ditulis lengkap; sisanya dihitung saja.
- Commit `docs`, `test`, `chore`, `refactor`, `style`, `ci` hanya dihitung. Untuk
  rincian apa pun: `git log --oneline --since=<tanggal> --until=<tanggal>`.
- Subjek commit ditulis di commit asli; terjemahan atau perbaikan ejaan tidak dilakukan.

Pembaruan berkas ini: jalankan ulang pengelompokan dari `git log`, jangan menulis
tangan angka atau ringkasan di luar yang ada di riwayat. Untuk membuat versi
bernomor, tambahkan tag (`git tag -a v0.1.0 -m "..."`) lalu bagi per tag.

---

## 2026-10-10

### Ditambahkan

- **uji:** kunci build paralel supaya E2E tidak memakai `.next` setengah tulis
- **uji:** kunci build dua arah, E2E menahan kunci bertoken

### Optimasi

- **perf:** disiplin prefetch tautan di bawah lipatan, 84 ke 87
- **perf:** tutup CLS di daftar online, tambah skrip ukur performa

### Perbaikan

- **a11y:** scrim hero dikalibrasi supaya teks putih lolos 4.5:1
- **a11y:** foto dekoratif dinyatakan eksplisit, bukan cuma dikosongkan
- **a11y:** pulihkan penanda dekoratif yang tertimpa mutasi uji
- **teks:** tiga kata rusak di komentar a11y

Lainnya (hanya dihitung): docs 8, test 4, fix 2, chore 1.

## 2026-10-09

### Ditambahkan

- **deploy:** Dockerfile dan dokumentasi rilis Vercel serta VPS

### Perbaikan

- **deps:** naikkan sweetalert2 ke 11.22.4
- **deps:** naikkan swiper ke 12.2.0, sesuaikan CSS tombol navigasi
- **deploy:** Dockerfile lolos build di VPS
- **a11y:** daftarkan modul A11y di HeroSlider + tutup advisory
- **auth:** galat kata sandi tempel ke nama field yang dikirim
- **auth:** tolak ADMIN_ORIGIN http untuk host publik saat start
- **a11y:** trio temuan Lighthouse dan kunci dengan test
- dan 3 perbaikan lain (tampilan, perilaku, tes, dll.)

Lainnya (hanya dihitung): docs 17, test 4, refactor 1, chore 2, ci 1.

## 2026-10-08

### Ditambahkan

- **rawat jalan:** halaman unit, data dokter 54, daftar anak jadi kartu
- widget beranda ke API, semua tombol membawa konteks, manajemen dikelompok
- **rawat inap:** tabel, endpoint, dan formulir yang terpisah dari rawat jalan
- **rawat inap:** tampilkan permintaan inap di inbox admin
- **kapasitas bed:** tampilkan dan perbarui ketersediaan tempat tidur
- **ppid:** isi halaman PPID dengan tabel, langkah, dan angka yang konsisten
- **skm:** isi halaman survei lebih lengkap dan formulir yang benar-benar mengirim
- **wbs:** formulir pelaporan yang benar-benar mengirim ke server
- **admin:** layar akun panel
- **keamanan:** tambah tujuh header keamanan pada semua respons
- **admin:** layar pengaturan situs untuk kelompok API settings
- **admin:** tampilkan pendaftaran harian dan survei per unit di dasbor
- **mcu:** formulir pendaftaran paket MCU di halaman paket

### Perbaikan

- **keamanan:** hentikan pesan error membocorkan panjang AUTH_SECRET
- dan 5 perbaikan lain (tampilan, perilaku, tes, dll.)

Lainnya (hanya dihitung): docs 6, test 1, chore 1.

## 2026-10-07

### Ditambahkan

- dokter lengkap 30 spesialisasi, FAB menu, bungkam warning Sass

### Perbaikan

- dan 2 perbaikan lain (tampilan, perilaku, tes, dll.)

## 2026-10-06

### Ditambahkan

- gabung kerja lokal tertunda (breadcrumb tepat, seed, validasi, API)

### Optimasi

- subset font ikon, 131 KB menjadi 7,9 KB per halaman
- subset Bootstrap 5.3.3, CSS 30,4 KB menjadi 19,5 KB gzip
- sweetalert2 dimuat malas, copot react-select yang tidak dipakai

Lainnya (hanya dihitung): test 1.

## 2026-10-05

### Ditambahkan

- **konten:** sambungkan halaman berita publik ke database dan tingkatkan kepatuhan lighthouse
- **navbar:** tangga responsif satu-baris-kompak, hapus test pembatas

## 2026-10-04

### Ditambahkan

- **seo:** tambahkan peta situs XML dan robots.txt
- **admin:** kerangka, login, dan dasbor panel admin
- **admin:** kelola 17 tabel konten tanpa kode per tabel
- **admin:** inbox lima pengajuan dengan ubah status
- **seo:** adopsi peta situs sesi paralel dan perbaiki segmen grup
- **frontend:** panel brosur di server, peta situs, dan kembali ke atas
- bilah aksi cepat dan tombol kembali ke atas
- **beranda:** samakan jumlah penghargaan, asuransi, dan kepala section dengan situs referensi

### Perbaikan

- **admin:** larang indeks mesin pencari untuk halaman admin
- **seo:** kembalikan URL ganda ke daftar pengecualian sitemap
- **seo:** hentikan judul halaman generik yang menyebut nama RS dua kali
- dan 13 perbaikan lain (tampilan, perilaku, tes, dll.)

Lainnya (hanya dihitung): docs 9, test 1.

## 2026-10-03

### Ditambahkan

- **pelayanan:** tambah halaman daftar poliklinik
- **pelayanan:** lengkapkan katalog klinik, halaman detail, MCU, dan PPID
- **informasi:** halaman brosur digital dengan 21 brosur
- **db:** skema Drizzle dan dua migrasi SQL
- **server:** lapisan server untuk database, auth, dan sanitasi
- **api:** Route Handler untuk 40 endpoint di bawah /api/v1
- detail poliklinik dinamis dengan dokter dan jadwal
- **pelayanan:** lengkapkan katalog klinik, halaman detail, MCU, dan PPID
- **informasi:** halaman brosur digital dengan 21 brosur
- **pelayanan:** katalog klinik 16 tab dan 25 halaman detail
- **pelayanan:** halaman /laboratorium
- **pelayanan:** halaman /radiologi dan perbarui konten /laboratorium
- **galeri:** lightbox dengan navigasi keyboard di dua permukaan galeri
- **seo:** tambahkan gambar Open Graph untuk seluruh halaman
- **poliklinik:** tambahkan pencarian teks dan daftar dokter per klinik
- endpoint detail dokumen dan rate limit tiket
- **epasien:** kirim pendaftaran E-Pasien ke Route Handler

### Perbaikan

- **a11y:** roving tabindex dan aria-controls yang tidak menggantung
- **a11y:** kembalikan role region pada carousel agar nama section terbaca
- **a11y:** role img yang saling meniadakan di avatar
- **auth:** cabut sesi admin begitu kredensial atau hak akses berubah
- **admin:** tolak perubahan hak akses pada akun pemanggil sendiri
- **a11y:** perbaiki kontras, urutan heading, dan fokus tautan lewati
- dan 27 perbaikan lain (tampilan, perilaku, tes, dll.)

Lainnya (hanya dihitung): docs 14, test 15, refactor 5, chore 5, ci 1, build 1, revert 2, lain 1.

## 2026-10-02

### Ditambahkan

- **data:** tambahkan navigasi, konten beranda, dan kumpulan foto
- **styles:** tambahkan design token dan gaya layout global
- **styles:** tambahkan gaya section beranda dan halaman detail
- **layout:** tambahkan topbar, navbar, footer, dan kepala halaman
- **home:** bangun section beranda sesuai urutan DOM rujukan
- **pages:** tambahkan daftar berita dan halaman detail berita
- **pages:** tambahkan detail layanan prioritas dan paket MCU
- **pages:** tambahkan halaman umum dan 404 agar tidak ada tautan mati
- **forms:** tambahkan formulir pendaftaran online dengan validasi klien
- **pages:** tambahkan halaman 404, 500, dan penangkap error global
- **home:** ubah lima section kartu menjadi carousel Swiper
- **data:** tambah isi untuk klinik, halaman detail, profil, dan manajemen
- **pelayanan:** tambah sidebar detail, direktori klinik, dan avatar anime
- **pelayanan:** tambah halaman poliklinik, medis, diagnostik, dan profil
- **topbar:** beri nama yang bisa dibacakan layar pada tiap tautan kontak
- **home:** ubah lima section kartu menjadi carousel Swiper
- **data:** tambah isi untuk klinik, halaman detail, profil, dan manajemen
- **pelayanan:** tambah sidebar detail, direktori klinik, dan avatar anime
- **pelayanan:** tambah halaman poliklinik, medis, diagnostik, dan profil
- **topbar:** beri nama yang bisa dibacakan layar pada tiap tautan kontak

### Perbaikan

- **a11y:** tambahkan judul utama tersembunyi di beranda
- dan 6 perbaikan lain (tampilan, perilaku, tes, dll.)

Lainnya (hanya dihitung): docs 7, test 3, refactor 5, chore 8, style 2.

## 2026-09-29

Lainnya (hanya dihitung): lain 1.

## 2026-09-25

Lainnya (hanya dihitung): docs 1.

## 2026-09-22

Lainnya (hanya dihitung): docs 1.

## 2026-09-21

Lainnya (hanya dihitung): lain 5.
