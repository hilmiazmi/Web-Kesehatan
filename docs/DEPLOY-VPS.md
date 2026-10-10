# Deploy ke VPS (Docker)

Rujukan menjalankan Web-Kesehatan di VPS memakai image Docker dari
[`Dockerfile`](../Dockerfile). Ditulis untuk deploy di belakang reverse proxy
yang menangani HTTPS, karena aplikasi ini sendiri tidak menerbitkan
sertifikat.

## Yang dibutuhkan

- Docker Engine 24+ dan plugin Compose v2
- PostgreSQL yang bisa dijangkau container (bisa `docker-compose.yml` di repo
  ini, bisa layanan terkelola)
- Nama domain yang sudah menunjuk ke VPS

## Sudah teruji

Image ini sudah dibangun dari awal sampai akhir di VPS 2 GB pada 2026-10-09
(1,31 GB), dijalankan mode `API_MODE=snapshot`, dan lolos pemeriksaan:
homepage 200, API paket 200, health Docker healthy. Perintah di bawah tetap
berlaku; urutan yang disarankan sama: build dulu, jalankan, uji, baru pasang.

Catatan keterbatasan yang ditemukan saat verifikasi: VPS kecil kehabisan
sumber daya saat generate halaman statis (7 worker + Turbopack) sampai SSH
putus belasan menit, lalu pulih sendiri. Kalau build mati di tengah jalan,
tunggu pulih lalu ulangi — cache layer membuat percobaan berikutnya jauh
lebih cepat.

## 1. Build image

```bash
docker build -t web-kesehatan:1.0.0 .
```

`-t web-kesehatan:1.0.0` memberi nama dan versi pada image. Pakai versi
eksplisit, bukan `latest`: kalau rilis berikutnya bermasalah, `latest` tidak
memberi jalan kembali ke versi sebelumnya.

Karena lockfile bersifat wajib (`bun install --frozen-lockfile`), build gagal
kalau `bun.lock` tidak cocok dengan `package.json`. Itu memang tujuannya:
versi paket di image harus sama persis dengan yang tercatat di repo.

## 2. Siapkan berkas variabel lingkungan

Buat berkas yang **tidak** dikomit, misalnya `/srv/web-kesehatan/.env`:

```bash
touch /srv/web-kesehatan/.env && chmod 600 /srv/web-kesehatan/.env
```

Isinya:

```dotenv
NODE_ENV=production
API_MODE=live
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
AUTH_SECRET=<hasil openssl rand -base64 48>
ADMIN_ORIGIN=https://<domain-anda>
NEXT_PUBLIC_SITE_URL=https://<domain-anda>
```

`chmod 600` membuat berkas itu hanya terbaca pemiliknya. Berkas `--env-file`
sering berisi kredensial database, dan izin baca yang longgar membuat kredensial
itu terbaca semua pengguna di mesin.

`ADMIN_ORIGIN` dan `NEXT_PUBLIC_SITE_URL` **wajib** berawalan `https://`. Kalau
`ADMIN_ORIGIN` tidak diawali `https://`, cookie sesi dikirim tanpa atribut
`Secure`, dan itu tidak bisa dicegah dari kode.

## 3. Jalankan

```bash
docker run -d \
  --name web-kesehatan \
  --restart unless-stopped \
  --env-file /srv/web-kesehatan/.env \
  -p 127.0.0.1:3000:3000 \
  web-kesehatan:1.0.0
```

Penjelasan tiap flag:

| Flag | Fungsi |
|---|---|
| `-d` | jalan di belakang, terminal bebas kembali |
| `--name web-kesehatan` | nama container, dipakai perintah sesudahnya |
| `--restart unless-stopped` | container hidup lagi setelah mesin restart |
| `--env-file ...` | sumber variabel lingkungan, jadi rahasia tidak tertulis di baris perintah |
| `-p 127.0.0.1:3000:3000` | hanya terbuka di localhost; akses dari luar lewat reverse proxy |

Port sengaja diikat ke `127.0.0.1`, bukan `0.0.0.0`. Aplikasi ini tidak
menerbitkan sertifikat sendiri, jadi HTTPS harus diakhiri di reverse proxy
(Caddy, Nginx, Traefik). Mengikat ke `0.0.0.0` membuat VPS melayani HTTP polos
dan melewati lapisan TLS sama sekali.

## 4. Migrasi database

