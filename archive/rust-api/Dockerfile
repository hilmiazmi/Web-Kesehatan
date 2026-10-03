# Image untuk API Rust.
#
# Dua tahap: tahap build membawa toolchain Rust, tahap akhir hanya binary dan
# pustaka yang dibutuhkannya. Binary ini sudah linked ke glibc, jadi image
# akhirnya memakai Debian dan bukan Alpine: mencampur Alpine di build dengan
# Debian di runtime adalah penyebab paling umum "missing loader" saat deploy.
#
# argon2 di-build dalam mode pure Rust, jadi gcc tidak dibutuhkan sama sekali
# dan image ini bisa dibangun di mana pun tanpa toolchain C.

# ---------- tahap build ----------
FROM rust:1.83-bookworm AS build

WORKDIR /src

# Manifest lebih dulu supaya lapisan dependensi tidak ikut hilang setiap kali
# source berubah.
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src/bin \
    && echo 'fn main() {}' > src/main.rs \
    && echo 'fn main() {}' > src/bin/db.rs \
    && cargo build --release \
    && rm -rf src

COPY migrations ./migrations
COPY src ./src

# Touch supaya cargo tidak menganggap berkas hasil build sebelumnya masih
# segar setelah source disalin.
RUN touch src/main.rs src/bin/db.rs \
    && cargo build --release --locked --bin rsud-api --bin rsud-db

# ---------- tahap runtime ----------
FROM debian:bookworm-slim AS runtime

# ca-certificates dibutuhkan hanya kalau nanti `DATABASE_URL` memakai TLS.
# postgresql-client dipakai `rsud-db migrate` dari dalam container.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Jalankan sebagai pengguna tanpa hak, bukan root.
RUN useradd --system --create-home --uid 10001 rsud

COPY --from=build /src/target/release/rsud-api /usr/local/bin/rsud-api
COPY --from=build /src/target/release/rsud-db  /usr/local/bin/rsud-db
COPY --from=build /src/migrations           /app/migrations

WORKDIR /app
USER rsud

ENV BIND_ADDR=0.0.0.0 \
    PORT=8081 \
    RUST_LOG=rsud_api=info,tower_http=info,warn

EXPOSE 8081

# Health check memanggil endpoint yang benar-benar memeriksa koneksi database,
# bukan hanya memeriksa prosesnya masih hidup.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/usr/local/bin/rsud-api", "--health-check"]

ENTRYPOINT ["/usr/local/bin/rsud-api"]
