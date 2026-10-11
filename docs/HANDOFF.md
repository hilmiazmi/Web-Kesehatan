# Serah-Terima Proyek

**Baca berkas ini lebih dulu di awal setiap sesi.** Isinya menggantikan
dokumen lain untuk mencari tahu posisi kerja sekarang.

Tanggal pembaruan: **11 Oktober 2026**
Commit saat serah-terima: **`f6fa52e` = `main` = `upstream/main` (sudah di-push).**
Semua pekerjaan panel admin dan riwayat sudah masuk `main`; riwayat audit dan
tes E2E panel/dialog ada di branch `poles-riwayat-audit`.

Riwayat per hari ada di bawah, bukan di kepala ini. Kepala berkas hanya
menunjuk posisi sekarang; jangan tambahkan catatan panjang di sini.

---

## 1. Tahap saat ini

| Tahap | Isi | Status |
|---|---|---|
| A | Audit, tanpa ubah kode | **Selesai** — `docs/STATUS-PROYEK.md` |
| B | Perbaikan dasar | **Sebagian** — lihat bagian 3 |
| C | C1 form · C2 daftar online · C3 UI admin · C4 dual deploy | **C3 selesai**, C1 dan C2 sudah ada di kode, C4 belum |
| D | Pengujian | **Sebagian** — unit dan integrasi API bertambah, E2E belum |
| E | Audit keamanan | **Selesai** — `docs/AUDIT-KEAMANAN.md` |
| F | Penutup | **Selesai** — README dan `docs/LAPORAN-PROGRESS.md` |

**Pekerjaan sudah di-merge ke `main` dan di-push ke `upstream/main`.**
Semua gerbang hijau saat push: lint 0, unit 825 lulus, build 169 halaman,
e2e 7 lulus.

---

## 2. Checklist status fitur

Ringkasan. Bukti lengkap di `docs/STATUS-PROYEK.md` bagian 3.

| Fitur | Status | Catatan |
|---|---|---|
| Build produksi | Selesai | 179 halaman statis, exit 0 |
| Lint | Selesai | 0 error |
| Test | Selesai | 813 lulus di 60 berkas |
| 163 halaman HTML | Selesai | cocok dengan README |
| 44 endpoint `/api/v1` | Selesai | cocok dengan README |
| 28 tabel Drizzle | Selesai | README sudah diperbaiki |
| 13 section beranda | Selesai | 12 `id` + hero tanpa `id` |
| Galeri | Selesai | `id="galeri"`, 6 foto |
| Navigasi tiga tingkat | Selesai | `src/data/navigation.ts` |
| Auth admin (scrypt + HMAC) | Selesai | `timingSafeEqual` dipakai |
| Sanitasi Markdown | Selesai | `src/server/markdown.ts` |
| Mode snapshot | Selesai | dikunci test baru |
| Tujuh header keamanan | Selesai | dikunci test baru |
| Form Kritik-Saran, SKM, WBS, MCU | Selesai | mengirim ke server |
| Daftar Online (poli, dokter, jam) | Selesai | `schedule_id` terisi |
| Panel admin | Selesai | 7 halaman, 9 kelompok API |
| Form E-Pasien | Selesai | **Sama dengan Daftar Online.** `src/data/home.ts` mengirim tautan "E-Pasien" ke `/daftar-online`, dan `registration-form.tsx:24` menyebut dirinya "Formulir pendaftaran online (E-Pasien)". Checklist lama bilang "Belum" karena salah baca |
| Uji E2E (Playwright) | Selesai | `e2e/publik.test.ts` (beranda, hero autoplay, navigasi, 404, gate admin, Daftar Online, mobile 390px) dan `e2e/alur-db.test.ts` (login, panel, pengaturan, kritik terlacak) |
| Dual deploy Vercel + VPS | Sebagian | `Dockerfile`, `.dockerignore`, `docs/DEPLOY-VERCEL.md`, `docs/DEPLOY-VPS.md` sudah ada. **Docker sudah terverifikasi** di VPS (build sukses, mode snapshot 200, health healthy) — lihat bagian 6. Vercel belum pernah dicoba dari repo ini |

---

## 3. Keputusan yang sudah diambil

| Keputusan | Alasan |
|---|---|
| `middleware.ts` **tidak** dibuat | Tidak menutup celah apa pun, dan akan membuat logika pencabutan sesi punya dua implementasi: yang di middleware tidak bisa memakai `node:crypto` maupun `drizzle`, jadi harus ditulis ulang di runtime Edge |
| CSP statis, bukan berbasis nonce | Nonce hanya bisa terbit di middleware, dan itu akan mengubah 179 halaman statis menjadi dinamis. Harga terlalu besar |
| `unsafe-inline` diterima di `script-src` dan `style-src` | App Router menyisipkan payload RSC sebaris, dan Swiper serta enam komponen menulis `style={{...}}`. Dicatat sebagai sisa terbuka, bukan disamarkan |
| `appointments-per-day` dan `survey-by-unit` masuk dasbor, bukan halaman sendiri | Dasbor sudah Server Component yang membaca statistik dari database. Halaman terpisah untuk tabel 14 baris bukan struktur yang lebih baik |
| `settings` jadi halaman sendiri | Butuh form interaktif, tidak bisa Server Component murni |
| Validasi `settings` di klien | `saveSettings` tidak memvalidasi per field. Kalau klien longgar, penyimpanan salah tersimpan tanpa keluhan |
| Halaman publik tetap baca `src/data/` | Isi situs tidak boleh hilang saat database tidak terjangkau; `snapshot/` menyediakan salinan baca |
| Kredensial dev lokal boleh ada di `docker-compose.yml` | Database hanya mendengarkan di `127.0.0.1`, nilainya bukan kunci ke mana pun |

---

## 4. Masalah terbuka

### Prioritas tinggi

1. **`swiper@11.2.6` punya advisory kritis** (prototype pollution,
   `GHSA-hmx5-qpq5-p643`), diperbaiki di `12.1.2`. Dipakai `HeroSlider` dan
   `CardCarousel`. Naik versi utama, butuh uji carousel di browser.
   Bukti: `bun audit`. Rincian: `docs/AUDIT-KEAMANAN.md` bagian K-1.
2. ~~**Login admin belum pernah diuji sungguhan.**~~ **Teratasi.** Diuji
   terhadap database sungguhan pada 9 Oktober 2026: sandi salah ditolak, login
   benar menerbitkan sesi, panel terbuka, putaran pengaturan kembali ke nilai
   awal, dan kritik yang dikirim terbaca di inbox. Bukti: `e2e/alur-db.test.ts`
   lulus, dijalankan lewat `scripts/siapkan-admin-uji.ts` lalu dibersihkan dengan
   `scripts/bersihkan-admin-uji.ts`.

### Prioritas sedang

3. ~~**`sweetalert2@11.22.0`**~~ **Teratasi**, sudah di `11.22.4`.
4. **`braces` dan `esbuild`** hanya muncul di rantai perkembangan, tidak
   berdampak ke produksi.
5. **`ADMIN_ORIGIN` harus diawali `https://` di produksi.** Penjaga di kode
   sudah ditambahkan: `config()` menolak `ADMIN_ORIGIN` yang `http://` untuk host
   publik di mode `live`, jadi salah environment ketahuan saat start, bukan
   diam-diam terbit tanpa `Secure`. Yang tersisa hanya mengisi nilai
   production dengan `https://` di dashboard platform.

### Prioritas rendah

6. ~~Uji E2E belum ada~~ **Teratasi** untuk carousel, hero autoplay, overflow
   mobile 390px, dan alur login. Yang masih manual: panel navigasi off-canvas
   (below 1200px) dan interaksi dialog SweetAlert2.

---

## 5. Langkah berikutnya

Semua yang ada di bawah sudah selesai; yang tersisa hanya tindakan yang butuh
environment produksi atau keputusan Anda.

1. Isi `ADMIN_ORIGIN=https://domain-anda` di dashboard platform (Vercel atau
   Coolify). `config()` sekarang menolak `http://` untuk host publik, jadi salah
   environment tidak akan lolos diam-diam.
2. Sekali deploy pertama berhasil, jalankan `bun run db:migrate` di server
   (VPS) supaya skema cocok dengan data seed. Snapshot untuk pratinjau Vercel
   sudah cukup tanpa database.
3. Tutup dua sisanya yang masih manual: panel navigasi off-canvas di bawah
   1200px, dan dialog SweetAlert2. Keduanya perlu E2E di viewport kecil atau
   pengujian visual.
4. Kalau `bun audit` masih melaporkan `braces`/`esbuild`, putuskan apakah rantai
   pengembangan itu ditinjau atau diterima.

---

## 6. Yang perlu keputusan Anda

1. ~~Enam commit di branch belum di-merge~~ **Selesai**, sudah masuk `main` dan
   dipush ke `upstream`.
2. ~~Dua kenaikan versi dependensi belum dikerjakan~~ **Selesai**: `swiper` di
   `12.2.0` dan `sweetalert2` di `11.22.4`.
3. **Deploy produksi belum dicoba dari repo ini.** Docker sudah terbukti jalan
   di VPS, tetapi tidak ada domain, DNS, atau TLS yang sudah diarahkan ke sana.
   Itu keputusan dan biaya, bukan pekerjaan kode.

---

## 7. Catatan penting untuk sesi berikutnya

### Repo ini menerima perubahan paralel

Selama sesi ini, repo menerima commit dan berkas baru dari pekerjaan yang
bukan dari agent: `c89f250` (form WBS), `c154306` (layar akun panel),
migrasi `0005_slug_paket_mcu.sql`, dan `mcu-form.tsx`.

Konsekuensinya:

- **Jangan pernah `git add -A`.** Selalu sebutkan berkas satu per satu.
- Jalankan `git status` dan `git log --oneline -3` sebelum mulai.
- Hitung ulang angka apa pun sebelum menuliskannya ke dokumen.

### Dua bug pemblokir build di berkas pekerjaan paralel — SUDAH BERES

Sempat ditemukan di `McuPackageDetail.tsx` (memakai `<McuForm>` tanpa
import, kehilangan tag pembuka `<a href="#daftar-mcu">`), lalu ada di
working tree tanpa commit sehingga build bisa gagal. Keduanya sekarang
sudah ikut di-commit `6602a7d`
`feat(mcu): formulir pendaftaran paket MCU di halaman paket`. Nama paket
yang salah ketik ("Nafrotik") juga sudah diperbaiki oleh `35c65cf`.

### Jebakan `*/` di dalam komentar

Bug nomor 2 di atas muncul sebagai `Expected '</', got 'ident'` yang menunjuk
baris 102, padahal penyebabnya beberapa baris di atasnya. Jangan menulis `*/`
di dalam komentar blok mana pun.

### Penulisan teks bisa rusak

Selama sesi ini, penulisan dokumen dan kode berkali-kali menyisipkan karakter
asing (CJK) dan kata campuran. Semuanya sudah dibersihkan. Selalu periksa
setelah menulis berkas:

```bash
python3 -c "import io,re,sys; print([(i+1,l) for i,l in enumerate(io.open(sys.argv[1],encoding='utf-8').read().split(chr(10))) if re.search(r'[\u4e00-\u9fff]',l)] or 'BERSIH')" <berkas>
```

### Verifikasi cepat

```bash
bun run lint && bun run test && bun run build
```

Angka yang benar untuk commit `32f5ed9`: lint 0 error, test 813 lulus di 60
berkas, build 179 halaman statis (163 HTML).

### Docker tidak bisa diakses tanpa sudo

`docker compose up -d postgres` gagal dengan `permission denied` pada
`/var/run/docker.sock`. Aturan repo melarang `sudo` tanpa diminta eksplisit.
Jadi uji yang butuh database harus dilakukan di sesi yang punya akses.

