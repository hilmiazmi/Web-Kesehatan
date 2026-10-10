# Panduan Konten Fiktif

Aturan tentang **apa yang boleh dan tidak boleh** masuk ke konten situs. Aturan ini
tadinya tersebar di `README.md`, `AGENTS.md`, PRD bagian 9/12/13, dan komentar kode.
Berkas ini memusatkannya; bila ada selisih, kode dan PRD menang, lalu perbarui berkas ini.

Situs ini adalah **rumah sakit fiktif ("RSUD Contoh Sehat")** untuk pembelajaran
dan portofolio. Referensi tampilan: `rsudpasarminggu.jakarta.go.id`. Referensi
itu dipakai untuk **struktur dan ukuran desain**, bukan untuk isi.

---

## 1. Aturan utama (tidak boleh dilanggar)

1. **Jangan salin aset asli dari situs referensi**: logo, foto, nama dokter,
   testimoni, nomor kontak, teks halaman. Alasan: hak cipta dan privasi orang nyata
   (PRD bagian 13).
2. **Semua nama orang adalah rekaan.** Jangan memakai nama dokter, pejabat, atau
   pasien nyata, termasuk yang "kebetulan mirip" situs referensi.
3. **Tidak boleh menyamar** sebagai situs pemerintah atau rumah sakit asli. Nama
   fiktif dan penanda demo wajib ada.
4. **Tidak ada data pasien sungguhan** di seed, snapshot, tes, tangkapan layar,
   atau issue. Formulir menerima NIK hanya untuk divalidasi formatnya; server
   tidak menyimpannya (diganti angka nol).
5. **Tidak ada script pihak ketiga yang aktif secara bawaan** (Instagram, YouTube,
   GA, GTM, ShareThis). PRD bagian 12 melarangnya. Pencarian `googletagmanager`,
   `gtag`, dan sejenisnya di `src/` harus tetap kosong.
6. **Font Gotham tidak dipakai** (lisensi komersial); pengganti: Poppins.

### Penanda demo

Footer harus tetap memuat penanda bahwa ini situs demo. Teks saat ini
(`src/components/layout/Footer.tsx`): "Situs demo untuk keperluan pembelajaran
dan portofolio. Bukan situs …". Jangan dihapus atau dilemahkan.

---

## 2. Identitas dan kontak fiktif

| Hal | Aturan |
| --- | --- |
| Nama | "RSUD Contoh Sehat", tagline "Rumah Sehat Untuk Semua" |
| Kontak | Hanya nilai di `CONTACT` (`src/data/navigation.ts`). Nomor memakai pola jelas-fiktif: `(021) 5000 1234`, WhatsApp `+6281100001234`, surel `info@rsudcontoh.go.id` |
| Domain surel | Gunakan domain contoh: `.test`, `.example`, atau `rsudcontoh.go.id` seperti yang sudah ada. **Jangan** memakai domain yang kemungkinan dimiliki orang nyata |
| Sosial media | Tautan generik ke beranda platform (`facebook.com`, `x.com`, `instagram.com`), bukan akun nyata |
| Alamat | Karangan; jangan alamat rumah sakit nyata |

Satu sumber kebenaran untuk kontak: ubah di `CONTACT`, jangan menulis ulang nomor
di komponen atau halaman. Komponen yang membutuhkannya (topbar, footer, bilah aksi
cepat) membaca dari sana.

---

## 3. Membuat nama dokter fiktif

Sumber tunggal nama dokter adalah `src/data/doctors.ts` (komentar di berkas itu:
"satu-satunya sumber nama dokter di repo"). Beranda menurunkan daftarnya lewat
`DOCTORS_BY_SPECIALTY`, jadi **jangan membuat daftar dokter kedua**: sebelumnya
spesialis yang sama punya nama berbeda tergantung halaman.

Pola yang dipakai:

```
slug: "dr-annisa-rahma-spa"   name: "dr. Annisa Rahma, Sp.A"   specialty: "Anak"
```

Aturan:

1. Gabungkan **dua kata nama Indonesia umum** yang dipilih acak, lalu cek tidak
   sama dengan dokter nyata yang Anda kenal dari situs referensi atau rumah sakit
   setempat. Bila ragu, ganti.
2. Format gelar: `dr. <Nama>, Sp.<Kode>` (mis. `Sp.A`, `Sp.PD`, `Sp.JP`).
3. `slug` huruf kecil, tanda hubung, ditambah kode spesialis (`dr-nama-nama-spa`).
4. `specialty` **harus sama persis** dengan `specialty` di `src/data/clinics.ts`;
   dijaga oleh `tests/poliklinik.test.ts`.
5. Jadwal praktik dalam jam rawat jalan: Senin sampai Jumat, 07.30 sampai 14.00,
   format waktu `"08.00–12.00"`, hari bertipe `Day`.
6. Jangan memberi foto wajah nyata. Ada komponen avatar gambar-sendiri
   (`AnimeAvatar`, SVG yang digambar di komponen); seed database memakai foto
   dari `picsum.photos`.

> Kebiasaan yang perlu diingat: seed database (`scripts/seed-data.json`) memakai
> daftar dokter yang **berbeda** dari modul statis (17 vs 30+). Menyamakannya
> adalah keputusan terpisah; lihat `ARCHITECTURE.md` bagian 2. Keduanya tetap
> harus fiktif.

