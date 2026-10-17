# Laporan Progress

Proyek: **Web-Kesehatan** — website rumah sakit fiktif "RSUD Contoh Sehat"
Periode laporan: **8 Oktober 2026**
Commit awal periode: `c89f250` · Commit akhir periode: `ee112a3`

Laporan ini untuk keperluan tugas kuliah dan portofolio. Isinya apa yang
dikerjakan, apa yang menghambat, dan apa rencana berikutnya.

---

## 1. Ringkasan

| Ukuran | Nilai | Cara menghitung |
|---|---|---|
| Halaman HTML ter-build | **163** | `.next/prerender-manifest.json` |
| Route Handler `/api/v1` | **44** | 45 berkas `route.ts` − 1 catcher |
| Tabel PostgreSQL | **28** | `pgTable(` di `src/server/db/schema.ts` |
| Migrasi SQL | **6** | berkas `.sql` di `drizzle/` |
| Test | **813** di **60 berkas** | keluaran `bun run test` |
| Halaman panel admin | **7** | `page.tsx` di bawah `src/app/admin` |
| Header keamanan | **7** | `next.config.ts` |

Tiga gerbang kualitas, dijalankan pada commit `ee112a3`:

```
bun run lint   → 0 error, 0 warning
bun run test   → 813 lulus, 0 gagal
bun run build  → Compiled successfully, 179 halaman statis
```

---

## 2. Yang dikerjakan

### 2.1 Audit awal

Sebelum mengubah apa pun, seluruh klaim di README diperiksa ulang terhadap
kode. Hasilnya: **empat klaim tidak sesuai**, dan tiga di antaranya membuat
pekerjaan yang sudah selesai terlihat belum dikerjakan.

| Klaim lama | Kenyataan |
|---|---|
| 27 tabel | 28 tabel |
| Panel admin "halaman belum" | 7 halaman sudah ada |
| Form Kritik-Saran, WBS, SKM "belum" | Ketiganya sudah mengirim ke server |
| Daftar Online "hanya menanyakan tanggal" | Sudah ada langkah pilih poli, dokter, jam |

Hasil lengkapnya di [`docs/STATUS-PROYEK.md`](STATUS-PROYEK.md).

### 2.2 Perbaikan keamanan

| Perbaikan | Commit |
|---|---|
| Tujuh header keamanan di `next.config.ts` | `9a197e1` |
| Pesan error `AUTH_SECRET` berhenti membocorkan panjang nilai | `4878634` |
| Dokumen audit beserta koreksinya | `fd38c15` |

CSP disusun dari pengukuran, bukan dari template. Sebelum menulis nilainya,
saya memeriksa bahwa repo ini:
tidak punya `<iframe>`, tidak punya `form action` ke host luar, semua `fetch`
dari klien hanya ke origin sendiri, dan fotonya hanya dari dua host yang sudah
terdaftar di `remotePatterns`. Font Poppins di-host sendiri lewat `next/font`,
jadi tidak ada permintaan runtime ke `fonts.googleapis.com`.

Setelah header dipasang, situs diperiksa di peramban untuk memastikan CSP
**tidak merusak** apa pun: stylesheet tetap terbaca, font Poppins tetap
dimuat, dan nol aset lokal yang diblokir.

### 2.3 Koreksi atas temuan yang salah

Ini bagian yang menurut saya paling penting untuk dilaporkan, karena
menunjukkan kenapa pemeriksaan harus diukur, bukan dinilai dari membaca kode.

Di audit awal saya melaporkan dua "celah":

1. Tidak ada `middleware.ts`.
2. Dua halaman admin tidak memeriksa sesi di server.

**Keduanya tidak benar.** Gate sesi ada di satu tempat,
`src/app/admin/(panel)/layout.tsx`, yang membungkus seluruh halaman di route
group itu. Kesalahan saya: yang saya ukur sebenarnya adalah "apakah berkas
`page.tsx` **sendiri** memanggil `readSession`", dan itu pertanyaan yang salah.

Setelah diukur dengan `curl` tanpa cookie sesi, hasilnya:

```
/admin                   → 307  /admin/login
/admin/akun              → 307  /admin/login
/admin/pengaturan        → 307  /admin/login
/api/v1/admin/stats      → 401  UNAUTHORIZED
```

Koreksinya dicatat di `docs/AUDIT-KEAMANAN.md` bagian 3, bukan dihapus.

### 2.4 Antarmuka panel admin

Tiga kelompok API yang belum punya antarmuka ditutup:

| Kelompok | Tempatnya | Alasan |
|---|---|---|
| `settings` | Halaman baru `/admin/pengaturan` | Butuh form interaktif |
| `appointments-per-day` | Dasbor | Sudah Server Component, jadi tidak perlu memindahkan apa pun ke klien |
| `survey-by-unit` | Dasbor | Sama |

Untuk dua yang terakhir saya sengaja **tidak** membuat halaman terpisah.
Dasbornya sudah membaca statistik langsung dari database di server, jadi
menambahkan dua tabel di situ tidak perlu menambah keadaan "memuat" yang akan
berkedip. Halaman terpisah untuk tabel 14 baris juga bukan struktur yang lebih
baik.

Dua hal yang perlu diperhatikan di halaman pengaturan, dan keduanya ditemukan
dari membaca kode server, bukan dari mencoba:

1. Endpointnya memakai **`PUT`**, bukan `PATCH`. `PATCH` akan dibalas 404.
2. Server **tidak memvalidasi per field**. `saveSettings` hanya menyalin key
   yang dikenal lalu melempar 400 kalau tidak ada satu pun yang cocok. Jadi
   seluruh aturan wajib ada di klien; kalau longgar, satu penyimpanan yang
   salah akan tersimpan tanpa keluhan apa pun.

### 2.5 Pengujian

Dua berkas test baru untuk hal yang tidak bisa dijamin dari mata:

| Berkas | Yang dikunci |
|---|---|
| `tests/snapshot-tolak-tulis.test.ts` | Enam endpoint tulis publik menolak di mode snapshot, dengan langkah tulis sebagai spy |
| `tests/header-keamanan.test.ts` | Isi tujuh header, termasuk alasan dua kelonggaran CSP |
| `tests/settings-manager.test.ts` | Aturan validasi yang tidak ada di server |

Yang membedakan test snapshot itu dari test biasa: yang diperiksa bukan status
503-nya, melainkan bahwa **fungsi tulisnya tidak pernah terpanggil**. Status
503 saja bisa datang dari validasi atau rate limit, dan keduanya tidak
membuktikan apa pun tentang mode baca-saja. Ada juga blok mode `live` sebagai
bukti lawannya, supaya test itu tidak bisa lulus karena fungsinya menolak
semua hal tanpa syarat.

### 2.6 Dokumentasi

| Berkas | Isi |
|---|---|
| `docs/STATUS-PROYEK.md` | Audit: status per fitur, bukti, ketidaksesuaian dokumen vs kode |
| `docs/AUDIT-KEAMANAN.md` | Temuan keamanan, tingkat risiko, bukti, sisa risiko |
| `docs/HANDOFF.md` | Posisi kerja, keputusan, masalah terbuka, langkah berikutnya |
| `README.md` | Diperbarui agar sesuai kenyataan |

---

## 3. Kendala

### 3.1 Repo berubah terus saat dikerjakan

Ini kendala terbesar. Selama sesi berjalan, repo menerima commit dan berkas
baru dari pekerjaan paralel yang bukan dari saya:

| Muncul saat sesi | Isi |
|---|---|
| `c89f250` | Form WBS |
| `c154306` | Layar akun panel (`AccountsManager.tsx`) |
| Migrasi `0005_slug_paket_mcu.sql` | Perubahan skema paket MCU |
| `mcu-form.tsx` | Form MCU, belum ter-commit saat saya periksa |

Konsekuensinya: setiap angka harus dihitung ulang di akhir, dan setiap commit
harus memakai daftar berkas eksplisit. Saya **tidak pernah** memakai
`git add -A`, karena itu akan menyeret pekerjaan orang lain yang belum selesai
ke dalam commit saya.

### 3.2 Dua bug yang memblokir build, ditemukan di berkas pekerjaan paralel

