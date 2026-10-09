# Status Proyek — Audit Tahap A

Tanggal audit: **8 Oktober 2026**
Commit yang diaudit: **`c89f250`** (`feat(wbs): formulir pelaporan yang benar-benar mengirim ke server`)
Branch: `main`, sama dengan `upstream/main`, working tree bersih.

Dokumen ini hasil audit, bukan klaim. Setiap angka di bawah bisa ditelusuri
ulang lewat perintah yang dicantumkan. Tidak ada satu pun angka yang diambil
dari README tanpa dihitung ulang.

## Metodologi

| Yang diperiksa | Cara |
|---|---|
| Halaman ter-build | `.next/prerender-manifest.json` + baris `Generating static pages` dari stdout build |
| Route Handler | menghitung berkas `route.ts` di `src/app/api`, lalu memisahkan catcher `[...path]` |
| Tabel database | menghitung `export const x = pgTable(` di `src/server/db/schema.ts` |
| Section beranda | mencari `id="..."` di seluruh komponen, bukan cuma `src/app/page.tsx` |
| Form yang benar-benar mengirim | mencari `method: POST/PATCH/...` **dan** `/api/v1/` di berkas yang sama |
| Klaim auth | membaca `src/server/auth/`, bukan mengandalkan README |

---

## 1. Hasil gerbang kualitas

Semua berjalan di commit `c89f250`.

| Perintah | Exit | Hasil |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | `Checked 406 installs across 560 packages (no changes)` |
| `bun run lint` | 0 | tanpa output = 0 error, 0 warning |
| `bun run test` | 0 | `Test Files 55 passed (55)`, `Tests 756 passed (756)`, 9.53s |
| `bun run build` | 0 | `Compiled successfully in 3.6s`, `Generating static pages using 7 workers (177/177) in 5.0s` |

**Tidak ada satu pun gerbang yang gagal.** Repo dalam keadaan hijau penuh.

---

## 2. Verifikasi klaim README satu per satu

| Klaim README | Angka README | Angka nyata | Status |
|---|---|---|---|
| Route Handler nyata di `/api/v1` | 44 | **44** (45 berkas `route.ts` − 1 catcher `[...path]`) | ✅ Benar |
| Kelompok endpoint admin | 9 | **9** | ✅ Benar |
| Halaman ter-build | 163 | **163** (166 route − 3 non-halaman: `opengraph-image`, `robots.txt`, `sitemap.xml`) | ✅ Benar |
| 13 section beranda | 13 | **13** (12 punya `id`, hero memang tanpa `id` sesuai README) | ✅ Benar |
| Tabel PostgreSQL | 27 | **28** | ❌ **Salah, kurang 1** |
| `API_MODE` bawaan `live` | `live` | `live` | ✅ Benar |
| Mode snapshot menolak request ubah data | ya | `jalankanForm` di `src/server/api/form.ts` mengecek `snapshot` | ✅ Benar |
| Password di-hash `scrypt` | ya | `src/server/auth/password.ts` memakai `scrypt` + `timingSafeEqual` | ✅ Benar |
| Token sesi ditandatangani HMAC-SHA256 | ya | `src/server/auth/session.ts` memakai `createHmac` + `timingSafeEqual` | ✅ Benar |

### Rincian 13 section beranda

README mengklaim 13 section. Verifikasi mencari `id` di seluruh
`src/components/`, karena `src/app/page.tsx` hanya memuat sebagian.

