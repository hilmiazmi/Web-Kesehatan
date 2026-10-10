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
2. `AUTH_SECRET` ditambah di langkah seed `.github/workflows/e2e-db.yml`
   beserta komentar alasan; bukti = run CI setelah push.
3. Angka `README.md` diluruskan (856/62, 150 halaman, 169/169).
4. Protokol kunci build paralel: `scripts/kunci-build.ts` baru (tandai/lepas/
   tunggu + deteksi proses `next-build` mentah), `prebuild`/`postbuild`/
   `test:e2e` di `package.json`, `.next-build-lock` di `.gitignore`,
   `tests/kunci-build.test.ts` (6 tes), aturan di `AGENTS.md`. Total tes
   856→862. E2E penuh 13 lulus 1 dilewati lewat `test:e2e` baru.
5. Tetap terbuka (keputusan, bukan kode): deploy produksi + `ADMIN_ORIGIN`
   https + sisa manual (panel off-canvas, SweetAlert2).