Keduanya bukan berkas saya, tapi memblokir `bun run build` untuk semua orang,
jadi saya perbaiki dan laporkan:

1. **`McuPackageDetail.tsx` memakai `<McuForm>` tanpa import.** Akibatnya
   `bun run lint` gagal: `'McuForm' is not defined`.
2. **Tag pembuka `<a href="#daftar-mcu">` hilang.** Yang tersisa hanya teks dan
   `</a>`, sehingga `bun run build` gagal dengan `Expected '</', got 'ident'`.

Bug kedua itu menarik: pesan errornya menunjuk baris 102, sedangkan
penyebabnya ada beberapa baris di atasnya. Ini persis jebakan yang sudah
diperingatkan di `AGENTS.md`.

### 3.3 Tidak bisa menguji login sungguhan

`docker compose up -d postgres` gagal dengan `permission denied` pada
`/var/run/docker.sock`, dan aturan repo melarang memakai `sudo` tanpa diminta.

Akibatnya: **halaman `/admin/pengaturan` belum pernah diuji dengan login
sungguhan.** Yang bisa saya buktikan hanya bahwa halamannya terlindungi
(307 ke `/admin/login`) dan bahwa kodenya lolos typecheck, lint, test, dan
build. Sisa pembuktiannya harus dilakukan di mesin yang punya akses database.

### 3.4 Angka halaman sempat salah

Verifikasi pertama saya menghitung 162 halaman, karena regex penyaring saya
tidak mengecualikan `_not-found` dengan benar. Setelah disaring ulang dengan
kriteria yang benar (buang `opengraph-image`, `robots.txt`, `sitemap.xml`),
angkanya 163 — dan itu **cocok persis** dengan klaim README. Angka 163 di
README ternyata benar sejak awal; yang salah adalah hitungan saya sendiri.

---

## 4. Rencana berikutnya

Urutan yang saya sarankan beserta alasannya:

1. **Naikkan `swiper` ke 12.1.2.** Ini satu-satunya advisory berlevel kritis,
   dan satu-satunya yang berdampak ke produksi. Butuh uji carousel di
   browser. Lihat `docs/AUDIT-KEAMANAN.md` bagian K-1.
2. **Uji login sungguhan di mesin dengan database**, untuk membuktikan
   `/admin/pengaturan` benar-benar bisa menyimpan, bukan sekadar ter-render.
3. **Naikkan `sweetalert2` ke 11.22.4.** Advisory rendah, perubahan kecil.
4. **Uji end-to-end dengan Playwright** untuk yang sekarang belum tersentuh:
   tata letak responsif, carousel, panel navigasi off-canvas, dan interaksi
   SweetAlert2.
5. **Formulir E-Pasien**, satu-satunya formulir yang belum ada sama sekali.
6. **Dual deploy Vercel + VPS**, dengan pratinjau memakai `API_MODE=snapshot`.

---

## 5. Yang perlu diketahui penguji

Kalau Anda memeriksa hasil kerja ini, empat hal ini memudahkan penilaian:

- **Semua angka bisa dihitung ulang.** Cara menghitungnya ada di
  `docs/STATUS-PROYEK.md` bagian Metodologi.
- **Dua temuan keamanan yang salah sudah dikoreksi secara terbuka**, bukan
  disembunyikan. Bukti pengukurannya disertakan.
- **Kelengkapan syarat tugas** ada di bagian 1 tabel pertama: 163 halaman
  (syarat 25), galeri 6 foto, navigasi tiga tingkat, dan 28 tabel database
  fiktif.
- **Yang belum diuji disebutkan**, bukan didiamkan. Login admin dan perilaku
  visual carousel adalah dua hal yang belum dibuktikan.

---

# Laporan 9 Oktober 2026

Periode laporan: **9 Oktober 2026** (diperbarui sepanjang hari)
Commit awal periode: `ee112a3` · Commit akhir periode: `8ea3ffc`
(33 commit sepanjang hari itu)

## 1. Ringkasan

