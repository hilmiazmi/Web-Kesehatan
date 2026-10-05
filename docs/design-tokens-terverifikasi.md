# Design Tokens — Terverifikasi Langsung dari Situs Referensi

> Status: ✅ **terverifikasi**, bukan estimasi.
> Cara: `getComputedStyle()` pada elemen yang hidup di
> `https://rsudpasarminggu.jakarta.go.id/`, diambil 2 Oktober 2026.
> Sumber CSS: `main.css` (37.878 byte) + `style.css` (11.667 byte).

PRD bagian 8.1 dan 13.4 menandai token ini sebagai `⚠ belum terverifikasi`.
Dokumen ini menutup celah tersebut. **Jangan menebak angka di bawah — semuanya
hasil pengukuran.**

## Cara verifiable ulang tanpa peramban

Pengukuran di atas memakai peramban. Sejak 5 Oktober 2026 sebagian angka bisa
dicek ulang dengan membaca stylesheet acuan langsung, karena `curl` berhasil
pada host tersebut:

```bash
curl -s https://rsudpasarminggu.jakarta.go.id/v2/assets/css/main.css > main.css
curl -s https://rsudpasarminggu.jakarta.go.id/v2/assets/css/style.css > style.css
```

Yang terkonfirmasi begitu:

- `--accent-color: #1977cc` di `main.css`, dengan komentar resmi mereka sendiri.
  `#1A77CC` tidak ada di kedua berkas, jadi angka di PRD bukan warna aksen.
  Judul repo memakai Poppins, sama persis dengan nilai mereka. Yang berbeda
  adalah body dan navigasi: mereka memakai `Roboto` dan `Raleway`, sedangkan
  repo memakai Poppins untuk keduanya. Itu keputusan, bukan pengukuran.
- `bootstrap.min.css` milik mereka 232.803 byte, sama dengan `bootstrap@5.3.3`
  di npm.

Angka yang **tidak** ada di CSS mereka, dan tetap harus diukur lewat peramban:
tinggi hero `303px`, lebar `.navmenu` `894px`, dan angka lain yang muncul dari
`getBoundingClientRect()`. Rincian dan alasannya ada di bagian 3.19
`docs/roadmap.md`.

---

## 1. Warna

| Token | Nilai terverifikasi | Sumber |
|---|---|---|
| Warna aksen (CSS asli) | **`#1977cc`** | `--accent-color` |
| Warna aksen (meta tag) | `#1A77CC` | `<meta name="theme-color">` |
| Background body | `#FFFFFF` | `body` |
| Background section terang | **`#F1F7FC`** | `.light-background` |
| Teks body | `#444444` | `body` |
| Teks heading | `#000000` | `h1..h6` (ada `!important`) |
| Teks link navigasi | `#2C4964` | `#navmenu > ul > li > a` |

### ⚠ Dua warna utama berbeda — ini Attention

PRD menyebut `#1A77CC`, dan itu memang benar untuk `theme-color` di `<head>`.
Tapi warna yang **benar-benar dipakai CSS** adalah **`#1977cc`**.

Untuk pixel-match, pakai **`#1977cc`**. Nilai `#1A77CC` hanya untuk meta tag
di browser chrome.

---

## 2. Tipografi

Situs memakai **dua font**, keduanya `@font-face` di-inline di `<head>`:

```css
@font-face { font-family: 'Gotham';        font-weight: 700; }  /* heading bold */
@font-face { font-family: 'Gotham Rounded'; font-weight: 400; }  /* body */
```

| Elemen | Font | Ukuran | Weight | Line-height | Warna |
|---|---|---|---|---|---|
| `body` | Gotham Rounded | `16px` | 400 | `24px` | `#444` |
| `h1`–`h6` | Gotham | — | — | — | `#000` |
| `.section-title h2` | Gotham | **`42px`** | **500** | `50.4px` | `#000` |
| `.section-title p` | Gotham Rounded | `16px` | 400 | `24px` | `#444` |
| `#navmenu > ul > li > a` | Gotham | **`15px`** | **700** | `22.5px` | `#2C4964` |
| `.btn-daftar` / `.btn-tertiary` | Gotham Rounded | `14px` | 400 | `21px` | — |
| `.topbar` | Gotham Rounded | `14px` | 400 | `21px` | `#FFF` |

`.section-title h2` punya `padding-bottom: 20px`.

### ⚠ Gotham tidak boleh disalin

`Gotham` dan `Gotham Rounded` adalah font **komersial berlisensi** (Hoefler&Co).
File `.otf` aslinya **tidak boleh** masuk ke repo publik — ini pelanggaran
lisensi, terpisah dari masalah etika data yang sudah dibahas di PRD bagian 13.

Pilihan yang aman: pakai font gratis dengan **metrik dan rasa visual paling dekat**.
Rekomendasi (bold = heading, regular = body):

| Opsi | Kesan | Catatan |
|---|---|---|
| **Poppins** | Geometris, bulat, sangat dekat dengan Gotham Rounded | Pilihan utama |
| **Nunito Sans** | Mirip Poppins, sedikit lebih netral | Sudah dipakai situs untuk satu stylesheet |
| **Inter** | Netral, sangat legibility | Fallback kalau mau kesan lebih modern |