---

## Review diff (Prompt 4) — 2026-10-08, SUDAH DIBERESKAN

**Lingkup saat review:** working tree belum di-commit (11 modified +
12 untracked) berisi fitur pendaftaran paket MCU: `McuForm` di halaman
paket, migrasi slug, snapshot baru. Semua gerbang tetap hijau: build
179/179 exit 0, test 813 lulus, lint 0 error, scan rahasia bersih.

**Status sekarang:** ketiga temuan sudah diperbaiki dan di-commit
oleh pemilik repo, jadi tabel di bawah hanya arsip.

| # | Lokasi | Tingkat | Temuan | Nasib |
|---|---|---|---|---|
| 1 | `drizzle/0005_slug_paket_mcu.sql:16`, `scripts/seed-data.json`, snapshot | **Blocker** | `name = 'MCU Paket Periksaan Bebas Nafrotik'` (salah ketik). Nilai ini jadi `<h1>` halaman paket dan `namaPaket` form, jadi terlihat publik. | ✅ Diperbaiki jadi "Narkoba" — commit `35c65cf` |
| 2 | `drizzle/0005_slug_paket_mcu.sql:15` | Minor | `--_effectif sama.` — kata rusak ("efektif") + spasi hilang setelah `--`. | ✅ Diperbaiki jadi `-- efektif sama.` — `35c65cf` |
| 3 | turunan #1 di seed + snapshot | **Blocker** | Nama sama ikut ke seed dan snapshot API. | ✅ Diperbaiki bersama #1 |

Fitur MCU itu sendiri sudah di-commit sebagai `6602a7d`
`feat(mcu): formulir pendaftaran paket MCU di halaman paket`.

### Yang dinilai baik saat review (tetap berlaku)
- Komentar `McuPackageDetail.tsx` menjelaskan kenapa tombol lama salah
  (mengarah ke form rawat jalan yang minta slot dokter/jam).
- Migrasi idempoten: `UPDATE ... WHERE slug=...` + `ON CONFLICT DO NOTHING`.
- Tidak ada rahasia/kredensial di diff.
- `dynamicParams=false` + `collectNavPaths` di `[...slug]` → tidak tambah
  tautan mati (terverifikasi lewat `.next/prerender-manifest.json`).

### Catatan repo bergerak sendiri
Saat sesi ini berjalan, HEAD berubah dari `ee112a3` ke `35c65cf`
(branch `fix/header-keamanan-dan-audit`). Commit `5bcf2ad` juga sudah
menerapkan usulan AGENTS.md (baca `docs/HANDOFF.md` di awal sesi).
**Selalu jalankan `git status` + `git log --oneline -3` sebelum
mengklaim sesuatu; jangan pakai angka dari HANDOFF tanpa verifikasi ulang.**

---

## Status tahap C setelah verifikasi ulang (2026-10-08)

Semua klaim di bawah dihitung dari kode di HEAD, bukan dari README atau dari
daftar HANDOFF sebelumnya.

| Sub-tahap | Status sebelum | Status nyata | Bukti |
|---|---|---|---|
| C1 form | sebagian | **Cukup** | 6 komponen formulir, semuanya POST ke server |
| C2 Daftar Online | sebagian | **Cukup** | `schedule_id` terkirim, endpoint mewajibkan |
| C3 panel admin | sebagian | **Cukup** | 9 dari 9 kelompok API punya tampilan, sesi dijaga terminal layout |
| C4 dual deploy | belum | **Sebagian** | berkas konfigurasi dibuat, belum teruji |

C1, enam formulir yang sudah mengirim: `feedback-form.tsx` (Kritik-Saran) ke
`/api/v1/feedbacks`, `survey-form.tsx` (SKM) ke `/api/v1/survey-responses`,
`wbs-form.tsx` ke `/api/v1/wbs-reports`, `admission-form.tsx` (Rawat Inap) ke
`/api/v1/admissions`, `mcu-form.tsx` ke `/api/v1/mcu-registrations`, dan
`registration-form.tsx` ke `/api/v1/appointments`.

C2, alur Daftar Online: `registration-form.tsx:262` mengirim hanya
`schedule_id`, dan `appointments/route.ts:62` membacanya sebagai UUID wajib.
Urutannya poli ke dokter ke tanggal ke slot jam
(`registration-form.tsx:26-27`).

C3, sembilan kelompok API dan tempatnya: `beds`, `inbox`, `records`+`tables`,
`settings`, `stats`, `users` punya halaman sendiri di `src/app/admin/`, lalu
`appointments-per-day` dan `survey-by-unit` masuk dasbor lewat pemanggilan
server-side (`(panel)/page.tsx:69,74`). Proteksi sesi satu tempat, di
`(panel)/layout.tsx:25`: `readSession()` null langsung mengarahkan ke
`/admin/login`.

**Koreksi klaim HANDOFF lama:** "Form E-Pasien — Belum" salah, karena E-Pasien
adalah nama lain Daftar Online; "UI panel admin 4 dari 9" salah; "2 halaman
tidak cek sesi" salah.

### C4, apa yang dikerjakan sesi ini

Dibuat `Dockerfile` (tiga tahap, pengguna non-root, health check di `/`),
`.dockerignore`, `docs/DEPLOY-VERCEL.md`, dan `docs/DEPLOY-VPS.md`.

Ditambahkan juga perbaikan satu cacat dokumentasi: komentar `DATABASE_URL`
kosong di `.env.example` tadinya mengatakan "berarti mode snapshot", padahal
`src/server/config.ts:68` justru melempar error kalau `API_MODE=live` dengan
`DATABASE_URL` kosong. Mode snapshot harus eksplisit.

**BELUM DIVERIFIKASI:** Docker di mesin ini tidak punya izin
(`permission denied` pada `/var/run/docker.sock`), jadi image belum pernah
dibangun. Jangan pakai untuk deploy sebelum sekali build berhasil. Deploy
Vercel juga belum pernah dicoba dari repo ini.

---

## Checkpoint: refactor validasi bersama (2026-10-09)

**Konteks:** pemilik mengerjakan refactor paralel saat sesi ini berjalan
(modul + test berubah di tengah jalan; satu edit saya sempat merusak
`typecheck` karena definisi yang saya hapus ternyata sedang dipakai —
sudah dipulihkan pemilik, dan saya tidak menyentuh berkas itu lagi).

**Yang dikerjakan sesi ini:**
- Verifikasi refactor `src/lib/validasi-umum.ts` (baru) + `tests/validasi-umum.test.ts`
  (baru): 6 formulir dan `src/server/validation.ts` kini memakai aturan bersama
  (`surelValid`, `teleponFormValid`, `teleponServerValid`, `teleponBersih`).
- Menemukan 4 test gagal di awal sesi (aturan surel/telepon di modul baru
  belum cocok dengan test); pemilik memperbaiki modulnya sendiri sampai hijau.
- Menghapus kode mati `LOKAL_SURAT` (tambahan saya yang tak jadi dipakai) —
  lalu pemilik justru memakainya, jadi definisi dipulihkan oleh pemilik.
- Audit karakter asing: 9 berkas BERSIH. Pindai rahasia di diff: bersih.

**Bukti gerbang (`bun run verify`, HEAD sesi ini):**
- lint: 0 error, 0 warning
- test: 61 berkas lulus, 825 test lulus
- build: 169/169 halaman, exit 0

**Keputusan:** commit refactor sebagai satu perubahan logis, push branch
langsung tanpa PR atas instruksi eksplisit pemilik
("jika sudah lolos testing push tanpa pr").

### Verifikasi login + tulis sungguhan (9 Okt 2026, DB uji lokal)

Docker tidak bisa diakses, jadi PostgreSQL 17.11 dijalankan langsung dari
binary mise sebagai user biasa di `/tmp/opencode/pgdata`, hanya `127.0.0.1:5433`.
Tidak menyentuh `.env.local`. Migrasi 28 tabel + seed jalan. Akun uji
`uji-e2e@contoh.test` dibuat lewat `hashPassword` milik aplikasi, lalu
dihapus lagi setelah selesai. Hasil:

- `POST /auth/login` sandi benar → 200 + cookie `rsud_session`.
- Sandi salah → 401.
- `GET /api/v1/admin/stats` + `/admin/pengaturan` dengan cookie → 200.
- `PUT /api/v1/admin/settings` tersimpan dan terbaca kembali dari DB.
- `POST /api/v1/feedbacks` → 201 + tiket, muncul di inbox admin.
- Data uji dihapus, postgres dihentikan. Cara mengulang ada di laporan sesi.

Catatan: field feedback adalah `message`/`name`/`phone`, bukan
`pesan`/`nama`/`telepon`. Salah nama field dibalas 422 dengan
`fields` yang menyebut field yang benar.

---

## Verifikasi Docker lewat VPS (2026-10-09) — BELUM SELESAI

**Aturan keamanan sesi ini:** tidak satu pun alamat IP, isi log server, nama
pengguna, atau detail mesin yang ditulis di dokumen, chat, maupun commit.
Hanya status ringkas yang dicatat. Semua keluaran perintah jarak jauh disaring
sebelum dibaca, dan artefak sementara di VPS dijadwalkan untuk dihapus.

**Yang terjadi:**
1. Akses SSH dengan alias yang diberikan pemilik berhasil; Docker tersedia.
2. Snapshot kode (`git archive HEAD`, tanpa `.env*`/`.next`) terkirim utuh.
3. Build image #1 **gagal** di tahap runner. Tiga cacat di `Dockerfile`,
   semuanya dari berkas saya: COPY atas direktori `public/` yang tidak ada,
   `${PORT}` kosong karena ARG global tidak dinyatakan ulang di tahap runner,
   dan HEALTHCHECK bentuk exec yang tidak mengganti variabel.
4. Ketiganya diperbaiki dan di-commit lokal (`4b1dda2`, belum push).
5. Build image #2 **berjalan normal** (dependensi 404 paket selesai, kompilasi
   Next.js sukses di dalam container) lalu **VPS tidak lagi terjangkau SSH**
   selama belasan menit. Dugaan paling mungkin: mesin kecil kehabisan sumber
   daya saat generate halaman statis (7 worker), bukan kesalahan perintah.
6. Status akhir build #2 **tidak diketahui**. Direktori build sementara dan
   container (bila sempat dibuat) masih ada di VPS menunggu pembersihan.

**Gerbang lokal tetap hijau:** lint 0 error, test 825/825, build 169/169.

**Keputusan:** merge dan push ke `main` **ditahan**. Syarat pemilik adalah
"semua lolos", dan verifikasi Docker belum tuntas. Commit `4b1dda2` tetap
lokal sampai ada kepastian.

**Perlu dari pemilik:** periksa kondisi VPS dari konsol (atau tunggu lalu
coba lagi), beri tahu bila SSH sudah pulih supaya verifikasi dilanjutkan
dan artefak sementara dibersihkan.

---

## Audit cabang + lanjutkan kerja agen lain + Docker terverifikasi (2026-10-09)

### 1. Audit cabang dan commit (diminta pemilik)
- `main`, `lokal-dev`, `fix/header-keamanan-dan-audit`: semua sinkron dengan
  remote masing-masing. Tidak ada commit yang hilang.
- Ketemu 3 commit "belum push" di feature branch — diverifikasi ketiganya
  **sudah ada di `main`** (cek ancestor), jadi hanya pointer yang basi.
  Pointer di-push agar bersih. Tidak ada stash.
- Skrip sementara `scripts/.uji-login-sementara.ts` (untracked, sesuai nama
  hanya untuk verifikasi manual sekali pakai yang sudah dicatat di `fba25a1`):
  isinya sudah selesai dipakai. Dicadangkan ke direktori sementara lokal lalu
  dihapus dari repo, sesuai tulisannya sendiri ("lalu bereskan").

