# PRD — Website Rumah Sakit (Referensi: RSUD Pasar Minggu)

> **Legenda status verifikasi** (dipakai di seluruh dokumen)
> - ✅ = terverifikasi langsung dari situs referensi (halaman Home, Jadwal Dokter, Kapasitas Bed, Daftar Online) dan screenshot Wappalyzer
> - ⚠️ = **asumsi / diturunkan dari pola navigasi**, isi halamannya belum diperiksa → wajib divalidasi manual sebelum dikerjakan

## Daftar Isi
1. Overview
2. Requirements
3. Core Features
4. Sitemap & Inventaris Halaman
5. User Flow
6. Architecture
7. Database Schema
8. Design & Technical Constraints
9. Inventaris Konten (Seed Data Dummy)
10. Deployment & Environment
11. Roadmap
12. Acceptance Criteria
13. Out of Scope, Risiko, dan Catatan Verifikasi

---

## 1. Overview

Proyek ini membangun **website profil dan layanan rumah sakit pemerintah daerah** yang meniru struktur, alur navigasi, dan pengalaman pengguna (UI/UX) dari situs RSUD Pasar Minggu (`rsudpasarminggu.jakarta.go.id`). Situs referensi adalah portal rumah sakit tipe B yang menggabungkan: profil institusi, katalog layanan, pencarian jadwal dokter, paket Medical Check Up (MCU), berita, informasi publik/zona integritas, serta jalur pendaftaran online.

**Masalah yang diselesaikan (versi proyek ini):**
- Calon pasien sulit menemukan layanan, jadwal dokter, dan cara mendaftar di satu tempat.
- Informasi publik (berita, penghargaan, regulasi, karir) tersebar dan tidak terstruktur.
- Perlu bukti implementasi *full-stack* modern: Next.js + PostgreSQL, dengan *dual deployment* (Vercel dan VPS pribadi).

**Tujuan utama:**
1. Mereplikasi tampilan dan alur situs referensi sedekat mungkin (layout, urutan section, pola navigasi multi-level, komponen interaktif).
2. Seluruh konten **dinamis dibaca dari database PostgreSQL** (bukan hardcode), sehingga bisa dikelola lewat panel admin.
3. Satu *codebase* yang bisa dideploy ke **Vercel** dan **VPS** tanpa mengubah kode (hanya mengubah environment variable).

**Keputusan identitas (penting):**
Karena ini replika untuk keperluan belajar/portofolio, proyek memakai **nama rumah sakit fiktif** yang bisa diganti lewat konfigurasi (`site_settings`). Logo resmi, foto, nama dokter nyata, testimoni pasien nyata, dan nomor kontak nyata dari situs referensi **tidak disalin** (lihat bagian 13).

| Item | Nilai default di proyek ini |
|---|---|
| Nama RS | `RSUD Contoh Sehat` (placeholder, ubah via `site_settings`) |
| Tagline | `Rumah Sehat Untuk Semua` (padanan dari tagline referensi) |
| Warna utama | `#1A77CC` ✅ (nilai `theme-color` pada meta situs referensi) |

---

## 2. Requirements

Persyaratan tingkat tinggi:

- **Aksesibilitas:** web responsif (mobile-first). Referensi memakai viewport `width=device-width, initial-scale=1.0` ✅ dan Bootstrap ✅, sehingga tampilan mobile dan desktop harus sama-sama utama.
- **Pengguna:**
  - **Pengunjung/Calon Pasien** (publik, tanpa login).
  - **Admin** (login) dengan peran: `super_admin`, `editor`, `front_office`.
- **Bahasa:** Bahasa Indonesia (referensi tidak menunjukkan pilihan bahasa lain ✅).
- **Data:** seluruh data pasien/pendaftaran adalah **data dummy**. Dilarang menyimpan data kesehatan nyata.
- **Stack wajib:** Next.js (App Router), PostgreSQL, deploy ganda Vercel + VPS.
- **Stack referensi yang terdeteksi (Wappalyzer)** ✅: Bootstrap, jQuery 3.7.1, Select2, SweetAlert2, Swiper, GSAP 3.12.5, Font Awesome, Bootstrap Icons, Google Font API, ResponsiveVoice 1.8.4, Google Analytics (GA4), Google Tag Manager, ShareThis, Cloudflare, cdnjs, HTTP/2, Open Graph.
- **SEO:** metadata per halaman (title, description, keywords, Open Graph, Twitter card) — referensi memakai pola `"<Judul Halaman> | <Nama RS> - <Tagline>"` ✅.
- **Konten dinamis di-load tanpa reload:** dropdown dokter bergantung pada spesialis, jadwal dimuat via request (referensi menampilkan teks "Sedang memuat jadwal..." ✅).

---

## 3. Core Features

Fitur dikelompokkan dari yang paling sederhana ke yang paling kompleks (sesuai urutan pengerjaan).

### P0 — Situs Statis Berbasis Konten (fondasi)
1. **Layout global**: topbar kontak, navbar multi-level, footer, tombol back-to-top.
2. **Halaman Home** dengan 15 section (rincian di bagian 8.3).
3. **Halaman konten** (profil, manajemen, aula, budaya keselamatan, dll.) yang dirender dari tabel `pages`.
4. **Halaman detail template**: layanan prioritas, fasilitas, paket MCU, berita.
5. **Galeri** dengan lightbox.

### P1 — Fitur Interaktif Berbasis Database
6. **Cari Jadwal Dokter** ✅ — filter Spesialis → Dokter → Hari; hasil dimuat dinamis.
7. **Informasi Kapasitas Bed** ✅ — tabel ketersediaan ruang rawat inap (data diperbarui admin).
8. **Berita & Artikel** — daftar, pagination, halaman detail, tombol bagikan.
9. **FAQ accordion** (9 pertanyaan pada referensi ✅).
10. **Pencarian poliklinik** dan daftar dokter per poliklinik ⚠️.

