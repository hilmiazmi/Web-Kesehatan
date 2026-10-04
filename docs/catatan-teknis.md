# Catatan teknis

Catatan singkat untuk keputusan yang tidak terlihat dari kode. Untuk daftar
pekerjaan dan statusnya, `docs/roadmap.md` yang jadi acuan. Berkas ini untuk
menjelaskan alasan suatu keputusan diambil, terutama yang tidak bisa dibuktikan
sendiri dengan membaca kode.

---

## `<title>` halaman generik menyebut nama rumah sakit dua kali

### Gejala

`layout.tsx` memasang template judul:

```
title: { template: "%s | RSUD Contoh Sehat" }
```

Jadi setiap halaman yang mengembalikan `metadata.title` sebagai string akan
dirender menjadi `<title>Judul | RSUD Contoh Sehat</title>`, dan nama rumah
sakit muncul **satu kali**, dari template.

`src/app/[...slug]/page.tsx` dulu mengembalikan `${title} - ${SITE.name}`.
Untuk halaman generic, `metadata.title` disusun dari label jejak halaman itu,
sehingga hasilnya seperti `Tentang Kami - RSUD Contoh Sehat`. Template lalu
menempelkan nama rumah sakit lagi, dan `<title>`-nya menjadi
`Tentang Kami - RSUD Contoh Sehat | RSUD Contoh Sehat`. Nama rumah sakit
muncul **dua kali**.

### Kenapa cuma route generic

Hanya `src/app/[...slug]/page.tsx` yang menambahkan nama itu. Seluruh repo
sudah diperiksa: `SITE.name` muncul juga di `opengraph-image.tsx` (`alt` dan
teks SVG), `Footer.tsx`, dan `Navbar.tsx`, tapi tidak satu pun dari sana menulis
`<title>`. Jadi sumber dobelnya satu, bukan beberapa.

### Cara menangkap

Dua bagian di `scripts/cek-tautan.ts`:

- `kemunculanNamaRS()` menghitung **kemunculan**, bukan posisi. Menghitung
  posisi akan salah, karena ada judul yang memang sah diawali nama rumah sakit.
- `JUDUL_BOLEH_DOBEL` adalah daftar halaman yang dikecualikan. Saat ini isinya
  cuma `/berita/rsud-contoh-sehat-terima-akreditasi-utama`, karena judul berita
  itu memang diawali nama rumah sakit dan itu benar.

Kalau `judulDobel` tidak kosong, `main()` menetapkan `gagal = true` lalu keluar
dengan kode 1. Jadi ini bukan peringatan, tapi gerbang yang menggagalkan build.

### Angka terverifikasi

Diukur pada 4 Oktober 2026, dari build yang sudah diperbaiki:

| Angka | Nilai | Cara diukur |
|---|---|---|
| Berkas HTML hasil build | 150 | `find .next/server/app -name '*.html'` |
| Halaman setelah abaikan dua halaman internal Next.js | 148 | `/_not-found` dan `/_global-error` diabaikan |
| Route yang dilayani catch-all | 30 | `collectNavPaths()` di `src/lib/nav-path.ts` |
| Judul dobel setelah diperbaiki | 1 | satu-satunya, dan memang ada di `JUDUL_BOLEH_DOBEL` |

Jadi 30 halaman generic yang tadinya dobel sekarang sudah bersih.

### Yang belum bisa direproduksi

Komentar di `src/app/[...slug]/page.tsx` menyebut **"31 dari 152 halaman"**.
Angka itu tidak bisa diulang. Yang terukur 30 dari 148. Dua-duanya mungkin
mengukur hal yang sedikit berbeda:

- **152** adalah jumlah HTML yang pernah ada, sebelum penghapusan halaman yatim
  oleh commit `48a34d2`. Sekarang jumlah HTML 150, dan 148 setelah pengabaian
  halaman internal.
- **31** mungkin menghitung 30 halaman generic ditambah satu halaman yang
  memang sah diawali nama rumah sakit. Kalau begitu, jumlah dobel yang
  sebenarnya tetap 30.

Angka di komentar sebaiknya diubah menjadi 30 dari 148, atau diberi catatan
bahwa itu hasil pengukuran lama. Selama tidak cocok, orang berikutnya akan
menghitung ulang lalu meragukan hasilnya.

### Status

**Sudah di-commit** di `422292e`. Perubahan itu ada di dua berkas:

| Berkas | Isi |
|---|---|
| `src/app/[...slug]/page.tsx` | `generateMetadata` mengembalikan judul polos, bukan `${title} - ${SITE.name}` |
| `scripts/cek-tautan.ts` | ditambah `kemunculanNamaRS` dan `JUDUL_BOLEH_DOBEL` |

`src/app/layout.tsx` **tidak** ikut berubah. Template `%s \| RSUD Contoh Sehat`
sudah ada di sana sejak commit `8fd77e5`, jadi tidak perlu disentuh. Ini yang
membuat perbaikannya cukup satu baris: hapus penambahan nama di satu tempat, dan
biarkan template yang menambahkannya.

Kalau suatu saat dibalik, `generateMetadata` harus mengembalikan objek dengan
`default` dan `template`, bukan judul polos. Yang sekarang dipakai adalah pola
`template` di `layout.tsx`, jadi keduanya tidak boleh hidup bersamaan.