Hindari Montserrat untuk body:uskup lebih lebar dan sedikit lebih tegas dari
Gotham, jadi rasa "lebih besar" dari aslinya.

---

## 3. Komponen

| Komponen | Nilai terverifikasi |
|---|---|
| Radius tombol | **`50px`** (pill, bukan `0.25rem` default Bootstrap) |
| Padding tombol | **`8px 25px`** |
| Tombol primary | bg `#1977cc`, teks `#FFFFFF` |
| Tombol secondary | bg `#FFFFFF`, teks `#1977cc` |
| Radius tombol lain | `unset` (kelas `.btn-flat`) |
| Padding section | `60px 0` |
| Ikon navbar | Bootstrap Icons (`bi bi-chevron-down` / `chevron-right`) |

---

## 4. Struktur halaman (terverifikasi via DOM)

- **13 section** di `main`, urutan persis:

| # | `id` | Class | `h2` |
|---|---|---|---|
| 1 | — | `slider section p-0` | — (hero slider) |
| 2 | `cariDokter` | `dokter section pb-3` | — (card "Cari Jadwal Dokter") |
| 3 | `layanan` | `layanan section pb-3` | Layanan Unggulan & Prioritas |
| 4 | `departments` | `departments section light-background` | Fasilitas & Layanan |
| 5 | `mcu` | `mcu section pb-3` | Paket MCU & Promosi |
| 6 | `berita` | `berita section pb-3 light-background` | Berita dan Artikel Kesehatan |
| 7 | `services` | `penghargaan section` | Akreditasi & Penghargaan |
| 8 | `gallery` | `gallery section light-background` | Gallery |
| 9 | `pendaftaran` | `pendaftaran section` | Pendaftaran |
| 10 | `about` | `about section light-background` | Sosial Media |
| 11 | `testimonials` | `testimonials section` | — (Patient Experience) |
| 12 | `services` | `penghargaan section light-background` | Asuransi |
| 13 | `faq` | `faq section light-background` | Frequently Asked Questions |

> Catatan: `id="services"` dipakai **dua kali** (Akreditasi dan Asyaratan).
> Itu bug di situs aslinya. Di proyek ini, pakai `id` unik: `akreditasi` dan `asuransi`.

- **Jumlah item terverifikasi:** 30 spesialis · 83 dokter · 8 paket MCU (reguler)
  · 16 kartu berita · 4 foto galeri · 9 FAQ
- **Navbar:** 11 item level-1, dropdown sampai **3 tingkat**
  (Pelayanan → MCU → Paket Reguler → isi paket)

---

## 5. Template asal

`main.css` berheader:

```
Template Name: Medilab
Template URL: https://bootstrapmade.com/medilab-free-medical-bootstrap-theme/
Updated: Aug 07 2024 with Bootstrap v5.3.3
License: https://bootstrapmade.com/license/
```

Artinya seluruh styling asli diturunkan dari **BootstrapMade "Medilab"**
di atas Bootstrap 5.3.3. Banner `bootstrapmade.com` **tidak ikut disalin**.

BootstrapMade menyediakan lisensi free untuk proyek yang **tidak** dijual ulang.
Kalau proyek iniuislater dijual, license key berbayar perlu dibeli.

---

## 6. Yang TIDAK bisa ditiru

| Aset | Alasan | Pengganti di proyek ini |
|---|---|---|
| Logo RSUD PM | Logo instansi pemerintah | Logo SVG buatan sendiri |
| Foto slider, layanan, fasilitas, berita | Hak cipta foto + foto orang nyata | Placeholder SVG/gradient |
| Nama dokter (~83 orang) | Data pribadi orang nyata | Nama fiktif (PRD bagian 9) |
| Testimoni pasien | Data pribadi + foto orang | Teks karangan sendiri |
| Foto instagram/yt embed | Embed pihak ketiga dan aset nyata | Kartu placeholder statis |
| Font Gotham / Gotham Rounded | Lisensi komersial | Poppins (lihat bagian 2) |

Semua ini konsisten dengan aturan PRD bagian 12 Acceptance Criteria:
> "Tidak ada logo, foto, nama dokter, testimoni, atau kontak asli dari situs
> referensi di repo maupun database."

---

## 7. Catatan mencurigakan dari situs aslinya

Ditemukan saat inspeksi, tidak disengaja:

1. Section **"Sosial Media" kosong** di halaman live — iframe Instagram tidak
   termuat (kemungkinan diblokir atau sudah mati). Mustahil ditiru; pakai placeholder.
2. `id="services"` duplikat (lihat bagian 4).
3. Nilai warna utama berbeda antara CSS (`#1977cc`) dan meta tag (`#1A77CC`).
4. `[Image 1]` dan `[Image 2]` menandai "100% identik" — **tidak realistis dan tidak
  -etis.** Aset asli (foto dokter, logo, testimoni) tidak bisa dan tidak boleh
   disalin. YangDim dicapai: **struktur, urutan, layout, dan nilai desain identik;
   konten diganti placeholder** — sesuai PRD sendiri.