### P2 — Form dan Transaksi (dummy)
11. **Daftar Online (E-Pasien)** — simulasi pendaftaran berobat: pilih dokter, tanggal, jenis pembayaran → nomor antrean → modal konfirmasi (gaya SweetAlert).
12. **Registrasi MCU** ✅ (link ada di halaman Daftar Online) — form pemesanan paket MCU.
13. **Kritik & Saran / Pengaduan** ✅ (link `crm/saran`) — form + status tiket.
14. **WBS (Whistleblowing System)** ✅ (link `e-apps/wbs`) — form laporan, opsi anonim, kode tiket.
15. **Survei Kepuasan Masyarakat** ✅ — form penilaian layanan.
16. **Karir** ✅ — daftar lowongan dan detail.

### P3 — Panel Admin (CMS)
17. Login admin, manajemen: dokter, spesialis, jadwal, layanan/fasilitas, paket MCU, berita, penghargaan, galeri, hero slider, testimoni, asuransi, FAQ, kapasitas bed, lowongan, dokumen, pengaturan situs.
18. Inbox: pendaftaran pasien, registrasi MCU, kritik-saran, laporan WBS, respons survei.

### P4 — Pelengkap (opsional)
19. Fitur **baca-nyaring (text-to-speech)** — kemungkinan fungsi ResponsiveVoice pada referensi ⚠️ (tidak terlihat tombolnya pada data yang diambil).
20. Analytics (GA4) — dinonaktifkan default untuk proyek dummy.

---

## 4. Sitemap & Inventaris Halaman

Total **±30 template halaman** (jauh di atas target 25 halaman), dengan ratusan URL jika detail dihitung.

### 4.1 Struktur Navigasi (navbar) ✅
```
Home
Tentang Kami
 ├─ Profile RS
 └─ Manajemen
Pelayanan
 ├─ Poliklinik
 ├─ Layanan Prioritas
 │    ├─ Jantung Terpadu · Kanker Terpadu · Medical Check Up
 │    └─ Stroke Terpadu · Uro Nefrologi · Maternal Center
 ├─ Layanan Diagnostik
 │    ├─ Laboratorium
 │    └─ Radiologi
 ├─ Layanan Medis
 │    ├─ Instalasi Gawat Darurat · Rawat Jalan
 │    └─ Rawat Inap · Rawat Inap Khusus
 └─ MCU
      ├─ Paket Reguler (8 paket)
      └─ Paket Health Meets Holiday (5 paket)
Informasi Publik
 ├─ Survey Kepuasan Masyarakat
 ├─ Standar Pelayanan · Kompensasi Pelayanan · Pengaduan Masyarakat
 ├─ Fasilitas → Aula
 ├─ Karir
 ├─ Brosur Digital Sobat Sehat
 └─ Budaya Keselamatan
Zona Integritas
 ├─ Video Zona Integritas · WBS
 └─ Regulasi Zona Integritas · Foto Kegiatan
PPID
Diklat
 ├─ Kemahasiswaan · Penelitian · Kaji Banding
Kapasitas Bed
[Tombol] Daftar Online    [Tombol] Administrasi Pasien
```

### 4.2 Tabel Route

| # | Route | Halaman | Sumber data | Status |
|---|---|---|---|---|
| 1 | `/` | Home | banyak tabel | ✅ |
| 2 | `/about` | Profil RS | `pages` | ⚠️ |
| 3 | `/manajemen` | Manajemen/Struktur | `management_members` | ⚠️ |
| 4 | `/poliklinik` | Daftar poliklinik | `polyclinics` | ⚠️ |
| 5 | `/layanan/[slug]` | Detail layanan prioritas (×6) | `services` (type=`priority`) | ✅ URL |
| 6 | `/laboratorium` | Layanan lab | `pages` / `services` | ⚠️ |
| 7 | `/radiologi` | Layanan radiologi | `pages` / `services` | ⚠️ |
| 8 | `/fasilitas/[slug]` | Detail fasilitas/layanan medis (×8) | `services` (type=`facility`) | ✅ URL |
| 9 | `/mcu/[slug]` | Detail paket MCU (×13) | `mcu_packages` | ✅ URL |
| 10 | `/jadwal-dokter` | Cari jadwal dokter | `doctors`, `doctor_schedules` | ✅ |
| 11 | `/register` | Pilihan cara daftar online | statis | ✅ |
| 12 | `/e-pasien` | Form pendaftaran (dummy) | `appointments` | ✅ URL, ⚠️ isi |
| 13 | `/registrasi-mcu` | Registrasi MCU | `mcu_registrations` | ✅ URL |
| 14 | `/administrasi` | Info administrasi pasien | `pages` | ⚠️ |
| 15 | `/kapasitasbed` | Ketersediaan ruang rawat inap | `bed_capacity` | ✅ |
| 16 | `/berita` + `/berita/[slug]` | Daftar & detail berita | `articles` | ✅ URL detail |
| 17 | `/survey-kepuasan-masyarakat` | Survei SKM | `survey_responses` | ✅ URL |
| 18 | `/aula` | Fasilitas aula | `pages` | ✅ URL |
| 19 | `/karir` | Lowongan | `job_vacancies` | ✅ URL |
| 20 | `/brosur-digital-sobat-sehat` | Brosur digital | `documents` | ✅ URL |
| 21 | `/budaya-keselamatan` | Budaya keselamatan | `pages` | ✅ URL |
| 22 | `/regulasi-zona-integritas` | Regulasi ZI | `documents` | ✅ URL |
| 23 | `/foto-kegiatan` | Galeri kegiatan ZI | `gallery_items` | ✅ URL |
| 24 | `/wbs` | Whistleblowing | `wbs_reports` | ✅ URL |
| 25 | `/ppid` | Portal PPID | `pages` + `documents` | ✅ URL |
| 26 | `/kemahasiswaan` | Info kemahasiswaan | `pages` | ✅ URL |
| 27 | `/penelitian` | Info penelitian | `pages` | ✅ URL |
| 28 | `/kaji-banding` | Info kaji banding | `pages` | ✅ URL |
| 29 | `/kritik-saran` | Kritik & saran | `feedbacks` | ✅ URL |
| 30 | `/dokumen/[slug]` | Standar Pelayanan, Kompensasi, Pengaduan | `documents` | ✅ (di referensi berupa link Google Drive) |
| 31 | `/penghargaan`, `/galeri` | Halaman lengkap (di referensi hanya section Home) | `awards`, `gallery_items` | ⚠️ opsional |
| 32 | `/admin/*` | Panel admin | semua | — |
| 33 | `/404`, `/sitemap.xml`, `/robots.txt` | Sistem | — | — |

