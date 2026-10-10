# Rilis: ringkasan dan hal lintas-dokumen

Dokumen ini **tidak mengulang** langkah rilis. Langkahnya sudah ada di dua panduan
yang ditulis dan diuji agent bersama pemilik repo; berkas ini menunjukkan di mana
mencarinya, lalu mencatat hal lintas-dokumen yang tidak ada di sana.

| Perlu | Baca |
| --- | --- |
| Pratinjau di Vercel (`API_MODE=snapshot`) | [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md) |
| Produksi di VPS dengan Docker (build image, `.env`, migrasi, backup, rollback, pemeriksaan) | [`DEPLOY-VPS.md`](DEPLOY-VPS.md) |
| Daftar variabel dan bawaannya | `.env.example` (sumber kebenaran), `src/server/config.ts` |
| Beda mode `live` dan `snapshot` | [`ARCHITECTURE.md`](ARCHITECTURE.md) bagian 3 |
| Gerbang yang harus hijau sebelum rilis | [`TESTING.md`](TESTING.md) bagian 4 |
| Aturan rahasia dan sesi admin | [`../SECURITY.md`](../SECURITY.md) |

Disusun dari kode pada commit `4d848c3` (9 Oktober 2026), diselaraskan ke
`f1ebe60` (10 Oktober 2026). Yang tidak saya
jalankan sendiri ditandai **BELUM DIVERIFIKASI**.

---

## 1. Peran dua target

| Target | Peran | `API_MODE` | Database | Admin dan formulir |
| --- | --- | --- | --- | --- |
| Vercel | Pratinjau / cadangan baca | `snapshot` | tidak ada | tidak berfungsi (503) |
| VPS (Docker) | Produksi penuh | `live` | PostgreSQL | berfungsi |

Alasan Vercel hanya pratinjau: database ada di VPS, dan penghitung rate limit
hidup di memori satu proses sehingga di platform serverless tiap instance punya
penghitung sendiri.

## 2. Hal yang sering salah (diverifikasi dari kode)

1. **`DATABASE_URL` kosong tidak berarti snapshot.** Tanpa `API_MODE=snapshot`,
   mode `live` dengan `DATABASE_URL` kosong membuat server gagal start.
2. **`NEXT_PUBLIC_SITE_URL` dibaca saat build** (`metadataBase`, sitemap, Open
   Graph). Mengubahnya setelah build tidak berpengaruh; bangun ulang image.
3. **`ADMIN_ORIGIN` di mode `live` harus `https://`, kecuali loopback.**
   Sejak commit `91de5b9` `config.ts` melempar `ConfigError` saat start bila
   nilainya `http://` untuk host publik (cookie sesi akan terbit tanpa atribut
   `Secure`). `http://localhost` tetap diterima untuk pengembangan.
4. **`AUTH_SECRET` minimal 32 karakter** dan tidak punya nilai bawaan.
   Merotasinya mencabut sesi semua admin. Pesan galatnya sengaja tidak
   menyebut panjang nilai yang dipakai.
5. **Build butuh internet keluar ke Google Fonts.** `next/font/google`
   mengunduh Poppins saat `bun run build` (tahap `builder` di `Dockerfile`).
   Di jaringan tertutup build gagal dengan galat "Failed to fetch Poppins";
   itu galat jaringan, bukan galat kode. Saat runtime tidak ada permintaan ke
   Google (font disajikan dari origin sendiri).

## 3. Dua pemeriksaan kesehatan yang berbeda

- `HEALTHCHECK` di `Dockerfile` menembak `/`. Halaman beranda membaca
  `src/data/`, bukan database, jadi health Docker tetap hijau saat database mati.
  Ini disengaja dan dijelaskan di `DEPLOY-VPS.md` bagian 6.
- `GET /api/v1/health` memeriksa koneksi database: `200` dengan
  `database: "PostgreSQL"` bila sehat, `500` generik bila database mati (route
  melempar `Error` biasa dan `toApiError` membungkus galat lain menjadi 500; dibaca
  dari kode, belum dicoba), dan tetap `200` di mode snapshot (`database: "tidak terhubung"`). Pakai ini untuk
  pemantauan dari luar, bukan untuk memutuskan restart container.

## 4. Header keamanan dan akibatnya untuk rilis

