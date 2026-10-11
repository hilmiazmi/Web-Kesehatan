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
├── e2e/                   # Uji end-to-end (Playwright)
├── .github/workflows/     # Gerbang CI dan pembangunan image Docker
├── archive/legacy-v1/     # Kode versi lama, read-only
├── archive/rust-api/      # Backend Rust pertama, read-only
└── docs/                  # PRD, design token, arsitektur, pengujian, rilis, API
```

## Menjalankan

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # build produksi + typecheck
bun run lint       # pemeriksaan ESLint
bun run test       # unit test (Vitest)
bun run test:e2e   # uji end-to-end (Playwright)
bun run verify     # lint + test + build, urutan yang sama dengan CI
```

Aplikasi berada di root repo, tidak perlu `cd` ke subdirektori.

Butuh Node 20+ dan Bun. `packageManager` di `package.json` dikunci ke `bun@1.4.2`.

Gerbang pemeriksaan lain, semuanya mode snapshot kecuali yang disebut:

| Perintah | Yang dicek |
|---|---|
| `bun run cek:konten` | Bentuk data konten dan kuasanya |
| `bun run cek:tautan` | Tautan mati setelah build |
| `bun run cek:admin` | Kelengkapan panel admin |
| `bun run audit:teks` | Teks rusak, huruf kapital di tengah kata, kata Inggris di prosa Indonesia |
| `bun run cek:tulis` | Jalur tulis lewat Route Handler. **Menyentuh database sungguhan**, jangan jalankan di mode snapshot |

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

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Posisi kerja terkini; **baca lebih dulu** |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Alur data, mode `live`/`snapshot`, peta folder, ERD |
| [`docs/TESTING.md`](docs/TESTING.md) | Strategi uji, gerbang CI, checklist manual |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Ringkasan rilis, variabel env, backup, rollback |
| [`docs/DEPLOY-VPS.md`](docs/DEPLOY-VPS.md) | Rilis ke VPS: image GHCR, container, migrasi, rollback |
| [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) | Rilis ke Vercel |
| [`docs/API.md`](docs/API.md) | Referensi endpoint `/api/v1` |
| [`docs/CONTENT-GUIDE.md`](docs/CONTENT-GUIDE.md) | Aturan konten fiktif |
| [`docs/design-tokens-terverifikasi.md`](docs/design-tokens-terverifikasi.md) | Angka warna dan ukuran yang diukur, bukan ditebak |
| [`docs/STATUS-PROYEK.md`](docs/STATUS-PROYEK.md), [`docs/AUDIT-KEAMANAN.md`](docs/AUDIT-KEAMANAN.md) | Hasil audit |
| [`SECURITY.md`](SECURITY.md) | Aturan penanganan kredensial; **baca sebelum menyentuh `.env`** |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md) | Konvensi kerja dan riwayat |

Satu fakta ditulis di satu berkas; angka (jumlah halaman, endpoint, tes) tidak
disalin ke banyak tempat dan harus dihitung ulang sebelum dituliskan.

---

## Yang sudah selesai

### Backend

- **47 Route Handler** di bawah `/api/v1`, endpoint publik dan admin. Semua
  path lain dibalas 404 sungguhan oleh catcher di `[...path]/route.ts`.
- **29 tabel** PostgreSQL lewat Drizzle ORM, dengan 8 migrasi SQL dan trigger
  `set_updated_at`. Dua di antaranya hanya mengisi data dan tidak mengubah
  bentuk tabel: `0005_slug_paket_mcu` dan `0007_perbaiki_teks_rusak`, keduanya
  idempoten sehingga aman dijalankan ulang.
- Auth admin: kata sandi di-hash dengan `scrypt`, token sesi ditandatangani
  HMAC-SHA256, endpoint login, logout, dan sesi. Perbandingan signature memakai
  `timingSafeEqual`.
- Sanitasi Markdown di server, memakai allow-list tag dan atribut.
- 10 kelompok endpoint panel admin: appointments-per-day, audit, beds, inbox,
  records, settings, stats, survey-by-unit, tables, dan users, plus
  autentikasinya.
- Mode snapshot, supaya build pratinjau tidak perlu database dan menolak
  setiap permintaan yang mengubah data.

### Panel admin

Delapan halaman di bawah `/admin`, semuanya di balik gate server di
`src/app/admin/(panel)/layout.tsx`:

| Halaman | Isi |
|---|---|
| `/admin/login` | Masuk |
| `/admin` | Dasbor: ringkasan, pendaftaran 14 hari terakhir, survei per unit |
| `/admin/records/[table]` | CRUD isi konten, mengikuti peran |
| `/admin/beds` | Kapasitas tempat tidur |
| `/admin/inbox/[kind]` | Antrean pengajuan: pendaftaran, rawat inap, kritik, WBS, survei |
| `/admin/riwayat` | Riwayat perubahan: siapa mengubah apa dan kapan |
| `/admin/akun` | Kelola akun admin, hanya `super_admin` |
| `/admin/pengaturan` | Nama, kontak, jam layanan, tautan sosial |

Sepuluh kelompok API sudah punya representasi di antarmuka: `tables` lewat
`records/[table]`, `stats`, `appointments-per-day`, dan `survey-by-unit` lewat
dasbor, `settings` lewat `/admin/pengaturan`, `audit` lewat `/admin/riwayat`.

### Layout global

- `Topbar` — kontak (telepon/WhatsApp/email) + ikon sosial, latar `#1977cc`
- `Navbar` — 8 item level-1, dropdown 3 tingkat (hover di desktop, accordion di mobile)
- `Footer` — identitas, link terkait, media pengaduan, blok lokasi, penanda demo
- Tombol CTA header: **Daftar Online** dan **Administrasi Pasien**
- Skip-link untuk aksesibilitas keyboard