> **Catatan:** di referensi, beberapa menu mengarah ke layanan eksternal (Google Drive, YouTube, Linktree, aplikasi JAKSEHAT/JKN di Play Store). Pada proyek ini, yang bisa dibuat lokal dibuat lokal (halaman dokumen dummy); yang memang aplikasi pihak ketiga (JAKSEHAT, JKN) tetap berupa **link keluar**.

---

## 5. User Flow

### 5.1 Calon pasien mencari jadwal dokter ✅
1. Dari Home (kartu "Cari Jadwal Dokter") atau menu footer **Jadwal Dokter**.
2. Pilih **Spesialis** → dropdown **Dokter** terisi sesuai spesialis.
3. Pilih **Pilihan Hari**.
4. Sistem menampilkan jadwal (loading state "Sedang memuat jadwal...").
5. Pengguna menekan **Daftar Online** untuk lanjut ke pendaftaran.

### 5.2 Pendaftaran online (dummy)
1. Buka `/register` → pilih jalur: **JAKSEHAT** (link keluar), **JKN** (link keluar), **E-Pasien** (form internal), atau **Registrasi MCU**.
2. Di E-Pasien: isi data diri (dummy), pilih poliklinik/dokter, tanggal kunjungan, jenis pembayaran (Umum/BPJS/Asuransi).
3. Sistem validasi, menyimpan `appointments`, membuat **nomor antrean**.
4. Modal sukses menampilkan nomor antrean dan ringkasan.

### 5.3 Memilih paket MCU
Home → section **Paket MCU & Promosi** → **Detail** → halaman paket → tombol **Registrasi MCU** → form → konfirmasi.

### 5.4 Membaca berita
Home (section Berita) → **Baca Selengkapnya** → detail berita → tombol bagikan → kembali ke daftar.

### 5.5 Menyampaikan pengaduan ✅
Footer (Kritik & Saran / Media Pengaduan) → form → kode tiket → status bisa dicek ulang.

### 5.6 Admin
Login → dashboard (ringkasan jumlah pendaftaran, pesan masuk) → kelola konten → simpan → perubahan langsung tampil di situs publik (revalidate).

---

## 6. Architecture

### 6.1 Pemetaan teknologi: referensi → proyek ini

| Teknologi referensi ✅ | Fungsi di situs referensi | Padanan di proyek (Next.js) | Catatan |
|---|---|---|---|
| Bootstrap | Grid, komponen, navbar, utilitas | **Bootstrap 5 (SCSS)** via paket `bootstrap` (+ `react-bootstrap` bila perlu) | Dipilih agar grid, breakpoint, dan perilaku komponen identik dengan referensi. Jangan campur dengan Tailwind. |
| jQuery 3.7.1 | Manipulasi DOM, plugin | **Tidak dipakai** | Digantikan React state. Jangan memasukkan jQuery ke Next.js. |
| Select2 | Dropdown yang bisa dicari (Spesialis/Dokter) | `react-select` | Perilaku *searchable select* sama. |
| SweetAlert2 | Modal notifikasi sukses/gagal | `sweetalert2` | Framework-agnostic, aman di React (panggil dari event handler/client component). |
| Swiper | Slider hero, kartu, logo | `swiper` (komponen React) | Dipakai di: hero, MCU, berita, penghargaan, testimoni, asuransi. |
| GSAP 3.12.5 | Animasi scroll/transisi | `gsap` + `@gsap/react` | Hanya di client component. Cek ketentuan lisensi plugin yang dipakai. |
| Font Awesome, Bootstrap Icons | Ikon | `@fortawesome/react-fontawesome` atau `react-icons` | Pilih satu agar bundle kecil. |
| Google Font API | Font web | `next/font/google` | Di-host sendiri saat build (lebih cepat). |
| ResponsiveVoice 1.8.4 | Text-to-speech ⚠️ | Web Speech API (`speechSynthesis`) bawaan browser | Tanpa API key/lisensi pihak ketiga. |
| GA4 + Google Tag Manager | Analitik | `@next/third-parties` (opsional) | Default **off**. |
| ShareThis | Tombol bagikan | Tombol bagikan sendiri (link WhatsApp/FB/X + Web Share API) | Hindari script pihak ketiga. |
| Cloudflare, cdnjs | CDN | Vercel Edge Network; (opsional) Cloudflare di depan VPS | Library di-bundle via npm, bukan CDN. |
| HTTP/2 | Protokol | Otomatis di Vercel; aktifkan di Nginx pada VPS | — |
| Open Graph | Pratinjau sosial | **Next.js Metadata API** | — |
| Backend (tidak terdeteksi) | Rendering "0.1 detik", struktur `/FILEAPPS/WEB/...` ⚠️ | Next.js Route Handlers / Server Actions + ORM | Backend referensi tidak dapat dipastikan dari data yang ada. |

