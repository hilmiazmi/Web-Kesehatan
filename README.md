# Web-Kesehatan

Website rumah sakit fiktif ("RSUD Contoh Sehat") dengan Next.js.
Seluruh identitas, konten, foto, dan data di sini dibuat sendiri untuk
keperluan demonstrasi dan portofolio.

> **Situs demo untuk pembelajaran/portofolio.** Bukan situs resmi rumah sakit
> pemerintah. Data seluruhnya fiktif.

---

## Struktur

```
.
├── src/
│   ├── app/               # Halaman, Route Handler di /api/v1, dan catcher 404
│   ├── components/        # Komponen UI per bagian
│   ├── data/              # Konten dan kumpulan foto (masih data lokal)
│   ├── lib/               # Pembantu: format, penelusuran path menu
│   ├── server/            # Backend: config, db, auth, validasi, markdown
│   └── styles/            # CSS: token, layout, section, halaman detail
├── drizzle/               # Skema dan migrasi SQL (Drizzle)
├── snapshot/              # Salinan baca endpoint publik, untuk mode tanpa database
├── scripts/               # Skrip migrasi, seed, dan gerbang pemeriksaan
├── tests/                 # Unit test (Vitest)
├── archive/legacy-v1/     # Kode versi lama, read-only
├── archive/rust-api/      # Backend Rust pertama, read-only
└── docs/                  # PRD & dokumentasi design token
```