> **Catatan 10 Oktober 2026: perintah image di bawah tidak jalan apa adanya.**
> Tahap runner di `Dockerfile` tidak menyertakan `drizzle/`,
> `drizzle.config.ts`, maupun `scripts/`, jadi `bun run db:migrate` di dalam
> image gagal dengan `drizzle.config.json file does not exist`. Yang terbukti
> jalan: menjalankan migrasi dari snapshot kode dengan image `oven/bun`
> (contoh di bawah). Kalau migrasi dari dalam image aplikasi diinginkan
> (misalnya untuk perintah sekali jalan Coolify), `Dockerfile` perlu
> menyertakan ketiga path itu lebih dulu.

```bash
docker run --rm \
  --network webkes \
  --env-file ~/web-kesehatan/.env \
  --env-file ~/web-kesehatan/.env.seed \
  -v /tmp/build-42589c8:/work -w /work \
  oven/bun:1.4.2-alpine bun install --frozen-lockfile
docker run --rm \
  --network webkes \
  --env-file ~/web-kesehatan/.env \
  --env-file ~/web-kesehatan/.env.seed \
  -v /tmp/build-42589c8:/work -w /work \
  oven/bun:1.4.2-alpine bun run db:migrate
docker run --rm \
  --network webkes \
  --env-file ~/web-kesehatan/.env \
  --env-file ~/web-kesehatan/.env.seed \
  -v /tmp/build-42589c8:/work -w /work \
  oven/bun:1.4.2-alpine bun run db:seed
```

`.env` berisi `DATABASE_URL` ke container postgres di network yang sama
(misalnya `postgres://rsud_app@pg-webkes:5432/rsud_produksi`, kredensial
asli tidak ditulis di sini) plus `AUTH_SECRET` minimal 32 karakter, karena
`db:seed` memanggil `config()` penuh. `.env.seed` berisi `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_PASSWORD` (minimal 10 karakter), dan opsional
`SEED_ADMIN_NAME`; validasinya berjalan walau admin sudah ada. Terbukti
10 Oktober 2026: migrasi sukses, seed mengisi 20 tabel termasuk 12
pengaturan situs. `bun install` dibutuhkan sekali saja karena `db:seed`
mengimpor kode `src/` lewat TypeScript.

`--rm` membuang container sesudah selesai. `--entrypoint bun` mengganti
perintah awal image dengan `bun`, lalu `run db:migrate` menjalankan
`drizzle-kit migrate` yang mengeksekusi berkas `drizzle/*.sql` yang belum
pernah dijalankan. Volume dipasang supaya `drizzle-kit` bisa mencatat migrasi
yang sudah diterapkan.

### Backup sebelum migrasi — jangan dilewati

Migrasi hanya menambah yang belum pernah jalan. Tapi perintah di atas tidak
punya `down`, jadi sekali jalan, satu-satunya jalan kembali adalah memulihkan
dari backup. Backup dulu, baru migrasi:

```bash
docker exec <container-postgres> \
  pg_dump -U <user> -d <database> -F c -f /backup/sebelum-migrasi.dump
```

`-F c` memakai format khusus PostgreSQL yang terkompresi. Kalau berkas itu
tidak muncul di daftar, jangan lanjut ke `db:migrate`. Rincian dan cara
memulihkannya ada di bagian 5.

## 5. Backup dan rollback

Backup database:

```bash
docker exec <container-postgres> \
  pg_dump -U <user> -d <database> -F c -f /backup/sebelum-migrasi.dump
```

`-F c` memakai format khusus PostgreSQL yang terkompresi dan bisa dipulihkan
selektif. Simpan keluaran di luar container, lalu salin ke mesin lain.

Rollback aplikasi, kalau rilis baru bermasalah:

```bash
docker stop web-kesehatan && docker rm web-kesehatan
docker run -d --name web-kesehatan --restart unless-stopped \
  --env-file /srv/web-kesehatan/.env \
  -p 127.0.0.1:3000:3000 \
  web-kesehatan:<versi-sebelumnya>
```

Rollback aplikasi cepat karena image lama masih ada di mesin. **Rollback skema
database tidak otomatis:** `drizzle/000*.sql` tidak punya berkas turunan
`down`, jadi kalau migrasi mengubah struktur tabel, mengganti image lama tidak
mengembalikan struktur tabel. Untuk kasus itu, pulihkan dari dump:

```bash
docker exec -i <container-postgres> \
  pg_restore -U <user> -d <database> --clean --if-exists \
  /backup/sebelum-migrasi.dump
```

