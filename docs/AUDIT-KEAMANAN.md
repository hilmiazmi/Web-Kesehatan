# Audit Keamanan

Tanggal: **8 Oktober 2026**
Commit yang diaudit: **`a74774f`**
Dasar percakapan: `c154306` plus empat commit perbaikan di atasnya.

Semua temuan di sini sudah diverifikasi lewat kode atau lewat perintah yang
hasilnya dilampirkan. Dua temuan yang semula saya laporkan sebagai kerentanan
ternyata **tidak benar**, dan koreksinya ada di bagian 3. Itu dicatat, bukan
dihapus, karena kalau tidak dicatat orang akan mengulang pemeriksaan yang sama
dan menyimpulkan hal yang sama lagi.

---

## 1. Ringkasan

| Tingkat | Jumlah | Status |
|---|---|---|
| Kritis | 1 | Belum diperbaiki, perlu keputusan Anda |
| Tinggi | 0 | — |
| Sedang | 1 | Belum diperbaiki, perlu keputusan Anda |
| Rendah | 2 | Diperbaiki atau cukup diterima |

Dua temuan sudah diperbaiki dan diverifikasi:

| Temuan | Commit | Bukti |
|---|---|---|
| Tidak ada header keamanan | `9a197e1` | `curl -D -` ke server berjalan, 7 header muncul |
| Pesan error membocorkan panjang `AUTH_SECRET` | `4878634` | pesan tidak lagi memuat `authSecret.length` |

---

## 2. Temuan yang masih terbuka

### K-1 · Kritis · Prototype pollution di Swiper

**Bukti**

```
$ bun audit
swiper@11.2.6
  (direct dependency)
  critical: Prototype pollution in swiper (>=6.5.1 <12.1.2)
  https://github.com/advisories/GHSA-hmx5-qpq5-p643
```

**Dampak.** Swiper dipakai di dua komponen: `HeroSlider` (slider hero beranda)
dan `CardCarousel`. Keduanya memakai API modul React, yaitu `Swiper`,
`SwiperSlide`, dan modul dari `swiper/modules`.

**Kenapa belum diperbaiki.** Perbaikannya naik satu versi utama, dari 11 ke
12.1.2, dan `package.json` mengunci `"swiper": "11.2.6"` tanpa `^`, jadi
perubahan ini disengaja dan harus diuji, bukan sekadar `bun audit fix`. Swiper
12 mengubah beberapa hal di modul React, dan dua komponen itu adalah carousel
yang tidak bisa dibuktikan benar hanya dari test unit: karusel rusak tetap
"lulus" test kalau test-nya tidak menyentuh perilaku visual.

**Yang perlu Anda kerjakan.** Naikkan ke `swiper@12.1.2` atau lebih baru,
lalu periksa dua carousel di browser pada lebar desktop dan mobile: swipe
berjalan, autoplay berjalan, titik pagination bisa diklik, dan tidak ada
galat di konsol.

**Status 2026-10-09: DITUTUP.** Naik ke `swiper@12.2.0` di `eb0e453`
(termasuk sesuaikan CSS tombol navigasi). `bun audit` hari ini tidak lagi
menyebut swiper. E2E hero (9 slide + autoplay) lolos; Carousel dipakai dengan
modul terdaftar benar. Sisa manual: cek visual mobile 390px di browser
(panah ganda, bullet meluber, gulir horizontal) — belum dikerjakan.

### S-1 · Sedang · SweetAlert2 versi rentan

**Bukti**

```
sweetalert2@11.22.0
  low: sweetalert2 contains potentially undesirable behavior (>=11.6.14 <11.22.4)
```

**Dampak.** Dipakai di tujuh berkas: lima formulir publik, satu lagi di
panel admin. Levelnya rendah, dan menurut advisory perbaikannya sudah ada
di 11.22.4, jadi ini naik versi kecil di dalam rentang 11.

**Kenapa belum diperbaiki.** Sama seperti Swiper, versinya dikunci persis di
`package.json`. Menaikkan berarti mengubah kunci itu, jadi ini keputusan
yang perlu disadari, bukan yang diam-diam.

**Status 2026-10-09: DITUTUP.** Naik ke `sweetalert2@11.22.4` di `a7146d3`.
`bun audit` hari ini tidak lagi menyebut sweetalert2.

### L-1 · Rendah · `braces` dan `esbuild`

Keduanya hanya muncul di rantai perkembangan, bukan di runtime produksi.

| Paket | Severity | Lewat mana | Efek ke produksi |
|---|---|---|---|
| `braces@3.0.3` | tinggi | `eslint-config-next` → `fast-glob` → `micromatch` | Tidak ada. Hanya `bun run lint`. |
| `esbuild` | sedang | `drizzle-kit`, dan `vitest` → `vite` → `tsx` | Tidak ada. Hanya `dev` dan `test`. |