| Ukuran | Nilai | Cara menghitung |
|---|---|---|
| Halaman HTML ter-build | **163** | `.next/prerender-manifest.json` (sama seperti periode lalu) |
| Route Handler `/api/v1` | **44** | 45 berkas `route.ts` − 1 catcher |
| Tabel PostgreSQL | **28** | `pgTable(` di `src/server/db/schema.ts` |
| Migrasi SQL | **6** | berkas `.sql` di `drizzle/` (tambah `0005_slug_paket_mcu.sql`) |
| Test Vitest | **856** di **62 berkas** | keluaran `bun run test` |
| Test Playwright | **13** | 7 publik + 5 aksesibilitas + 1 alur ber-database |
| Skor aksesibilitas Lighthouse | **100** | beranda, daftar-online, admin/login, berita |

Tiga gerbang kualitas ditambah E2E, dijalankan pada commit `8ea3ffc`:

```
bun run lint     → 0 error, 0 warning
bun run test     → 856 lulus, 0 gagal
bun run test:e2e → 12 lulus, 1 dilewati (butuh kredensial DB)
bun run build    → 169/169 halaman statis
```

## 2. Yang dikerjakan

| Pekerjaan | Commit |
|---|---|
| Formulir pendaftaran paket MCU di halaman paket + migrasi slug | `6602a7d`, `35c65cf` |
| Modul validasi bersama surel/telepon + migrasi 6 formulir | `0ceb539`, `7d2177a` |
| Naik sweetalert2 ke 11.22.4, swiper ke 12.2.0 + sesuaikan CSS | `a7146d3`, `eb0e453` |
| Kerangka Playwright + perbaikan flake hitung opsi | `e579f3e`, `d3ac143` |
| Dockerfile + dokumen deploy Vercel/VPS + perbaikan build | `67f1bdc`, `4b1dda2` |
| Verifikasi login sungguhan ke DB uji | `fba25a1` |
| E2E alur ber-database (login, panel, pengaturan, kritik) | `00095fb` |
| Test integrasi 8 endpoint admin yang sebelumnya tanpa pengaman | `00b1ee6` |
| Verifikasi snapshot dan admin sungguhan terhadap database | `fe9b2b0` |
| Perbaikan galat auth yang menempel ke kolom yang tidak ada | `4c30a8a` |
| Tolak `ADMIN_ORIGIN` http untuk host publik saat start | `91de5b9` |
| Aksesibilitas: 85 temuan target-size turun, logo dan galeri diperbaiki | `7c96aa1` |
| Daftarkan modul A11y di HeroSlider + tutup advisory | `d412a2d` |

Dua rencana periode lalu yang tertutup: login admin kini terbukti sungguhan
(bukan sekadar ter-render), dan E2E Playwright sudah berjalan.

## 3. Kendala

**VPS 2 GB kehabisan sumber daya saat build Docker** (generate 7 worker +
Turbopack). SSH putus belasan menit dari dua mesin berbeda, lalu pulih
sendiri — tidak ada yang perlu diperbaiki di jaringan. Build diulang setelah
pulih dan sukses; runtime terverifikasi (beranda 200, API 200, health
healthy). Artefak sementara dihapus dan cache builder di-prune. Image Docker
(1,31 GB) dibiarkan di VPS. Efisiensi lebih lanjut (batas memori build
permanen) butuh akses root yang tidak ada.

## 4. Rencana berikutnya

1. Cabut label BELUM-DIVERIFIKASI pada `Dockerfile` dan `docs/DEPLOY-VPS.md`.
2. Merge branch fitur yang masih terbuka ke `main` bila ada.
3. Uji responsif dan aksesibilitas manual (tata letak, kontras, keyboard),
   karena cakupan otomatis belum menyentuhnya.

Tiga butir di atas sudah selesai hari yang sama. Sisa yang tidak bisa
dikerjakan agent tanpa peramban manusia: penilaian akhir kontras dan pembaca
layar, dan satu temuan `target-size` Lighthouse (diukur 332x43, jauh di atas
minimum 24x24 — artefak konteks carousel).

## 5. Kelengkapan syarat tugas

163 halaman (syarat 25), galeri 6 foto, navigasi tiga tingkat, 28 tabel
database fiktif. Tidak ada klaim baru di luar yang terbukti di atas.

---

# Laporan 10 Oktober 2026