Dipasang di kode (`next.config.ts`, `headers()`, semua respons): CSP, HSTS,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`X-Frame-Options`. Tidak perlu diulang di proxy. Dibaca dari konfigurasi;
**BELUM DIVERIFIKASI di peramban**:

- `img-src` hanya `'self' data: blob:` plus `images.unsplash.com` dan
  `picsum.photos`. **Gambar admin dari host lain akan diblokir peramban**, walau
  admin boleh mengisi URL bebas. Tambahkan host ke CSP bila perlu.
- `upgrade-insecure-requests` dapat memengaruhi pengujian lokal lewat `http://`.
- HSTS (`max-age=31536000; includeSubDomains`) mengunci domain ke HTTPS; pasang
  domain dengan HTTPS yang stabil sebelum rilis pertama.
- `script-src` dan `style-src` masih memuat `'unsafe-inline'` (sisa risiko yang
  dicatat di `AUDIT-KEAMANAN.md`).

## 5. Proxy dan alamat IP klien

Rate limit memakai entri **paling kanan** `x-forwarded-for`, lalu `x-real-ip`.
Agar penghitung per-IP bermakna: proxy (mis. Traefik) harus menambahkan IP klien
ke `x-forwarded-for`, dan aplikasi **tidak boleh** dijangkau langsung dari
internet (header bisa dipalsukan). Penghitung tidak dibagi antar proses.

## 6. Migrasi: aturan tambahan

Panduan langkahnya ada di `DEPLOY-VPS.md` bagian 4 dan 5. Tambahan dari kode:

1. Enam migrasi (`0000` sampai `0005`); semuanya hanya maju (tidak ada "down").
2. Backup sebelum **setiap** migrasi (`DEPLOY-VPS.md` bagian 4 dan 5).
3. `0003_anti_ganda.sql` membuat unique index `appointments(phone, schedule_id)`
   dan gagal bila sudah ada baris ganda. Periksa dulu pada database lama:

   ```sql
   SELECT phone, schedule_id, count(*)
     FROM appointments
    WHERE schedule_id IS NOT NULL
    GROUP BY phone, schedule_id
   HAVING count(*) > 1;
   ```

   Bila keluar baris, jangan dihapus otomatis; itu keputusan pemilik data.
4. `0005_slug_paket_mcu.sql` memindahkan tiga baris `mcu_packages` dan menambah
   tiga baris. `db:seed` memakai `onConflictDoNothing`, jadi database yang sudah
   berisi tidak ikut berubah dari seed; hanya migrasi ini yang menyamakannya.
5. Perubahan skema yang tidak kompatibel mundur dirilis dua tahap (tambah dulu,
   pakai, baru hapus) supaya rollback aplikasi tidak patah.

## 7. Yang belum terbukti

- Build di Vercel belum pernah dijalankan dari repo ini (diakui di `DEPLOY-VERCEL.md`).
- `output: "standalone"` belum dipakai; image memakai `next start` dengan
  `node_modules` penuh (`DEPLOY-VPS.md` bagian 7).
- Verifikasi Docker di VPS dicatat agent di `HANDOFF.md`; saya **tidak** menjalankannya
  ulang (tidak ada Docker/VPS di lingkungan saya).
- Acceptance Criteria butir 12 ("identik di Vercel dan VPS") dan butir 13 (upload
  gambar admin di kedua lingkungan) tetap belum terbukti.

## 8. Daftar periksa rilis

- [ ] CI hijau: `gerbang.yml` dan `e2e-db.yml`
- [ ] Backup database dibuat dan lokasinya dicatat
- [ ] Pemeriksaan baris ganda dijalankan bila database lama belum memasang `0003`
- [ ] Env produksi lengkap; `AUTH_SECRET` ≥ 32 karakter; `ADMIN_ORIGIN` berawalan `https://`
- [ ] `NEXT_PUBLIC_SITE_URL` benar **saat build**
- [ ] `db:migrate` sukses; `bun run db:status` melaporkan konfigurasi dan jumlah tabel sesuai skema
- [ ] `GET /api/v1/health` sehat; `/admin` tanpa sesi mengalihkan ke `/admin/login`
- [ ] Sandi admin awal diganti; `SEED_ADMIN_PASSWORD` dihapus dari lingkungan
- [ ] CSP diuji di peramban pada domain produksi (gambar, formulir, admin)
- [ ] Port PostgreSQL tidak terbuka ke internet; aplikasi hanya lewat proxy
