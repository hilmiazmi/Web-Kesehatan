<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web-Kesehatan

Website rumah sakit **fiktif** ("RSUD Contoh Sehat") memakai Next.js. Identitas,
konten, foto, dan nama orang semua dibuat sendiri - jangan salin logo, nama dokter,
testimoni, kontak, atau foto milik rumah sakit nyata mana pun (PRD di `docs/`
bagian 12 dan 13).

## Lokasi aplikasi

Aplikasi ada di **root repo**: `src/`, `package.json`, `next.config.ts` semuanya
di root. Semula ada di subdirektori `rs-frontend/` dan dipindahkan pada 2 Oktober
2026; **jangan membuat ulang subdirektori itu**. Nama di `package.json` masih
`rs-frontend` - itu tertinggal dan tidak memengaruhi build.

## Perintah

```bash
bun install
bun run dev         # http://localhost:3000
bun run build       # build produksi, sekaligus typecheck
bun run lint        # ESLint
bun run test        # Vitest, sekali jalan
bun run test:watch  # Vitest, mode watching
```

`packageManager` dikunci ke `bun@1.4.2`. Belum ada CI workflow, jadi jalankan
`bun run lint && bun run test && bun run build` sebelum menyatakan selesai.

Backend memakai skrip yang sama. Urutannya penting, karena tiap langkah
bergantung pada langkah sebelumnya:

```bash
docker compose up -d postgres   # database lokal, hanya di 127.0.0.1
bun run db:migrate              # jalankan drizzle/000*.sql
bun run db:seed                 # isi data contoh
bun run db:status               # cek isi database
bun run db:snapshot             # tulis ulang snapshot/*.json
```

`DATABASE_URL` di `.env.local` harus sama persis dengan nama service, user,
kata sandi, dan database di `docker-compose.yml`. Salah satu berubah, keduanya
harus berubah bersama.

Skrip `cek:konten`, `cek:tulis`, `cek:admin`, dan `audit:teks` adalah gerbang
manual, bukan bagian dari `bun run test`. `cek:tulis` menyentuh database
sungguhan, jadi jangan menjalankannya di mode snapshot.

## Tes

Vitest 5, tanpa jsdom karena semua yang diuji logika murni. Tes ada di
`tests/*.test.ts` dan hanya mencakup apa yang tidak bisa dijamin mata:
`nav-path.ts`, `format.ts`, `validate()` di formulir, bentuk data konten,
sanitasi Markdown, dan fungsi tanggal di `src/server/`.

Tes yang menguji aturan waktu **wajib** memakai `vi.setSystemTime`. Aturan
yang membandingkan "hari ini" dengan tanggal UTC terlihat benar selama
berbulan-bulan, lalu meledak sendiri di jendela tujuh jam pertama pagi. Tes
yang memakai jam sebenarnya tidak akan pernah menyentuh jalur itu.

Alias `@/` dideklarasikan ulang di `vitest.config.mts`; Vite tidak membaca
`tsconfig.json`. Berkas itu memakai ekstensi `.mts` karena paket ini tidak
menulis `"type": "module"`.

Yang **tidak** bisa diuji di sini dan harus diperiksa manual lewat browser:
tata letak responsif, carousel Swiper, panel navigasi off-canvas, dan interaksi
SweetAlert2.

Memeriksa satu route setelah build:

```bash
bun run start --port 3300 &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3300/daftar-online
```

## Jebakan Next.js 16 yang sudah pernah jadi bug

- **`params` itu `Promise`.** Semua page component wajib
  `const { slug } = await params;`
- **`generateStaticParams` untuk catch-all harus mengembalikan `{ slug: string[] }[]`.**
  Mengembalikan `{ path }` membuat tidak ada satu pun halaman ter-prerender dan
  setiap tautan navbar berakhir jadi 404. Sudah pernah salah di
  `src/lib/nav-path.ts`.
- **`src/app/[...slug]/page.tsx` memakai `dynamicParams = false`** supaya URL tak
  dikenal membalas 404 sungguhan, bukan soft-404 dengan status 200.
- Dokumentasi API tersedia lokal di `node_modules/next/dist/docs/`. Baca sebelum
  memakai API Next.js yang tidak biasa.

## Sumber kebenaran untuk rute