**Pilihan tambahan (rekomendasi, bisa diganti):**
- **ORM:** Prisma (migrasi + seed lebih rapi untuk tugas kuliah). Alternatif: Drizzle (lebih ringan di serverless).
- **Validasi:** Zod (skema dipakai ulang di form dan API).
- **Auth admin:** Auth.js (Credentials) atau sesi buatan sendiri dengan hash `argon2`/`bcrypt`.
- **Penyimpanan file:** lewat *storage adapter* (lihat 6.3).

### 6.2 Arsitektur dual deploy

```mermaid
flowchart LR
    DEV["Developer (Arch Linux)"] -->|git push| GH["GitHub Repository"]
    GH -->|"Integrasi otomatis"| VC["Vercel (Serverless / Edge)"]
    GH -->|"CI: build lalu deploy"| VPS["VPS: Docker + Nginx"]

    VC --> DB1[("PostgreSQL untuk Vercel")]
    VPS --> DB2[("PostgreSQL untuk VPS")]

    VC --> OBJ["Object Storage (gambar & dokumen)"]
    VPS --> OBJ

    USER1["Pengunjung"] --> VC
    USER2["Pengunjung"] --> VPS
```

### 6.3 Keputusan arsitektur untuk dual deploy

Ini bagian yang paling mudah salah, jadi dicatat eksplisit:

| Isu | Penjelasan | Keputusan |
|---|---|---|
| **Database** | Vercel menjalankan fungsi *serverless*; tiap eksekusi bisa membuka koneksi baru ke Postgres sehingga koneksi cepat habis tanpa *pooler*. | **Opsi A (default, paling sederhana):** DB terpisah per deployment (Postgres di VPS untuk VPS; Postgres terkelola atau DB kecil untuk Vercel), **di-seed dari skrip yang sama** sehingga isi awal identik. **Opsi B:** satu DB bersama (mis. Postgres terkelola) yang diakses keduanya lewat TLS + connection pooling. Opsi B membuat data selalu sama, tetapi menambah kerumitan jaringan dan keamanan. Untuk data dummy, **gunakan Opsi A**. |
| **Upload file** | Filesystem Vercel bersifat sementara dan tidak persisten. Referensi menyimpan aset di folder lokal (`/FILEAPPS/WEB/...`) ⚠️, pola yang **tidak bisa ditiru mentah-mentah** di Vercel. | Buat **storage adapter**: `STORAGE_DRIVER=local` (VPS: folder volume) atau `STORAGE_DRIVER=s3` (Vercel: bucket kompatibel S3 / Vercel Blob). Kode aplikasi hanya memanggil `storage.put()` dan `storage.url()`. |
| **Build mode** | VPS perlu server Node. | Tambah `output: "standalone"` di `next.config` untuk image Docker ringan. Vercel mengabaikan setting ini dengan aman. |
| **Optimasi gambar** | `next/image` di VPS memerlukan `sharp`. | Pastikan `sharp` terinstal di image Docker. |
| **Cache/ISR** | Cache `revalidate` di VPS tersimpan per instance. | Cukup untuk 1 instance. Jangan skala horizontal tanpa cache bersama. |
| **Konfigurasi** | Perbedaan antar lingkungan tidak boleh ada di kode. | Semua lewat environment variable (bagian 10). |

### 6.4 Sequence: Cari Jadwal Dokter

```mermaid
sequenceDiagram
    participant U as Pengunjung
    participant P as Halaman Jadwal Dokter
    participant API as Route Handler API
    participant DB as PostgreSQL

    Note over U,DB: Filter Spesialis, Dokter, dan Hari

    U->>P: Buka halaman jadwal dokter
    P->>API: GET /api/specialties
    API->>DB: Ambil daftar spesialis
    DB-->>API: 30 spesialis (data seed)
    API-->>P: Daftar spesialis
    U->>P: Pilih spesialis
    P->>API: GET /api/doctors?specialty=slug
    API->>DB: Ambil dokter berdasarkan spesialis
    DB-->>API: Daftar dokter
    API-->>P: Dropdown dokter terisi
    U->>P: Pilih dokter dan hari
    P-->>U: Tampilkan status memuat jadwal
    P->>API: GET /api/schedules?doctor=id&day=n
    API->>DB: Ambil jadwal praktik
    DB-->>API: Baris jadwal
    API-->>P: JSON jadwal
    P-->>U: Tampilkan tabel jadwal
```

### 6.5 Sequence: Pendaftaran Online (dummy)

```mermaid
sequenceDiagram
    participant U as Pengunjung
    participant F as Form E-Pasien
    participant S as Server Action
    participant DB as PostgreSQL

    U->>F: Isi data, pilih dokter dan tanggal
    F->>F: Validasi sisi klien (Zod)
    F->>S: Kirim data pendaftaran
    S->>S: Validasi ulang, cek rate limit dan honeypot
    S->>DB: Hitung antrean hari itu untuk dokter
    DB-->>S: Jumlah antrean saat ini
    S->>DB: Simpan appointment dengan nomor antrean baru
    DB-->>S: Konfirmasi tersimpan
    S-->>F: Kembalikan nomor antrean
    F-->>U: Modal sukses berisi nomor antrean
```

---

## 7. Database Schema

PostgreSQL, dikelola lewat migrasi ORM. Kunci primer memakai `uuid` (atau `serial`, sesuai selera) dan semua tabel punya `created_at`/`updated_at`.

### 7.1 ERD