| # | Section | `id` | Ditemukan di |
|---|---|---|---|
| 1 | Hero slider | — (tanpa `id`) | `page.tsx` |
| 2 | Cari Jadwal Dokter | `cari-dokter` | `DoctorSearchCard.tsx` |
| 3 | Layanan Unggulan & Prioritas | `layanan` | `PriorityServices.tsx` |
| 4 | Fasilitas & Layanan | `fasilitas` | `FacilityTabs.tsx` |
| 5 | Paket MCU & Promosi | `mcu` | `McuPackages.tsx` |
| 6 | Berita dan Artikel | `berita` | `NewsSection.tsx` |
| 7 | Akreditasi & Penghargaan | `akreditasi` | `AwardsGallery.tsx` |
| 8 | Gallery | `galeri` | `AwardsGallery.tsx` |
| 9 | Pendaftaran | `pendaftaran` | `HomeSections.tsx` |
| 10 | Sosial Media | `sosial-media` | `HomeSections.tsx` |
| 11 | Patient Experience | `testimoni` | `HomeSections.tsx` |
| 12 | Asuransi | `asuransi` | `HomeSections.tsx` |
| 13 | FAQ | `faq` | `HomeSections.tsx` |

---

## 3. Status per fitur

Legenda: **Selesai** = ada dan lulus uji · **Sebagian** = ada tapi belum
mencakup kebutuhan · **Belum** = tidak ada · **Rusak** = ada tapi tidak
berfungsi.

| Fitur | Status | Bukti |
|---|---|---|
| Build produksi | **Selesai** | `Generating static pages (177/177)`, exit 0 |
| Unit test | **Selesai** | 756 test / 55 berkas lulus |
| Lint | **Selesai** | `bun run lint` exit 0, tanpa output |
| 163 halaman ter-build | **Selesai** | `prerender-manifest.json` |
| Layout global (Topbar/Navbar/Footer) | **Selesai** | `src/components/`, 163 halaman memakainya |
| 13 section beranda | **Selesai** | tabel di atas |
| 44 endpoint `/api/v1` | **Selesai** | hitungan `route.ts` |
| Catcher 404 untuk path asing | **Selesai** | `src/app/api/v1/[...path]/route.ts` |
| 28 tabel Drizzle + 5 migrasi SQL | **Selesai** | `pgTable` × 28, `drizzle/000*.sql` × 5 |
| Auth admin (scrypt + HMAC) | **Selesai** | `src/server/auth/` |
| Sanitasi Markdown | **Selesai** | `src/server/markdown.ts` |
| Mode snapshot | **Selesai** | `src/server/api/snapshot.ts`, dicek `jalankanForm` |
| Form Daftar Online (poli→dokter→jam) | **Selesai** | `registration-form.tsx` mengirim `schedule_id` |
| Form Kritik-Saran | **Selesai** | `feedback-form.tsx` → `POST /api/v1/feedbacks` |
| Form SKM | **Selesai** | `survey-form.tsx` → `POST /api/v1/survey-responses` |
| Form WBS | **Selesai** | `wbs-form.tsx` → `POST /api/v1/wbs-reports` |
| Form Rawat Inap | **Selesai** | `admission-form.tsx` → `POST /api/v1/admissions` |
| Halaman login admin | **Selesai** | `src/app/admin/login/page.tsx` |
| UI panel admin | **Sebagian** | 4 dari 9 kelompok punya UI, lihat bagian 4 |
| Proteksi `/admin` di server | **Selesai** | Gate di `(panel)/layout.tsx`; terukur 307 ke `/admin/login` |
| Form Registrasi MCU (klien) | **Belum** | endpoint `POST /mcu-registrations` ada, form klien tidak |
| Form E-Pasien | **Selesai** | Sama dengan Daftar Online. Audit ini salah menandainya "Belum" karena mencari berkas bernama "e-pasien"; kenyataannya `registration-form.tsx` menyebut dirinya "Formulir pendaftaran online (E-Pasien)" dan `src/data/home.ts:467` menautkan "E-Pasien" ke `/daftar-online` |
| Header keamanan di `next.config.ts` | **Belum** | 0 dari 7 header ada |
| Dual deploy Vercel + VPS | **Belum** | tidak ada konfigurasi deploy |
| Audit keamanan menyeluruh | **Belum** | ditangani pada TAHAP E |

---

## 4. Ketidaksesuaian dokumen vs kode

Empat poin. Tiga di antaranya membuat README **melbihkan kekurangan** dan
satu **menyembunyikan kekurangan**.