`collectNavPaths()` di `src/lib/nav-path.ts` menelusuri **`NAV_ITEMS`,
`HEADER_CTAS`, dan `FOOTER_LINKS`** dari `src/data/navigation.ts` untuk membuat
seluruh halaman generik. Tautan baru yang tidak ada di salah satu dari tiga
array itu **akan 404**. Jangan menulis daftar path manual di tempat lain.

## Styling

Bootstrap 5.3.3, **bukan Tailwind**. Urutan import di `src/app/layout.tsx` penting:
`bootstrap.min.css`, lalu `bootstrap-icons`, lalu `tokens.css`, `site.css`,
`pages.css`. `home.css` diimpor dari `src/app/page.tsx`.

Angka warna dan ukuran **diukur** dari situs rujukan lewat `getComputedStyle()`,
bukan tebakan. Rinciannya ada di `docs/design-tokens-terverifikasi.md`.

- Aksen `#1977cc`, **bukan** `#1a77cc` yang hanya muncul di meta `theme-color`.
- Font Gotham berlisensi komersial, diganti **Poppins**.
- `.card` radius `25px`, **tanpa** box-shadow, garis tepi 1px.
- Tombol CTA header boleh berbentuk pill `50px`; tombol di dalam kartu radius
  `5px`. Jangan menyamakan keduanya.
- Tinggi hero `min(303px, 23.67vw)`: hero ikut menyusut menjadi 92px pada lebar
  390px, bukan tinggi tetap.

## Peran komponen

- **Aturan `.photo-box` ada di `site.css`, bukan di `home.css`.** Komponen
  `Photo` dipakai di sebelas berkas dan sebagian besar bukan halaman beranda,
  sedangkan `home.css` hanya diimpor oleh `src/app/page.tsx`. Saat aturan ini
  masih di `home.css`, `/pelayanan/poliklinik` dan semua halaman detail
  menampilkan gambar keluar kotak. Jangan memindahkannya kembali.
- **`src/components/ui/Photo.tsx` sudah memiliki wrapper-nya sendiri.** Pakai
  `<Photo height={165} radius="top" />`; jangan tambahkan div kelas `img-*` lagi.
- **`AnimeAvatar` menggambar SVG di dalam komponen, bukan berkas gambar.**
  `next/image` menolak SVG kecuali `dangerouslyAllowSVG` diaktifkan, dan
  mengaktifkannya melemahkan keamanan seluruh situs. Bentuknya dihasilkan oleh
  `/tmp/opencode/gen-avatar.py` supaya dapat dibangun ulang.