## Menjalankan

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # build produksi + typecheck
bun run lint       # pemeriksaan ESLint
bun run test       # unit test (Vitest)
```

Aplikasi berada di root repo, tidak perlu `cd` ke subdirektori.

Butuh Node 20+ dan Bun. `packageManager` di `package.json` dikunci ke `bun@1.4.2`.

### Backend

Halaman publik sendiri **tidak** butuh database: isinya masih dibaca dari
`src/data/`. Database hanya dipakai oleh Route Handler dan skrip.

```bash
docker compose up -d postgres   # PostgreSQL lokal, hanya mendengarkan di 127.0.0.1
bun run db:migrate              # jalankan drizzle/000*.sql
bun run db:seed                 # isi data contoh
bun run db:status               # cek isi database
bun run db:snapshot             # tulis ulang snapshot/*.json
```

`DATABASE_URL` di `.env.local` harus sama persis dengan nama service, user,
kata sandi, dan database di `docker-compose.yml`.

Mode database ditentukan `API_MODE`, bukan oleh isi `DATABASE_URL`:

| `API_MODE` | Perilaku |
|---|---|
| `live` (bawaan) | Baca dan tulis ke database. `DATABASE_URL` dan `AUTH_SECRET` wajib diisi; kalau tidak, backend berhenti start dengan pesan yang jelas. |
| `snapshot` | Hanya membaca `snapshot/*.json` dan menolak semua permintaan yang mengubah data. Dipakai build pratinjau, supaya pratinjau tidak pernah menyentuh database produksi. |

---

## Yang sudah selesai

### Backend

- **44 Route Handler** di bawah `/api/v1`, endpoint publik dan admin. Semua
  path lain dibalas 404 sungguhan oleh catcher di `[...path]/route.ts`.
- **28 tabel** PostgreSQL lewat Drizzle ORM, dengan 5 migrasi SQL dan trigger
  `set_updated_at`.
- Auth admin: kata sandi di-hash dengan `scrypt`, token sesi ditandatangani
  HMAC-SHA256, endpoint login, logout, dan sesi. Perbandingan signature memakai
  `timingSafeEqual`.
- Sanitasi Markdown di server, memakai allow-list tag dan atribut.
- 9 kelompok endpoint panel admin: appointments-per-day, beds, inbox, records,
  settings, stats, survey-by-unit, tables, dan users, plus autentikasinya.
- Mode snapshot, supaya build pratinjau tidak perlu database dan menolak
  setiap permintaan yang mengubah data.

### Panel admin

Tujuh halaman di bawah `/admin`, semuanya di balik gate server di
`src/app/admin/(panel)/layout.tsx`:

| Halaman | Isi |
|---|---|
| `/admin/login` | Masuk |
| `/admin` | Dasbor: ringkasan, pendaftaran 14 hari terakhir, survei per unit |
| `/admin/records/[table]` | CRUD isi konten, mengikuti peran |
| `/admin/beds` | Kapasitas tempat tidur |
| `/admin/inbox/[kind]` | Antrean pengajuan: pendaftaran, rawat inap, kritik, WBS, survei |
| `/admin/akun` | Kelola akun admin, hanya `super_admin` |
| `/admin/pengaturan` | Nama, kontak, jam layanan, tautan sosial |

Sembilan kelompok API sudah punya Representasi di antarmuka di antarmuka:
`tables` lewat `records/[table]`, `stats`, `appointments-per-day`, dan
`survey-by-unit` lewat dasbor, `settings` lewat `/admin/pengaturan`.

### Layout global

- `Topbar` — kontak (telepon/WhatsApp/email) + ikon sosial, latar `#1977cc`
- `Navbar` — 8 item level-1, dropdown 3 tingkat (hover di desktop, accordion di mobile)
- `Footer` — identitas, link terkait, media pengaduan, blok lokasi, penanda demo
- Tombol CTA header: **Daftar Online** dan **Administrasi Pasien**
- Skip-link untuk aksesibilitas keyboard

### Halaman

**163 halaman HTML** ter-build, plus `opengraph-image`, `robots.txt`, dan
`sitemap.xml`. Selain beranda, sudah ada katalog pelayanan (poliklinik, medis,
diagnostik, MCU), PPID bercabang, berita, informasi publik, laboratorium,
radiologi, tentang-kami, dan daftar online.

Angka ini dihitung dari `.next/prerender-manifest.json`, bukan dikira.
`bun run build` mencetak `Generating static pages (179/179)`; selisihnya
karena route `[slug]` menghasilkan banyak halaman dari satu pola.

### Home — 13 section

Urutan **terverifikasi dari DOM situs referensi**, bukan dari PRD:

| # | Section | ID |
|---|---|---|
| 1 | Hero slider (9 slide, Swiper autoplay) | — |
| 2 | Cari Jadwal Dokter (spesialis → dokter → hari) | `cari-dokter` |
| 3 | Layanan Unggulan & Prioritas (6 kartu) | `layanan` |
| 4 | Fasilitas & Layanan (tab vertikal 8 item) | `fasilitas` |
| 5 | Paket MCU & Promosi (8 paket) | `mcu` |
| 6 | Berita dan Artikel (16 kartu) | `berita` |
| 7 | Akreditasi & Penghargaan | `akreditasi` |
| 8 | Gallery | `galeri` |
| 9 | Pendaftaran (3 tombol) | `pendaftaran` |
| 10 | Sosial Media | `sosial-media` |
| 11 | Patient Experience (4 testimoni) | `testimoni` |
| 12 | Asuransi | `asuransi` |
| 13 | FAQ (9 pertanyaan, `<details>`) | `faq` |

### Design tokens — semua terverifikasi

Nilai diambil dari `getComputedStyle()` pada situs referensi, **bukan tebakan**.
Detail lengkap: [`docs/design-tokens-terverifikasi.md`](docs/design-tokens-terverifikasi.md)

| Token | Nilai |
|---|---|
| Warna aksen | `#1977cc` |
| Background section | `#f1f7fc` |
| Font heading | Poppins 500 (pengganti Gotham) |
| Font body | Poppins 400 (pengganti Gotham Rounded) |
| `h2` section | 42px / 50.4px |
| Nav link | 15px / 700 |
| Tombol | radius 50px, padding 8px 25px |

### Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict ·
Bootstrap 5.3.3 · Bootstrap Icons · Swiper · SweetAlert2 · Poppins via
`next/font` · Drizzle ORM · driver `postgres`

### Keamanan

Tujuh header keamanan dikirim ke setiap respons, dikonfigurasi di
`next.config.ts`: Content-Security-Policy, Strict-Transport-Security,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options,
dan `frame-ancestors` di dalam CSP.

CSP disusun dari pengukuran: tidak ada `<iframe>`, tidak ada `form action` ke
host lain, semua permintaan dari klien hanya ke origin sendiri, dan foto hanya
dari dua host yang terdaftar di `remotePatterns`. Dua kelonggaran yang tersisa
dicatat terbuka di [`docs/AUDIT-KEAMANAN.md`](docs/AUDIT-KEAMANAN.md):
`script-src` dan `style-src` masih memakai `'unsafe-inline'`, karena menghapusnya
butuh nonce, dan nonce hanya bisa terbit di middleware, yang akan mengubah
seluruh halaman statis menjadi dinamis.

Rincian temuan keamanan ada di
[`docs/AUDIT-KEAMANAN.md`](docs/AUDIT-KEAMANAN.md).

### Pengujian

813 test di 60 berkas, memakai Vitest. Cakupannya logika murni: bentuk data
konten, validasi formulir, sanitasi Markdown, hashing dan verifikasi sesi,
penelusuran path menu, fungsi tanggal, dan penolakan mode snapshot atas
permintaan yang mengubah data.

Yang **tidak** diuji dan harus diperiksa manual: tata letak responsif,
carousel Swiper, panel navigasi off-canvas, dan interaksi SweetAlert2.

---

## Yang belum dikerjakan

- [ ] Menaikkan `swiper` ke 12.1.2. Versi 11.2.6 punya advisori prototype
      pollution ([GHSA-hmx5-qpq5-p643](https://github.com/advisories/GHSA-hmx5-qpq5-p643)).
      Perlu naik versi utama dan pengujian carousel di browser, jadi tidak
      bisa ditutup diam-diam. Lihat [`docs/AUDIT-KEAMANAN.md`](docs/AUDIT-KEAMANAN.md).
- [ ] Menaikkan `sweetalert2` ke 11.22.4 untuk advisori tingkat rendah.
- [ ] Formulir **E-Pasien**.
- [ ] Dual deploy Vercel + VPS.
- [ ] Uji end-to-end dengan Playwright. Yang diuji sekarang adalah logika
      murni; tata letak responsif, carousel, panel navigasi off-canvas, dan
      interaksi SweetAlert2 masih harus diperiksa manual lewat browser.

Yang **sudah** selesai dan dulu tercatat belum, diperbarui 8 Oktober 2026:

| Perluasan | Status |
|---|---|
| Formulir Kritik-Saran | Mengirim ke `POST /api/v1/feedbacks` |
| Formulir SKM | Mengirim ke `POST /api/v1/survey-responses` |
| Formulir WBS | Mengirim ke `POST /api/v1/wbs-reports` |
| Formulir MCU | Mengirim ke `POST /api/v1/mcu-registrations` |
| Daftar Online | Sudah punya langkah pilih poli, dokter, dan jam, jadi `schedule_id` terisi |
| Panel admin | Tujuh halaman, mencakup 9 kelompok API |

Halaman publik masih membaca `src/data/`, bukan Route Handler. Itu pilihan
sengaja: isi situs tidak boleh ikut hilang saat database tidak bisa dijangkau,
dan `snapshot/` sudah menyediakan salinan baca untuk keadaan itu.

---

## Keamanan

[`SECURITY.md`](SECURITY.md) adalah aturan penanganan kredensial: apa yang
tidak boleh masuk commit, push, issue, PR, screenshot, atau log, dan apa yang
harus dilakukan kalau kredensial terlanjur bocor. **Baca sebelum menyentuh
`.env` atau kredensial apa pun.**

---

## Batasan yang disengaja

1. **Aset asli tidak disalin** — logo, foto, nama dokter, testimoni. Diganti
   placeholder. Alasan: hak cipta dan privasi (PRD bagian 13).
2. **Font Gotham tidak dipakai** — lisensi komersial. Diganti Poppins.
3. **Embed pihak ketiga dimatikan** — Instagram, YouTube, GA, GTM, ShareThis.
   PRD bagian 12 melarang script pihak ketiga aktif secara bawaan.
4. **`id="services"` duplikat diperbaiki** — situs asli memakai ID sama dua kali;
   di sini dibedakan jadi `akreditasi` dan `asuransi`.
5. **Section Sosial Media memakai placeholder** — di situs asli bagian ini
   kosong karena embed Instagram gagal termuat.
6. **Kredensial development lokal ada di `docker-compose.yml`** — disengaja,
   karena database itu hanya mendengarkan di `127.0.0.1` dan nilainya bukan
   kunci ke mana pun. Nilai yang sama tidak boleh dipakai di produksi.