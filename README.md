# Web-skesehatan — Frontend Rebuild

Website rumah sakit fiktif ("RSUD Contoh Sehat") rebuilt dengan Next.js.
Seluruh identitas, konten, foto, dan data di sini dibuat sendiri untuk
keperluan demonstrasi dan portofolio.

> **Situs demo untuk pembelajaran/portofolio.** Bukan situs resmi rumah sakit
> pemerintah. Data seluruhnya fiktif.

---

## Struktur

```
.
├── src/                   # Aplikasi Next.js (aktif, di root repo)
│   ├── app/               # Route: beranda, berita, layanan, MCU, formulir
│   ├── components/        # Komponen UI per bagian
│   ├── data/              # Konten dan kumpulan foto (masih data lokal)
│   ├── lib/               # Pembantu: format, penelusuran path menu
│   └── styles/            # CSS: token, layout, section, halaman detail
├── archive/legacy-v1/     # Kode versi lama, read-only
└── docs/                  # PRD & dokumentasi desain token
```

## Menjalankan

```bash
bun install
bun run dev        # http://localhost:3000
bun run build      # build produksi + typecheck
bun run lint       # pemeriksaan ESLint
bun run test       # unit test (Vitest)
```

Aplikasi berada di root repo, tidak perlu `cd` ke subdirektori.

Butuh Node 20+ dan Bun. `packageManager` di `package.json` dikunci ke `bun@1.4.2`.

---

## Yang sudah selesai

### Layout global
- `Topbar` — kontak (telepon/WhatsApp/email) + ikon sosial, latar `#1977cc`
- `Navbar` — 11 item level-1, dropdown 3 tingkat (hover di desktop, accordion di mobile)
- `Footer` — identitas, link terkait, media pengaduan, blok lokasi, penanda demo
- Tombol CTA header: **Daftar Online** dan **Administrasi Pasien**
- Skip-link untuk aksesibilitas keyboard

### Home — 13 section
Urutan **terverifikasi dari DOM situs referensi**, bukan dari PRD:

| # | Section | ID |
|---|---|---|
| 1 | Hero slider (9 slide, Swiper autoplay) | — |
| 2 | Cari Jadwal Dokter (spesialis → dokter → hari) | `cari-dokter` |
| 3 | Layanan Unggulan & Prioritas (6 kartu) | `layanan` |
| 4 | Fasilitas & Layanan (tab vertikal 8 item) | `fasilitas` |
| 5 | Paket MCU & Promosi (8 paket) | `mcu` |
| 6 | Berita dan Artikel (16 kartu) | `berita` |
| 7 | Akreditasi & Penghargaan | `akreditasi` |
| 8 | Gallery | `galeri` |
| 9 | Pendaftaran (3 tombol) | `pendaftaran` |
| 10 | Sosial Media | `sosial-media` |
| 11 | Patient Experience (4 testimoni) | `testimoni` |
| 12 | Asuransi | `asuransi` |
| 13 | FAQ (9 pertanyaan, `<details>`) | `faq` |

### Design tokens — semua terverifikasi
Nilai diambil dari `getComputedStyle()` pada situs referensi, **bukan tebakan**.
Detail lengkap: [`docs/design-tokens-terverifikasi.md`](../docs/design-tokens-terverifikasi.md)

| Token | Nilai |
|---|---|
| Warna aksen | `#1977cc` |
| Background section | `#f1f7fc` |
| Font heading | Poppins 500 (pengganti Gotham) |
| Font body | Poppins 400 (pengganti Gotham Rounded) |
| `h2` section | 42px / 50.4px |
| Nav link | 15px / 700 |
| Tombol | radius 50px, padding 8px 25px |

### Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict ·
Bootstrap 5.3.3 · Bootstrap Icons · Swiper · react-select (prepared) ·
SweetAlert2 (prepared) · Poppins via `next/font`

---

## Yang belum dikerjakan

Sesuai instruksi, fokus **frontend saja** pada tahap ini. Belum ada:

- [ ] Halaman selain Home (±30 template di PRD bagian 4.2)
- [ ] PostgreSQL + Prisma/Drizzle (skema sudah ada di PRD bagian 7)
- [ ] Route Handler untuk jadwal dokter & kapasitas bed
- [ ] Panel admin (P3)
- [ ] Form: E-Pasien, Registrasi MCU, Kritik-Saran, WBS, SKM (P2)
- [ ] Dual deploy Vercel + VPS

Data Home masih hardcoded di `src/data/home.ts`. Saat backend siap, ganti
sumbernya dengan pemanggilan Route Handler sesuai PRD bagian 6.4-6.5.

---

## Batasan yang disengaja

1. **Aset asli tidak disalin** — logo, foto, nama dokter, testimoni. Diganti
   placeholder. Alasan: hak cipta dan privasi (PRD bagian 13).
2. **Font Gotham tidak dipakai** — lisensi komersial. Diganti Poppins.
3. **Embed pihak ketiga dimatikan** — Instagram/YouTube/GA/GTM/ShareThis.
   PRD bagian 12 melarang script pihak ketiga aktif default.
4. **`id="services"` duplikat diperbaiki** — situs asli memakai ID sama dua kali;
   di sini dibedakan jadi `akreditasi` dan `asuransi`.
5. **Section Sosial Media memakai placeholder** — di situs asli bagian ini
   kosong karena embed Instagram gagal termuat.