### 4.1 ❌ Tabel: README bilang 27, kenyataan 28

Tabel ke-28 adalah **`bedCapacity`**. Ditambahkan oleh commit `109069c`
(`feat(kapasitas bed): tampilkan dan perbarui ketersediaan tempat tidur`).
README belum diperbarui setelah commit itu.

### 4.2 ❌ "Halaman antarmuka panel admin. API-nya sudah ada, halaman belum."

Ini **tidak benar lagi**. Yang ada sekarang:

- 5 halaman: `login`, `(panel)`, `(panel)/beds`, `(panel)/inbox/[kind]`, `(panel)/records/[table]`
- 10 komponen: `AdminNav`, `AdminShell`, `FormBaris`, `InboxManager`, `LoginForm`, `LogoutButton`, `RecordManager`, `BedsManager`, plus `types.ts` dan `nilai-form.ts`

Sudah ada UI untuk kelompok `beds`, `inbox`, `records`, dan `stats`
(ringkasan di halaman panel). **Kelompok yang belum punya UI:**
`appointments-per-day`, `settings`, `survey-by-unit`, `tables`, `users`.

### 4.3 ❌ Checklist form: tiga dari lima sudah selesai

README menyebut E-Pasien, Registrasi MCU, Kritik-Saran, WBS, dan
SKM sebagai belum. Kenyataannya:

| Form | Status sebenarnya | Bukti |
|---|---|---|
| Kritik-Saran | **Sudah** kirim ke server | `feedback-form.tsx` → `POST /api/v1/feedbacks` |
| SKM | **Sudah** kirim ke server | `survey-form.tsx` → `POST /api/v1/survey-responses` |
| WBS | **Sudah** kirim ke server | `wbs-form.tsx` → `POST /api/v1/wbs-reports` |
| Registrasi MCU | **Belum** (klien) | endpoint server ada, tidak ada form klien |
| E-Pasien | **Belum** | tidak ada berkas sama sekali |

### 4.4 ❌ Daftar Online: hambatan yang ditulis README sudah terpecahkan

README menulis: "`POST /api/v1/appointments` sudah ada, tapi endpoint itu
menuntut `schedule_id` berupa UUID jadwal dokter, sedangkan formulir
pendaftaran hanya menanyakan tanggal. Menyambungkannya berarti menambah
langkah pilih dokter lalu pilih jam."

Verifikasi `registration-form.tsx` pada `c89f250` menunjukkan semua Istilah
 itu sudah ada: `schedule_id`, `polyclinic`, `specialty`, `doctor`, `time`,
`slot`, `jadwal`, `dokter`, `jam`. Ini dikerjakan oleh commit `97455e7`
(`fix(pendaftaran): kalender sendiri, dokter per spesialitas, bawa konteks URL`).

---

## 5. Catatan penting soal perubahan repo saat audit

Selama audit berjalan, commit **`c89f250`** muncul dan langsung ter-push ke
`upstream/main` (HEAD = `upstream/main` = `c89f250`). Working tree yang tadinya
memuat 3 berkas termodifikasi dan 2 berkas belum dilacak (`wbs-form.tsx`,
`tests/wbs-form.test.ts`) menjadi bersih.

Commit itu **bukan dibuat oleh agent**. Penulisnya `neiaki`, dan isinya
mencakup berkas-berkas yang tadinya belum dilacak. Konsekuensinya: hasil
lint, test, dan build yang tercatat di bagian 1 adalah hasil **kedua**,
yang dijalankan ulang setelah commit itu ada. Angka di dokumen ini semua
mengacu ke `c89f250`, bukan ke `b209dc6` yang aktif saat sesi dimulai.

Tidak ada kredensial yang ditemukan bocor selama audit. `git ls-files`
hanya menemukan `.env.example`, `.next` tidak terlacak, dan
`.gitignore` memuat pola `.env*` beserta pengecualian `!.env.example`.

---

