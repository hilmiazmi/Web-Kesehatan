# Keamanan Rahasia

Dokumen ini berlaku untuk repo `Web-Kesehatan` dan untuk siapa pun yang
bekerja di dalamnya, termasuk sesi AI agent.

Aturan di sini bukan saran. Satu kebocoran cukup untuk membuat biaya
rotasi kredensial, dan rotasi itu tidak bisa dibatalkan begitu saja.

---

## Yang tidak boleh pernah keluar dari mesin lokal

Segala bentuk di bawah ini **tidak boleh** masuk commit, push, issue,
pull request, komentar review, screenshot, atau pesan chat:

| Jenis | Contoh |
|---|---|
| Kredensial database | `DATABASE_URL` lengkap, kata sandi PostgreSQL |
| Kunci penandatangan | `AUTH_SECRET`, `SESSION_SECRET` |
| Token API | token GitHub, token Vercel, token Sentry, token GA |
| Kunci privat | `-----BEGIN ... PRIVATE KEY-----`, berkas `.pem`, `.key` |
| Password | `SEED_ADMIN_PASSWORD`, password admin, password WiFi kantor |
| Cookie dan sesi | `Cookie: rsud_session=...`, isi token sesi admin |
| Alamat jaringan pribadi | IP VPS, IP rumah, IP kantor, URL panel admin |
| Data pasien | NIK, nomor rekrutmen, nama pasien bersama alamat |

Kriteria objektifnya sederhana: **kalau nilai itu bisa dipakai orang lain
untuk masuk ke sesuatu, nilai itu rahasia.** Nama host dan username
bukan rahasia, tetapi kombinasi `user + password + host` adalah.

---

## Yang boleh ada di repo

Nilai contoh, bukan nilai nyata:

- `.env.example` — hanya nama variabel. Nilai default yang aman
  (`AUTH_SECRET=` kosong, `SEED_ADMIN_PASSWORD=` kosong) boleh.
- `docker-compose.yml` — kredensial development lokal boleh, **asalkan**
  hanya untuk PostgreSQL di `127.0.0.1` dan bukan turunan dari
  kredensial produksi.
- Dokumentasi — nama variabel, format, dan cara pakainya boleh.
  Nilainya tidak.

Kredensial development lokal (`rsud_dev_password`) memang tertulis di
`docker-compose.yml` dan itu disengaja: database itu hanya mendengarkan
di `127.0.0.1` di laptop, dan nilainya bukan kunci ke mana pun. Yang
dilarang adalah memakai nilai yang sama di produksi.

---

## Cara mencegah

### 1. Semua nilai lewat environment

Tidak ada kredensial yang ditulis langsung di source code. Di Rust,
`Config::from_env()` sudah menolak start kalau `AUTH_SECRET` kurang dari
32 karakter. itu disengaja, jangan longgarkan.

### 2. `.gitignore` sudah menutup `.env*`

`.env`, `.env.local`, dan `.env.production` tidak akan pernah ter-commit.
Pola `.env*` juga cocok dengan `.env.example`, jadi ada baris pengecualian
`!.env.example` — jangan hapus baris itu, karena `.env.example` adalah
satu-satunya dokumentasi konfigurasi backend.

### 3. Cek sebelum commit

```bash
# 1. pastikan tidak ada .env sungguhan yang ikut.
#    $ Anchored wajib: tanpa itu, `.env.example` ikut kena dan alarm
#    selalu menyala.:
git status --porcelain | grep -E '\.env' | grep -v '\.env\.example$' \
  && echo "STOP: periksa"

# 2. pindai isi yang akan di-commit untuk pola kredensial
git diff --cached | grep -niE "(secret|token|api[_-]?key|password|passwd)[^a-zA-Z]*[:=][^a-zA-Z]"
```

Kalau baris kedua menemukan sesuatu, periksa dulu sebelum lanjut. False
positive akan muncul dari `.env.example` dan dokumentasi, itu wajar.

### 4. Kalau terlanjur bocor

Kredensial yang sudah masuk history **harus dianggap sudah bocor**,
walau commit-nya sudah di-revert. Menghapus commit tidak menghapusnya
dari mirror, fork, atau cache GitHub.