```mermaid
erDiagram
    specialties {
        uuid id PK
        string name
        string slug
    }

    doctors {
        uuid id PK
        uuid specialty_id FK
        string full_name
        string photo_url
        boolean is_active
    }

    polyclinics {
        uuid id PK
        string name
        string slug
        text description
        string location
    }

    doctor_schedules {
        uuid id PK
        uuid doctor_id FK
        uuid polyclinic_id FK
        int day_of_week
        time start_time
        time end_time
        int quota
    }

    appointments {
        uuid id PK
        uuid doctor_id FK
        string patient_name
        date birth_date
        string phone
        string email
        date visit_date
        string payment_type
        int queue_number
        string status
        datetime created_at
    }

    mcu_packages {
        uuid id PK
        string slug
        string name
        string category
        text summary
        text description
        decimal price
        string image_url
    }

    mcu_package_items {
        uuid id PK
        uuid package_id FK
        string group_name
        string item_name
    }

    mcu_registrations {
        uuid id PK
        uuid package_id FK
        string name
        string phone
        string company_name
        date preferred_date
        string status
    }

    services {
        uuid id PK
        string type
        string slug
        string title
        string tagline
        text body
        string image_url
        int sort_order
    }

    articles {
        uuid id PK
        string slug
        string title
        text excerpt
        text body
        string cover_url
        string author
        datetime published_at
    }

    users {
        uuid id PK
        string email
        string password_hash
        string name
        string role
        datetime created_at
    }

    specialties ||--o{ doctors : "memiliki"
    doctors ||--o{ doctor_schedules : "praktik"
    polyclinics ||--o{ doctor_schedules : "lokasi"
    doctors ||--o{ appointments : "dituju"
    mcu_packages ||--o{ mcu_package_items : "berisi"
    mcu_packages ||--o{ mcu_registrations : "dipesan"
```

### 7.2 Tabel pendukung (tanpa relasi kompleks)

```mermaid
erDiagram
    pages {
        uuid id PK
        string slug
        string title
        text body_markdown
        string meta_description
    }
    management_members {
        uuid id PK
        string name
        string position
        string photo_url
        int sort_order
    }
    hero_slides {
        uuid id PK
        string title
        string image_url
        string link_url
        boolean is_active
        int sort_order
    }
    awards {
        uuid id PK
        string title
        int year
        string image_url
    }
    gallery_items {
        uuid id PK
        string title
        string image_url
        string category
        int sort_order
    }
    testimonials {
        uuid id PK
        string display_name
        string role_label
        text quote
        string photo_url
    }
    insurance_partners {
        uuid id PK
        string name
        string logo_url
        int sort_order
    }
    faqs {
        uuid id PK
        string question
        text answer
        int sort_order
    }
    bed_capacity {
        uuid id PK
        string ward_name
        string class_name
        int total_beds
        int occupied_beds
        datetime updated_at
    }
    feedbacks {
        uuid id PK
        string type
        string name
        string email
        text message
        string ticket_code
        string status
    }
    wbs_reports {
        uuid id PK
        string ticket_code
        string subject
        text description
        boolean is_anonymous
        string status
    }
    survey_responses {
        uuid id PK
        string service_unit
        jsonb answers
        int overall_score
        text comment
    }
    job_vacancies {
        uuid id PK
        string title
        string department
        text requirements
        date deadline
        boolean is_open
    }
    documents {
        uuid id PK
        string title
        string category
        string file_url
        int year
    }
    site_settings {
        string key PK
        jsonb value
    }
```

### 7.3 Ringkasan tabel

| Tabel | Fungsi | Section/halaman yang memakainya |
|---|---|---|
| `specialties`, `doctors`, `doctor_schedules`, `polyclinics` | Data dokter dan jadwal | Home (widget jadwal), `/jadwal-dokter`, `/poliklinik` |
| `services` | Layanan prioritas (`type=priority`), fasilitas (`facility`), diagnostik (`diagnostic`). Satu tabel dengan kolom `type` agar sederhana; URL tetap dibedakan `/layanan/*` dan `/fasilitas/*` seperti referensi | Home, `/layanan/*`, `/fasilitas/*` |
| `mcu_packages`, `mcu_package_items`, `mcu_registrations` | Paket MCU, isi pemeriksaan, pemesanan | Home, `/mcu/*`, `/registrasi-mcu` |
| `articles` | Berita dan artikel kesehatan | Home, `/berita/*` |
| `appointments` | Pendaftaran online dummy | `/e-pasien` |
| `pages`, `management_members`, `documents` | Halaman statis, struktur manajemen, dokumen unduhan | Tentang Kami, Informasi Publik, ZI, PPID, Diklat |
| `hero_slides`, `awards`, `gallery_items`, `testimonials`, `insurance_partners`, `faqs` | Konten section Home | Home |
| `bed_capacity` | Ketersediaan bed | `/kapasitasbed` |
| `feedbacks`, `wbs_reports`, `survey_responses` | Masukan, pengaduan, survei | Kritik-Saran, WBS, SKM |
| `job_vacancies` | Lowongan | `/karir` |
| `site_settings` | Nama RS, kontak, jam operasional, sosial media, alamat | Topbar, footer, FAQ |
| `users` | Akun admin dan peran | `/admin` |

**Indeks yang wajib:** `doctors(specialty_id)`, `doctor_schedules(doctor_id, day_of_week)`, `articles(published_at DESC)`, `appointments(doctor_id, visit_date)`, serta kolom `slug` yang unik di tiap tabel yang punya slug.

---

## 8. Design & Technical Constraints

### 8.1 Design tokens

| Token | Nilai | Status |
|---|---|---|
| `--color-primary` | `#1A77CC` | ✅ (meta `theme-color`) |
| Warna sekunder/aksen, abu-abu teks, warna tombol CTA, warna background section | **Ambil dari DevTools** (Computed styles) | ⚠️ belum terverifikasi |
| Font utama | **Ambil dari DevTools.** Yang terkonfirmasi hanya penggunaan *Google Font API* ✅, nama font belum diketahui. Sementara pasang placeholder sans-serif lewat `next/font/google`. | ⚠️ |
| Ukuran heading/body, radius, bayangan, jarak | Ukur dari referensi | ⚠️ |
| Breakpoint | Ikuti Bootstrap 5 (576/768/992/1200/1400) | asumsi (karena memakai Bootstrap ✅) |

Variabel font disiapkan sebagai CSS variable agar mudah diganti setelah diverifikasi:

