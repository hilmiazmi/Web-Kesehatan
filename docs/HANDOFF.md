# Serah-Terima Proyek

**Baca berkas ini lebih dulu di awal setiap sesi.** Isinya menggantikan
dokumen lain untuk mencari tahu posisi kerja sekarang.

Tanggal pembaruan: **8 Oktober 2026**
Commit saat serah-terima: **`32f5ed9`**, di branch
`fix/header-keamanan-dan-audit`.
Branch `main` masih di `c89f250`.

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

**Pekerjaan ada di branch, belum di-merge ke `main` dan belum di-push.**
Enam commit, dari `9a197e1` sampai `32f5ed9`.

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
| Form E-Pasien | Belum | tidak ada sama sekali |
| Uji E2E (Playwright) | Belum | lihat bagian 4 |
| Dual deploy Vercel + VPS | Belum | tidak ada konfigurasi |

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

6. Form E-Pasien belum ada.
7. Uji E2E belum ada: tata letak responsif, carousel, panel navigasi
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
3. **Satu baris untuk `AGENTS.md`**, diusulkan tapi belum ditulis:

   ```markdown
   ## Awal sesi

   Baca `docs/HANDOFF.md` sebelum menyentuh kode. Isinya posisi kerja
   sekarang, keputusan yang sudah diambil, dan masalah yang masih terbuka.
   ```

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

### Dua bug pemblokir build ditemukan di berkas pekerjaan paralel

Keduanya sudah diperbaiki **di working tree tapi tidak di-commit**, karena
berkasnya juga memuat perubahan lain yang belum selesai:

1. `McuPackageDetail.tsx` memakai `<McuForm>` tanpa import.
2. `McuPackageDetail.tsx` kehilangan tag pembuka `<a href="#daftar-mcu">`.

Kalau berkas itu di-commit oleh pemiliknya, kedua perbaikan itu ikut terbawa.
Kalau tidak, build akan gagal lagi.

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