Periode laporan: **10 Oktober 2026**
Commit awal periode: `8ea3ffc` · Commit akhir periode: `2d5aa87`
(25 commit sepanjang hari itu)

## 1. Ringkasan

| Ukuran | Nilai | Cara menghitung |
|---|---|---|
| Halaman HTML ter-build | **150** | berkas `.html` di `.next/server/app` minus dua cadangan Next.js |
| Route Handler `/api/v1` | **45** | 44 endpoint + catcher 404 (tambah `admissions`) |
| Tabel PostgreSQL | **28** | `pgTable(` di `src/server/db/schema.ts` |
| Migrasi SQL | **6** | berkas `.sql` di `drizzle/` |
| Test Vitest | **867** di **63 berkas** | keluaran `bun run test` |
| Test Playwright | **16** | 8 publik + 5 aksesibilitas + 3 alur ber-database |
| Skor Performance Lighthouse mobile | **87** | median 3 jalan, naik dari 84 |

Gerbang kualitas pada commit `2d5aa87`:

```
bun run lint     → 0 error, 0 warning
bun run test     → 867 lulus, 0 gagal
bun run test:e2e → 13 lulus, 2 dilewati (butuh kredensial DB)
alur-db live     → 3 lulus (server live + basis uji segar)
bun run build    → 169/169 halaman statis
bun run cek:tautan → 150 halaman, 150 tautan, 149 sitemap, bersih
```

## 2. Yang dikerjakan

| Pekerjaan | Commit |
|---|---|
| Kalibrasi scrim hero (kontras 4.76-5.19) + skrip backup + tutup CLS | `85701dc`, `b2f0f40`, `e7cdcb6` |
| Foto dekoratif dinyatakan eksplisit + perkuat tes a11y dua arah (PR #45, sudah merge) | `12ae10a`, `ab26e25`, `c3e53b9` |
| Perbaiki workflow E2E ber-database (`AUTH_SECRET`, `SEED_ADMIN_*`) + bukti CI hijau | `d7e88d0`, `f6224aa`, `89ff6e9` |
| Kunci build paralel + protokol dua arah bertoken + teardown | `039b5a3`, `46bd920` |
| E2E a11y diperluas ke 4 halaman kunci | `ca01d0d` |
| E2E kritik dan daftar online lewat peramban sampai tersimpan | `8205648`, `2d5aa87` |
| Disiplin prefetch: Performance 84 ke 87 | `c5c699f` |
| Sinkronisasi angka README/roadmap + masukan riset | `044b49c`, `ce81eb3`, `42589c8` |

Bukti backup pulih: dump 103 KB di-restore ke basis kedua, hitungan
28 tabel identik, isi join dokter-jadwal identik, rotasi menghapus yang
lama dan melindungi yang terbaru. Basis uji di-drop setelahnya.

## 3. Kendala

**Sesi paralel memakai cluster database yang sama.** `pg_ctl stop`
dijalankan sesi ini tidak menghentikan postmaster (masih hidup dan
melayani), dan basis `rsud_uji_cek` yang sudah di-drop muncul kembali
dengan isi segar — sesi lain sedang memakai nama yang sama di port yang
sama. Pelajaran: untuk verifikasi, `initdb` cluster sendiri di port
sendiri (dipakai 5436) dan matikan postmaster lewat PID eksplisit yang
sudah diverifikasi, bukan lewat `pg_ctl stop` saja. Basis dan proses
milik sesi lain (`pgdata2`:5434, `pgdata3`:5435) tidak disentuh.

**Perintah background `A && B &` menyesatkan.** Operator `&`
mem-background-kan seluruh rantai `&&`, sehingga `eval` kredensial
jalan di subshell dan password hilang di shell induk, sementara pesan
"siap" tercetak walau server belum tentu nyala. Jalankan `siapkan`
di foreground dan periksa endpoint sebelum menyimpulkan.

## 4. Rencana berikutnya

Yang tersisa dari daftar lama hanya dua butir opsional (Performance di
atas 90 — kini 87 — dan baca-nyaring/analytics) plus deploy produksi
yang butuh domain dan keputusan pemilik. Tidak ada butir wajib.