---

## 4. Testimoni, penghargaan, dan klaim

- Testimoni ("Patient Experience") adalah **karangan**; nama pemberi testimoni
  fiktif, tanpa foto nyata.
- Penghargaan dan akreditasi harus jelas-fiktif. Jangan menulis nama lembaga
  akreditasi beserta nomor sertifikat yang tampak resmi.
- Hindari klaim medis yang bisa disalahartikan sebagai saran nyata. Konten
  kesehatan (berita, artikel) bersifat contoh.
- Harga dan paket MCU adalah contoh.

---

## 5. Foto dan gambar

Aturan dari `src/data/images.ts` dan `next.config.ts`:

1. Foto berasal dari **Unsplash** (stok gratis) dan **picsum.photos**. Tidak ada foto
   dari situs referensi.
2. Host gambar harus terdaftar di `remotePatterns` pada `next.config.ts`. Host
   baru **ditolak `next/image`** sampai ditambahkan di sana.
3. Foto dibangun lewat helper `photo(id, width, height)` di `images.ts`; untuk
   mengganti ke aset milik sendiri cukup ubah nilai `PHOTO.*`.
4. ID Unsplash diverifikasi aktif (HTTP 200) pada 2 Oktober 2026. Tautan gambar
   bisa mati kapan saja; periksa ulang secara berkala.
5. **Gambar dari admin (URL bebas)**: admin boleh memasukkan URL `http`/`https`
   apa pun. Foto dari database ditandai `unoptimized` agar host di luar daftar
   tidak membuat kotak gambar rusak. Konsekuensinya: tidak dioptimasi
   `next/image`; jangan jadikan ini alasan untuk menaruh gambar asli RS lain.
   **Perhatian:** CSP `img-src` di `next.config.ts` hanya mengizinkan
   `images.unsplash.com` dan `picsum.photos`, sehingga gambar dari host lain
   diblokir peramban walau `next/image` tidak menolaknya (dibaca dari
   konfigurasi; belum dicoba di peramban).
6. **Ikon**: Bootstrap Icons memakai subset (`bun run subset-ikon` menghasilkan
   ulang subset CSS dan font). Ikon baru di `*.tsx` harus ikut di-subset.
7. **Jangan** `dangerouslyAllowSVG` untuk `next/image`; itu melemahkan keamanan
   situs. Avatar SVG digambar di dalam komponen, bukan sebagai berkas gambar.
8. Setiap gambar punya `alt` bermakna (kriteria aksesibilitas: nol `img` tanpa `alt`).

---

## 6. Menulis konten halaman dan berita

1. **Bahasa Indonesia**, nada netral. Cek ejaan; `bun run audit:teks` menangkap
   karakter asing dan sekitar 90 kata Inggris yang mustahil ada di prosa
   Indonesia, tetapi **tidak menangkap kesalahan makna**. Baca hasilnya.
2. Konten statis ada di `src/data/**` (halaman generik di `src/data/halaman/*`).
   Konten dari admin disimpan di database sebagai Markdown.
3. Markdown dari admin disanitasi di server (`src/server/markdown.ts`, daftar
   putih tag dan atribut; URL berbahaya seperti `javascript:` dibuang termasuk
   yang disamarkan dengan karakter kontrol). Jangan menulis HTML mentah berharap lolos.
4. Berkas teks yang ditulis alat otomatis kadang tersisip karakter aksara lain.
   Setelah menulis, jalankan `bun run audit:teks`.
5. Satu `h1` per halaman, tanpa lompatan tingkat heading.

### Tautan baru dan rute

Tautan yang tidak ada di `NAV_ITEMS`, `HEADER_CTAS`, atau `FOOTER_LINKS`
(`src/data/navigation.ts`) akan 404. Jangan menulis daftar path di tempat lain.
Setelah menambah halaman, jalankan `bun run build` lalu `bun run cek:tautan`
(halaman yatim, tautan mati, dan sitemap yang tertinggal digagalkan CI).

### Desain

Angka warna, ukuran, dan jarak **diukur** dari situs referensi
(`docs/design-tokens-terverifikasi.md`): jangan mengarang nilai baru tanpa
pengukuran. Contoh: aksen `#1977cc` (bukan `#1a77cc`, yang hanya nilai meta `theme-color`).

---

## 7. Daftar periksa sebelum menggabungkan konten

- [ ] Tidak ada nama, logo, foto, nomor, atau teks yang disalin dari situs referensi
- [ ] Semua nama orang fiktif dan dicek tidak sama dengan orang nyata yang dikenal
- [ ] Kontak hanya dari `CONTACT`; domain surel contoh
- [ ] Foto dari Unsplash/picsum dan host terdaftar; semua `img` punya `alt`
- [ ] Tidak ada script pihak ketiga baru
- [ ] Penanda demo di footer masih ada
- [ ] `bun run audit:teks` bersih; isi dibaca manusia
- [ ] `specialty` dokter cocok dengan `clinics.ts` (`bun run test`)
- [ ] Halaman baru terjangkau dari navigasi (`bun run cek:tautan` setelah build)