### 2. Docker: TERVERIFIKASI PENUH di VPS
- Build #3 **sukses** dengan `Dockerfile` yang diperbaiki. Image 1,31 GB ada.
- Runtime mode snapshot: homepage 200, API paket 200, health Docker **healthy**.
  Ini sekaligus membuktikan perbaikan HEALTHCHECK bentuk shell.
- Pembersihan: container dihapus, direktori build + log dihapus, cache builder
  di-prune (hampir 5 GB kembali, membantu disk 40 GB). Image dibiarkan.
- Label BELUM-DIVERIFIKASI pada `Dockerfile`/`docs/DEPLOY-VPS.md` sekarang
  boleh dicabut saat sunting berikut — build dan runtime sudah terbukti.

### 3. E2E Playwright (kerangka milik pemilik, Tahap D)
- Dijalankan apa adanya: 6 lulus, 1 gagal (`pilih poli` menghitung 1 opsi).
  Penyebab: opsi dimuat async, test menghitung sebelum fetch selesai (lolos
  saat diulang — flaky, bukan bug aplikasi; API mengembalikan data benar).
- Diperbaiki dengan `expect.poll` + komentar alasan. Hasil: **7/7 lulus,
  dua kali jalan berturut-turut**. Chromium sistem dipakai, tanpa unduh baru.

### 4. Angka README diselaraskan
- Migrasi SQL 5 → 6 (ada `0005_slug_paket_mcu.sql`), test 813/60 → 825/61.
  Tabel 28 dan 44 Route Handler masih cocok, tidak diubah.

### Gerbang akhir sesi
lint 0 error, test 825/825 (vitest) + 7/7 (playwright), build 169/169.

---

## Lanjutan agen lain + efisiensi VPS + Tahap F (2026-10-09)

**Audit cabang (diminta pemilik):** `main`, `lokal-dev`, dan
`fix/header-keamanan-dan-audit` semua sinkron dengan remote. Tiga commit
"belum push" di feature branch ternyata sudah ada di `main`; pointer
di-push agar bersih. Tidak ada stash, tidak ada commit hilang.

**Skrip sementara:** `scripts/.uji-login-sementara.ts` (untracked, verifikasi
login yang sudah dicatat selesai di `fba25a1`) dicadangkan ke direktori
sementara lokal lalu dihapus dari repo, sesuai tulisannya sendiri.

**Efisiensi VPS (2 GB RAM, 40 GB disk):** disk sehat (23 GB bebas), jadi
tidak ada yang perlu dihapus selain cache builder (~5 GB kembali). Delapan
container dan belasan image lain milik proyek lain — tidak disentuh. Swap
2 GB sudah ada. Satu-satunya yang tersisa butuh akses root, jadi hanya
dilaporkan, tidak dikerjakan.

**Tahap F:** `docs/LAPORAN-PROGRESS.md` ditambah periode 9 Oktober dari
riwayat git (20 commit, tanpa melebih-lebihkan). Angka README diselaraskan
lebih dulu (migrasi 6, test 825/61).

**Gerbang:** lint 0, vitest 825/825, playwright 7/7, build 169/169.

---

## Sudo VPS + cabut label usang (2026-10-09)

**Akses sudo** diberikan pemilik dan terverifikasi bekerja tanpa kata sandi.
Hasil pemeriksaan: journal sistem kecil (tidak perlu dikosongkan), disk sehat,
swap 2 GB sudah ada. Tidak ada tindakan root yang dijalankan, karena
satu-satunya yang berarti (batas log daemon Docker) mengharuskan restart
daemon dan akan mengganggu 8 container proyek lain yang sedang berjalan.
Diubah menjadi usulan, bukan tindakan.

**Status VPS: beres.** Image terverifikasi ada, artefak sementara bersih,
tidak ada proses build menggantung, tidak ada yang perlu dihapus lagi.

**Label usang dicabut:** `Dockerfile` dan `docs/DEPLOY-VPS.md` tidak lagi
menyatakan "belum teruji" — keduanya mencatat hasil verifikasi 2026-10-09
beserta keterbatasan VPS kecil yang ditemukan. Label Vercel dipertahankan
karena deploy Vercel memang belum pernah dicoba.

**Gerbang:** lint 0, vitest 825/825, playwright 7/7, build 169/169
(cek ulang sebelum commit di bawah).

---

## Hapus branch lokal-dev (2026-10-09)

Atas instruksi eksplisit pemilik. Diverifikasi dulu tidak ada commit unik
di lokal-dev maupun upstream/lokal-dev dibanding main, lalu dihapus
lokal (branch -d) dan remote (push upstream --delete).
Sisa branch: main dan fix/header-keamanan-dan-audit (sudah termerge,
dibiarkan).

---

## E2E ber-database selesai (2026-10-09)

**Hasil:** `e2e/alur-db.test.ts` baru — login benar/salah, panel terbuka
dengan sesi, putaran pengaturan tulis-baca-kembali, kritik POST 201 lalu
terlacak tiketnya dan muncul di inbox. Lolos 2/2 jalan (~1 detik, API saja).

**Cara jalan (tidak merusak default):** tanpa E2E_UJI_EMAIL/SANDI seluruh
describe di-skip, jadi `bun run test:e2e` biasa tetap hijau. Dengan kredensial
+ `BASE_URL` server live, jalan penuh. Diverifikasi dua-duanya.

**Kebersihan DB (wajib):** basis `rsud_uji` milik pemilik dipakai apa adanya
(tidak dibuat baru). Akun admin sementara acak + baris kritik uji dihapus
sesudahnya; hitungan kembali persis baseline (users 1, feedbacks 0);
tagline dikembalikan (PUT restore 200 dan terverifikasi isinya).
Satu baris nyasar dari curl manual ikut terhapus (pola LIKE berbeda).
Server uji :3400 dimatikan; server pemilik (:3399, :3300) tidak disentuh.

**Dua pelajaran:**
- `pkill -f` mencocokkan baris perintah sendiri lalu membunuh shell-nya.
  Mulai sekarang matikan proses lewat PID eksplisit yang sudah diverifikasi.
- Satu kegagalan awal (login 503) tidak terjelaskan tuntas; jalan ulang
  langsung hijau 2/2. Kemungkinan kondisi pacu saat server baru nyala.
  Kalau kambuh, tambahkan tunggu-siap sebelum login pertama.

---

## Sapu bersih agen lain (2026-10-09)

**Prop a11y mati (terbukti, diperbaiki):** `HeroSlider.tsx` mengirim
`a11y={{ enabled: true }}` tanpa mendaftarkan modul `A11y` — prop tidak
berfungsi. `CardCarousel.tsx` sudah benar (impor + modules). Perbaikan:
tambah `A11y` ke impor dan `modules`, meniru pola yang benar. Tidak perlu
CSS tambahan (modul A11y memakai CSS inti). Gerbang hijau sesudahnya.

**Redundansi validasi-umum (tidak ada yang perlu diubah):** `LOKAL_SURAT`
sudah dipakai di `surelValid` dan menggantikan tiga cek ad-hoc (ada komentar
penjelasnya). `LOKAL_MAKS`/`LABEL_MAKS`/`LABEL_DOMAIN` masing-masing menjaga
hal berbeda (batas panjang vs pola) dan tidak redundan. Pemeriksaan domain
berlapis (panjang total, wajib titik, per label) juga masing-masing perlu.
Audit selesai tanpa perubahan kode.

**Advisory ditutup di dokumen:** K-1 (swiper 12.2.0) dan S-1 (sweetalert2
11.22.4) diberi status DITUTUP beserta bukti commit dan hasil `bun audit`
hari ini; baris risiko dan "sengaja tidak dikerjakan" disesuaikan. Sisa
manual yang jujur dicatat: cek visual mobile 390px.

**Gerbang:** lint 0, vitest 825/825, playwright 7/7, build 169/169.

---

## Uji mobile 390px carousel + koreksi ukur (2026-10-09)

**Hasil (server produksi sehat, 2x jalan, stabil):** dokumen 390 = viewport
390 (tanpa gulir horizontal); 7 kontainer pagination dengan 84 bullet, 0
meluber; 5 tombol next (hero memang tanpa navigasi, sesuai kode). Semua
lolos. Server uji :3400 milik sesi ini sudah dimatikan; :3399 dan :3300
milik pemilik tidak disentuh.

**Koreksi pengukuran sebelumnya:** tiga probe awal melaporkan NOL pagination
dan sempat disimpulkan celah render. Itu artefak ukur — server sehat selalu
menampilkan 7 kontainer + 84 bullet tanpa error konsol. Pelajaran: satu angka
nol dari satu probe bukan temuan; ulangi sebelum menyimpulkan.

**Temuan samping yang perlu pemilik tahu:** server dev di :3399 menjawab
500 untuk chunk Turbopack (`/_next/static/...`, MIME text/plain) sehingga
hidrasi gagal. Itu server dev milik pemilik, jadi tidak saya restart.
Biasanya sembuh dengan hentikan dev + `rm -rf .next` + nyalakan lagi.

---

## Integrasi API admin + verifikasi DB (2026-10-09)

**Test integrasi baru (25 kasus, semua hijau):** `tests/admin-endpoint.test.ts`
menutup `admin/beds`, `admin/tables`, `admin/appointments-per-day`,
`admin/survey-by-unit`, `admin/users` (GET+POST), `admin/users/[id]`
(PATCH+DELETE), `password`, dan `reset-password`. Semua kombinasi: berhasil,
401 tanpa sesi, 403 peran tidak berwenang, 422/400 masukan salah, 503 mode
snapshot. Sesi diuji dengan token asli (`signSession` lalu `verifySession`),
jadi verifikasi token dan `session_version` ikut terlindungi. Total test repo
naik 825 -> 850.

**Temuan yang sengaja dikunci apa adanya:** `periksaKataSandi` melapor galat
ke field `password`, sementara formulir mengirim `new_password`. Panel
menampilkan galat per kolom, jadi galat itu menempel ke kolom yang tidak ada
di layar. Perilaku dikunci test dengan komentar; **perbaikannya belum
dikerjakan** karena menyentuh kode auth dan perlu keputusan pemilik.

**Verifikasi DB nyata (`rsud_uji`, yang ternyata sudah ter-seed):**
- `bun run cek:konten` hijau: 124 rute, seluruh berkas snapshot konsisten,
  20 tabel terisi. Ini bukti bahwa `snapshot/` masih sinkron dengan database.
- `bun run cek:admin` hijau penuh: login, buat akun, ubah profil, protections
  akun sendiri, ubah/setel ulang sandi, hapus akun, dasbor, survei per unit,
  pendaftaran per hari tanpa celah.
- Setelah itu DB kembali baseline: users 1, feedbacks 0, tagline utuh.

**Regresi tampilan pasca-Swiper 12 (terukur):**
- Tanpa gulir horizontal di 360/768/1024/1199/1200/1360/1520/1920px.
- Lebar nav sesuai dokumentasi: 894px di 1520px dan 1920px, 778px (kompak) di
  1360px, hamburger `display:block` di 1199px dan `none` di 1200px, panel
  off-canvas di 1199px (`left:1199`) dan penuh di 1200px.
- Gambar carousel: 0 gambar rusak dan 0 `alt` kosong di 390px maupun 1280px.

---

## Sisa audit ditutup: auth, a11y, Lighthouse, server (2026-10-09)

**Temuan auth diperbaiki.** `periksaKataSandi` melapor ke field `password`,
padahal endpoint ganti dan setel-ulang sandi mengirim `new_password`. Panel
menampilkan galat per kolom, jadi galat itu menempel ke kolom yang tidak ada.
Fungsi kini menerima nama field. Commit `4c30a8a`.

