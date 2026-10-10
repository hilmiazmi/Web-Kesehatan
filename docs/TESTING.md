# Pengujian

Panduan ini menjawab: *apa yang diuji, dengan apa, bagaimana menjalankannya, dan
apa yang harus diperiksa manual.* Angka di bawah **diukur langsung** pada commit
`f1ebe60` (`main`, 10 Oktober 2026; `bun install --frozen-lockfile`, mode snapshot,
`TZ=Asia/Jakarta`), kecuali ditandai **BELUM DIVERIFIKASI**. Versi awal dokumen
ini diukur pada `4d848c3` (9 Oktober 2026); 23 commit di antaranya hanya
menyentuh docs, uji, CI, a11y, prefetch, dan skrip bantu, tanpa mengubah
endpoint, skema, atau mode — jadi strategi di bawah tetap berlaku.

Tautan terkait: arsitektur di [`ARCHITECTURE.md`](ARCHITECTURE.md), CI di
`.github/workflows/gerbang.yml`, status proyek di [`roadmap.md`](roadmap.md).

---

## 1. Ringkasan hasil terukur

| Pemeriksaan | Hasil | Perintah |
| --- | --- | --- |
| ESLint | bersih (exit 0) | `bun run lint` |
| Unit test (Vitest) | **63 berkas, 870 tes, semua lulus** | `bun run test` |
| Konsistensi snapshot vs route | "semua berkas snapshot konsisten" | `bun run cek:konten` |
| Audit teks rusak | "BERSIH (324 berkas)" | `bun run audit:teks` |
| `bun audit` | 2 advisory tersisa: `braces` (tinggi) dan `esbuild` (sedang), keduanya di rantai pengembangan; `swiper` dan `sweetalert2` sudah dinaikkan | `bun audit` |
| Build produksi + typecheck | 169/169 halaman, exit 0 (diukur 10 Okt 2026, lihat catatan di bawah) | `bun run build` |
| E2E Playwright | 13 lulus, 3 dilewati (alur-db butuh kredensial DB) | `bun run test:e2e` |
| Kontrol tautan + sitemap | 150 halaman / 150 tautan / 149 sitemap, nihil mati | `bun run cek:tautan` |

Kenapa build sempat tidak terverifikasi: `bun run build` gagal di lingkungan
terbatas penyusun awal dokumen ini karena `next/font/google` mengunduh Poppins
dari `fonts.googleapis.com` saat build. Itu kegagalan jaringan, bukan galat
kode.

Diukur ulang 10 Oktober 2026 pada working tree ini (`f1ebe60` + perubahan
dokumen dan 5 perbaikan temuan, branch `docs/lengkapi-dokumentasi`): build
169/169 exit 0, E2E 13 lulus 3 dilewati (alur-db dilewati tanpa kredensial DB),
`cek:tautan` 150 halaman / 150 tautan / 149 sitemap tanpa tautan mati.
`HANDOFF.md` mencatat build 169/169; `roadmap.md`
mencatat 150 halaman ter-prerender (diukur 10 Oktober 2026; naik 2 dari 148
karena halaman unit `rawat-jalan` dan `rawat-inap`). `cek:tautan` yang
menentukan angka sebenarnya.

Angka di `roadmap.md` bagian riwayat (46 berkas / 640 tes, audit 260 berkas)
sudah usang terhadap hasil di atas. Dokumen itu milik pemilik repo dan tidak diubah di sini.
`HANDOFF.md` mencatat angka dari sesi-sesinya sendiri (813 tes di 60 berkas pada `35c65cf`); pada working tree ini (`f1ebe60` + perubahan sesi ini) hasilnya 870 tes di 63 berkas.

---

## 2. Strategi: apa yang diuji dengan apa

Prinsip dari `AGENTS.md`: Vitest 5, **tanpa jsdom**, karena yang diuji logika murni
(`environment: "node"` di `vitest.config.mts`). Tes hanya mencakup apa yang tidak
bisa dijamin oleh mata; tampilan diperiksa manual.

