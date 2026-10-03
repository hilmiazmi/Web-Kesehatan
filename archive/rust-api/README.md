# Archive Backend Rust

Backend pertama untuk Web-Kesehatan, ditulis dengan Rust (axum + sqlx).
Sudah **selesai dan lulus semua pengujiannya**, lalu dipindahkan ke sini
ketika backend utama diganti ke Bun + Next.js Route Handler + Drizzle.

Folder ini read-only. Jangan diperbaiki, jangan dipindahkan.

## Status saat diarsipkan

| Pemeriksaan | Hasil |
|---|---|
| `cargo check --all-targets` | bersih |
| `cargo clippy --all-targets` | bersih, tanpa warning |
| `cargo fmt --check` | bersih |
| `cargo test` | 132 lulus, 0 gagal |

Jadi ini bukan kode setengah jadi. Kode ini bekerja, hanya tidak lagi dipakai.

## Keterbatasan yang diketahui

Satu bug yang sudah teridentifikasi tapi sengaja tidak diperbaiki di sini,
karena folder ini read-only dan backend aktif sudah tidak memakai kode ini.

**Pencarian panel admin tidak meng-escape wildcard SQL.** `admin/records.rs`
dan `admin/inbox.rs` menyusun `ILIKE` dengan `%{search}%` apa adanya, jadi
`%` dan `_` di dalam kata yang diketik pengguna tetap punya arti wildcard:

| Yang diketik di panel | Yang sebenarnya dicocokkan |
|---|---|
| `%` | seluruh isi tabel |
| `_` | satu karakter apa pun |
| `100%` | yang diawali `100` |

Akibatnya satu `%` saja mengembalikan setiap baris, dan `100%` mengembalikan
baris yang tidak ada hubungannya. Ini bukan celah kebocoran data, karena
panel sudah butuh sesi admin, tapi hasil pencariannya tidak dapat dipercaya.

Perbaikannya sudah ada di backend aktif: `searchPattern()` di
`src/server/validation.ts` meng-escape `\`, `%`, dan `_` sebelum menambahkan
Wildcard, dan ada tesnya di `tests/validation.test.ts`.

Kalau folder ini nanti dihidupkan kembali, dua berkas itu adalah tempat
pertama yang perlu diperiksa. Menjalankan `cargo test` untuk memastikan tidak
ada regresi lain membutuhkan build ulang dari nol, karena `target/` tidak
disimpan di Git.

## Kenapa diarsipkan, bukan dihapus

Masalahnya bukan kualitas, tapi jumlah runtime. Backend Rust menuntut
satu proses tambahan (biner sendiri, image Docker sendiri, connection
pool sendiri) di atas Next.js, sementara penghematannya nyaris nol:

- Next.js harus tetap hidup untuk melayani halaman, jadi tidak ada
  proses yang bisa dihemat.
- Rate limit `Mutex<HashMap>` di `ratelimit.rs` hanya berlaku di satu
  proses. Kalau nanti di-host di Vercel, tiap instance punya memorinya
  sendiri dan batas efektifnya jadi N kali lebih longgar.
- Database ada di VPS, dan Vercel tidak bisa menjangkau `127.0.0.1`.

Dengan satu bahasa, semua itu hilang: satu proses, satu pool, satu layer
validasi, dan rate limit yang benar-benar berlaku di mana pun dijalankan.

## Isi folder

| Path | Keterangan |
|---|---|
| `src/main.rs` | server HTTP, perakitan router |
| `src/bin/db.rs` | alat operasional database (`migrate`, `seed`, `reset`) |
| `src/config.rs` | pembacaan environment, gagal cepat kalau `AUTH_SECRET` lemah |
| `src/auth/` | hash Argon2id dan token sesi HMAC-SHA256 |
| `src/repo/` | layer query, satu-satunya tempat menulis SQL |
| `src/routes/` | endpoint publik dan admin |
| `src/admin/` | operasi panel admin |
| `src/markdown.rs` | render Markdown + sanitasi ammonia |
| `src/validation.rs` | validasi formulir publik |
| `src/ratelimit.rs` | pembatas laju jendela geser |
| `src/ticket.rs` | pembuatan kode tiket |
| `migrations/` | empat migrasi SQL, sudah di-embed lewat `sqlx::migrate!` |
| `Dockerfile`, `.dockerignore` | build image produksi |

Total sekitar 11.700 baris Rust plus 4 berkas migrasi.

## Isi yang masih layak dibaca

Beberapa bagian di sini lebih matang daripada padanannya di backend
sekarang, dan layak dipakai sebagai rujukan kalau ada yang perlu
diperbaiki nanti:

- **`src/ratelimit.rs`** — jendela geser dengan peng-vector, bukan
  penghitung. Fenomenanya: menarik semua hitungan lalu menunggu jendela
  bergeser penuh akan melewati batas kalau yang disimpan cuma penghitung.
- **`src/auth/session.rs`** — tanda tangan dicek sebelum payload di-parse,
  dan perbandingannya waktu tetap lewat `subtle`. Urutan itu penting:
  kalau dibalik, penyerang bisa membuat server mengerjakan parsing pada
  data yang belum diautentikasi.
- **`migrations/`** — skema yang lebih lengkap, termasuk kolom antrean,
  nomor tiket, dan audit.

## Cara membukanya

```bash
# baca tanpa mengubah apa pun
cd archive/rust-api && cargo check

# kalau ingin menjalankan pengujiannya
cd archive/rust-api && cargo test
```

Tidak ada yang memanggil folder ini. Backend aktif ada di
`src/server/` dan `src/app/api/v1/`, dengan skema di `drizzle/`.