- **Navbar: desktop tanpa hamburger, mobile dengan hamburger.** Permintaan
  pemilik repo 4 Oktober 2026: pembekuan navbar dicabut. Nav desktop harus
  tampil penuh tanpa hamburger dan tanpa ada yang terpotong; hamburger +
  panel off-canvas hanya untuk mobile di bawah `1200px`.
  - Batas desktop `1200px`, dengan panel off-canvas `translateX(100%)` dan
    tombol hamburger `d-xl-none` di bawahnya.
  - Font nav `15px` seragam untuk desktop, submenu dropdown, dan panel.
  - Delapan butir nav butuh `894px`, tidak membungkus dan tidak menyusut.
    Angka itu adalah lebar elemen `.navmenu` pada viewport 1920px,
    hasil `getBoundingClientRect()`, bukan perkiraan.
  - **Header desktop dua baris.** Baris pertama logo + dua CTA, baris kedua
    nav penuh dan dipusatkan. Alasannya angka: satu baris butuh `1496px`
    (logo 237 + nav 894 + CTA 341 + padding 24), sedangkan viewport terkecil
    yang masih desktop adalah `1200px`. Menambah tinggi header dari `53px`
    menjadi `100px` memberi ruang yang cukup tanpa harus mengecilkan huruf nav.
  - **Sudah dicoba dan ditolak, jangan diulang:**
    - Memaksa satu baris dengan menyembunyikan CTA di bawah `1496px`.
      Akibatnya nav terdorong ke tepi kanan sampai menempel (`12px`) dan dua
      tombol utama hilang. Persis cacat yang dilaporkan pemilik repo
      4 Oktober 2026 lewat tangkapan layar.
    - Mengecilkan nav supaya muat di `1200px`. Nav harus menyusut sekitar 33%
      supaya seluruhnya muat, dan huruf `15px` menjadi `10px`: tidak terbaca.
  - Yang menyembunyikan CTA hanyalah lebar di bawah `1200px`, di mana header
    memang sedang berpanel off-canvas. Di mobile CTA tetap terjangkau lewat
    panel, bilah aksi cepat, dan footer.
  - Diukur ulang lewat CDP pada 1200, 1280, 1366, 1440, 1496, 1920, dan
    2560px: tinggi `.branding` `100px`, nav tetap `894px` di semua lebar itu,
    `scrollWidth` sama dengan `clientWidth` (tidak ada gulir horizontal), dan
    CTA `display: flex` di semua lebar itu.
  - `tests/header-ctas.test.ts` mengunci semua angka di atas;
    `tests/panel-nav-mobile.test.ts` mengunci panel mobile.

  **Panel off-canvas mobile, diperbaiki 4 Oktober 2026 atas izin pemilik repo.**
  Semua aturan barunya hanya ada di dalam `@media (max-width: 1199.98px)`. `.navmenu` diukur ulang di 1920, 1440, dan
  1200px: tetap `894px`, font `15px`, `flex-wrap: nowrap`, tinggi `.branding`
  53px. Angka itu masih dijaga `tests/panel-nav-mobile.test.ts`.
  - Panel yang tertutup memakai `visibility: hidden`, bukan hanya
    `translateX(100%)`. Tanpa itu, 74 tautan di dalam panel tetap bisa difokus
    padahal tidak terlihat, jadi Tab masuk ke menu yang tidak kelihatan.
    `visibility` juga ikut masuk `transition`, karena nilainya dianimasikan
    sebagai langkah diskret: panel tetap terlihat sepanjang durasi geser keluar.
  - Tiga cara menutup, semuanya dipakai karena tidak ada satu pun yang cukup
    sendiri: `.navmenu-backdrop` (latar penutup, `z-index: 1190`, di bawah
    panel 1200), tombol `.navmenu-close` di dalam panel, dan tombol Escape.
  - Sambil panel terbuka, `body` dapat kelas `navmenu-terbuka` dan
    `overflow: hidden`. Tanpa itu, halaman di belakang panel masih bisa bergulir
    dan membuat orang mengira panelnya yang bergerak.
  - Fokus kembali ke hamburger **hanya setelah panel ditutup**, dijaga ref
    `pernahTerbuka`. Tanpa penjaga itu, `useEffect` berjalan sekali saat render
    pertama dengan panel masih tertutup dan fokus melompat ke tombol menu, jadi
    pembaca layar tidak lagi membacakan isi halaman.
  - `body.navmenu-terbuka .scroll-top` memakai `visibility: hidden`, bukan
    `display: none`. Alasannya teknis: `BackToTop` memakai `d-flex` dari
    Bootstrap yang menulis `display: flex !important`, jadi `display` biasa
    kalah. `z-index` tombol itu tidak disentuh, karena
    `tests/kembali-ke-atas.test.ts` mengunci 1199 sebagai satu-satunya nilai.

  `tests/panel-nav-mobile.test.ts` mengunci seluruh perilaku di atas. Cara
  memeriksa angka CSS di berkas tes ada di helper `kodeSaja()`: komentar harus
  dibuang dulu, karena aturan pembacaan properti hanya menerima `^`, `{`, atau
  `;` tepat sebelum nama propertinya. Tanpa itu, `visibility: hidden` yang
  didahului penutup komentar terbaca tidak ada.
- **Jangan menulis `*/` di dalam komentar blok manapun di repo ini.** Itu menutup
  komentar lebih awal, dan sisa komentarnya dibaca TypeScript sebagai kode. Error
  berikutnya muncul jauh dari lokasi sebenarnya, jadi sulit dibaca.
- **Tombol hamburger harus di LUAR `.navmenu`.** Di mobile `.navmenu` menjadi
  panel off-canvas `translateX(100%)`, sehingga apa pun isinya tidak bisa diklik.
- Submenu navbar: hover di desktop dan tautan induk tetap dinavigasi; accordion
  di mobile. Percabangan ini lewat `isDesktopNav()` dengan batas `1200px` yang
  **harus sama** dengan media query `.navmenu` di `site.css`.
- **`validate()` di `registration-form.tsx` sengaja di-export** supaya aturan
  validasinya bisa diuji tanpa merender komponen. Jangan dibuat lokal lagi.
- Form dan komponen lain tidak boleh memanggil `setState` di dalam `useEffect`;
  aturan eslint `react-hooks/set-state-in-effect` aktif. Pola yang dipakai adalah
  penyesuaian saat render lewat pasangan `lastX` dan `setLastX`, contoh di
  `Navbar` dan `DoctorSearchCard`.
