# Deploy ke Vercel

Rujukan untuk mempasang Web-Kesehatan di Vercel. Angka dan nama variabel di
sini diambil dari `src/server/config.ts`, bukan diketik ulang dari README;
kalau ada yang berbeda, `config.ts` yang benar.

## Aturan utama

**Pratinjau (Preview Deployment) wajib `API_MODE=snapshot`.**

Mode snapshot menolak setiap permintaan yang mengubah data
(`src/server/api/form.ts` memeriksanya), jadi pratinjau tidak bisa mengubah
database produksi walau ada yang menekan tombol simpan. Tanpa itu, satu
pratinjau dari pull request bisa menulis baris sungguhan ke database.

Produksi tetap `API_MODE=live` karena butuh database.

## Variabel lingkungan

Isi di **Vercel dashboard → Project → Settings → Environment Variables**.
Jangan taruh nilai asli di `vercel.json` atau di berkas yang dikomit.

| Variabel | Pratinjau | Produksi | Keterangan |
|---|---|---|---|
| `API_MODE` | `snapshot` | `live` | Wajib beda antara dua lingkungan |
| `DATABASE_URL` | kosongkan | isi | Pratinjau tidak menyentuh database |
| `AUTH_SECRET` | boleh kosong* | isi | *mode snapshot menolak login 503 sebelum token terbit, jadi kosong tidak berbahaya |
| `NEXT_PUBLIC_SITE_URL` | URL pratinjau | URL produksi | Dipakai `metadataBase`: dasar URL absolut Open Graph dan sitemap |
| `ADMIN_ORIGIN` | URL pratinjau | URL produksi | Kalau diawali `https://`, cookie sesi diberi atribut `Secure` |

Variabel lain boleh dibiarkan bawaan: `DB_MAX_CONNECTIONS` (10),
`DB_ACQUIRE_TIMEOUT_SECONDS` (8), `SESSION_MAX_AGE_SECONDS` (28800),
`BODY_LIMIT_BYTES` (262144), `MIN_LEAD_DAYS` (0), `MAX_LEAD_DAYS` (90),
`RATE_LIMIT_WINDOW_SECONDS` (60), `RATE_LIMIT_MAX_REQUESTS` (5).

`SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` hanya dipakai
`bun run db:seed` yang dijalankan lokal, jadi **tidak** perlu di Vercel.

Daftar lengkap beserta penjelasan ada di `.env.example`. Semua nama yang
dipakai aplikasi harus cocok dengan berkas itu; nama yang salah dibaca sebagai
kosong dan server diam-diam memakai nilai bawaan.

## Cara membuat nilai

```bash
# AUTH_SECRET untuk produksi. Wajib 32 karakter atau lebih.
openssl rand -base64 48
```

`openssl rand -base64 48` menghasilkan 48 byte acak lalu menuliskannya dalam
base64. Angka 48 itu jumlah byte, bukan panjang teks keluaran; teks hasilnya
sekitar 64 karakter, di atas batas minimum 32.

## Kenapa `.env` tidak ikut

`.env*` sudah masuk `.gitignore`, dan `!.env.example` memastikan template-nya
tetap ada di repo. Nilai produksi hanya hidup di dashboard Vercel, jadi tidak
pernah masuk riwayat git maupun bundle klien.

## Pratinjau yang tidak menjangkau database

Dengan `API_MODE=snapshot`:

- Endpoint baca menjawab dari berkas JSON di `snapshot/`
- Endpoint tulis (`POST`, `PATCH`, `DELETE`) ditolak, tidak menjawab 200 palsu
- Login admin ditolak 503

Ini yang membuat pratinjau aman untuk dibagikan ke reviewer yang belum
dipercaya: tidak ada satu pun permintaan dari pratinjau bisa mengubah data.

## Yang belum diverifikasi

- **Build di Vercel belum pernah dijalankan dari repo ini.** Semua langkah di
  atas disusun dari pembacaan kode konfigurasi, bukan dari deploy sungguhan.
- Perilaku bawaan Vercel terhadap `bun.lock` perlu dicek saat deploy pertama:
  kalau build gagal mencari lockfile, jalankan `bun install` dan komit hasilnya
  dulu.