```css
:root {
  --font-sans: var(--font-placeholder), system-ui, sans-serif; /* ganti setelah cek DevTools */
  --font-serif: serif;
  --font-mono: ui-monospace, monospace;
}
```

### 8.2 Anatomi layout global ✅

1. **Topbar "Kontak Kami"** (latar biru): telepon, WhatsApp, email; ikon Facebook, X (Twitter), Instagram, YouTube di sisi kanan (terlihat pada screenshot).
2. **Header**: logo + navbar multi-level (dropdown bersarang sampai 3 tingkat pada menu Pelayanan → MCU → Paket). Dua tombol CTA: **Daftar Online** dan **Administrasi Pasien**.
3. **Konten halaman.**
4. **Footer**: alamat, "Link Terkait" (5 logo: PPID, PANRB, Kemenkes, Jakarta, Dinkes), banner "Media Pengaduan", blok Lokasi (telepon, email), hak cipta.
5. **Bilah aksi cepat** (di bagian bawah markup): *Jadwal Dokter*, *Pendaftaran*, *Survey Kepuasan Pelanggan*, *Kritik & Saran*, plus tombol *back to top*. Posisi/gaya (melayang di mobile atau tetap) ⚠️ perlu dicek visual.

### 8.3 Urutan section Home ✅

| # | Section | Isi di referensi | Komponen |
|---|---|---|---|
| 1 | Hero slider | 9 banner (Klinik Eksekutif, Zona Integritas, Wisata Kesehatan, Paket MCU, Maternal Center, MRI, Jam Pendaftaran, Cath Lab, Jam Besuk) | Swiper (autoplay + navigasi) |
| 2 | **Cari Jadwal Dokter** | Select Spesialis (30 opsi), Select Dokter (±70 opsi), Pilihan Hari | `react-select` |
| 3 | **Layanan Unggulan & Prioritas** — "Layanan Terbaik Untuk Kesehatan Anda" | 6 kartu: Jantung, Kanker, MCU, Stroke, Uro Nefrologi, Maternal Center; tombol *Detail* | Grid kartu |
| 4 | **Fasilitas & Layanan** | 8 item (IGD, Rawat Jalan, Rawat Inap, Rawat Inap Khusus, Diagnostic Center, ESWL, MRI, Klinik Eksekutif Magnolia); daftar tautan anchor + gambar + *Selengkapnya* | Tab/list + gambar |
| 5 | **Paket MCU & Promosi** — "Berbagai penawaran istimewa untuk Anda" | 8 kartu paket; *Detail* | Swiper kartu |
| 6 | **Berita dan Artikel Kesehatan** | Kartu berita (16 pada kondisi saat diambil) + *Baca Selengkapnya* | Swiper/grid |
| 7 | **Akreditasi & Penghargaan** | 22 gambar penghargaan + judul | Swiper |
| 8 | **Gallery** | 4 foto (Farmasi, Mata, Rehabilitasi Medik, dll.) | Grid + lightbox |
| 9 | **Pendaftaran** | 3 tombol: JAKSEHAT, JKN, E-Pasien | Tombol/ikon |
| 10 | **Sosial Media** | Embed postingan Instagram | Kartu statis (hindari embed pihak ketiga) |
| 11 | **Patient Experience** — "Cerita penuh inspirasi dari mereka yang telah mempercayai kami" | 4 testimoni (foto, nama, peran, kutipan) | Swiper |
| 12 | **Asuransi** | 19 logo mitra | Swiper logo |
| 13 | **FAQ** | 9 pertanyaan (jenis layanan, cara daftar, BPJS, alur IGD, MCU, jadwal dokter, asuransi, keluhan, lokasi & jam operasional) | Accordion |
| 14 | Footer | lihat 8.2 | — |

### 8.4 Komponen UI yang harus dibangun
`Topbar`, `Navbar (multi-level, hover di desktop, accordion di mobile)`, `HeroSlider`, `DoctorSearchCard`, `ServiceCard`, `FacilityTabs`, `McuCard`, `NewsCard`, `AwardSlider`, `GalleryLightbox`, `TestimonialSlider`, `InsuranceMarquee`, `FaqAccordion`, `Footer`, `QuickActionBar`, `BackToTop`, `Breadcrumb`, `Pagination`, `FormField` (+ error), `ConfirmModal`, `DataTable` (bed, jadwal), `AdminLayout`.

### 8.5 Batasan teknis
1. **Rendering:** halaman publik memakai Server Components + ISR (`revalidate`) untuk konten yang jarang berubah; halaman jadwal dan kapasitas bed memakai data segar (dinamis atau revalidate pendek).
2. **Client component seperlunya:** hanya komponen yang butuh interaksi (Swiper, GSAP, react-select, modal).
3. **Aksesibilitas (WCAG 2.1 AA sebagai target):** kontras teks pada latar `#1A77CC` harus diuji (teks putih di biru ini perlu dicek rasio kontrasnya); semua gambar punya `alt`; navigasi keyboard untuk dropdown; label form terhubung ke input.
4. **Keamanan:** validasi server (Zod) untuk semua form; *rate limiting* dan *honeypot* pada form publik; sanitasi Markdown; hash password; cookie sesi `httpOnly` + `secure`; tidak ada rahasia di kode.
5. **Performa (target, bukan jaminan):** LCP < 2,5 detik di mobile, gambar lewat `next/image`, slider hero hanya memuat slide pertama secara *eager*.
6. **SEO:** `sitemap.xml`, `robots.txt`, metadata dinamis, URL slug yang bersih.
7. **Privasi:** hanya data dummy; tidak ada nomor KTP/rekam medis nyata. Form pendaftaran menampilkan pernyataan "data simulasi".

---

## 9. Inventaris Konten (Seed Data Dummy)

Struktur data diambil dari situs referensi, **isinya diganti dengan data fiktif**.