`--clean --if-exists` menghapus objek yang sudah ada sebelum memulihkan, jadi
hasil dump benar-benar menggantikan keadaan sekarang.

### Backup berkala

`pg_dump` yang ditulis manual cocok untuk sekali jalan sebelum migrasi, tapi
tidak cocok untuk jadwal: nama berkasnya tidak bisa diurut, tidak berputar, dan
tidak ada yang membuktikan berkasnya terisi sampai ada yang memulihkannya.

```bash
BACKUP_DIR=/srv/web-kesehatan/backup bun run db:backup
SIMPAN_HARI=30 bun run db:backup
```

Skrip itu memberi nama berpola waktu, memutar dump lebih tua dari
`SIMPAN_HARI` hari (bawaan 14, dan dump terbaru tidak pernah ikut dihapus),
lalu gagal kalau dump ternyata di bawah 1 KB — dump kosong yang lulus `ls`
adalah bentuk kegagalan paling menipu karena baru ketahuan saat dipulihkan.

Cara memasang jadwal harian, sebagai user yang punya akses `.env`:

```bash
sudo tee /etc/cron.d/web-kesehatan-backup > /dev/null <<'CRON'
# Backup harian pukul 01.00 WIB. Jalankan sebagai user mesin, bukan root.
0 1 * * * <user> cd /srv/web-kesehatan && BACKUP_DIR=/srv/web-kesehatan/backup bun run db:backup >> /var/log/web-kesehatan-backup.log 2>&1
CRON
```

Backup baru tidak berarti backup yang bisa dipulihkan. Pulihkan ke database
kadung sesekali untuk membuktikan:

```bash
createdb -h 127.0.0.1 -U <user> rsud_pulih
pg_restore -h 127.0.0.1 -p <port> -U <user> -d rsud_pulih \
  --clean --if-exists /srv/web-kesehatan/backup/<berkas>.dump
psql -h 127.0.0.1 -U <user> -d rsud_pulih -c "SELECT count(*) FROM doctors;"
```

Angka yang muncul harus sama dengan halaman `/admin` dasbor: 54 dokter dan 28
tabel. Buang database percobaan itu setelah yakin:

```bash
dropdb -h 127.0.0.1 -U <user> rsud_pulih
```

Skrip backup sudah diuji lewat putaran penuh pada PostgreSQL 17 lokal:
migrasi dan seed, backup, tabel `users` di-drop dan truncate tiga tabel, lalu
`pg_restore`. Setelah pulih, 28 tabel, 1 users, 54 doctors, dan 12
pengaturan kembali persis. Salinan di luar mesin tetap tanggung jawab Anda —
direktori `/srv` tidak ikut hilang bersama mesin.

## 6. Pemeriksaan

```bash
docker ps                      # container hidup?
docker logs --tail 100 web-kesehatan
docker inspect --format '{{.State.Health.Status}}' web-kesehatan
```

Health check di image menembak `/`. Halaman beranda membaca `src/data/` yang
sudah dibundel, bukan database, jadi health check tetap hijau walau database
mati. Itu disengaja: health check yang ikut merah saat database mati membuat
orchestrator men restart aplikasi yang sebenarnya tidak bermasalah.

Status health yang berubah merah berarti aplikasi tidak lagi bisa merender
halaman, bukan berarti database bermasalah. Bedakan dua hal itu lewat log.

## 7. Yang perlu diperhatikan

- **`snapshot/` ikut ke dalam image.** Mode `API_MODE=snapshot` membaca berkas
  JSON dari folder itu saat runtime, jadi jangan hapus dari `.dockerignore`.
- **Image sudah diverifikasi dua kali.** 2026-10-09 dari build pertama, dan
  10 Oktober 2026 dari `HEAD` (`web-kesehatan:1.0.0`, 1,31 GB): build sukses
  dari awal, container snapshot menjawab homepage 200 + API 200 + health
  healthy.
- **`output: 'standalone'` belum dipakai.** Image ini memakai `next start`
  dengan `node_modules` penuh, jadi ukurannya lebih besar dari yang bisa
  dicapai. Mengaktifkan `standalone` di `next.config.ts` akan mengecilkan
  image jauh, tapi itu perubahan konfigurasi utama yang perlu persetujuan
  lebih dulu.
- **Rahasia tidak di image.** `.env` masuk `.dockerignore`; nilai hanya masuk
  lewat `--env-file` saat `docker run`.