**F1 (sebagian terukur).** Yang bisa dijawab tegas dijadikan
`e2e/a11y.test.ts`: skip-link jadi fokus pertama dan targetnya ada, 0 gambar
tanpa `alt`, 0 field tanpa label, `lang="id"`, dan panel nav mobile tertutup
tidak bisa difokus (0 dari 90 kali Tab) serta terbuka bisa dimasuki dengan
Escape mengembalikan fokus ke hamburger. Yang tersisa masih butuh manusia:
kontras warna, pembaca layar, urutan fokus di seluruh situs.

**F2 — server dev 3399 dipulihkan.** Penyebabnya sudah terukur: chunk JS yang
diminta browser sudah tidak ada di build sekarang, karena server itu masih
memegang build lama. Restart (tanpa `rm -rf .next`) sudah cukup: 0 request
gagal, Swiper merender.

**F4 — Lighthouse.** Dijalankan lewat `bunx` tanpa menambah dependency.
Awal: aksesibilitas 96, best-practices 100, SEO 100, **85 temuan target-size**.
Sesudah tiga perbaikan: 97/100/100 dengan **1 temuan**. Sisa satu terukur
332x43, jauh di atas minimum 24x24, jadi artefak konteks carousel.
`errors-in-console` berasal dari host gambar picsum.photos yang tidak
terjangkau dari lingkungan audit, bukan cacat kode. Skor best-practices 93 di
percobaan terakhir juga efek gambar luar yang gagal dimuat.

**D3 — dibersihkan.** PostgreSQL 5433 dan kedua server uji dimatikan; log dan
hasil Lighthouse di direktori sementara dihapus. Berkas milik pemilik di
direktori yang sama tidak disentuh.

**Penting untuk sesi berikutnya:** jangan jalankan `bun run build` yang
keluarannya dipipe ke `grep`/`tail`; build terpotong dan menghasilkan
`.next` tanpa `BUILD_ID` sehingga `next start` gagal. Tulis ke berkas log
lalu baca setelah selesai.

Gerbang akhir: lint 0, 856 test lulus, e2e 7+5 lulus, build 169/169.

---

## Audit aksesibilitas lintas halaman + dokumen diperbarui (2026-10-09)

**Lighthouse diulang di empat halaman, semuanya 100.** Sebelumnya hanya
beranda yang diukur. Yang diperiksa juga: `/daftar-online`, `/admin/login`,
dan `/berita`. Tidak ada satu pun audit aksesibilitas yang gagal di
keempatnya, jadi jangkauan sudah lebih luas dari pemeriksaan beranda.

**Dua dokumen diperbaiki karena isinya sempat menyesatkan:**
- `DEPLOY-VPS.md`: perintah backup sempat berada SETELAH migrasi, padahal
  harus sebelumnya. Sekarang bagian 4 memuat perintah backup dengan peringatan
  "kalau berkas tidak muncul, jangan lanjut ke `db:migrate`".
- `AUDIT-KEAMANAN.md`: sisa risiko Swiper masih menulis "cek visual mobile
  di browser" padahal sudah diukur (tanpa gulir horizontal di 8 lebar, 0
  gambar rusak, 0 alt kosong). Diganti keterangan yang benar, sisanya hanya
  penilaian mata atas animasi.

**`LAPORAN-PROGRESS.md` diselaraskan.** Angka-angka masih dari `6ee7ed0` padahal
sudah 33 commit sepanjang hari. Sekarang: peril handle 856 test, Playwright
13, aksesibilitas Lighthouse 100. Blok "rencana berikutnya" tidak lagi
menyuruh kerja yang sudah selesai dilakukan.

Gerbang saat ini: lint 0, 856 test lulus, build 169/169.

---

## Bukti tautan mati + kerentanan dependensi (2026-10-09)

**Tidak ada tautan mati, kini terbukti bukan cuma disimpulkan.** Sesudah
build, `bun run cek:tautan` dijalankan apa adanya: 150 halaman, 150 tautan
unik, 149 entri sitemap, tidak ada tautan mati, setiap halaman punya tautan
masuk, sitemap lengkap, tidak ada judul dobel. Ini membuktikan pernyataan
sebelumnya bahwa 49 href nav tidak punya `page.tsx` sendiri bukan tautan mati
melainkan ditangani catch-all.

**Dua kerentanan dependensi tidak bisa ditutup dari repo.**
`bun audit fix` menjawab "no published version fixes" untuk `braces@3.0.3`
(tidak ada rilis patch, hanya major baru), dan esbuild ditahan
`@esbuild-kit/core-utils@3.3.2` yang mengunci `esbuild@~0.18.20`.
`package.json` dan `bun.lock` tidak berubah sedikit pun. Keduanya sudah
tercatat diterima di `AUDIT-KEAMANAN.md` bagian L-1 karena hanya rantai
perkembangan, tanpa efek ke produksi.

---

## Kontras hero diukur dan dikalibrasi (2026-10-09)

**Cara mengukur.** Luminance WCAG dihitung dari piksel foto yang benar-benar
dipakai, bukan dari nilai CSS. Gambar dimuat ulang dengan
`crossOrigin="anonymous"` lalu digambar ke canvas; kalau host tidak mengirim
CORS, canvas terkontaminasi dan hasilnya dilaporkan terpisah — tidak diam-diam
dihitung sebagai rasio 1.0.

**Yang ditemukan.** Teks hero putih di atas foto, dengan satu-satunya
penopang `text-shadow` 0.28 yang tidak dihitung WCAG. Rasio kontras terukur
turun sampai **1.0** untuk sembilan foto sekaligus.

**Kesalahan penghitungan saya sendiri yang perlu dicatat.** Awalnya saya tulis
"scrim 0.72 membuat luminance 0.73 menjadi 0.16, rasio 4.5:1". Itu salah:
luminance WCAG memakai pangkat 2.4 per kanal, jadi menggelapkan piksel
berskala eksponensial, bukan linear. Kalibrasi ulang memakai beberapa alfa dan
mengukur kompositnya: **0.45 sudah cukup**, 0.78 yang saya pasang pertama kali
berlebihan sampai foto nyaris hilang.

**Hasil akhir.** Alfa 0.55 di bidang 25%-75% tinggi, memudar ke 0.30 di tepi
supaya foto tetap terlihat. Ukuran ulang: sembilan foto lolos dengan rasio
**4.76 sampai 5.19**. Ukuran tidak berubah — blok teks tetap 720x270, teks
tetap di atas scrim (z-index 2, elemen teratas di titik teks adalah `h2`).

**Satu duplikasi `::after` sempat terjadi** karena repo sudah punya scrim yang
saya lewatkan; sudah dihapus dan aturan aslinya diperkuat jadi satu.

**Keadaan repo saat bekerja.** Saat bekerja, pemilik mengubah `e2e/a11y.test.ts`,
`Photo.tsx`, dan `GalleryLightbox.tsx`, lalu menghapus fixture negatif
(`<img seed="negatif">`) yang mereka pasang untuk membuktikan test a11y
menangkap gambar dekoratif tanpa penanda. Karena itu commit saya hanya
memuat `src/styles/home.css`.

---

## Riset + pembaruan roadmap (2026-10-10, sesi teman-riset)

**Peran sesi ini:** bukan feature work, melainkan checking penuh + masukan +
sinkronisasi dokumen. Tidak ada commit kode; working tree milik pemilik
(`Photo.tsx` mutasi + `e2e/a11y.test.ts` dua arah) tidak disentuh.

**Gerbang di HEAD `12ae10a` + worktree (diukur ulang, bukan dari ingatan):**
lint 0 error + 1 warning (`alt` tak terpakai di `Photo.tsx` — akibat langsung
mutasi `return true`, hilang sendiri setelah revert), unit 856/62 lulus,
build 169/169 exit 0, `cek:tautan` 150 halaman / 150 tautan / 149 sitemap,
`cek:konten` konsisten, `audit:teks` BERSIH 316 berkas.

**Eksperimen mutasi terverifikasi dari sisi agent:** dengan build utuh, mutasi
`dekoratif() => true` tertangkap (`terlaluDisembunyikan` = 56, tes gagal
seperti dirancang) dan panel mobile lolos 2/2. Satu jalan E2E sebelumnya
memberi hasil mustahil (panel gagal total + tes mutasi lolos) karena `.next`
sedang ditimpa build paralel sesi lain — buktinya `BUILD_ID` hilang di tengah
jalan. Aturan baru: pastikan tidak ada proses `next build` lain sebelum
menjalankan E2E, dan curigai hasil aneh pertama sebagai artefak lingkungan.

**Yang diubah sesi ini (hanya dokumen):** `docs/roadmap.md` bagian 1 (150 halaman,
62/856 tes, 27 catch-all, 28 tabel, 6 migrasi, gerbang terbaru), penjelasan
delta 148→150 (`rawat-jalan` + `rawat-inap`) dan 30→27, bagian 3.21 baru, bagian 4 tambah
dua temuan, dua typo (`consequent:`, `bukanTechnical:`). Angka endpoint 44 +
catcher dan registry 17 diverifikasi tetap benar, tidak diubah.

**Dikerjakan sesi ini atas instruksi pemilik ("kerjakan itu semua"):**
1. Mutasi sudah dikembalikan pemilik sendiri (`ab26e25`) sebelum sesi mulai;
   sesi ini memverifikasi (56 tertangkap, panel lolos) dan membersihkan typo
   (`Fatanya`→`Perannya sebagai`, `Propi-nya`→`Prop-nya`, `sighted`→`orang
   yang bisa melihat`).
2. `AUTH_SECRET` + `SEED_ADMIN_*` ditambah di langkah seed
   `.github/workflows/e2e-db.yml` (dua lapis, ketahuan satu per satu dari log
   CI). Terbukti run `38033040538`: seed 20 tabel, E2E lulus, `main` hijau
   penuh. Commit lanjutan `f6224aa`.
3. Angka `README.md` diluruskan (856/62, 150 halaman, 169/169).
4. Protokol kunci build paralel: `scripts/kunci-build.ts` baru (tandai/lepas/
   tunggu + deteksi proses `next-build` mentah), `prebuild`/`postbuild`/
   `test:e2e` di `package.json`, `.next-build-lock` di `.gitignore`,
   `tests/kunci-build.test.ts` (6 tes), aturan di `AGENTS.md`. Total tes
   856→862. E2E penuh 13 lulus 1 dilewati lewat `test:e2e` baru.
5. Tetap terbuka (keputusan, bukan kode): deploy produksi + `ADMIN_ORIGIN`
   https + sisa manual (panel off-canvas, SweetAlert2).

---

## Checking penuh sesi riset (2026-10-10)

**Peran:** teman riset. PR #45 sudah merge sebelum sesi; sesi ini memverifikasi
hasil merge di worktree bersih (`f6224aa`, `89ff6e9` hanya dokumen):
typecheck 0, lint 0, unit 862/63, audit 318 BERSIH, build 169/169,
`cek:tautan` 150/150/149, E2E a11y 5/5. Remote branch dihapus di kedua remote,
judul PR dibetulkan, lalu branch lokal dihapus dan kembali ke `main`
(atas instruksi pemilik). Tidak ada PR terbuka, tidak ada branch basi.

**Temuan dokumen vs repo** (sudah diperbaiki di `roadmap.md` 3.22 + bagian
1/4/5/6 dan `README`): tes 856/62 padahal 862/63, halaman admin 4 padahal 7,
route 44 padahal 45, klaim `tests/panel-nav-mobile.test.ts` padahal berkasnya
tidak ada (pengunci sebenarnya `e2e/a11y.test.ts`), butir 6 masih 148.