| Data | Jumlah di referensi | Aturan untuk seed |
|---|---|---|
| Spesialis | 30 ✅ (Anak, Anestesi, Bedah Digestive, Bedah Onkologi, Bedah Saraf, Bedah Toraks & Kardiovaskular, Bedah Umum, 5 spesialis Gigi, Ginekologi Onkologi, Gizi Klinik, Jantung, Kebidanan & Kandungan, Kulit & Kelamin, Mata, Onkologi Radiasi, Orthopedi, Paru, Penyakit Dalam, PD Hematologi Onkologi Medik, Psikiatri, Psikologi, Rehab Medik, Saraf, TB DOTS, THT, Urologi) | Boleh disalin (nama spesialisasi bersifat generik). |
| Dokter | ±70 ✅ | **Nama dokter fiktif** (buat dengan skrip generator), sebar acak ke 30 spesialis; format gelar mengikuti pola referensi (`dr. ..., Sp.PD`). Jangan pakai nama dokter asli. |
| Jadwal dokter | dimuat dinamis (struktur isi tidak terlihat) ⚠️ | Generate 1–3 slot/dokter/pekan; rawat jalan Senin–Jumat 07.30–14.00 sesuai FAQ referensi ✅. |
| Layanan prioritas | 6 ✅ | Salin struktur, tulis ulang deskripsi. |
| Fasilitas/layanan medis | 8 ✅ | idem |
| Paket MCU | 8 reguler + 5 *Health Meets Holiday* = 13 ✅ | Nama paket boleh serupa; harga dan isi pemeriksaan dibuat sendiri (harga referensi tidak terlihat ⚠️). |
| Berita | 16 di Home ✅ | Judul dan isi fiktif; tanggal bervariasi. |
| Penghargaan | 22 ✅ | Gambar placeholder; judul dibuat generik. |
| Galeri | 4 ✅ (tambah hingga ±12) | Gambar placeholder/stok berlisensi bebas. |
| Testimoni | 4 ✅ | **Karangan sendiri**; jangan pakai nama/foto pasien asli. |
| Mitra asuransi | 19 logo ✅ | Gunakan logo placeholder bertulisan nama generik. |
| FAQ | 9 ✅ | Tulis ulang dengan jawaban sesuai data fiktif. |
| Jam operasional | Rawat jalan Sen–Jum 07.30–14.00; IGD & rawat inap 24 jam ✅ | Boleh dipakai sebagai default. |
| Kontak | telepon, WhatsApp, email ✅ | **Ganti** dengan nomor/email dummy. |

---

## 10. Deployment & Environment

### 10.1 Environment variable

| Variabel | Contoh nilai | Fungsi |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?sslmode=require` | Koneksi Postgres (berbeda per lingkungan). |
| `AUTH_SECRET` | string acak panjang | Penandatangan sesi admin. |
| `NEXT_PUBLIC_SITE_URL` | `https://domain-anda.tld` | URL kanonik untuk metadata & sitemap. |
| `STORAGE_DRIVER` | `local` atau `s3` | Memilih adapter penyimpanan file. |
| `STORAGE_*` | bucket, endpoint, key | Kredensial storage `s3`. |
| `NEXT_PUBLIC_GA_ID` | (kosong) | Aktifkan analitik hanya bila diisi. |

### 10.2 Perintah penting beserta penjelasan

**1. Build produksi**
```bash
npm run build
```
- `npm` : package manager Node.
- `run` : menjalankan sebuah *script* yang tercatat di `package.json`.
- `build` : nama script tersebut; pada proyek Next.js biasanya berisi `next build` (kompilasi produksi, optimasi, pembuatan output `standalone` bila diaktifkan).

**2. Terapkan migrasi database (produksi)**
```bash
npx prisma migrate deploy
```
- `npx` : menjalankan program dari `node_modules` (atau mengunduhnya sementara) tanpa instalasi global.
- `prisma` : CLI Prisma.
- `migrate deploy` : menerapkan semua migrasi yang **belum** pernah dijalankan ke database. Berbeda dari `migrate dev`, perintah ini **tidak** membuat migrasi baru, **tidak** mereset database, dan tidak meminta konfirmasi interaktif, sehingga aman untuk server/CI.

**3. Isi data awal (seed)**
```bash
npx prisma db seed
```
- `db seed` : menjalankan skrip seed yang didefinisikan pada kunci `prisma.seed` di `package.json` (di sini: pengisi spesialis, dokter fiktif, layanan, MCU, berita, dll.). Tidak memakai flag tambahan. Jalankan **sekali per database** (Vercel-DB dan VPS-DB masing-masing).

**4. Jalankan di VPS dengan Docker**
```bash
docker compose up -d --build
```
- `docker compose` : Compose v2, mengelola beberapa container dari satu file `compose.yaml`.
- `up` : membuat (bila belum ada) dan menjalankan container sesuai file.
- `-d` (`--detach`) : jalan di latar belakang, terminal langsung bebas.
- `--build` : memaksa build ulang image sebelum start, agar perubahan kode terbawa.

### 10.3 Topologi VPS
`Internet → Nginx (TLS, HTTP/2, reverse proxy) → container Next.js (standalone) → container PostgreSQL (jaringan Docker internal, port 5432 tidak dibuka ke publik)`.

### 10.4 Topologi Vercel
Repo terhubung ke Vercel; set environment variable di dashboard; build otomatis tiap `push`. Database untuk Vercel mengikuti Opsi A/B pada bagian 6.3. Migrasi dijalankan dari mesin lokal/CI terhadap `DATABASE_URL` milik Vercel, **bukan** otomatis oleh fungsi serverless.

---

## 11. Roadmap

Disusun per pekan agar mudah dipakai sebagai laporan progres mingguan (sesuaikan dengan jadwal tugas).