1. **Rotasi dulu, bersihkan kemudian.** Urutannya tidak boleh dibalik.
   Ganti password atau tokennya di sisi penyedia, baru tangani history.
2. Kalau token GitHub: revoke di
   `Settings → Developer settings → Personal access tokens`.
3. Kalau `AUTH_SECRET`: ganti di deployment. Seluruh sesi admin yang
   sedang berjalan ikut batal, dan itu memang yang diinginkan.
4. Beri tahu pemilik repo lewat kanal privat. **Jangan** buka issue
   publik yang menyebut nama kredensialnya.

---

## Isu dan pull request

GitHub menjalankan pemindaian rahasia pada commit dan push, tapi
pemindaian itu tidak menangkap semuanya. Nilai yang tersamar di URL, di
teks screenshot, atau di dalam pesan log sering lolos.

- **Jangan tempel nilai rahasia di issue atau PR.** Bug keamanan dikirim
  ke owner lewat kanal privat, bukan lewat issue publik.
- **Screenshot dan log bisa bocor tanpa disengaja.** Sebelum attach,
  periksa URL di address bar, tab yang terbuka, dan isi `.env` yang
  mungkin ikut terpotong. Alamat, nama, dan token harus disensor.
- **PR dari fork publik bisa dibaca siapa pun.** Kalau nanti ada
  kontributor, jangan pernah menyertakan kredensial di branch yang akan
  jadi PR publik.

---

## Sesi admin: logout tidak mencabut token yang sudah dicuri

Cookie `rsud_session` tidak menyimpan catatan di database. Isinya adalah klaim
yang ditandatangani dengan `AUTH_SECRET` dan punya waktu kedaluwarsa sendiri
(`SESSION_MAX_AGE_SECONDS`, bawaan delapan jam). Server cukup memeriksa tanda
tangannya, tanpa perlu menanyakan ke mana pun.

Empat konsekuensi yang perlu diketahui sebelum cookie sesi ikut tersalin:

- **Keluar dari panel tidak membatalkan tokennya.** `POST /auth/logout`
  hanya menghapus cookie di peramban. Salinan yang sudah tersalin tetap sah
  sampai kedaluwarsa.
- **Tidak ada "keluar dari semua perangkat"** dan tidak ada pencabutan per
  token. Satu token bisa dicabut dengan menaikkan `TOKEN_VERSION` di
  `src/server/auth/session.ts`, yang membatalkan seluruh sesi yang sedang
  berjalan, termasuk yang tidak disengaja.
- **Jendelanya adalah delapan jam.** Menyingkat `SESSION_MAX_AGE_SECONDS`
  memperpendek masa itu tanpa mengubah kode apa pun.
- **Penyalahgunaan tidak kelihatan sebagai kegagalan.** Satu cookie yang
  dipakai dari alamat lain terbaca seperti permintaan biasa, bukan seperti
  percobaan masuk. Rate limit di `POST /auth/login` tidak menutup jalur ini,
  karena penyalahguna tidak melewati halaman login.

Kalau sebuah cookie sesi dicuriga bocor, rotasi `AUTH_SECRET` di deployment.
Membatalkan seluruh sesi yang sedang berjalan sekaligus membuat jelas ada yang
berubah.

---

## Untuk sesi AI agent

Tiga aturan tambahan yang berlaku khusus untuk agent yang bekerja di
repo ini:

1. **Jangan pernah `git add -A` tanpa membaca outputnya.** Kalau tidak,
   satu berkas `.env` ikut tanpa terlihat.
2. **Jangan pernah mencetak nilai `.env*` ke terminal.** Ambil nama
   variabel saja. Kalau butuh tahu apakah ada yang terisi, pakai
   `grep -c`, bukan `cat`.
3. **Jangan pernah menulis nilai rahasia di commit message.** Commit
   message masuk history secara permanen dan sering ikut terbawa saat
   repo di-fork.

Kalau agent tidak yakin apakah sebuah nilai itu rahasia, perlakukan
sebagai rahasia. Biaya salah klasifikasi di sini jauh lebih murah
daripada biaya kebocoran.