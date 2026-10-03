#!/usr/bin/env bash
#
# Menjalankan perintah cargo dengan environment dari .env.local.
#
# Rust tidak memuat berkas .env sendiri. `Config::from_env()` hanya membaca
# environment proses, jadi `cargo run` dari folder `api/` tidak pernah melihat
# nilai yang ditulis di .env.local. Tanpa pembungkus ini, server selalu gagal
# start dengan pesan "environment variable DATABASE_URL wajib diisi" padahal
# nilainya sudah ada di berkas.
#
# Pemakaian (dari root repo):
#   bash scripts/api.sh --bin rsud-api            # server
#   bash scripts/api.sh --bin rsud-db -- migrate  # migrasi
#   bash scripts/api.sh --bin rsud-db -- seed     # isi data awal
#   bash scripts/api.sh --bin rsud-db -- status
#
# Semua bentuk di atas juga tersedia sebagai `bun run api`, `bun run db:migrate`,
# dan seterusnya.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  echo "berkas $ENV_FILE tidak ada." >&2
  echo "salin .env.example ke .env.local lalu isikan AUTH_SECRET dan SEED_ADMIN_PASSWORD." >&2
  exit 1
fi

# set -a menandai setiap variabel yang dibuat sebagai "ekspor", sehingga
# set +a di baris berikutnya tidak membatalkan ekspornya. Tanpa pasangan ini
# variabel hanya hidup di shell ini, tidak terbaca oleh cargo.
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

# Kegagalan di sini lebih sulit dibaca daripada pesan dari Config::from_env(),
# jadi dua variabel yang paling sering terlupa dicek dulu di tempat yang jelas.
for name in DATABASE_URL AUTH_SECRET; do
  if [ -z "${!name:-}" ]; then
    echo "$name belum diisi di $ENV_FILE." >&2
    exit 1
  fi
done

cd "$ROOT/api"
exec cargo run "$@"