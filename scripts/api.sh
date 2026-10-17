#!/usr/bin/env bash
#
# Pembungkus lama untuk backend Rust terpisah (`$ROOT/api`, `cargo run`).
#
# Backend itu sudah tidak ada: folder `api/` di root tidak pernah ada lagi,
# dan kode Rust yang lama kini read-only di `archive/rust-api/`. Backend aktif
# adalah Route Handler Next.js di `src/app/api/v1/` dengan perintah:
#
#   bun run dev         # server + API
#   bun run db:migrate  # migrasi
#   bun run db:seed     # isi data awal
#   bun run db:status   # cek isi database
#
# Berkas ini dipertahankan sebagai penunjuk jalan supaya yang menjalankannya
# mendapat penjelasan, bukan galat `cd` yang membingungkan. Jangan dihapus
# tanpa persetujuan: AGENTS.md melarang hapus/rename berkas.

echo "scripts/api.sh sudah tidak dipakai: backend Rust terpisah sudah diganti Route Handler Next.js." >&2
echo "Pakai: bun run dev | bun run db:migrate | bun run db:seed | bun run db:status" >&2
exit 1
