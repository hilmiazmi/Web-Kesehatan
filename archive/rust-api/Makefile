# Rust API - build dan pengujian
#
# Format: `cargo fmt --check` untuk format, `cargo clippy` untuk lint,
# `cargo test` untuk unit test.
#
# Database WAJIB hidup sebelum `cargo run` atau integration test.
# Untuk develop lokal: docker compose up -d postgres (dari root repo).

# --- Server ---
cargo run --bin rsud-api
cargo run --release --bin rsud-api

# --- Database ---
cargo run --bin rsud-db -- migrate      # terapkan migrasi yang belum jalan
cargo run --bin rsud-db -- seed         # isi data fiktif (aman diulang)
cargo run --bin rsud-db -- seed --reset # kosongkan tabel lalu isi ulang
cargo run --bin rsud-db -- status       # daftar migrasi + jumlah baris
cargo run --bin rsud-db -- reset        # DROP SCHEMA public (perlu konfirmasi)

# --- Mutu ---
cargo fmt
cargo clippy --all-targets -- -D warnings
cargo test

# --- Build image ---
docker build -f api/Dockerfile -t rsud-api:latest .