| Pekan | Target | Output yang bisa didemokan |
|---|---|---|
| 1 | Setup repo, Next.js, Bootstrap SCSS, token desain, layout global (topbar, navbar multi-level, footer), skema DB + migrasi awal | Kerangka situs dengan navigasi lengkap |
| 2 | Halaman Home (semua section dengan data seed) | Home identik secara struktur dengan referensi |
| 3 | Halaman detail template (layanan, fasilitas, MCU, berita) + halaman statis `pages` | ≥ 25 halaman bisa dijelajahi dengan alur link lengkap |
| 4 | Jadwal dokter, kapasitas bed, galeri + lightbox, FAQ | Fitur dinamis berbasis DB |
| 5 | Form: E-Pasien, Registrasi MCU, Kritik-Saran, WBS, SKM, Karir | Alur transaksi dummy end-to-end |
| 6 | Panel admin (CRUD inti + inbox) | Konten bisa diubah tanpa menyentuh kode |
| 7 | Dual deploy Vercel + VPS, QA lintas perangkat, SEO, aksesibilitas | Dua URL publik yang berfungsi sama |

---

## 12. Acceptance Criteria

**Fidelity UI/UX**
- [ ] Urutan section Home sama dengan tabel 8.3.
- [ ] Navbar memiliki 3 tingkat dropdown (Pelayanan → MCU → Paket) dan berfungsi di desktop serta mobile.
- [ ] Warna utama `#1A77CC`; font, ukuran, dan jarak sudah dicocokkan dengan hasil pengukuran DevTools (bukan tebakan).
- [ ] Topbar kontak, dua tombol CTA header, dan bilah aksi cepat ada.

**Fungsional**
- [ ] Memilih spesialis memfilter dropdown dokter; hasil jadwal tampil dengan status memuat.
- [ ] Semua 30+ template halaman dapat dijangkau lewat link dari navbar/footer/Home (tidak ada halaman yatim, tidak ada link mati).
- [ ] Pendaftaran E-Pasien menghasilkan nomor antrean dan tersimpan di DB.
- [ ] Form menolak input tidak valid (server-side) dan tahan terhadap spam sederhana.
- [ ] Admin dapat menambah/ubah/hapus berita dan perubahan tampil di situs publik.
- [ ] Peran `front_office` tidak bisa mengubah konten; `editor` tidak bisa mengelola user.

**Non-fungsional**
- [ ] Build produksi sukses tanpa error TypeScript/lint.
- [ ] Situs berjalan identik di Vercel dan VPS dengan hanya perbedaan environment variable.
- [ ] Upload gambar admin berfungsi di **kedua** lingkungan (storage adapter).
- [ ] Lighthouse mobile: Accessibility ≥ 90, SEO ≥ 90 (Performance dicatat sebagai target ≥ 80).
- [ ] Tidak ada script pihak ketiga yang aktif default (GA/GTM/ShareThis off).

**Data & etika**
- [ ] Tidak ada logo, foto, nama dokter, testimoni, atau kontak asli dari situs referensi di repo maupun database.

---

## 13. Out of Scope, Risiko, dan Catatan Verifikasi

### Out of scope
- Integrasi nyata dengan BPJS, JAKSEHAT/JKN, SIMRS, atau sistem antrean rumah sakit asli.
- Pembayaran online, rekam medis, hasil lab pasien.
- Aplikasi mobile native.
- Multi-bahasa.

### Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Menyalin aset/konten asli (logo, foto, nama dokter, testimoni) | Masalah hak cipta dan privasi orang nyata | Pakai placeholder dan data fiktif (bagian 9). |
| Deploy publik dengan identitas RS asli | Bisa dianggap menyamar sebagai situs pemerintah | Gunakan nama fiktif; cantumkan penanda "situs demo/portofolio" di footer. |
| Koneksi DB habis di Vercel | Error 500 saat trafik naik | Connection pooling atau Opsi A (DB terpisah, beban kecil). |
| Upload file gagal di Vercel | Fitur admin rusak | Storage adapter; jangan tulis ke disk lokal. |
| Menyalin pola teknis referensi secara buta (jQuery, aset lokal) | Kode tidak idiomatik di React/Next.js | Ikuti tabel pemetaan 6.1. |
| Estimasi jadwal terlalu optimistis (≈30 template + admin) | Terlambat | Kerjakan berdasarkan prioritas P0 → P4; P3/P4 boleh dipotong. |

### Catatan verifikasi (jujur tentang batas data)
1. **Terverifikasi:** struktur navbar, urutan section Home, jumlah item per section, FAQ, kontak, jam operasional, warna tema, teknologi dari Wappalyzer, serta keberadaan halaman Jadwal Dokter, Kapasitas Bed, dan Daftar Online.
2. **Tidak terlihat dari data yang diambil:** isi halaman Profil, Manajemen, Poliklinik, detail layanan/MCU/berita, Laboratorium, Radiologi, Administrasi, Karir, WBS, PPID, dll. Strukturnya pada PRD ini **diturunkan dari pola Home dan navigasi**. Kerjakan dengan membuka halaman tersebut satu per satu dan perbarui tabel 4.2.
3. **Data dinamis:** Jadwal Dokter dan Kapasitas Bed dimuat lewat request setelah halaman tampil, sehingga isi tabelnya tidak terlihat. Skema `doctor_schedules` dan `bed_capacity` pada PRD ini adalah **rancangan sendiri**, bukan salinan dari backend referensi.
4. **Tidak bisa dipastikan:** nama font, nilai ukuran/jarak CSS, perilaku navbar (sticky atau tidak), posisi bilah aksi cepat, dan keberadaan tombol baca-nyaring. Semuanya perlu dicek lewat DevTools (tab *Elements* → *Computed*, serta *Network* untuk melihat request jadwal).
5. Daftar teknologi dari Wappalyzer bersifat **deteksi**, bukan jaminan 100% akurat; backend/bahasa server referensi tidak terdeteksi pada screenshot.