Advisory `esbuild` menyangkut dev server yang menerima permintaan dari
situs mana pun. Itu tidak berlaku untuk build produksi, dan `bun run build`
tidak memakai dev server.

**Saran.** Tidak perlu buru-buru. Kalau nanti `eslint-config-next` atau
`drizzle-kit` ikut naik versinya, kedua-duanya biasanya ikut tertutup.

---

## 3. Koreksi atas temuan yang semula salah

Bagian ini penting. Dua temuan yang saya laporkan di audit sebelumnya ternyata
tidak benar, dan saya baru menyadarinya setelah mengujinya, bukan setelah
membaca kodenya lagi.

### Yang dikira celah: tidak ada `middleware.ts`

**Pernyataan saya sebelumnya:** "`/admin` hanya dilindungi pemeriksaan di
dalam masing-masing halaman."

**Kenyataannya.** Gate-nya ada di satu tempat, yaitu
`src/app/admin/(panel)/layout.tsx:16-17`:

```tsx
const claims = await readSession();
if (claims === null) redirect("/admin/login");
```

Layout route group membungkus **seluruh** halaman di dalam `(panel)`, jadi
satu baris itu berlaku untuk dasbor, beds, inbox, records, akun, dan
pengaturan yang baru.

### Yang dikira celah: dua halaman admin tidak cek sesi

**Pernyataan saya sebelumnya:** "`(panel)/page.tsx` dan
`(panel)/inbox/[kind]/page.tsx` tidak memanggil `readSession`."

**Kenyataannya.** Keduanya memang tidak memanggilnya sendiri, tapi tidak
perlu: pemeriksaannya di layout sudah memblokir render sebelum halaman
sampai dieksekusi. Yang saya ukur sebenarnya adalah "apakah berkas `page.tsx`
sendiri memanggil `readSession`", dan itu pertanyaan yang salah.

### Bukti pengukuran

Pengukuran dengan `curl` ke server yang sedang berjalan, tanpa cookie sesi:

```
$ for u in /admin /admin/akun /admin/beds /admin/pengaturan \
           /admin/records/articles /admin/inbox/appointment; do
    curl -s -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "http://localhost:3399$u"
  done

/admin                    -> 307 http://localhost:3399/admin/login
/admin/akun               -> 307 http://localhost:3399/admin/login
/admin/beds               -> 307 http://localhost:3399/admin/login
/admin/pengaturan         -> 307 http://localhost:3399/admin/login
/admin/records/articles   -> 307 http://localhost:3399/admin/login
/admin/inbox/appointment  -> 307 http://localhost:3399/admin/login
/                         -> 200
```

Dan untuk API-nya:

```
/api/v1/admin/stats  -> 401 {"error":{"code":"UNAUTHORIZED","message":"Sesi tidak valid atau sudah berakhir."}}
/api/v1/admin/beds   -> 401 UNAUTHORIZED
/api/v1/admin/users  -> 401 UNAUTHORIZED
```

### Keputusan: `middleware.ts` tidak dibuat

Dua alasan:

1. **Tidak ada celah yang ditutup.** Gate sudah bekerja, dan pengukurannya di
   atas bukan membaca kode tapi melihat perilakunya.
2. **Middleware akan membuat dua sumber kebenaran untuk satu hal.**
   `readSession()` memakai `node:crypto` dan `drizzle-orm` yang tidak bisa
   jalan di runtime Edge milik middleware. Menulisnya ulang di sana berarti
   logika pencabutan sesi punya dua implementasi. Kalau keduanya menyimpang,
   yang salah bisa jadi yang lebih longgar — dan itu persis kelas bug yang
   paling mahal.

Kalau nanti memang butuh middleware, alasannya sebaiknya bukan-keamanan
percuma, melainkan hal lain seperti rewrites, pengukuran, atau limiting yang
benar-benar perlu Edge. Kebutuhan itu belum ada.

---

## 4. Yang sudah benar, dan dibuktikan

Sesi ini sengaja mencatat hal yang sudah aman, supaya pemeriksaan berikutnya
tidak membuang waktu mengulanginya.

### Auth dan sesi

| Yang diperiksa | Hasil | Bukti |
|---|---|---|
| Hashing password | `scrypt` | `src/server/auth/password.ts` |
| Perbandingan hash | `timingSafeEqual` | `password.ts`, `session.ts` |
| Tanda tangan token | HMAC-SHA256 | `createHmac("sha256", ...)` di `session.ts:97` |
| Perbandingan signature | `timingSafeEqual` | `session.ts:107-112` |
| Urutan verifikasi | signature dulu, baru parse payload | `session.ts:143-149` |
| Masa berlaku token | 8 jam, `SESSION_MAX_AGE_SECONDS` | `config.ts:90` |
| Pencabutan | `users.session_version` dibandingkan tiap permintaan | `session.ts:248-261` |
| `AUTH_SECRET` tanpa bawaan | kosong tidak diterima di mode `live` | `config.ts:79-84` |

