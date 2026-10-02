# Archive Kode Legacy v1

Folder ini berisi kode **versi lama** website Web-Kesehatan, dipindahkan saat
project memasuki tahap rebuild.

## Isi folder

| File | Keterangan |
|---|---|
| `index.html` | Halaman utama / landing page |
| `manajemen.html` | Halaman manajemen rumah sakit |
| `profil-rumah-sakit.html` | Halaman profil rumah sakit |
| `style.css` | Stylesheet global |
| `script.js` | Logika JavaScript global |

Versi ini adalah **HTML, CSS, dan JavaScript murni** tanpa tooling, tanpa
`package.json`, tanpa build step. Total sekitar 1.476 baris kode.

## Kenapa dipindahkan, bukan dihapus

Kode ini tidak dibuang karena masih berguna sebagai:

- **Referensi** saat menulis ulang, supaya fitur yang sudah ada tidak ikut hilang
- **Bahan perbandingan** untuk mengecek apakah versi baru sudah mencakup semuanya
- **Riwayat** jika ada bug lama yang ternyata masih relevan

## Cara membuka versi ini

```bash
# Lihat isi kode lamanya
ls archive/legacy-v1/

# Jalankan tanpa server, buka langsung di browser
xdg-open archive/legacy-v1/index.html
```

Kode asli versi ini juga bisa diakses lewat riwayat git kapan saja:

```bash
git show v1.0-legacy:index.html
```

## Catatan

Folder ini bersifat **read-only** (arsip). Perubahan baru tidak sebaiknya
ditempatkan di sini, melainkan di root repository.