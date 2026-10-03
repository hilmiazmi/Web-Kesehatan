# Archive Backend Rust

Backend pertama untuk Web-Kesehatan, ditulis dengan Rust (axum + sqlx).
Sudah **selesai dan lulus semua pengujiannya**, lalu dipindahkan ke sini
ketika backend utama diganti ke Bun + Next.js Route Handler + Drizzle.

Folder ini tidak lagi dipakai. Jangan dipindahkan, dan baca bagian cacat di
bawah ini sebelum memakai tabel status sebagai bukti bahwa kodenya benar.

## Status saat diarsipkan

| Pemeriksaan | Hasil |
|---|---|
| `cargo check --all-targets` | bersih |
| `cargo clippy --all-targets` | bersih, tanpa warning |
| `cargo fmt --check` | bersih |
| `cargo test` | 132 lulus, 0 gagal (136 setelah empat cacat panel diperbaiki) |

Jadi ini bukan kode setengah jadi. Kode ini bekerja, hanya tidak lagi dipakai.

Catatan penting: angka 132 di atas diukur **sebelum** dua halaman utama panel
diperbaiki. Pada waktu itu seluruh tes hijau sementara panel mengembalikan 500.
Bacalah bagian cacat di bawah ini sebelum memakai angka itu sebagai bukti.

## Cacat yang ditemukan lewat pengujian, lalu diperbaiki

Folder ini sempat ditulis "read-only". Empat cacat di panel admin baru terlihat
setelah servernya dijalankan terhadap database sungguhan, dan keempatnya tembus
di seluruh tes yang ada. Bentuk SQL-nya disusun dengan `format!`, sedangkan
tes di folder ini semuanya unit murni tanpa database, jadi tidak satu pun bisa
menyentuh kalimat SQL yang menyusunnya.

| Cacat | Gejala dari luar |
|---|---|
| `$FILTER` dipakai sebagai placeholder | 500 `syntax error at or near "$"` |
| `$2::text IS NULL OR status = $2` | 500 `operator does not exist: submission_status = text` |
| klausa `ILIKE` ditambahkan walau kata kunci kosong | daftar selalu kosong begitu kotak pencarian dikosongkan |
| pola `ILIKE` tidak meng-escape wildcard | satu `%` di kotak pencarian mencocokkan seluruh isi tabel |

Dua yang pertama lebih serius daripada dua sisanya, karena tidak terlihat
sebagai hasil pencarian yang salah. `$FILTER` dan `$2` membuat **setiap**
permintaan daftar catatan dan daftar inbox berakhir 500, dengan atau tanpa kata
kunci. Panelnya tidak terlihat rusak, panelnya tidak bisa dipakai sama sekali.

Dua yang terakhir tidak terlihat sebagai galat sama sekali, hanya sebagai
hasil yang salah. Tanpa kata kunci, `?q` yang tidak dikirim terikat sebagai
NULL, dan `kolom ILIKE NULL` bernilai NULL untuk semua baris, jadi daftar
selalu kosong. Tanpa escape, `%` dan `_` di dalam kata kunci tetap punya arti
wildcard, jadi satu `%` saja mengembalikan setiap baris.

Perbaikannya: pola pencarian pindah ke `validation::search_pattern`, yang
membungkus wildcard lalu meng-escape `\`, `%`, dan `_`; setiap `ILIKE` mendapat
`ESCAPE '\\'`; klausa hanya ditambahkan kalau memang ada kata kunci; dan
placeholder-nya menjadi posisional. Bentuk yang sama sudah ada di backend
aktif (`searchPattern()` di `src/server/validation.ts`), jadi sekarang kedua
backend berpikir sama.

Verifikasi tidak berhenti di `cargo test`. Setelah diperbaiki, servernya
dijalankan di atas database ter-seed lalu diperiksa lewat HTTP sungguhan:
`%`, `_`, `100%`, dan `koridorLY` masing-masing mengembalikan nol baris dari
lima baris yang ada; `jam` dan `JAM` masing-masing mengembalikan satu baris yang
sama; `?q=lampu&status=resolved` mengembalikan nol; dan tanpa kata kunci daftar
tetap menampilkan seluruh isi tabel.

Pelajaran yang lebih berguna daripada perbaikannya: tes yang hijau tidak
berarti kodenya jalan. Seluruh tes di folder ini benar dan tetap hijau ketika
dua halaman utama panel mengembalikan 500 untuk semua permintaan. `cargo test`
membuktikan kodenya berperilaku seperti yang ditulis, tidak ada yang
membuktikan tidak ada yang salah ditulis. Untuk jalur yang menyentuh database,
jalankan servernya.

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