Urutannya penting dan sering terbalik: kalau payload di-parse dulu, penyerang
bisa membuat server melakukan parsing atas data yang belum diautentikasi.

### Atribut cookie

Dari `src/server/auth/session.ts:186-198`:

```ts
const secure = config().adminOrigin.startsWith("https://");
return {
  name: COOKIE_NAME,
  value: token,
  options: { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ... },
};
```

Empat dari lima atribut sudah benar. Yang kelima, `secure`, dihitung dari
`adminOrigin`. Ini benar untuk produksi, dan disengaja tidak dipaksa `true`
karena situs ini diakses lewat HTTP lokal saat pengembangan. Konsekuensinya
perlu diketahui: **kalau `ADMIN_ORIGIN` tidak diawali `https://` di produksi,
cookie sesi akan dikirim tanpa atribut `Secure`.** Bukan kerentanan pada kodenya,
tapi konfigurasi yang harus benar saat deploying.

### Otorisasi

`requireSession()` di `session.ts:272-279` dipakai seluruh endpoint admin, dan
menerima fungsi peran seperti `canEditContent` atau `canManageUsers`. Satu tempat
sehingga tidak ada handler yang bisa "hanya cek ada sesi" lalu lupa
perannya. Terukur: tiga endpoint admin membalas 401 tanpa sesi.

### Validasi input

Validasi tidak pernah pakai penggabungan string. Semua query memakai tag
`sql` dari Drizzle dengan parameter binding, misalnya
`WHERE id = ${claims.sub}::uuid` di `session.ts:249`.

### XSS

`dangerouslySetInnerHTML` dipakai di **satu** berkas saja,
`src/app/berita/[slug]/page.tsx`, dan isinya melewati sanitasi di
`src/server/markdown.ts` yang memakai allow-list tag dan atribut.

### Rate limiting

Seluruh endpoint tulis publik melewati `jalankanForm` di
`src/server/api/form.ts`, yang memanggil `limitRequest` sebelum apa pun yang
lain. Endpoint tiket punya hitungan 32^8 kombinasi, jadi tidak perlu rate
limit; alasannya sudah tertulis di `SECURITY.md`.

### Kebocoran informasi

Tidak ditemukan nilai rahasia di bundle klien. Semua variabel yang boleh
tembus ke peramban berawalan `NEXT_PUBLIC_`, dan hanya satu yang dipakai:
`NEXT_PUBLIC_SITE_URL`. `.env*` tidak pernah terlacak Git; satu-satunya
berkas `.env` yang terlacak adalah `.env.example` yang isinya nama variabel
saja.

`git status --porcelain | grep -E '\.env' | grep -v '\.env\.example$'` →
kosong.

### Privasi

`SECURITY.md` ada dan sudah dibaca ulang; aturannya dipakai selama audit ini.
Semua nilai `.env` hanya dibaca lewat nama variabelnya, tidak pernah dicetak.

---

## 5. Sisa risiko

| Risiko | Ringkas |
|---|---|
| Swiper prototype pollution | Ditutup 2026-10-09 (`swiper@12.2.0`). Sisa manual: cek visual mobile di browser. |
| `ADMIN_ORIGIN` salah di produksi | Kalau tidak `https://`, cookie sesi tidak dapat `Secure`. Tidak ada kode yang bisa mencegah ini; hanya konfigurasi. |
| `script-src` masih `'unsafe-inline'` | CSP tidak bisa menutup XSS inline tanpa nonce. Nonce butuh middleware, yang akan mengubah 179 halaman statis menjadi dinamis. |
| `AUTH_SECRET` tidak punya nilai bawaan | Sudah benar, tapi akibatnya aplikasi menolak start. Itu pilihan yang benar, bukan risiko. |
| Pencabutan sesi tidak terlihat sebagai kegagalan | Sudah dicatat di `SECURITY.md`. Satu cookie yang dipakai dari alamat lain terbaca seperti permintaan biasa. Rate limit di login tidak menutup jalur ini. |
| Error 500 di produksi | `global-error.tsx` menampilkan pesan generik, bukan stack trace. Detail server tetap di log server, bukan di respons. |

---

## 6. Yang sengaja tidak dikerjakan

| Bukan tugas audit | Alasan |
|---|---|
| Membuat `middleware.ts` | Tidak menutup celah apa pun; hanya menambah sumber kebenaran kedua. |
| CSP berbasis nonce | Mengubah 179 halaman statis menjadi dinamis. Harga terlalu besar. |
| Uji beban pada rate limit | Di luar cakupan audit statis. |