### Halaman

**160 halaman** ter-build (162 berkas HTML minus dua halaman cadangan Next.js),
plus `opengraph-image`, `robots.txt`, dan
`sitemap.xml`. Selain beranda, sudah ada katalog pelayanan (poliklinik, medis,
diagnostik, MCU), PPID bercabang, berita, informasi publik, laboratorium,
radiologi, tentang-kami, dan daftar online.

Angka ini dihitung dari `bun run cek:tautan`, bukan dikira, dan hasilnya
`160 halaman, 160 tautan unik, 159 entri sitemap`. Selisih antara 160 halaman
dan 159 entri sitemap itu memang disengaja: yang tidak masuk sitemap adalah
halaman 404 bawaan Next.js. Halaman `/admin` tidak masuk hitungan sama sekali,
karena semuanya dihitung sebagai dinamis di balik gate server.

`bun run build` mencetak `Generating static pages (178/178)`. Angka itu lebih
besar karena route berparameter (`[slug]`, `[kind]`, `[table]`) dihitung satu kali
per kombinasi parameter, dan `[...slug]` menghidrasi semua rute generik.

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

### Cookie sesi di belakang proksi TLS

Aplikasi hampir tidak pernah melihat HTTPS secara langsung. Di belakang reverse
proxy atau tunnel, skema datang dari header `x-forwarded-proto`, dan header itu
bisa bernilai ganda: rantai proksi yang **menambah** pada header kiriman klien
menghasilkan `http, https`, yang nilai pertamanya bisa berasal dari klien.

`src/lib/koneksi-aman.ts` karena itu aman kalau **ada** satu saja nilai
`https`, bukan mengambil nilai pertama. Arah kesalahan pilihan itu disengaja:
memaksa `https` hanya menghasilkan cookie bertanda `Secure` saat koneksi
sesungguhnya http, yang tidak merusak apa pun. Mengambil nilai pertama
justru membuka cookie sesi tanpa `Secure` tepat saat pengunjung sedang memakai
HTTPS.

Keputusan itu dikunci di `tests/koneksi-aman.test.ts`. Selain itu
`sessionCookie()` dan `clearedSessionCookie()` mewajibkan parameter `aman`
tanpa nilai bawaan, jadi pemanggil yang lupa mengoper flag-nya tertangkap saat
kompilasi, bukan diam-diam menerbitkan cookie tanpa `Secure`.

### Pengujian

**939 test di 70 berkas** memakai Vitest, tanpa jsdom karena semua yang diuji
logika murni: bentuk data konten, validasi formulir, sanitasi Markdown, hashing
dan verifikasi sesi, penelusuran path menu, fungsi tanggal, penjaga rantai
migrasi drizzle, dan penolakan mode snapshot atas permintaan yang mengubah
data.

Di atasnya ada **25 test end-to-end di 5 berkas** memakai Playwright, dijalankan
dengan `bun run test:e2e`:

| Berkas | Cakupan |
|---|---|
| `e2e/publik.test.ts` | Beranda, navigasi, 404 sungguhan, gate admin, daftar online, viewport 390px |
| `e2e/a11y.test.ts` | Skip-link, `alt` dan label, bahasa dokumen, fokus panel navigasi |
| `e2e/offcanvas-mobile.test.ts` | Panel navigasi mobile di bawah 1200px |
| `e2e/dialog-sweetalert.test.ts` | Dialog validasi dan penolakan pada formulir |
| `e2e/alur-db.test.ts` | Alur yang menyentuh database, butuh PostgreSQL |

E2E menutup sebagian dari tiga hal yang tadinya hanya bisa diperiksa manual.
Yang **masih** harus diperiksa manual di browser: tata letak responsif di
seluruh titik pecah, dan carousel Swiper.

---

## Yang belum dikerjakan

- [ ] Rilis ke Vercel. VPS sudah berjalan dan terverifikasi; alamatnya masih
      berupa tunnel Cloudflare sementara, jadi belum ada nama domain tetap.
- [ ] Tutup `script-src` dan `style-src` yang masih memakai `'unsafe-inline'`.
      Butuh nonce, dan nonce hanya bisa terbit di middleware, yang membuat
      seluruh halaman statis berubah menjadi dinamis. Dicatat terbuka di
      [`docs/AUDIT-KEAMANAN.md`](docs/AUDIT-KEAMANAN.md).

Yang **sudah** selesai dan dulu tercatat belum, diperbarui 11 Oktober 2026:

| Perluasan | Status |
|---|---|
| Formulir Kritik-Saran | Mengirim ke `POST /api/v1/feedbacks` |
| Formulir SKM | Mengirim ke `POST /api/v1/survey-responses` |
| Formulir WBS | Mengirim ke `POST /api/v1/wbs-reports` |
| Formulir MCU | Mengirim ke `POST /api/v1/mcu-registrations` |
| Daftar Online | Sudah punya langkah pilih poli, dokter, dan jam, jadi `schedule_id` terisi |
| Panel admin | Delapan halaman, mencakup 10 kelompok API |
| `swiper` 12.2.0 | Naik dari 11.2.6 yang punya advisori prototype pollution ([GHSA-hmx5-qpq5-p643](https://github.com/advisories/GHSA-hmx5-qpq5-p643)) |
| `sweetalert2` 11.22.4 | Naik untuk advisori tingkat rendah |
| Uji end-to-end | 25 test Playwright di 5 berkas, berjalan di CI |
| Deploy VPS | Image GHCR `:stabil`, dua container, migrasi dijalankan terpisah |

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