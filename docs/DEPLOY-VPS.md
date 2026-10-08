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

## Belum teruji

Docker di mesin tempat `Dockerfile` ini ditulis tidak punya izin
(`permission denied` pada `/var/run/docker.sock`), jadi **image belum pernah
benar-benar dibangun**. Perintah di bawah sudah disusun sedekat mungkin dengan
praktik yang berlaku, tapi jangan dianggap siap deploy sebelum sekali build
berhasil. Urutan yang disarankan: build dulu, jalankan, uji, baru pasang.

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

```bash
docker run --rm \
  --env-file /srv/web-kesehatan/.env \
  -v /srv/web-kesehatan/app:/app \
  --entrypoint bun \
  web-kesehatan:1.0.0 \
  run db:migrate
```

`--rm` membuang container sesudah selesai. `--entrypoint bun` mengganti
perintah awal image dengan `bun`, lalu `run db:migrate` menjalankan
`drizzle-kit migrate` yang mengeksekusi berkas `drizzle/*.sql` yang belum
pernah dijalankan. Volume dipasang supaya `drizzle-kit` bisa mencatat migrasi
yang sudah diterapkan.

Migrasi hanya menambah, tidak mengubah data yang ada. Tapi tetap **backup
lebih dulu**; lihat bagian berikut.

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
- **Image belum diverifikasi.** Build di mesin tanpa izin Docker. Jalankan
  sekali build lokal sebelum mengandalkannya di server.
- **`output: 'standalone'` belum dipakai.** Image ini memakai `next start`
  dengan `node_modules` penuh, jadi ukurannya lebih besar dari yang bisa
  dicapai. Mengaktifkan `standalone` di `next.config.ts` akan mengecilkan
  image jauh, tapi itu perubahan konfigurasi utama yang perlu persetujuan
  lebih dulu.
- **Rahasia tidak di image.** `.env` masuk `.dockerignore`; nilai hanya masuk
  lewat `--env-file` saat `docker run`.
