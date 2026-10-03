# Deploy backend Rust (arsip)

Backend Rust sudah diarsipkan ke `archive/rust-api/` pada 3 Oktober 2026.
Backend yang berjalan sekarang adalah Route Handler di `src/app/api/v1/`,
dengan Drizzle ORM dan PostgreSQL.

Dokumen ini sengaja disimpan apa adanya. Dua bagiannya masih dipakai:
pola routing Traefik, dan `migrations/*.sql` yang jadi sumber kebenaran skema.
Bagian cara menjalankan Rust di produksi sudah tidak berlaku.

## Bentuk arsitektur

```
Internet
   │
   ▼
Traefik  (sudah ada di VPS, port 80 dan 443)
   ├── /api/v1/*  →  rsud-api:8081     (backend Rust)
   └── /*         →  next:3000         (frontend Next.js)
```

Traefik hanya meneruskan. Tidak ada proxy lain di antara keduanya, dan
`rsud-api` tidak pernah dibuka langsung ke internet.

## Mengapa tidak Rust di Vercel

Vercel memang punya runtime Rust resmi, tapi dua hal menghalanginya di sini:

1. **Database ada di VPS.** Vercel tidak bisa menghubungi `127.0.0.1`.
   Memindahkan database ke luar VPS berarti membuka port PostgreSQL ke
   internet, lengkap dengan TLS dan daftar IP.
2. **Rate limit in-memory.** `Mutex<HashMap>` di `ratelimit.rs` hanya berlaku
   di satu proses. Di Functions, tiap instance punya memorinya sendiri, jadi
   limiter bisa dilewati berkali-kali lipat.

Karena itu Vercel dipakai sebagai pratinjau saja, dengan `API_MODE=snapshot`:
pratinjau membaca `snapshot/*.json` dan tidak pernah menyentuh database.

## Deploy ke VPS lewat Coolify

Coolify sudah menjalankan Traefik dan PostgreSQL (`coolify-db`), jadi yang
ditambahkan hanya satu aplikasi.

1. **Buat resource.** Coolify → New Resource → Application → Docker Image,
   atau Repository dengan `Dockerfile` di `archive/rust-api/`.
2. **Environment.** Isi dari `.env.example`. Yang wajib:

   ```
   DATABASE_URL=postgres://<user>:<password>@coolify-db:5432/<database>
   AUTH_SECRET=<openssl rand -base64 48>
   ADMIN_ORIGIN=https://domain-anda
   BIND_ADDR=0.0.0.0
   PORT=8081
   RUST_LOG=rsud_api=info,tower_http=info,warn
   ```

   `BIND_ADDR` harus `0.0.0.0` di dalam container. `127.0.0.1` membuat
   Traefik mendapat 502 meskipun prosesnya sehat.

3. **Health check.** Pakai `rsud-api --health-check`. Perintah ini memanggil
   `GET /api/v1/health` ke server yang sedang berjalan dan keluar dengan kode 0
   hanya kalau database juga menjawab. Memeriksa proses saja tidak cukup:
   database mati akan lolos sebagai "sehat".
4. **Domain.** Atur path `/api/*` dengan strip prefix. Tanpa strip prefix,
   Traefik meneruskan `/api/v1/...` utuh dan router tidak akan mengenali
   semuanya, karena semua rute berada di bawah `/api/v1`.
5. **Migrasi.** Dijalankan otomatis oleh `rsud-api` sebelum menerima
   permintaan, jadi tidak perlu langkah manual. `rsud-db` ada di image yang
   sama untuk menjalankan `status` saat menelusuri masalah.

## Paket memori

VPS ini hanya punya sekitar 800 MB RAM yang masih bebas. Batasnya:

| Layanan | RAM |
| --- | --- |
| PostgreSQL | 40 sampai 60 MB |
| rsud-api | 10 sampai 20 MB |
| Bun dan Next.js | 150 sampai 200 MB |
| Traefik | 10 MB |

`DB_MAX_CONNECTIONS` sengaja dibiarkan 10. Menaikkannya hanya menambah risiko
kehabisan memori tanpa menambah throughput, karena beban situs ini jauh di bawah
batas itu.

## Verifikasi

```bash
# di VPS
docker exec <container> /usr/local/bin/rsud-api --health-check
curl -s https://domain-anda/api/v1/health
curl -s https://domain-anda/api/v1/home | head -c 200
```

Status kode 404 dari `/api/v1/health` hampir selalu berarti strip prefix belum
dipasang di Traefik.

## Yang masih bernilai dari arsip

Yang paling berguna adalah `migrations/*.sql`: di situ skema berada dalam bentuk
SQL biasa, dan itu bentuk yang dipakai sebagai sumber kebenaran saat menulis
`src/server/db/schema.ts`. Perbandingan `pg_dump --schema-only` antara hasil
migrasi Drizzle dan berkas-berkas itu menunjukkan 26 trigger yang identik.

Selain itu, `snapshot/README.md` menjelaskan bentuk berkas salinan baca, dan
`src/snapshot/` (bukan `snapshot/`) menjelaskan cara membacanya.