| Lapisan | Alat | Contoh berkas di `tests/` |
| --- | --- | --- |
| Fungsi murni (format, tanggal, rute) | Vitest | `format`, `waktu`, `tanggal-jendela`, `nav-path`, `sitemap`, `params` |
| Validasi dan formulir | Vitest | `validation`, `registration-form`, `feedback-form`, `survey-form`, `wbs-form`, `admission*`, `daftar-ganda` |
| Konten dan Markdown | Vitest | `markdown`, `markdown-nul`, `data`, `data-detail`, `konten-loader`, `konten-detail` |
| API dan snapshot | Vitest | `snapshot`, `snapshot-query`, `respond`, `api-detail-dan-rate-limit`, `health`, `rate-limit`, `form-rate-limit` |
| Auth dan admin | Vitest | `password`, `session`, `read-session`, `peran-admin`, `registry`, `akun-panel`, `akun-diri-sendiri`, `admin-panel`, `admin-nilai-form`, `records`, `stats` |
| Aturan desain yang dikunci | Vitest | `kembali-ke-atas`, `theme-color`, `kontras`, `tautan-internal` |
| Keamanan yang dikunci | Vitest | `header-keamanan` (tujuh header di `next.config.ts`), `snapshot-tolak-tulis` (mode snapshot menolak tulis) |
| Protokol build paralel yang dikunci | Vitest | `kunci-build` (aturan basi 20 menit, pemasangan hook di `package.json` + teardown di `playwright.config.ts`, aturan lepas bertoken, pemeriksaan proses mentah) |
| Gerbang manual / CI | skrip `scripts/*.ts` | lihat bagian 4 |
| Tampilan, interaksi, aksesibilitas | **manual di peramban** | bagian 5 |

Tes end-to-end memakai **Playwright** (`e2e/`: `publik`, `a11y`, `alur-db`; script
`bun run test:e2e`), terpisah dari Vitest. Tidak ada tes terhadap PostgreSQL di
dalam `bun run test`; yang menyentuh database adalah `e2e/alur-db.test.ts` (job CI
terpisah, bagian 4) serta skrip manual `cek:tulis` dan `cek:admin`.

### Aturan penulisan tes

- **Tes aturan waktu wajib memakai `vi.setSystemTime`.** Aturan yang membandingkan
  "hari ini" dengan tanggal UTC terlihat benar berbulan-bulan lalu gagal di
  jendela 00:00 sampai 06:59 WIB. Tes dengan jam sungguhan tidak pernah menyentuh jalur itu.
- Alias `@/` harus dideklarasikan ulang di `vitest.config.mts` (Vite tidak
  membaca `tsconfig.json`). Berkas config berekstensi `.mts` karena paket tidak
  menulis `"type": "module"`.
- Satu perilaku, satu tes yang bisa gagal. `AGENTS.md` mencatat praktik
  "mutasi": ubah kode sumber dengan sengaja dan pastikan tes menjadi merah.

---

## 3. Menjalankan tes

Semua dari root repo. Bun 1.4.2 (dikunci di `packageManager`).

```bash
bun install --frozen-lockfile
bun run test
```

- `bun install`: memasang dependensi.
- `--frozen-lockfile`: menolak mengubah `bun.lock`; gagal bila lockfile tidak
  cocok dengan `package.json`. Sama dengan perilaku CI.
- `bun run test`: menjalankan script `test` di `package.json`, yaitu `vitest run`
  (satu kali jalan lalu keluar, bukan mode pantau).

Menjalankan sebagian:

```bash
bunx vitest run tests/session.test.ts
bunx vitest run tests/session.test.ts -t "kedaluwarsa"
bun run test:watch
```

- `bunx`: menjalankan binary paket (`vitest`) tanpa memasangnya global.
- `vitest run`: satu kali jalan (tanpa `run` Vitest masuk mode pantau).
- `tests/session.test.ts`: argumen filter berkas; hanya berkas yang namanya cocok dijalankan.
- `-t "kedaluwarsa"`: hanya tes yang **nama**-nya memuat kata itu. Nama tes
  `kedaluwarsa` adalah contoh; sesuaikan dengan nama tes yang ada.
- `bun run test:watch`: script `vitest` tanpa `run`, menjalankan ulang tes saat berkas berubah.

### Zona waktu

CI memakai `TZ: Asia/Jakarta`. Alasan dari komentar `gerbang.yml`: runner GitHub
berzona UTC menghitung "hari ini" berbeda pada 00:00 sampai 06:59 WIB sehingga
dua tes waktu gagal padahal lulus di mesin pengembang. Itu penanda sementara
sampai aturannya dihitung dari UTC eksplisit. Untuk meniru CI:

```bash
TZ=Asia/Jakarta API_MODE=snapshot DATABASE_URL= bun run test
```

- `TZ=Asia/Jakarta`: variabel lingkungan yang hanya berlaku untuk perintah ini;
  mengatur zona waktu proses.
- `API_MODE=snapshot`: memaksa mode snapshot (tanpa database).
- `DATABASE_URL=`: mengosongkan variabel agar tidak ada koneksi database.

---

## 4. Gerbang kualitas

Urutan yang sama dijalankan CI pada setiap `push` dan `pull_request`
(`.github/workflows/gerbang.yml`, batas 6 menit, semuanya mode snapshot):

| # | Langkah | Fungsi |
| --- | --- | --- |
| 1 | `bun install --frozen-lockfile` | Dependensi sesuai lockfile |
| 2 | `bun run lint` | ESLint |
| 3 | `bun run test` | Unit test |
| 4 | `bun run cek:konten` | `snapshot/` dan route handler saling cocok (fallback tidak diam-diam gagal) |
| 5 | `bun run audit:teks` | Karakter asing / kata rusak di sumber (mencakup `docs/`; dua PRD dikecualikan) |
| 6 | `bun run build` | Build produksi sekaligus typecheck |
| 7 | `bun run cek:tautan` | Setelah build: tautan mati, halaman tanpa tautan masuk, halaman tak masuk sitemap |

`bun run verify` menjalankan `lint && test && build` berurutan (lihat
`package.json`). Ia **tidak** menjalankan `cek:konten`, `audit:teks`, maupun
`cek:tautan`, jadi lulus `verify` belum berarti lulus CI.

### E2E (Playwright)

```bash
bun run build
bun run test:e2e
```

- `bun run build`: E2E publik menjalankan `bun run start`, yang menyajikan hasil build.
- `bun run test:e2e`: menahan kunci E2E bertoken (`tunggu-tandai`, token lewat
  `KUNCI_E2E`) lalu `playwright test`; membaca `playwright.config.ts`,
  menjalankan berkas di `e2e/` satu per satu (`workers: 1`), memakai proyek
  Chromium, menyalakan sendiri server `API_MODE=snapshot` di port 3401 bila
  belum ada (`reuseExistingServer: true`), dan melepas kunci di
  `globalTeardown` walau tes gagal.

Tiga berkas: `publik` (alur tanpa database), `a11y` (aksesibilitas di 4
halaman kunci), `alur-db` (login, panel, pengaturan, kritik-saran lewat API
maupun peramban, daftar online lewat peramban sampai dapat antrean; butuh
database dan akun uji dari `bun run uji:siapkan`, dibersihkan dengan
`bun run uji:bersihkan`).

CI memisahkan alur ber-database ke workflow **`.github/workflows/e2e-db.yml`**:
service `postgres:17-alpine`, `db:migrate` + `db:seed`, build mode snapshot, lalu
server mode `live` di port 3402 dengan `ADMIN_ORIGIN=http://localhost:3402`
(masih diterima karena loopback; lihat guard `ADMIN_ORIGIN` di `config.ts`).
`uji:mobile` (`scripts/uji-mobile.ts`) adalah skrip uji visual mobile 390 px,
dijalankan manual.

### Gerbang yang hanya manual (butuh PostgreSQL)

Tidak ada di CI karena butuh database sungguhan:

| Perintah | Menguji | Peringatan |
| --- | --- | --- |
| `bun run cek:tulis` | Jalur tulis: pendaftaran, kuota, penolakan ganda | **Menyentuh database sungguhan.** Jangan di mode snapshot dan jangan di database produksi |
| `bun run cek:admin` | CRUD generik, inbox, akun, dasbor (21 pemeriksaan pada catatan 5 Oktober 2026) | Skrip sekali pakai; butuh database terisi seed |

Menyiapkan database lokal:

```bash
docker compose up -d postgres
bun run db:migrate
bun run db:seed
bun run db:status
```