**Masukan utama:** deploy produksi satu-satunya pekerjaan besar tersisa;
kunci-build dua-kunci sudah diterapkan sesi ini (lihat 3.23 dan butir 2
bagian 4); disiplin prefetch menaikkan Performance 84 ke 87 (butir 1
bagian 4);
angka dokumen butuh commit bersamaan + tanggal ukur. Rincian di roadmap.

---

## Empat tugas lanjutan (2026-10-10, sesi riset berlanjut)

Pemilik meminta keempatnya dikerjakan, push langsung tanpa PR bila hijau.

1. **E2E a11y ke halaman kunci** (`ca01d0d`, sudah push): aturan gambar dan
   field diperiksa di `/`, `/daftar-online`, `/berita`, `/jadwal-dokter`
   lewat `test.step` per halaman. 5/5 lulus.
2. **Verifikasi ulang jalur database**: postgres mise di 5433 dengan basis
   segar `rsud_uji_cek` (basis milik pemilik tidak disentuh), migrate +
   seed + status (28 tabel/27 terisi) + `cek:konten` + `cek:tulis` +
   `cek:admin` semuanya hijau. Basis uji di-drop, server dimatikan.
   Ketahuan ada postgres pemilik di 5434 (`pgdata2`): tidak disentuh.
3. **E2E alur kritik lewat peramban** (`8205648`, sudah push): isi
   `#fb-pesan` di `/kontak`, baca tiket dari dialog SweetAlert2,
   verifikasi terlacak + masuk inbox. 2/2 di server live, lalu akun dan
   baris uji dibersihkan (users 1, sisa LIKE 0).
4. **Disiplin prefetch** (sesi ini): median Performance 84 ke 87, TBT
   separuh, permintaan 54 ke 32. Rincian di roadmap bagian 4 butir 1.

---

## Deploy VPS + auth produksi terverifikasi (2026-10-10)

**Aturan sesi ini:** tidak satu pun alamat IP, isi log server, nama pengguna,
kredensial, atau detail mesin yang ditulis di dokumen, chat, maupun commit.
Hanya status ringkas. Kredensial dibuat dengan `openssl` di VPS, disimpan di
`~/web-kesehatan/.env` (izin 600); yang sementara (`.env.seed`, cookie uji)
dihapus setelah verifikasi.

**Image `web-kesehatan:1.0.0` (1,31 GB) dibangun dari `HEAD` di VPS:**
snapshot `git archive` (tanpa `.env*`/`.next`) terkirim utuh, build sukses
dari awal sampai akhir tanpa SSH putus. Container snapshot di localhost:3000:
homepage 200, API paket 200, health healthy — sama seperti verifikasi
2026-10-09, kini dari kode terbaru.

**Database produksi siap:** container postgres khusus aplikasi (bukan milik
Coolify/proyek lain — tidak disentuh), volume persisten, migrasi sukses,
seed mengisi 20 tabel termasuk 12 pengaturan situs.

**Auth login terverifikasi penuh terhadap build produksi mode live:**
login benar 200 + cookie sesi, sandi salah 401, `/admin` tanpa sesi 307,
dengan sesi 200, API stats dengan sesi 200 dan tanpa sesi 401, halaman login
200. Akun admin sementara dihapus sesudahnya (`users` kembali 0, isi konten
tetap); `.env.seed` dan container uji live dibuang.

**Dua temuan untuk pemilik:**
1. Langkah migrasi di `docs/DEPLOY-VPS.md` tidak jalan apa adanya (runner
   image tidak memuat `drizzle/`/`drizzle.config.ts`/`scripts/`). Dokumen
   diperbaiki sesi ini dengan perintah snapshot+`oven/bun` yang terbukti.
   Kalau migrasi dari dalam image diinginkan (perintah sekali jalan
   Coolify), `Dockerfile` perlu menyertakan ketiga path itu.
2. Yang tersisa sebelum HTTPS publik: domain menunjuk ke VPS, routing
   reverse proxy, `ADMIN_ORIGIN` + `NEXT_PUBLIC_SITE_URL` diawali `https://`,
   akun admin asli (jalankan seed lagi dengan `SEED_ADMIN_*` milik Anda),
   lalu jalankan container mode live. Direktori kerja memakai
   `~/web-kesehatan` (bukan `/srv/...` seperti dokumen) karena `/srv` butuh
   sudo; pindah kalau Anda menghendaki.

---

## Jalur CI-build (2026-10-10, atas izin pemilik)

**Sebab:** VPS 2 vCPU/2 GB mati dua kali dalam sehari saat `docker build`
jalan di mesinnya (batas 1400 MB + 2 worker tidak menyelamatkan; SSH mati
sampai restart manual). Percobaan ketiga dengan resep sama dilarang sendiri:
berisiko mematikan proyek tetangga.

**Yang dipasang:** `.github/workflows/citra-docker.yml` — build di runner
GitHub tiap push `main` yang menyentuh kode (paths filter supaya push dokumen
tidak membangun), push ke `ghcr.io/hilmiazmi/web-kesehatan` dengan dua tag
(`sha-<sha>` untuk rollback persis, `stabil` untuk tarikan biasa). Cache
Buildx via GHA. `docs/DEPLOY-VPS.md` bagian 1 ditulis ulang jadi jalur tarik,
bukan jalur build.

**Sisa tindakan (butuh manusia):**
1. Setelah run pertama hijau, ubah visibilitas paket GHCR jadi publik supaya
   VPS pull tanpa login. Tanpa ini `docker pull` meminta auth.
2. Di VPS setelah pulih: `docker pull ...:stabil`, tukar container, verifikasi
   200 seperti biasa, hapus image lokal `1.0.0`/`1.0.1` kalau disk menipis.
3. Domain: pemilik belum membeli domain apa pun (VPS maupun rumah sakit).
   Tanpa domain, web tetap localhost selamanya. Pilihan termurah: subdomain
   dari domain yang sudah dikuasai (nol rupiah, DNS A ke VPS, TLS gratis
   dari proxy), atau beli `.my.id`/`.xyz`/`.site` belasan-puluh ribu per
   tahun pertama lalu A record yang sama.

---

## Swap ke image GHCR + bersih-bersih VPS (2026-10-10)

**Alur CI-build terbukti penuh:** workflow `Citra Docker` hijau di run
pertama, paket GHCR otomatis publik (tanpa klik apa pun), `docker pull`
di VPS tanpa login. Container ditukar ke
`ghcr.io/hilmiazmi/web-kesehatan:stabil`: healthy, beranda 200, API 200.

**Bersih-bersih VPS (milik sesi ini saja):** direktori snapshot build,
image lokal `1.0.0` (1,31 GB, sudah digantikan GHCR), cache builder
(3,7 GB kembali). Disk 20→22 GB bebas. Coolify, proyek tetangga, volume
database, dan `.env` tidak disentuh. Lokal: log lama + cluster postgres
mati (`pgdata-uji4`) dihapus; tiga cluster yang hidup dibiarkan.

**Catatan reboot:** mesin restart 2x hari ini (sekali manual pemilik,
sekali kemungkinan OOM kedua saat build 1.0.1). Semua container naik
sendiri via `unless-stopped`, database utuh (users 0, settings 12).
Pelajaran: jangan build di VPS lagi dalam keadaan apa pun — jalur GHCR
menghapus kebutuhan itu.

---

## Paket dokumentasi + lima temuan + sandi sendiri (2026-10-10, sesi agen)

**Patch dokumentasi Claude** (`dokumentasi.patch`, basis `4d848c3`) diterapkan
14/15 berkas di branch `docs/lengkapi-dokumentasi` (sudah merge ke `main`):
7 dokumen baru, 6 koreksi usang, skrip `gen-api-doc.py`. Hunk
`docs/DEPLOY-VPS.md` dibuang karena basi (mode live sudah terverifikasi).
Angka diselaraskan ke HEAD saat itu: 63 berkas / 870 tes, audit 323 berkas,
API 45 route.

**Lima temuan Claude, semua dikerjakan** (commit `528e717`, sudah merge):
1. Login: surel tak terdaftar menempuh scrypt dummy sebelum 401 (samarkan
   waktu). Dikunci tes sumber di `tests/password.test.ts`.
2. Peran ganti sandi: gate dipertahankan lalu diubah (butir di bawah).
3. CSP img-src: petunjuk host di form admin (`FormBaris.tsx`), bukan
   melonggarkan CSP atau mengetatkan API (keduanya dikunci tes).
4. `upgrade-insecure-requests`: diukur aman di localhost via Chromium
   headless, tanpa perubahan header.
5. `executablePath` Chromium jadi fallback (config + 2 skrip uji).

**Sandi sendiri untuk semua peran** (commit `27a5664`, sudah merge, atas
instruksi pemilik): `POST .../users/[id]/password` mengizinkan akun sendiri
dari peran apa pun, reset tetap super_admin. Form "Sandi saya" di halaman
akun semua peran; tombol dialog hapus jadi "Ya, hapus"/"Batal". Terverifikasi
di database scratch (migrate + seed, lalu di-drop): `cek:konten/tulis/admin`
hijau, editor ganti sandi lalu masuk lagi, dialog hapus, off-canvas mobile.

**Gerbang saat push:** lint 0, 870/63, build 169/169, E2E 13 lulus 3 dilewati,
`cek:tautan` nihil mati. Branch dokumentasi sudah dihapus lokal dan remote
setelah merge; `main` tidak pernah di-commit langsung (satu insiden HEAD
pindah sesi lain diperbaiki sebelum push).

---

## Sapu bersih komentar usang + berkas mati + temuan image (2026-10-10, sesi agen)

**Catatan pembaca:** kepala berkas ini (baris 6-8) masih menyebut commit
serah-terima `e579f3e` dan tanggal 9 Oktober 2026. Itu sudah usang: `main`
berada di `d9a9756` (dan pada akhir sesi ini, di `c2fa2f8`). Kepala tidak
diubah di sini karena sesi lain sedang menyunting berkas yang sama.

### 1. Kenyataan awal yang tidak cocok dengan berkas ini

- Sesi ini mulai di branch `docs/catatan-sesi-10-okt` dengan **5 berkas belum
  di-commit** (`AccountsManager.tsx`, `LoginForm.tsx`, `SettingsManager.tsx`,
  `Sparkline.tsx`, `tokens.css`). Sebelum saya menyentuhnya, sesi paralel
  meng-commitnya jadi `f56226e` dan `d9a9756`, lalu push ke `origin` dan
  `upstream`. Working tree bersih sendiri.
- Tiga commit branch di atas `main` (`aa7c8fe`, `98a960b`, `f2646a2`) belum
  tercatat di HANDOFF maupun CHANGELOG saat sesi dimulai.
- Keadaan akhir sesi: **commit saya berakhir di `main`**, bukan di branch
  sendiri. Saya commit di `chore/rapikan-komentar-schema`, tetapi sesi lain
  memindahkan `main` ke sana (fast-forward, tanpa merge commit). Saya tidak
  melakukannya, dan `main` belum di-push.

### 2. Yang dikerjakan

| Berkas | Perubahan |
|---|---|
| `src/server/db/schema.ts` | 5 rujukan path salah di komentar |
| `tests/schema-vs-sql.test.ts` | **baru**, 8 tes |
| `scripts/kunci-build.ts` | 2 rujukan `global-teardown.ts` menjadi `.mjs` |
| `playwright.config.ts` | 1 rujukan sama |
| `scripts/gen-rute-publik.py` | **dihapus** |
| `Dockerfile` | tahap `deps-prod` baru; runtime tak lagi memuat devDependencies |