- `suppressHydrationWarning` pada `<html>` dan `<body>` memang disengaja:
  ekstensi browser seperti Grammarly dan LanguageTool menyuntik atribut sebelum
  React memuat.
- Font Sizes, warna, dan radii untuk section beranda sudah diverifikasi satu per
  satu terhadap situs rujukan; jangan mengarang angka baru tanpa pengukuran.

## Rahasia

[`SECURITY.md`](SECURITY.md) adalah rujukan lengkap dan wajib dibaca
sebelum menyentuh kredensial apa pun. Ringkasnya:

- **Tidak boleh** masuk commit, push, issue, PR, komentar review,
  screenshot, atau chat: `DATABASE_URL` lengkap, `AUTH_SECRET`, token
  API, kunci privat, password, isi cookie sesi, IP VPS/rumah/kantor, dan
  data pasien.
- Kalau tidak yakin sebuah nilai itu rahasia, perlakukan sebagai rahasia.
- **Jangan pernah** mencetak nilai `.env*` ke terminal. Ambil nama
  variabelnya saja; untuk tahu apakah ada yang terisi pakai `grep -c`.
- **Jangan pernah** `git add -A` tanpa membaca outputnya, dan jangan
  menulis nilai rahasia di commit message.
- Kredensial yang terlanjur masuk history harus dirotasi, bukan hanya
  di-revert. Menghapus commit tidak menghapusnya dari fork atau cache.
- Baris `!.env.example` di `.gitignore` itu wajib ada. Tanpa itu,
  `.env.example` ikut ter-ignore dan satu-satunya dokumentasi konfigurasi
  backend hilang dari repo.

## Batasan

- `archive/legacy-v1/` adalah kode versi lama yang read-only dan sudah
  dikecualikan dari ESLint. Jangan diperbaiki atau dipindahkan.
- `docs/` berisi pekerjaan milik pemilik repo (rename PRD). **Jangan diubah**
  kecuali diminta.
- Isi `src/data/` masih data lokal dan itu disengaja: backend punya database
  sendiri, tapi halaman masih membaca dari modul data, bukan dari API. Route
  Handler sudah ada di `src/app/api/v1/`, jadi **`/api/registrations` dan
  `/api/schedules` bukan nama yang benar**; yang benar `/api/v1/appointments`
  dan `/api/v1/schedules`. Jangan mengarang pemanggilan: endpoint publik ada
  di `src/app/api/v1/<namabesar>/route.ts`, dan semua path lain dibalas 404
  oleh catcher di `src/app/api/v1/[...path]/route.ts`.
- Backend Rust yang lama ada di `archive/rust-api/` dan sudah read-only.
  Jangan memperbaikinya; backend aktif ada di `src/server/` dan
  `src/app/api/v1/`.
- Foto berasal dari Unsplash dan picsum, dan host-nya didaftarkan pada
  `remotePatterns` di `next.config.ts`. Host baru harus ditambahkan di sana atau
  `next/image` akan menolaknya.
- `react-select` sudah terpasang tetapi belum dipakai. Jangan memasang
  dependensi baru tanpa diminta.

## Git

`origin` adalah fork `neiaki/Web-Kesehatan`, `upstream` adalah repo asli
`hilmiazmi/Web-Kesehatan`. Collaborator access tersedia di repo asli, jadi
**push langsung ke `upstream` tidak memerlukan fork**; `origin` dipakai sebagai
cadangan. Jangan pernah commit langsung ke `main` tanpa diminta - buat branch.

## Catatan alat

Penulisan teks ke berkas kadang menghasilkan karakter asing atau kata yang rusak.
Setelah menulis berkas sumber, audit sekali dengan:

```bash
python3 -c "import io,re,sys; print([(i+1,l) for i,l in enumerate(io.open(sys.argv[1],encoding='utf-8').read().split(chr(10))) if re.search(r'[\u4e00-\u9fff]',l)] or 'BERSIH')" <file>
```

Skrip yang lebih lengkap ada di `/tmp/opencode/audit-data.py`. Ia memindai
**semua literal string**, bukan hanya komentar, dan menangkap tiga kelas
kerusakan: karakter non-Latin, huruf kapital di tengah kata, dan sekitar 90
kata Inggris yang mustahil ada di prosa Indonesia. Jalankan `audit-data.py src
tests` sebelum menyatakan selesai.