- `docker compose up`: menyalakan service dari `docker-compose.yml`.
- `-d`: *detached*, berjalan di latar belakang sehingga terminal bebas.
- `postgres`: hanya service itu yang dinyalakan.
- `db:migrate` menerapkan `drizzle/000*.sql`; `db:seed` mengisi data contoh dari
  `scripts/seed-data.json`; `db:status` melaporkan konfigurasi dan isi tabel
  (jalankan lebih dulu bila endpoint menjawab 404 tanpa sebab jelas).
- `DATABASE_URL` di `.env.local` harus sama persis dengan service, user, sandi,
  dan nama database di `docker-compose.yml`.

---

## 5. Pemeriksaan manual di peramban

Yang tidak bisa diuji otomatis di repo ini (dari `AGENTS.md`): tata letak
responsif, carousel Swiper, panel navigasi off-canvas, interaksi SweetAlert2.

Memeriksa satu rute setelah build:

```bash
bun run start --port 3411 &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3411/daftar-online
```

- `bun run start`: menjalankan `next start` (server produksi; wajib build dulu).
- `--port 3411`: port yang dipakai; jangan 3000 (dev), 3300/3399 (milik pemilik),
  3401 (E2E), atau 3402 (E2E ber-database).
- `&`: menjalankan proses di latar belakang agar perintah berikutnya bisa dipakai.
- `curl -s`: senyap (tanpa progress bar).
- `-o /dev/null`: membuang isi respons.
- `-w '%{http_code}\n'`: setelah selesai, mencetak hanya kode status HTTP lalu baris baru.

### Checklist uji manual

Centang di akhir tiap perubahan UI. Lebar uji yang dipakai repo: 390, 768, 1200, 1280, 1360, 1440, 1520, 1920 px.

**Navigasi dan tata letak**
- [ ] Navbar: tangga lebar sesuai `AGENTS.md` (≥1520 satu baris; 1360-1519 kompak; 1200-1359 dua baris; <1200 hamburger)
- [ ] Tidak ada gulir horizontal pada semua lebar di atas
- [ ] Submenu desktop: hover, jeda tutup 0,3 detik, tidak ada dua submenu menyala bersamaan
- [ ] Panel mobile: bisa ditutup dengan backdrop, tombol tutup, dan Escape; fokus kembali ke hamburger
- [ ] Panel tertutup tidak bisa difokus dengan Tab
- [ ] Tombol kembali ke atas muncul setelah gulir 100px dan tidak menutupi bilah aksi cepat

**Beranda (13 section)**
- [ ] Urutan section sesuai PRD 8.3
- [ ] Hero slider (autoplay, `fetchpriority` untuk dua slide pertama)
- [ ] Lightbox galeri: Escape menutup, fokus kembali ke pemicu, `role="dialog"`
- [ ] FAQ `<details>` terbuka/tertutup

**Formulir** (`/daftar-online`, rawat inap, MCU, kritik-saran, WBS, SKM)
- [ ] Pesan galat per field muncul dari galat `422` server
- [ ] Alur daftar online: dokter → slot jam → kirim → nomor antrean
- [ ] Pendaftaran ganda `(phone, schedule_id)` ditolak dengan pesan yang bisa dibaca
- [ ] Honeypot: field `website` terisi tidak menyimpan apa pun
- [ ] Setelah 5 kiriman gagal dalam semenit, muncul pesan rate limit (429)
- [ ] Mode snapshot: formulir menampilkan pesan baca-saja (503), bukan "berhasil"

**Panel admin** (`/admin`, butuh database)
- [ ] Tanpa sesi `/admin` redirect ke `/admin/login`
- [ ] `front_office` tidak bisa membuka daftar record (403) dan tidak melihat halaman akun
- [ ] `editor` bisa ubah konten tetapi tidak bisa menghapus record maupun mengelola akun
- [ ] `super_admin` bisa semuanya; tidak bisa menurunkan diri sendiri atau super admin aktif terakhir
- [ ] Ubah berita di panel → tampil di `/berita` dalam ±60 detik (`revalidate`); permintaan pertama setelah jendela masih menyajikan isi lama
- [ ] Logout menghapus cookie; ganti password mencabut sesi lama (401)

