# Serah-Terima Proyek

**Baca berkas ini lebih dulu di awal setiap sesi.** Isinya menggantikan
dokumen lain untuk mencari tahu posisi kerja sekarang.

Tanggal pembaruan: **9 Oktober 2026**
Commit saat serah-terima: **`e579f3e` = `main` = `upstream/main` (sudah di-push).**
Branch `fix/header-keamanan-dan-audit` sudah di-merge fast-forward.

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
| Uji E2E (Playwright) | Belum | lihat bagian 4 |
| Dual deploy Vercel + VPS | Sebagian | `Dockerfile`, `.dockerignore`, `docs/DEPLOY-VERCEL.md`, `docs/DEPLOY-VPS.md` sudah ada; build Docker **belum diverifikasi** (mesin tanpa izin Docker) |

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
2. **Login admin belum pernah diuji sungguhan.** `docker compose` gagal dengan
   `permission denied` pada `/var/run/docker.sock`, dan aturan repo melarang
   `sudo` tanpa diminta. Jadi `/admin/pengaturan` baru terbukti ter-render dan
   terlindungi, belum terbukti bisa menyimpan.

### Prioritas sedang

3. **`sweetalert2@11.22.0`** punya advisory rendah, diperbaiki di `11.22.4`.
   Versinya dikunci persis di `package.json`, jadi perlu keputusan.
4. **`braces` dan `esbuild`** hanya muncul di rantai perkembangan, tidak
   berdampak ke produksi.
5. **`ADMIN_ORIGIN` harus diawali `https://` di produksi**, kalau tidak cookie
   sesi dikirim tanpa atribut `Secure`. Tidak ada kode yang bisa mencegah ini.

### Prioritas rendah

6. Uji E2E belum ada: tata letak responsif, carousel, panel navigasi
   off-canvas, dan interaksi SweetAlert2 masih diperiksa manual.

---

## 5. Langkah berikutnya

1. Naikkan `swiper` ke 12.1.2 dan uji dua carousel di browser, desktop dan
   mobile.
2. Jalankan `docker compose up -d postgres` di mesin yang punya akses, lalu
   uji login dan penyimpanan `/admin/pengaturan` sungguhan.
3. Naikkan `sweetalert2` ke 11.22.4.
4. Tambah Playwright untuk yang belum tersentuh.
5. Merge branch `fix/header-keamanan-dan-audit` ke `main` kalau enam commit di
   dalamnya sudah disetujui.

---

## 6. Yang perlu keputusan Anda

1. **Enam commit di branch belum di-merge dan belum di-push.** Perlu
   persetujuan sebelum digabung ke `main`.
2. **Dua kenaikan versi dependensi** (swiper, sweetalert2) belum dikerjakan,
   karena keduanya perubahan dependensi yang perlu disetujui lebih dulu.
3. **Baris "Awal sesi" untuk `AGENTS.md` sudah diterapkan** di commit
   `5bcf2ad` (Baca `docs/HANDOFF.md` sebelum menyentuh kode), jadi usulan
   itu tidak lagi menggantung.

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