Skrip itu hanya menangkap kelas kerusakan yang terdaftar, jadi baris yang lolos
tidak otomatis benar. Sudah pernah lolos baris seperti `lastly`,
`prioritizing Adriatic`, `assessing`, dan `Penghancuran`, yang kesalahannya soal
makna, bukan karakter.

### Jebakan `.playwright-mcp`

- **`scale` adalah parameter wajib** pada `browser_take_screenshot`, walau
  keterangannya menulis `@default "css"`. Skema tool dan keterangan itu tidak
  cocok. Selalu kirim `{ scale: "css", ... }`, atau `"device"` untuk ukuran
  piksel asli.
- **`browser_run_code_unsafe` tidak mengembalikan nilai balik** dari kode yang
  kamu jalankan. Untuk membaca hasil pengukuran, pakai `browser_evaluate` dengan
  bentuk `{ function: "() => ..." }`; parameternya bernama `function`.
- `browser_take_screenshot` menolak selektor yang cocok lebih dari satu elemen.
  Tambahkan `>> nth=0` atau `.first()`.

### Jebakan `github` MCP di dalam `execute`

Tiga kesalahan berturut-turut yang memakan waktu. Semuanya karena menebak
bentuk pemanggilan, bukan karena GitHub-nya bermasalah.

- **Nama tool-nya `list_pull_requests`, bukan `list_pulls`.** `list_pulls`
  tidak ada sama sekali. Katalog di dalam `execute` parsial, jadi panggil
  `search({ query: "github list pull requests" })` dulu dan pakai `path` yang
  dikembalikan.
- **`owner` dan `repo` adalah parameter wajib**, bukan opsional. Tanpa keduanya
  tool menolak dengan `owner: Missing key`.
- **Nilai enum `state` huruf kecil semua**: `"open"`, `"closed"`, `"all"`.
  `"ALL"` ditolak, dan pesan errornya hanya menyebut tiga nilai yang diterima
  tanpa menyebutkan bentuk yang diminta.

Bentuk yang benar:

```js
const r = await tools.github.list_pull_requests({
  owner: "hilmiazmi",
  repo: "Web-Kesehatan",
  state: "all",
  per_page: 20,
});
const list = Array.isArray(r) ? r : (r?.pull_requests ?? r?.items ?? []);
```

Hasilnya tidak selalu berupa array. Cek `Array.isArray` dulu sebelum
memakai `.filter` atau `.map`.

### Hydration mismatch di `/daftar-online` bukan bug kode

Muncul di terminal sebagai:

```
[browser] Uncaught Error: Hydration failed ...
-  style={{background-size:"auto, 25px...", background-image:"none, url(..."}}
-  <button type="button" style={{border-top-width:"0px", ...}}>
```

Penyebabnya ekstensi browser, biasanya password manager. Form ini bahkan
tidak punya `type="password"`, tetapi ekstensi tetap menyuntik ikon ke field
email karena di situlah discreet orang menyimpan login.

Cara membuktikannya, dan kenapa ini tidak bisa diperbaiki di kode:

- Baris `style` itu muncul sebagai pengurangan di diff React. Artinya atribut
  itu ADA di DOM klien dan TIDAK ADA di HTML hasil server. Kode kita tidak
  mungkin menghasilkannya.
- `suppressHydrationWarning` hanya menutup satu lapis. Ia bisa menutup
  selisih `style`, tapi tidak bisa menutup `<button>` yang disuntik sebagai
  elemen baru, karena itu selisih struktural pada anak elemen.
- Menempel flag itu ke input hanya akan menyembunyikan setengah masalah dan
  ikut menutupi selisih yang benar-benar penting. Jangan.

Kalau lihat pesan ini, abaikan. Jangan membenarkannya di kode.

### Mengukur situs rujukan

Angka di CSS ini hasil `getComputedStyle()`, bukan tebakan. Bentuk yang dipakai
di dalam `browser_evaluate`, setelah `page.goto` ke situs rujukan:

```js
() => JSON.stringify({
  scrollW: bar.scrollWidth,
  clientW: bar.clientWidth,
  display: getComputedStyle(el).display,
})
```

Kalau ragu soal jarak atau ukuran, ukur ulang. Beberapa angka sempat dikira
salah lalu dikoreksi lewat pengukuran; contoh, jarak seksi pada `/about` ternyata
`padding-top: 60px` dan `padding-bottom: 60px`, sama dengan nilai
`--rs-padding-section` yang sudah dipakai.
