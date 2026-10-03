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

## Sesi admin: logout tidak mencabut token, perubahan kredensial mencabut

Cookie `rsud_session` berisi klaim yang ditandatangani dengan `AUTH_SECRET`.
Klaimnya menyimpan `sub`, `role`, `exp`, dan `sv` — salinan angka
`users.session_version` pada saat token diterbitkan.

Token itu sendiri tidak cukup. `readSession()` di
`src/server/auth/session.ts` selalu menanyakan `session_version` dan
`is_active` ke database, lalu menolak sesi kalau angkanya tidak cocok, akunnya
nonaktif, atau barisnya sudah hilang. Jadi pencabutan berlaku seketika, bukan
saat token kedaluwarsa. Biayanya satu query per permintaan admin, dan itu
sengaja: volumenya rendah dibanding API publik.

Perilaku yang sudah diukur terhadap database sungguhan:

| Perubahan | Sesi lama | Cara kerja |
| --- | --- | --- |
| `POST /auth/logout` | **tetap sah** | hanya menghapus cookie di peramban |
| Ganti password | dicabut, 401 | `session_version` naik satu |
| Reset password `super_admin` | dicabut, 401 | `session_version` naik satu |
| Ganti `role` atau `is_active` | dicabut, 401 | `session_version` naik satu, tapi tidak boleh pada akun sendiri |
| Ganti `name` atau `email` | **tetap sah** | tidak menyentuh hak akses |

Tiga hal yang tetap perlu diketahui:

- **Keluar dari panel tidak membatalkan salinan token.** `POST /auth/logout`
  hanya menghapus cookie. Salinan yang sudah tersalin tetap sah sampai
  kedaluwarsa, karena logout tidak menyentuh `session_version`.
- **Jendelanya adalah delapan jam.** `SESSION_MAX_AGE_SECONDS` bawaannya
  `8 * 3600`. Menyingkatnya memperpendek masa token tanpa mengubah kode.
- **Penyalahgunaan tidak kelihatan sebagai kegagalan.** Satu cookie yang
  dipakai dari alamat lain terbaca seperti permintaan biasa, bukan seperti
  percobaan masuk. Rate limit di `POST /auth/login` tidak menutup jalur ini.

`TOKEN_VERSION` di `src/server/auth/session.ts` bukan alat pencabutan harian.
Angkanya naik hanya kalau skema klaim berubah; sekarang bernilai 2 sejak klaim
`sv` ditambahkan. Menaikkannya membatalkan seluruh sesi semua orang, termasuk
yang tidak disengaja.

Kalau sebuah cookie sesi dicuriga bocor, ganti password akun itu. Itu mencabut
seluruh sesi milik akun tersebut tanpa mengganggu admin lain. Rotasi
`AUTH_SECRET` juga bekerja, tapi sifatnya membunuh sesi semua orang, jadi lebih
berat dari yang sebenarnya diperlukan.

Mode snapshot tidak punya database, jadi `readSession()` melewati pengecekan
pencabutan di sana. Itu tidak membuka jalan bagi token palsu, karena
`auth/login` menolak login di mode snapshot — verifikasi password selalu butuh
database — sehingga tidak ada token sesi yang bisa terbit di mode itu.

---

## Tiga penjaga agar panel admin tidak melukai diri sendiri

Panel admin bisa saja mengunci dirinya sendiri. Tiga penjaga di
`src/server/admin/accounts.ts` mencegah itu. Ketiganya menolak dengan 400
karena itu kesalahan permintaan, bukan kegagalan server.

- **Peran dan status aktif akun sendiri tidak bisa diubah.** Menonaktifkan diri
  sendiri adalah jalan mengunci diri: `session_version` naik sehingga sesi
  langsung mati, dan `credentialsByEmail` menyaring `AND is_active` sehingga
  login berikutnya mustahil. Satu-satunya perbaikan juga lewat `PATCH` pada
  route yang sama, jadi tidak ada jalan keluar. Menurunkan peran sendiri tidak
  terkunci, tetapi orangnya langsung kehilangan akses tanpa cara lain. `name`
  dan `email` tetap boleh, karena keduanya tidak menyentuh hak akses.
- **Super admin aktif terakhir tidak bisa diturunkan.** Menurunkan satu-satunya
  super admin aktif berarti tidak ada yang bisa menaikkannya orang lain lagi,
  dan tidak ada cara memulihkannya lewat panel. Buat akun lain dulu, baru
  turunkan.
- **Akun yang sedang dipakai tidak bisa dihapus.** Menghapus diri sendiri memutus
  sesi tanpa memberi jalan masuk lagi.

Dua hal lain yang perlu diketahui:

- **Reset password tidak meminta password lama.** Route
  `POST /admin/users/[id]/reset-password` hanya untuk `super_admin`. Password
  lama bukan bukti di sini; izin `super_admin` yang jadi buktinya.
- **Ganti password sendiri selalu memutus sesi sendiri.** `changePassword`
  menaikkan `session_version` juga pada perangkat yang sedang dipakai, jadi
  pemasuk perlu login ulang. Itu yang diharapkan, bukan kesalahan.

Kalau semua super admin aktif hilang, panel tidak bisa diperbaiki lewat panel.
Jalur pulihnya ada di luar aplikasi, di sisi database.

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