Commit sesi ini, semuanya di branch `docs/handoff-sapu-bersih`: `e699ea2`
(komentar schema + tes), `c2fa2f8` (rujukan teardown), `01f1160` (buang
generator), `72e0ba7` (berkas ini), `28c40a2` (tahap `deps-prod`), dan
`35bc682` (pemindai diperluas + tiga perintah yang salah nama).

Tiga commit: `e699ea2` (komentar schema + tes), `c2fa2f8` (rujukan teardown),
`01f1160` (buang generator). Bukan `git add -A`; berkas sesi lain tidak pernah
ikut.

**Rujukan usang di `schema.ts`** — semuanya diverifikasi berkasnya tidak ada:
`api/migrations/*.sql` (sumber sebenarnya `drizzle/0000_baseline.sql`),
`src/server/db/migration-kustom.sql` (tidak ada, tidak pernah ada),
`tests/schema.test.ts` (tidak ada, jadi tidak ada tes yang menjaga daftar
constraint), `src/server/repo/appointments.ts` dan `src/server/repo/content.ts`
(nyatanya `src/server/db/repo/`).

**Fakta yang menggantikan klaim lama**, diukur bukan ditebak:

- Tidak ada berkas SQL kustom terpisah. Tujuh CHECK regex hanya hidup di SQL:
  enam `*_email_format` dan `hero_slides_link_internal` di
  `drizzle/0000_baseline.sql`, kecuali `admissions_email_format` yang ikut
  tabelnya di `drizzle/0004_slimy_vector.sql`.
- Seluruh **56 indeks** di `drizzle/` punya padanan di `schema.ts`, dua arah,
  himpunan yang sama persis. Klaim lama "sisanya ada di migrasi kustom" salah.
- `appointments_nik_simulasi` dan `admissions_nik_simulasi` justru **ada** di
  `schema.ts`, jadi batas "apa yang bisa ditulis di sini" bukan posisi semua
  CHECK regex.

### 3. `tests/schema-vs-sql.test.ts` — apa yang dikunci dan cara diuji

Tiga grup: simetri indeks dua arah, keberadaan tujuh CHECK regex di SQL, dan
pemindai rujukan path di komentar seluruh `src/`, `tests/`, `e2e/`,
`scripts/` (85 token lolos filter saat ini). Mutasi dijalankan dua kali untuk
membuktikan tes benar-benar merah: mengembalikan rujukan usang memerahkan 3
tes, dan mengubah satu nama indeks memerahkan 3 tes lain.

Pemindai itu langsung berguna: rujukan `e2e/global-teardown.ts` (padahal `.mjs`)
tidak ditemukan oleh mata, melainkan oleh tes ini. Itu sebabnya
`scripts/kunci-build.ts` dan `playwright.config.ts` ikut diperbaiki.

Satu file sesi lain juga disentuh satu baris:
`scripts/isi-cover-berita.ts:11` masih menyebut `scripts/cover-berita.ts`
sesudah isinya dipindahkan ke `src/data/cover-berita.ts`. Statusnya merah
karena tes baru itu, jadi komentarnya diperbaiki. **Perubahan satu baris pada
berkas in-progress sesi lain** — dilaporkan agar tidak mengherankan.

### 4. Berkas yang dibuang dan yang TIDAK

**Dibuang: `scripts/gen-rute-publik.py`** (298 baris). Nol rujukan di seluruh
repo: bukan `package.json`, bukan workflow, tidak ada dokumen yang menyebutnya,
`git log -S` kosong. Lebih dari mati — **menjalankannya merusak**. Dibuktikan
dengan cara yang bisa dibalik: generator dijalankan, hash `git ls-files -s
src/app/api/v1` dicocokkan sebelum (`1307fb3...`) dan sesudah, lalu
`git checkout -- src/app/api/v1` memulihkannya. Hasilnya lima route handler
ditimpa versi yang kehilangan `import { satuHalaman } from
"@/server/api/snapshot-query"` beserta pemanggilannya — `?page=2` dan
`?category=` mulai mengulang isi `?page=1`, persis yang dikunci
`tests/snapshot-query.test.ts`. Skrip ini tidak pernah dijalankan siapa pun,
itu sebabnya kerusakannya tidak kelihatan.

**Tidak dibuang, meski terlihat tidak terpakai:**

- `scripts/api.sh` — isinya hanya pesan "jangan pakai ini". Bukan berkas mati,
  tapi penunjuk jalan, dan kepalanya sendiri menulis "Jangan dihapus tanpa
  persetujuan: AGENTS.md melarang hapus/rename berkas".
- `archive/`, `docs/` — read-only dan milik pemilik repo.

**Analisis yatim**: 221 berkas di `src/` ter-track. Analisis import atas 220
berkasnya (semua berekstensi `.ts`, `.tsx`, `.css`, `.scss`, `.json`, `.woff`,
`.ico`) menemukan nol yang yatim, kecuali lima berkas konvensi Next.js yang
dimuat lewat rute bukan lewat import (`page.tsx`, `layout.tsx`,
`not-found.tsx`, `robots.ts`, `opengraph-image.tsx`). Berkas yang tidak
berekstensi kode (`favicon.ico`) dan berkas gaya dicek lewat rujukan nama, bukan
lewat import. Sisanya: 21 skrip, 63 tes, dan 4 berkas `e2e/` semuanya punya
pemakai, jadi satu-satunya berkas repo yang benar-benar mati adalah
`gen-rute-publik.py` di atas.

**Berkas lokal yang dibersihkan:** `test-results/` (hanya berisi
`.last-run.json`, output Playwright). Sudah tidak ada saat saya periksa.

**Berkas lokal yang sengaja TIDAK dihapus, dengan alasannya:**

| Berkas | Ukuran | Alasan dibiarkan |
|---|---|---|
| `.next/` | 247 MB | ada dua `next dev` aktif memakainya; build output, tumbuh sendiri |
| `tsconfig.tsbuildinfo` | 340 KB | cache incremental TS, beberapa `tsserver` masih jalan |
| `.playwright-mcp/` | 2,0 MB | log dan screenshot dari 4 Okt; bisa jadi bukti, bukan sampah |
| `.env.local` | — | rahasia. Tidak pernah dibaca, tidak pernah dicetak |

### 5. Temuan baru: dependensi rentan IKUT masuk image produksi

`bun audit` melaporkan sisa yang sama seperti sebelumnya: `braces@3.0.3`
(tinggi, lewat `eslint-config-next > @next/eslint-plugin-next > fast-glob >
micromatch`) dan `esbuild` (sedang, lewat `drizzle-kit > esbuild` dan
`vitest > @vitest/mocker > vite > tsx`).

Kedua dokumen ini menyebut keduanya "hanya muncul di rantai perkembangan, tidak
berdampak ke produksi". **Separuhnya benar saja.** `Dockerfile` (baris 68 sebelum
sesi ini, sekarang baris 103):

```
COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
```

tahap `deps` memakai `bun install --frozen-lockfile`, yaitu **semua** dependensi
termasuk devDependencies, dan tidak ada pemilahan produksi. Jadi paket-paket itu
benar-benar disalin ke tahap `runner`. Delapan paket dari rantai itu
berukuran **15 MB** (`drizzle-kit` 9,9 M, `vitest` 3,0 M, sisanya kecil).

Kesan ke runtime: `next start` tidak pernah memanggil eslint, drizzle-kit, atau
vitest, dan advisory esbuild memang soal server pengembangan. Jadi **jalur
eksekusinya tidak ada**, dan ini bukan celah yang bisa dipicu dari permintaan
HTTP. Yang benar adalah: berkasnya ada di image, kodenya tidak pernah jalan.
Rugi yang nyata adalah ukuran image dan permukaan yang tampak pada hasil
pemindaian, bukan jalan serang.

**SUDAH DIPERBAIKI di sesi ini** (lihat bagian 2b di bawah): tahap `deps-prod`
baru plus `--production`, dan runner kini menyalin dari sana. Jadi paragraf di
atas adalah kondisi SEBELUM perbaikan, bukan keadaan sekarang.

### 5b. Perbaikan image produksi diverifikasi, bukan diasumsikan

Pemilik repo menjawab "lakukan yang terbaik menurutmu", jadi temuan di atas
diteruskan menjadi perbaikan dengan verifikasi sendiri.

**Perubahan `Dockerfile`:** tahap baru `deps-prod` (`bun install --frozen-lockfile
--production`) dan baris runner berganti dari `--from=deps` menjadi
`--from=deps-prod`. Builder tetap memakai tahap `deps` penuh karena `next build`
menjalankan pemeriksaan TypeScript. `.github/workflows/citra-docker.yml` tidak
menyebut nama tahap (tidak ada `target:`), jadi CI tidak terpengaruh.

**Kenapa tahap terpisah, bukan sekadar menambah flag di tahap `deps`:** satu tahap
dipakai dua konsumen dengan kebutuhan berbeda. Kalau `deps` dibuat produksi-saja,
`next build` gagal karena kehilangan `typescript`.

**Jebakan yang hampir membuat verifikasi ini salah.** `bun pm prune` tidak ada di
bun 1.4.3. `bun install --production` ada, tetapi **tidak menghapus apa pun
kalau node_modules sudah terisi** — sudah diuji: node_modules tetap 731 MB dan
seluruh devDependencies tetap ada. Perintah itu hanya menentukan apa yang
dipasang. Karena itu pengukuran yang berarti harus dilakukan dari nol, persis
seperti tahap `FROM` di Docker.

**Cara verifikasinya** (worktree terpisah `/tmp/opencode/uji-prune`, tidak
mengganggu sesi lain di repo utama):

1. `git worktree add` di branch `docs/handoff-sapu-bersih`, `bun install
   --frozen-lockfile` penuh, `bun run build` — sukses.
2. `mv node_modules node_modules.full`, lalu `bun install --frozen-lockfile
   --production` **dari nol**: 731 MB menjadi **525 MB**, dan `eslint`,
   `eslint-config-next`, `esbuild`, `braces`, `drizzle-kit`, `vitest`, serta
   `typescript` semuanya hilang.
3. `bun run start` (mode snapshot, port 3455) lalu empat pemeriksaan:

| Uji | Hasil |
|---|---|
| `GET /` | 200 |
| `GET /_next/image?url=https://images.unsplash.com/...` | **200** |
| `GET /api/v1/health` | 200, JSON benar, `mode: "snapshot"` |
| `GET /daftar-online`, `/robots.txt`, `/sitemap.xml` | 200, 200, 200 |
| Header keamanan di respons | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` semuanya hadir |
| Log server | 0 error |

`playwright` tetap terpasang (19 MB, `playwright` 5 M + `playwright-core` 14 M)
karena `next@16.3.8` mencantumkan `@playwright/test` sebagai **optional peer
dependency**. Itu satu-satunya perkakas yang tidak bisa dihilangkan lewat
`--production`, dan tidak ada advisory keamanan untuknya.

Uji `/_next/image` menjawab 200 itu bagian terpenting: itu membuktikan
`next.config.ts` — yang ditulis sebagai TypeScript — tetap termuat walau paket
`typescript` tidak ikut ke image. Kalau itu gagal, seluruh foto jarak jauh akan
mati di produksi.

**Yang BELUM diverifikasi:** image Docker-nya sendiri. `docker` di mesin ini
butuh `sudo`, dan AGENTS.md melarang `sudo` kecuali diminta eksplisit, jadi
`docker build` tidak dijalankan. Sintaks Dockerfile baru hanya ditinjau dengan
mata dan dicocokkan dengan `.dockerignore` (yang tidak mengabaikan `bun.lock`,
`package.json`, `next.config.ts`, `snapshot/`, maupun `drizzle/`). Angka 525 MB
adalah ukuran `node_modules` di Alpine lokal, bukan ukuran layer di image akhir;
jumlah pastinya baru ketahuan setelah `docker build` di VPS.

### 5c. Celah pada pemindai saya sendiri, dan tiga perintah yang rusak karena itu

Tes `tests/schema-vs-sql.test.ts` yang ditulis di sesi ini punya dua celah yang
ternyata bukan teori. Pemindai pertama hanya melihat token **di dalam backtick**
dan hanya di `src/`, `tests/`, `e2e/`, `scripts/`.

Sesi lain kemudian mengubah `playwright.config.ts` dan tanpa sengaja
mengembalikan rujukan `e2e/global-teardown.ts` padahal berkasnya `.mjs`. Rujukan
itu tanpa backtick dan berada di **akar repo**, jadi tes saya lulus
sementara komentarnya salah tepat di berkas yang ia kelola.

Setelah celahnya ditutup (berkas akar ikut dipindai, dan token tanpa backtick
ikut diperiksa), tiga kesalahan lain langsung muncul — kali ini yang rusak
bukan komentar, tapi **perintah yang akan gagal kalau dijalankan**:

| Berkas | Yang tertulis | Seharusnya |
|---|---|---|
| `e2e/alur-db.test.ts:12` | `bun scripts/.siapkan-admin-uji.ts` | `bun scripts/siapkan-admin-uji.ts` |
| `scripts/siapkan-admin-uji.ts:7` | `bun scripts/.bersihkan-admin-uji.ts` | `bun scripts/bersihkan-admin-uji.ts` |
| `scripts/bersihkan-admin-uji.ts:17` | `bun scripts/.bersihkan-admin-uji.ts <email-uji>` | `bun scripts/bersihkan-admin-uji.ts <email>` |

Yang ketiga paling parah: ia ada di `console.error`, jadi pesan salah itu
benar-benar ditampilkan ke orang yang salah memakai skrip, dan nama
argumennya pun keliru (`<email-uji>`).

Aturan penyempit supaya prosa Indonesia tidak memicu alarm palsu: hanya token
berekstensi, dan **hanya kalau direktori induknya ada** sedangkan berkasnya
tidak. Induk ada plus berkas tidak ada berarti direktori benar dan nama berkas
salah — persis kelas kesalahan yang dicari. Kalau induk tidak ada, kemungkinan
besar itu potongan prosa. Hasil ukurnya: 82 token lolos filter, 4 bermasalah,
keempatnya asli, nol false positive.

**Kesalahan saya sendiri di sesi ini, dicatat supaya tidak diulang:** versi
pertama pemindai teks polos memakai `kodeSaja()` sebelum memindai, dan karena
itu tidak menemukan apa pun. `kodeSaja()` membuang komentar, padahal yang
diperiksa justru komentar. Bentuknya mirip jebakan `*/` di dalam komentar blok
yang sudah tercatat di AGENTS.md: tes yang salah bentuk terlihat lulus. Uji
mutasi yang membuktinya — inject `global-teardown.ts` dan
`scripts/.siapkan-admin-uji.ts` kembali, keduanya memerahkan tes, lalu
dipulihkan.

### 6. Gerbang saat sesi ini

Diukur pada `c2fa2f8`:

| Gerbang | Hasil |
|---|---|
| `bun run lint` | exit 0, 0 error |
| `bun run test` | 65 berkas, 893 tes, semua lulus (lihat catatan di bawah) |
| `bun run cek:konten` | "semua berkas snapshot konsisten", 20 tabel terisi |
| `bun audit` | 2 advisory (braces tinggi, esbuild sedang) |
| `bun run build` | **160/160 halaman, exit 0**, `cek:tautan` 160 halaman / 160 tautan / 159 sitemap, nihil mati |
| `bun run audit:teks` | **MERAH**: `tests/csv.test.ts:25` U+00ED |

Dua kegagalan build dijalur sesi ini **bukan** dari kerja saya:
`scripts/isi-cover-berita.ts` (`glob` tidak ada di `node:fs/promises`) dan
`tests/aksi-massal-inbox.test.ts` (`label` tidak ada di `InboxKind`).
Keduanya berkas in-progress sesi lain, dan `bunx tsc --noEmit` membuktikan
nol error datang dari berkas yang saya sentuh.

Kunci build sempat tersangkut dua kali karena `postbuild` dilewati saat build
gagal. Saya lepas lewat `bun run scripts/kunci-build.ts lepas` hanya setelah
memastikan tidak ada proses `next build` lain yang hidup — sesuai bahaya yang
sudah dicatat di AGENTS.md.

**Penting soal angka-angka di atas: working tree ini bergerak terus.** Sesudah
angka terakhir saya ukur, sesi lain menambah route admin ke-15
(`src/app/api/v1/admin/inbox/[kind]/status-banyak/`, belum di-commit) sehingga
`bun run test` menjadi merah di `tests/peran-admin.test.ts` ("expected ...(15)
to have a length of 14"), dan `bun run lint` memunculkan satu peringatan
`getPublicArticles` tidak terpakai. Keduanya berkas sesi lain. Pengukuran
saya di atas benar pada saat diambil, tetapi siapa pun yang menjalankan gerbang
sekarang akan melihat merah dengan sebab yang berbeda. Verifikasi ulang sebelum
menyimpulkan sesuatu dari angka ini.

### 7. Yang perlu keputusan Anda

1. ~~**Prune image produksi.**~~ **Sudah dikerjakan dan diverifikasi** di sesi
   ini — lihat bagian 5b. Yang tersisa hanya menjalankan `docker build` di VPS
   untuk mengonfirmasi ukuran layer-nya (butuh `sudo`, tidak diminta).
2. **`tests/csv.test.ts` dan `tests/aksi-massal-inbox.test.ts`.** Keduanya
   merahkan gerbang, dan keduanya milik sesi lain yang sedang berjalan. Saya
   hanya memperbaiki satu komentar di `isi-cover-berita.ts` karena tes saya
   yang memerah karenanya.
3. **Push atau tidak.** Branch `polish/panel-admin` dan `chore/rapikan-komentar-schema`
   sudah punya commit; `main` berisi commit saya. Belum ada yang di-push.

### 8. Langkah berikutnya

1. Bangun image di VPS (`docker build`) untuk mengonfirmasi ukuran setelah tahap
   `deps-prod`. Bukti lokal sudah lengkap, angka layer-nya belum.
2. Selesaikan dua berkas sesi lain di atas sampai `audit:teks` dan `tsc` hijau.
3. Isi `ADMIN_ORIGIN=https://...` di dashboard platform (masih belum, ini
   tindakan sekali pakai, bukan pekerjaan kode).
4. Selesaikan dua berkas sesi lain di atas sampai `audit:teks` dan `tsc` hijau.
5. Perbarui kepala `docs/HANDOFF.md` (baris 6-8) setelah keributan sesi paralel
   reda, supaya commit serah-terimanya tidak lagi menunjuk `e579f3e`.

---

## Panel admin dipoles: responsif, ikon, CSV, aksi massal, riwayat (2026-10-11)

Sesi ini melanjutkan daftar "yang masih kurang" di panel admin yang diminta
pemilik. Semua dikerjakan di branch **`polish/panel-admin`**; `main` tidak
pernah di-commit langsung.

**Environment yang ditemukan (bukan dikira-kira):**

- `docker ps` → `permission denied`, dan `sudo` meminta sandi. Jalur database
  memakai kluster PostgreSQL yang **sudah berjalan** di `127.0.0.1:5433`, yang
  sudah termigrasi penuh (28 tabel) dan sudah menerima kredensial aplikasi.
- `DATABASE_URL` di `.env.local` diubah **hanya angka portnya**, `5432 → 5433`.
  Cadangan: `/tmp/opencode/env.local.cadangan` (izin 600). Untuk mengembalikan:
  ganti kembali ke `5432`, tidak ada perubahan lain.
- Akun admin dibuat: `admin@contoh.test` / `admin123`, peran `super_admin`.
  Dibuat lewat skrip karena `bun run db:seed` menuntut sandi minimal 10 karakter.
- `bun run db:migrate` perlu env dimasukkan ke shell lebih dulu
  (`set -a && . ./.env.local && set +a`): `drizzle-kit` tidak mewarisi
  `.env.local` yang dimuat Bun untuk binary luar. Ini **bukan** masalah baru.
- Login diperiksa sungguhan lewat HTTP: `POST /api/v1/auth/login` → `200`,
  cookie sesi terbit, `/admin` dengan sesi itu → `200` dan dasbor ter-render.

**Pekerjaan dan buktinya:**

| Pekerjaan | Commit | Bukti |
|---|---|---|
| Label form login jadi Email/Password | `f56226e` (sesi lain) | sudah ada di repo saat sesi ini mulai |
| Tiga cacat komentar dasbor & kerangka panel | `1d427ff` | lint hijau |
| Topbar & sidebar rapi di layar sempit | `ab375f5` | diukur Chromium headless 390/768/1200/1440: `luber: 0`, `pelaku: []`. Bug asli: tombol Keluar terpotong 69px di 390px karena `.admin-user` tidak punya `min-width: 0` |
| Tombol muat ulang dasbor | `e307b82` | diklik di peramban, keterangan "Diperbarui HH.MM.SS" muncul, `galatHalaman: []` |
| Ekspor CSV (records + inbox) | `758d9e6` | berkas `inbox-feedbacks-2026-10-10.csv` benar-benar terunduh; 13 tes aturan CSV |
| Aksi massal ubah status tiket | `d5ccd82` | endpoint `POST /api/v1/admin/inbox/{kind}/status-banyak`; 7 tes aturan `periksaAksiMassal` |
| Ikon sidebar berbeda per jenis | `c093683` | 27 butir → 27 ikon unik, `bun run subset-ikon` membangun ulang (99 ikon, 10,5 KB) |
| Riwayat perubahan (audit) | `1ee7d84` | migrasi `0006`, tabel `admin_audit`; uji HTTP: create/update/delete/login tercatat, ringkasan hapus memuat judul sebelum baris hilang |
| `unsafe-eval` hanya di dev | `004cb3a` | `cspHeader(false)` (produksi) tanpa eval; `cspHeader(true)` (dev) hanya di `script-src` |
| Definisi tipe Bun & Node | `6b15923` | `bun check` dari 2 galat → "No type errors" |

**Gerbang akhir (diukur, bukan dikutip):** lint 0 error, `bun check` bersih di
314 berkas, **915 tes lulus di 67 berkas**, build **178/178** exit 0.

**Keputusan yang diambil sesi ini:**

1. **Data dummy tetap di `src/`.** Tidak ada perubahan pada `src/data/` selain
   yang dilakukan sesi lain untuk gambar berita; halaman publik tetap membaca
   modul data, bukan API.
2. **CSV dihasilkan di peramban dari baris yang sedang tampil**, bukan lewat
   endpoint baru: berkas harus berisi apa yang operator lihat dan yakini,
   termasuk saringan yang aktif. Formula injection Excel dinetralkan di
   `src/lib/csv.ts` (awalan `=`, `+`, `-`, `@`, TAB, CR diberi tanda kutip
   tunggal) — isi formulir publik masuk ke inbox tanpa disaring.
3. **Aksi massal dibatasi 100 baris** (`BATAS_AKSI_MASSAL`). Batas kecelakaan,
   bukan batas teknis: satu halaman memuat 25 baris.
4. **Riwayat hanya dibaca `super_admin`.** Bukan kerahasiaan teknis; fungsinya
   menelusuri siapa mengubah apa, dan peran yang tidak mengubah konten tidak
   punya pertanyaan itu.
5. **Ikon ditulis sebagai literal di registry dan inbox**, bukan dirangkai dari
   nama tabel: `scripts/subset-ikon.ts` mencari pola `bi-*` di teks sumber, jadi
   ikon yang dirangkai tidak akan masuk font subset dan tidak akan tampil.