**Header keamanan (CSP)**
- [ ] Lewat `http://localhost` (`bun run start`), halaman, CSS, dan gambar termuat normal; CSP memuat `upgrade-insecure-requests` yang dapat memengaruhi pengujian lokal (**BELUM DIVERIFIKASI**)
- [ ] Gambar dari `images.unsplash.com` dan `picsum.photos` tampil; gambar dari host lain (mis. URL bebas dari admin) diblokir `img-src` dan tidak tampil
- [ ] Konsol peramban tidak menampilkan pelanggaran CSP pada beranda, `/berita`, `/daftar-online`, dan `/admin`

**Aksesibilitas**
- [ ] Tautan lewati (skip link) ada di urutan Tab pertama
- [ ] Satu `h1` per halaman, tidak ada lompatan tingkat heading
- [ ] Semua gambar punya `alt`, semua input punya label
- [ ] Fokus terlihat (`outline` 3px) pada elemen interaktif

---

## 6. Lighthouse

Prosedur dari `roadmap.md` bagian 3.5 (hanya dalam **mode snapshot**; mode live
mengukur database, bukan halaman):

```bash
bun run start --port 3412 &
npx --yes lighthouse@13.5.0 http://localhost:3412/berita \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=laporan.json \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
```

- `npx --yes`: menjalankan paket tanpa memasangnya permanen; `--yes` menjawab
  "ya" otomatis pada pertanyaan unduh.
- `lighthouse@13.5.0`: versi dikunci agar skor bisa dibandingkan.
- `--only-categories=...`: hanya empat kategori itu yang dihitung.
- `--output=json`: format keluaran; `--output-path=laporan.json`: nama berkasnya.
- `--chrome-flags="..."`: opsi untuk Chrome yang dijalankan Lighthouse:
  `--headless=new` tanpa jendela, `--no-sandbox` menonaktifkan sandbox (perlu di
  container/CI), `--disable-gpu` tanpa GPU, `--disable-dev-shm-usage` memakai
  `/tmp` alih-alih `/dev/shm` yang sering kecil di container.

Ambil **median dari tiga jalan** per rute (selisih antar-jalan bisa 25 poin).
Jangan matikan throttling simulasi (bawaan), dan jangan memakai `--preset=desktop`
tanpa alasan. Ambang Acceptance Criteria butir 14: Accessibility ≥ 90 dan SEO ≥ 90.
Angka terakhir yang tercatat di `roadmap.md` (median tiga jalan, 10 Oktober
2026): Performance 87 sampai 89, Accessibility 97 sampai 100, SEO 100.

---

## 7. Menambah tes baru

1. Taruh di `tests/<topik>.test.ts` (pola `include` di `vitest.config.mts`).
2. Impor dengan alias `@/` (mis. `import { x } from "@/lib/format"`).
3. Logika yang butuh tanggal: `vi.useFakeTimers()` / `vi.setSystemTime(...)`.
4. Pisahkan aturan dari komponen: ekspor fungsi murni (contoh: `validate()` di
   `registration-form.tsx` sengaja di-export agar bisa diuji tanpa render).
5. Setelah menulis berkas sumber, jalankan `bun run audit:teks`; alat tulis
   kadang menyisipkan karakter asing.
6. Jalankan `bun run lint && bun run test` sebelum commit.

## 8. Celah yang diketahui

- `playwright.config.ts` menulis `executablePath: "/usr/bin/chromium"` secara
  tetap; di mesin tanpa Chromium di jalur itu, E2E gagal start (dibaca dari
  konfigurasi, belum dijalankan di sini).
- E2E publik memakai server `API_MODE=snapshot` pada port 3401 dan butuh `bun run build`
  lebih dulu; alur ber-database hanya berjalan di CI atau mesin dengan PostgreSQL.
- `cek:tulis` dan `cek:admin` bergantung pada database yang disiapkan manual.
- Header keamanan diuji sebagai **konfigurasi** (`tests/header-keamanan.test.ts`),
  bukan sebagai respons HTTP sungguhan dari server yang berjalan. Pengaruh CSP ke
  halaman nyata (gambar admin dari host lain, `upgrade-insecure-requests` pada
  `http://localhost`) **BELUM DIVERIFIKASI** di peramban.
- Performance Lighthouse 87 (naik dari 84 sesudah disiplin prefetch;
  penyebab sisa: dokumen RSC 271 KiB dan LCP berupa teks, lihat `roadmap.md` 3.5
  dan bagian 4 butir 1).
