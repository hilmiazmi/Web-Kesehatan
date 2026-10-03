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

- **43 Route Handler** di bawah `/api/v1`, endpoint publik dan admin. Semua
  path lain dibalas 404 sungguhan oleh catcher di `[...path]/route.ts`.
- **27 tabel** PostgreSQL lewat Drizzle ORM, dengan migrasi SQL dan trigger
  `set_updated_at`.
- Auth admin: kata sandi di-hash dengan `scrypt`, token sesi ditandatangani
  HMAC-SHA256, endpoint login, logout, dan sesi.
- Sanitasi Markdown di server, memakai allow-list tag dan atribut.
- API panel admin, sembilan kelompok endpoint: appointments-per-day, beds,
  inbox, records, settings, stats, survey-by-unit, tables, dan users, plus
  autentikasinya. **Belum ada halaman antarmukanya.**
- Mode snapshot, supaya build pratinjau tidak perlu database.

### Layout global

- `Topbar` — kontak (telepon/WhatsApp/email) + ikon sosial, latar `#1977cc`
- `Navbar` — 11 item level-1, dropdown 3 tingkat (hover di desktop, accordion di mobile)
- `Footer` — identitas, link terkait, media pengaduan, blok lokasi, penanda demo
- Tombol CTA header: **Daftar Online** dan **Administrasi Pasien**
- Skip-link untuk aksesibilitas keyboard

### Halaman

**151 halaman** ter-build. Selain beranda, sudah ada katalog pelayanan
(poliklinik, medis, diagnostik, MCU), PPID bercabang, berita, informasi
publik, laboratorium, radiologi, tentang-kami, dan daftar online.

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

---

## Yang belum dikerjakan

- [ ] Halaman antarmuka panel admin. API-nya sudah ada, halaman belum.
- [ ] Formulir yang benar-benar mengirim ke server. `POST /api/v1/appointments`
      sudah ada, tapi endpoint itu menuntut `schedule_id` berupa UUID jadwal
      dokter, sedangkan formulir pendaftaran hanya menanyakan tanggal.
      Menyambungkannya berarti menambah langkah pilih dokter lalu pilih jam.
- [ ] Form: E-Pasien, Registrasi MCU, Kritik-Saran, WBS, SKM (P2)
- [ ] Dual deploy Vercel + VPS

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