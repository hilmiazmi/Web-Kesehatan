# syntax=docker/dockerfile:1
#
# Image produksi Web-Kesehatan.
#
# Empat tahap. Dependensi diisolir supaya cache bun tidak batal setiap kali
# berkas sumber berubah, dan dibuat dua versi karena tahap build dan tahap
# runtime butuh paket yang berbeda: builder perlu perkakas build, runtime tidak.
# Build dipisah dari runtime supaya perkakas build tidak ikut ke image akhir.
#
# Semua tahap memakai bun karena repo ini dikunci ke bun (packageManager
# bun@1.4.2, lockfile bun.lock). Alpine dipilih agar image kecil, dan sharp
# yang dipakai next/image punya binding native di alpine.
#
# Terverifikasi 2026-10-09 di VPS 2 GB: build sukses dari awal sampai akhir
# (termasuk perbaikan tiga cacat tahap runner yang ditemukan build pertama),
# container mode snapshot menjawab homepage 200 + API 200 + health healthy.
# Lihat docs/HANDOFF.md bagian verifikasi Docker.

ARG BUN_VERSION=1.4.2
ARG PORT=3000

# --- 1. dependensi penuh ---------------------------------------------------
# Dipakai tahap builder, bukan tahap runner. `next build` menjalankan
# pemeriksaan TypeScript, jadi tahap build butuh `typescript` dan `@types/*`
# yang belum tentu dibutuhkan saat `next start`.
FROM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app

# Hanya dua berkas ini disalin supaya layer instalasi paket tetap ter-cache
# selama bun.lock dan package.json tidak berubah.
COPY bun.lock package.json ./

# --frozen-lockfile: gagal kalau bun.lock tidak cocok dengan package.json,
# sehingga versi paket di image sama persis dengan yang tercatat di repo.
RUN bun install --frozen-lockfile

# --- 1b. dependensi produksi ------------------------------------------------
# Sama seperti `deps`, tetapi `--production` (`-p`) melewatkan devDependencies.
#
# Kenapa tahap terpisah dan bukan `--production` di tahap `deps`: satu tahap
# dipakai dua konsumen dengan kebutuhan berbeda. Builder butuh perkakas build;
# runtime tidak. Menyatukan keduanya berarti salah satu kekurangan.
#
# Sebelum perbaikan ini, runner menyalin node_modules dari tahap `deps`, jadi
# `eslint`, `eslint-config-next`, `drizzle-kit`, `vitest`, dan `typescript`
# ikut ke image yang jalan di produksi. Dua paket di antaranya punya advisory
# `bun audit`: `braces` (tinggi, lewat `eslint-config-next > fast-glob >
# micromatch`) dan `esbuild` (sedang, lewat `drizzle-kit` dan `vitest`).
#
# CATATAN PENTING soal `bun install --production`: perintah ini hanya menentukan
# apa yang DIPASANG, bukan apa yang DIHAPUS. Kalau node_modules sudah ada,
# devDependencies lama tetap tinggal. Tahap ini aman karena setiap tahap
# `FROM` dimulai dari image kosong, jadi `node_modules` di sini memang belum
# ada. Menguji `bun install --production` di node_modules yang sudah terisi
# tidak membuktikan apa pun.
FROM oven/bun:${BUN_VERSION}-alpine AS deps-prod
WORKDIR /app
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

# --- 2. build -------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next-env.d.ts dibuat oleh Next sendiri; abaikan kalau ada yang benar-benar
# dikomit, supaya build tidak gagal karena berkas itu tidak konsisten.
RUN rm -f next-env.d.ts

# Build tidak menyentuh database: halaman dengan API_MODE=snapshot membaca
# berkas di snapshot/, dan halaman biasa membaca src/data/ yang sudah dibundel.
# snapshots dibaca saat runtime, bukan build, jadi tetap disalin apa adanya.
RUN bun run build

# --- 3. runtime -----------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS runner

# ARG global hanya berlaku untuk baris FROM; setiap tahap yang memakai nilainya
# harus mendeklarasikan ulang tanpa nilai untuk mewarisi bawaan global.
# Tanpa baris ini ${PORT} di bawah kosong (peringatan UndefinedVar saat build).
ARG PORT

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=${PORT}

# Yang benar-benar dipakai `next start`: hasil build, node_modules, dan
# snapshot untuk mode snapshot. Tidak ada COPY public/ karena repo ini tidak
# punya direktori public (semua gambar dari host jarak jauh); COPY atas
# direktori yang tidak ada menggagalkan build.
COPY --from=builder --chown=bun:bun /app/.next ./.next
# Produksi, bukan `deps`: `next start` tidak pernah memanggil eslint,
# drizzle-kit, atau vitest. Diukur 10 Oktober 2026 terhadap build ini:
# 731 MB menjadi 525 MB, dan `playwright` tetap ada (19 MB) karena `next`
# mencantumkan `@playwright/test` sebagai optional peer dependency — itu
# satu-satunya paket perkakas yang tidak bisa dihilangkan lewat
# `--production`, dan tidak ada advisory keamanan untuknya.
COPY --from=deps-prod --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/package.json ./package.json
# next.config.ts WAJIB ikut ke image. Terbukti 10 Oktober 2026: tanpanya
# `next start` menjawab semua `/_next/image` jarak jauh dengan 400 `"url"
# parameter is not allowed", walau `required-server-files.json` memuat pola
# yang benar. Dengan berkas ini disalin, optimizer menjawab 200. Berkas ini
# tidak punya impor runtime (`import type` terhapus saat dimuat), jadi aman
# disalin apa adanya.
#
# Berkas ini juga aman dikombinasikan dengan tahap `deps-prod`. Kekhawatiran
# wajar: next.config.ts ditulis sebagai TypeScript, dan `typescript` tidak ikut
# ke image produksi. Sudah diuji langsung 10 Oktober 2026 di worktree terpisah
# (install `--production` dari nol, lalu `next start`): berkas config tetap
# termuat, buktinya `/_next/image?url=https://images.unsplash.com/...`
# menjawab 200 dan seluruh header keamanan dari `headers()` muncul di respons,
# termasuk CSP. Next memuat konfigurasi TypeScript lewat transformasi internal,
# bukan lewat paket `typescript` di node_modules.
COPY --from=builder --chown=bun:bun /app/next.config.ts ./next.config.ts
# snapshot/ dibaca runtime oleh src/server/api/snapshot.ts saat
# API_MODE=snapshot, jadi harus ikut meski tidak dipakai di mode live.
COPY --from=builder --chown=bun:bun /app/snapshot ./snapshot

# Jalankan sebagai pengguna tanpa hak root. Image oven/bun sudah punya
# pengguna `bun`, tidak perlu membuat sendiri.
USER bun

EXPOSE ${PORT}

# Health check menembak "/" karena halaman beranda membaca src/data/ yang
# sudah dibundel, bukan database. Jadi health check tetap hijau saat database
# sedang mati, dan tidak mengira aplikasi sehat padahal gagal render.
#
# Bentuk shell (tanpa kurung siku) supaya ${PORT} diganti nilainya. Bentuk
# exec tidak mengganti variabel dan akan menembak URL berisi teks "${PORT}".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:${PORT}/ || exit 1

CMD ["bun", "run", "start"]