## 6. Temuan keamanan

Audit ini sengaja tidak memperbaiki apa pun. Empat hal berikut tercatat
karena menyangkut keamanan.

**Dua di antaranya kemudian terbukti salah**, dan koreksinya ada di bagian 6.1.
Sengaja tidak dihapus dari daftar aslinya, karena kalau dihapus, pemeriksaan
berikutnya akan mengulang pemeriksaan yang sama dan menyimpulkan hal yang sama
lagi.

1. ~~**Tidak ada `middleware.ts` sama sekali.**~~ → lihat 6.1. Bukan celah.
2. ~~**Dua halaman admin tidak memeriksa sesi di server.**~~ → lihat 6.1.
   Keduanya terlindungi oleh layout.
3. **Tidak ada satu pun header keamanan di `next.config.ts`.**
   `Content-Security-Policy`, `Strict-Transport-Security`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
   `X-Frame-Options`, dan `frame-ancestors` semuanya tidak ada.
   **Sudah diperbaiki** di commit `9a197e1`, dikunci test `header-keamanan.test.ts`.
4. **Pesan error `AUTH_SECRET` membocorkan panjang nilainya.**
   `src/server/config.ts` menulis "nilai sekarang ${authSecret.length}".
   Panjang saja, bukan nilainya, tapi tidak perlu muncul di pesan error.
   **Sudah diperbaiki** di commit `4878634`.

### 6.1 Koreksi: dua temuan ternyata salah

**Yang dikira celah: tidak ada `middleware.ts`.**

Kenyataannya gate sesi ada di satu tempat,
`src/app/admin/(panel)/layout.tsx:16-17`, dan layout route group membungkus
**seluruh** halaman di dalam `(panel)`.

**Yang dikira celah: dua halaman admin tidak cek sesi.**

Keduanya memang tidak memanggil `readSession` sendiri, tapi tidak perlu:
layout memblokir render sebelum halaman dieksekusi. Pertanyaan yang saya pakai
saat itu salah. Yang perlu diperiksa bukan "apakah `page.tsx` memanggil
`readSession`", melainkan "apakah halaman itu sampai dieksekusi".

**Bukti pengukuran** — `curl` ke server berjalan, tanpa cookie sesi:

```
/admin                   → 307  /admin/login
/admin/beds              → 307  /admin/login
/admin/inbox/appointment → 307  /admin/login
/admin/records/articles  → 307  /admin/login
/api/v1/admin/stats      → 401  UNAUTHORIZED
/api/v1/admin/users      → 401  UNAUTHORIZED
```

**Keputusan.** `middleware.ts` tidak dibuat. Tidak menutup celah apa pun, dan
akan membuat logika pencabutan sesi punya dua implementasi: `readSession()`
memakai `node:crypto` dan `drizzle-orm` yang tidak bisa jalan di runtime Edge.
Rinciannya di [`docs/AUDIT-KEAMANAN.md`](AUDIT-KEAMANAN.md) bagian 3.


Catatan positif untuk TAHAP E: cookie sesi sudah memakai `httpOnly: true`,
`sameSite: "lax"`, `path: "/"`, dan `secure` dihitung dari
`adminOrigin.startsWith("https://")`. `dangerouslySetInnerHTML` hanya dipakai
di satu berkas, `src/app/berita/[slug]/page.tsx`, dan sanitasi Markdown
berada di `src/server/markdown.ts`.

---

## 7. Rekomendasi urutan

1. Perbarui README agar sesuai kenyataan (bagian 4) — murah, dan selama ini
   README menyesatkan untuk tahap berikutnya.
2. Perbaiki proteksi `/admin` di server (bagian 6, butir 1 dan 2).
3. Tambah header keamanan di `next.config.ts` (bagian 6, butir 3).
4. Lengkapi UI panel admin untuk 5 kelompok yang belum (bagian 4.2).
5. Form MCU dan E-Pasien.
6. Audit keamanan menyeluruh, pengujian terpadu, lalu deploy.