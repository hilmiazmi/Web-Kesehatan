<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web-Kesehatan

Replika UI/UX rumah sakit References `rsudpasarminggu.jakarta.go.id` memakai Next.js.
Identitas, konten, dan foto **fiktif** - jangan salin logo, nama dokter, testimoni,
kontak, atau foto milik rumah sakit asli (PRD di `docs/` bagian 12 dan 13).

## Lokasi aplikasi

Aplikasi ada di **root repo**: `src/`, `package.json`, `next.config.ts` semuanya
di root. Semula ada di subdirektori `rs-frontend/` dan dipindahkan pada 2 Oktober
2026; **jangan membuat ulang subdirektori itu**. Nama di `package.json` masih
`rs-frontend` - itu tertinggal dan tidak memengaruhi build.

## Perintah

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # build produksi, sekaligus typecheck
bun run lint     # ESLint
```

`packageManager` dikunci ke `bun@1.4.2`. **Belum ada test runner** (tidak ada
Vitest maupun Jest), jadi `bun run lint` dan `bun run build` adalah satu-satunya
gerbang otomatis. Perilaku harus diverifikasi manual lewat browser. Belum ada
CI workflow.

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

- **`src/components/ui/Photo.tsx` sudah memiliki wrapper-nya sendiri.** Pakai
  `<Photo height={165} radius="top" />`; jangan tambahkan div kelas `img-*` lagi.
- **Tombol hamburger harus di LUAR `.navmenu`.** Di mobile `.navmenu` menjadi
  panel off-canvas `translateX(100%)`, sehingga apa pun isinya tidak bisa diklik.
- Submenu navbar: hover di desktop dan tautan induk tetap dinavigasi; accordion
  di mobile. Percabangan ini lewat `isDesktopNav()` dengan batas `1200px` yang
  **harus sama** dengan media query `.navmenu` di `site.css`.
- Form dan komponen lain tidak boleh memanggil `setState` di dalam `useEffect`;
  aturan eslint `react-hooks/set-state-in-effect` aktif. Pola yang dipakai adalah
  penyesuaian saat render lewat pasangan `lastX` dan `setLastX`, contoh di
  `Navbar` dan `DoctorSearchCard`.
- `suppressHydrationWarning` pada `<html>` dan `<body>` memang disengaja:
  ekstensi browser seperti Grammarly dan LanguageTool menyuntik atribut sebelum
  React memuat.
- Font Sizes, warna, dan radii untuk section beranda sudah diverifikasi satu per
  satu terhadap situs rujukan; jangan mengarang angka baru tanpa pengukuran.

## Batasan

- `archive/legacy-v1/` adalah kode versi lama yang read-only dan sudah
  dikecualikan dari ESLint. Jangan diperbaiki atau dipindahkan.
- `docs/` berisi pekerjaan milik pemilik repo (rename PRD). **Jangan diubah**
  kecuali diminta.
- Isi `src/data/` masih data lokal. Route Handler `/api/registrations` dan
  `/api/schedules` belum ada; jangan mengarang pemanggilan yang tidak ada.
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