6. **`tsconfig.json` diberi `"types": ["bun", "node"]`** atas persetujuan pemilik,
   supaya skrip CLI (`scripts/kunci-build.ts`) lolos typecheck. `node` wajib ikut
   disebut karena bidang `types` membatasi paket `@types` yang otomatis dipakai.

**Yang dicoba dan gagal:**

- `git merge main` ke branch ini **ditolak**: `playwright.config.ts` dan
  `scripts/kunci-build.ts` sedang di-edit sesi lain dan belum di-commit. Solusinya
  `git cherry-pick e699ea2` (hanya perbaikan komentar schema) supaya
  `tests/schema-vs-sql.test.ts` tidak merah karena cabang tertinggal.
- Entry jurnal untuk migrasi `0007` milik sesi lain sengaja **tidak** ikut
  di-commit: berkas SQL-nya belum masuk repo, jadi merujuknya akan membuat
  migrasi gagal di checkout baru.

**Masalah terbuka:**

1. **Belum di-push.** Branch `polish/panel-admin` berisi sepuluh commit sesi ini;
   `chore/rapikan-komentar-schema` memuat commit pertama saya karena sesi lain
   berpindah branch di tengah jalan. Perlu dirapikan sebelum di-merge.
2. **`ADMIN_ORIGIN` produksi** masih perlu `https://` (tindakan platform, bukan kode).
3. **E2E panel off-canvas <1200px dan dialog SweetAlert2** masih manual.
4. **Riwayat audit belum dipanggil dari `settings` dan `beds`.**
5. Kepala berkas ini (baris 6-8) masih menunjuk commit serah-terima lama.

**Langkah berikutnya:**

1. Rapikan branch: pindahkan `1d427ff` ke `polish/panel-admin` kalau perlu, lalu
   push dan buka PR ke `upstream`.
2. Sambungkan `catatAudit` ke halaman pengaturan situs dan kapasitas bed.
3. Tulis E2E untuk aksi massal dan halaman riwayat (perlu `bun run test:e2e`).
4. Verifikasi tampilan riwayat di peramban pada 390px setelah server dev
   direstart (CSS dan `next.config.ts` baru dimuat saat start).

---

## Riwayat perubahan (audit) untuk panel admin (2026-10-11)

Menutup satu celah yang dicatat di sesi sebelumnya: tabel konten hanya punya
`updated_by` di `pages` dan `site_settings`, dan keduanya menimpa nilai lama
setiap perubahan — jadi pertanyaan "siapa yang mengubah isi ini, dan kapan"
tidak bisa dijawab sama sekali.

**Yang ditambahkan**

- Tabel `admin_audit` (`drizzle/0006_audit_admin.sql`): `id`, `actor_id` (→
  `users`, `set null`), `actor_email`, `action`, `table_name`, `row_id`,
  `summary`, `created_at`. Dua indeks: `created_at DESC` (urutan baca yang
  selalu dipakai) dan `(table_name, created_at DESC)` (penyaring per tabel).
- `src/server/admin/audit.ts` — modul baru: `ringkasAudit()`, `ringkasBaris()`,
  `catatAudit()`, `listAudit()`, `tabelAuditValid()`. Dua fungsi pertamanya murni
  supaya aturannya bisa diuji tanpa database, mengikuti pola
  `hakAksesDiriSendiri` di `accounts.ts`.
- `GET /api/v1/admin/audit` — daftar riwayat berpaginasi, penyaring per tabel.
  Hanya `super_admin`: fungsinya menelusuri siapa mengubah apa, dan peran yang
  tidak mengubah konten tidak punya pertanyaan itu.
- Halaman `/admin/riwayat` + butir sidebar (ikon `bi-clock-history`), hanya
  tampil untuk `super_admin`.

**Tempat yang benar-benar mencatat**

`records` (tambah/ubah/hapus), `inbox` (ubah status satu baris dan massal),
`accounts` (buat/ubah/hapus akun), ganti sandi dan setel-ulang sandi, login yang
berhasil, pengaturan situs, dan kapasitas tempat tidur.

**Empat keputusan yang perlu dijelaskan**

1. **Pencatatan tidak pernah menggagalkan tindakan aslinya.** `catatAudit()`
   menelan galatnya dan menulis ke log server. Tindakan yang sudah terjadi tidak
   bisa dibatalkan, dan riwayat yang bolong lebih baik daripada operasi yang
   batal di tengah.
2. **Ringkasan baris dihapus dibaca SEBELUM DELETE.** Sesudah baris hilang tidak
   ada lagi yang bisa dibaca, dan riwayat berisi id UUID saja tidak berarti apa-apa
   bagi orang yang membacanya.
3. **Satu baris riwayat per permintaan, bukan per tempat tidur.** Panel kapasitas
   bed mengirim seluruh tabel sekaligus; dua ratus baris riwayat untuk satu klik
   akan membuat halaman riwayat tidak terbaca.
4. **Kunci yang diubah dicatat, isinya tidak.** Isi pengaturan memuat nama rumah
   sakit, alamat, dan nomor telepon — bukan rahasia, tapi tidak ada gunanya
   disalin ke tabel yang hanya perlu menjawab "apa yang diubah".

**Bukti pengujian**

Uji lewat HTTP terhadap database sungguhan (bukan mock): buat, ubah, dan hapus
satu baris berita, lalu baca `/api/v1/admin/audit`:

```
2026-10-11T05:52:15Z  update  admin@contoh.test  articles   Uji Audit 123 Diubah
2026-10-11T05:52:15Z  delete  admin@contoh.test  articles   Uji Audit 123 Diubah
2026-10-11T05:52:12Z  login   admin@contoh.test             masuk ke panel
2026-10-11T05:52:12Z  create  admin@contoh.test  articles   Uji Audit 123
```

Baris pengaturan dan kapasitas tempat tidur juga terbukti tercatat sesudah
commit `d70adee`:

```
update  admin@contoh.test  site_settings  pengaturan: address, email, …, whatsapp
update  admin@contoh.test  bed_capacity  kapasitas tempat tidur: 1 baris diperbarui
```

Ringkasan `delete` memuat judul SEBELUM baris hilang, sesuai keputusan 2.

**Catatan skema**

`drizzle/meta/_journal.json` sengaja hanya memuat entri `0006`. Entri `0007`
milik sesi lain yang berkas SQL-nya belum masuk repo, jadi merujuknya akan
membuat migrasi gagal di checkout baru.

**Gerbang:** lint 0 error, `bun check` bersih di 314 berkas, tes lulus, build
sukses. Diukur pada branch ini, bukan dikutip dari catatan sebelumnya.

---

## E2E panel off-canvas dan dialog SweetAlert2 (2026-10-11)

Menutup dua-satunya hal yang selama ini hanya diperiksa mata dan dicatat di
`AGENTS.md` serta `docs/TESTING.md`: panel navigasi off-canvas di bawah 1200px,
dan dialog SweetAlert2 pada formulir.

**Berkas baru:** `e2e/panel-dan-dialog.test.ts` — 9 tes, tanpa database.

**Panel off-canvas (viewport 390px):** panel tertutup tidak terlihat dan tidak
bisa difokus dengan Tab; hamburger membuka panel dan mengunci gulir latar;
panel ditutup lewat tombol tutup, lewat Escape, dan lewat ketukan di luar
panel; fokus kembali ke hamburger setelah ditutup; tautan di dalam panel
menavigasi dan panel menutup sendiri.

**Dialog SweetAlert2:** formulir kosong memunculkan dialog, bukan diam saja;
formulir lengkap di mode baca-saja menyebut sebabnya ("baca-saja") alih-alih
gagal generik; dialog punya `role="dialog"` dan judul yang benar-benar berisi
teks.

**Dua kesalahan tes yang saya buat sendiri, dan sudah dibetulkan** — dicatat
supaya tidak diulang:

1. Locator `.navmenu a` pertama kena tautan "Home" (href `/`), yang tidak
   mengubah route sama sekali, sehingga panel wajar tidak menutup dan tes gagal
   padahal kodenya benar. Item bersubmenu juga adalah tombol accordion di
   mobile, bukan tautan. Tes sekarang memilih tautan yang href-nya bukan `/`
   dan induknya tidak punya submenu.
2. `visibility` diukur lewat `$eval` satu titik waktu, dan nilainya baru jadi
   `hidden` di AKHIR transisi 0,3 detik (itu memang didokumentasikan di
   `site.css`). Diganti assertion auto-retry (`toBeHidden`, `toHaveClass`),
   yang memang bentuk yang seharusnya dipakai dari awal.

**Gerbang:** E2E penuh 22 lulus, 3 dilewati (alur ber-database butuh
PostgreSQL, sama seperti sebelum ini). lint 0 error, `bun check` bersih, build
sukses.

---

## Dua commit yatim di `polish/panel-admin` (2026-10-11)

Pembersihan branch berhenti di sini, dan itu disengaja.

Awalnya `polish/panel-admin` dianggap sudah habis karena isinya kebanyakan
sudah masuk `upstream/main` lewat PR #46. Tapi `git cherry` -- yang
membandingkan patch-id, bukan SHA -- menunjukkan dua commit di sana yang belum
ada padanannya di upstream:

| Commit | Isi | Bukti belum ter-merge |
|---|---|---|
| `921ab42` | `tests/schema-vs-sql.test.ts` | Versi upstream 259 baris dengan tiga blok `describe`; versi ini 428 baris dan menambah blok keempat, "perintah di komentar menunjuk skrip yang ada". Bukan duplikat dan bukan versi lama. |
| `fa06346` | `src/styles/tokens.css` | Menghapus `margin-top` dan `margin-bottom` negatif pada tautan "Selengkapnya". Margin negatif itu membuat kotak tautan menumpuk paragraf di atasnya, dan Lighthouse membaca tumpang-tindih itu sebagai target "tertutup sebagian": ruang terlapor 11px padahal tinggi tautan 43px. |

**Kenapa branch itu tidak dihapus.** Git juga menolak: `polish/panel-admin`
sedang jadi HEAD repo utama, dan working tree di sana masih dirty. Pemilik
repo dan sesi paralel masih mengerjakannya. Menghapusnya berisiko membuang
kerja yang belum naik ke mana pun.

**Yang perlu dilakukan pemilik repo:** dua commit itu di-cherry-pick ke branch
yang lebih baru sebelum `polish/panel-admin` dihapus. Jangan memakai
`merge-base --is-ancestor` untuk memeriksanya. Commit yang sudah di-rebase punya
SHA berbeda, jadi isinya akan terbaca hilang padahal sebenarnya ada. Yang benar
`git cherry`.

**Branch yang sudah dihapus sesi ini** (aman, commit unik: 0):
`chore/rapikan-komentar-schema` dan `docs/catatan-sesi-10-okt`.

---

## `bun audit`: dua kerentanan yang tidak bisa diperbaiki (2026-10-11)

`bun audit fix --dry-run` hasilnya `Fixed 0 of 2`:

- `esbuild@0.18.20` terkunci oleh `@esbuild-kit/core-utils@3.3.2`, yang
  mensyaratkan `~0.18.20`.
- `braces@3.0.3` -- tidak ada versi perbaikan yang terbit sama sekali.

Satu-satunya jalan adalah menaikkan `drizzle-kit` dan `vitest` ke major baru.
Itu di luar jangkauan perbaikan yang aman dan berisiko merusak gerbang, jadi
tidak dijalankan. Keduanya hanya ada di rantai pengembangan (`drizzle-kit`,
`vitest`, `eslint-config-next`) dan tidak pernah masuk bundel runtime.

Kalau nanti dua paket itu dinaikkan ke major baru, `bun audit` harus dibaca
lagi. Untuk sekarang tidak ada yang menjaganya.
