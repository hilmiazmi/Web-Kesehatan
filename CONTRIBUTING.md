# Berkontribusi

Panduan kerja untuk manusia **dan** AI agent di repo ini. Aturan Git dan batas
wewenang agent yang lebih rinci ada di [`AGENTS.md`](AGENTS.md); aturan rahasia di
[`SECURITY.md`](SECURITY.md). Berkas ini merangkum yang praktis dan menautkan sisanya.

Ini proyek pembelajaran/portofolio dengan data **fiktif**. Baca
[`docs/CONTENT-GUIDE.md`](docs/CONTENT-GUIDE.md) sebelum menambah konten.

---

## 1. Sebelum mulai

1. Baca `docs/HANDOFF.md` (posisi kerja terkini).
2. Jalankan `git status` dan `git log --oneline -5`. Repo bisa menerima perubahan
   paralel dari orang atau agent lain; hitung ulang angka apa pun sebelum menuliskannya ke dokumen.
3. Pasang dependensi dengan `bun install --frozen-lockfile`
   (`--frozen-lockfile` menolak mengubah `bun.lock`, jadi versi paket sama dengan CI).
4. Untuk fitur yang butuh database, ikuti bagian "Backend" di `README.md`.

## 2. Branch

- **Jangan commit langsung ke `main`** tanpa diminta; buat branch (`AGENTS.md`, bagian Git).
- Pola nama yang terlihat di riwayat (sampel kecil, bukan aturan resmi):
  `feat/<topik>`, `fix/<topik>`, `fix-<topik>`. Pilih satu pola dan pakai
  konsisten: `<jenis>/<topik-singkat-dengan-tanda-hubung>`.
- Satu branch, satu tujuan. Pekerjaan yang tidak berkaitan dipisah ke branch lain.
- Penggabungan ke `main` lewat pull request; riwayat memuat commit
  "Merge pull request #NN from ...".

## 3. Pesan commit

Riwayat memakai gaya **Conventional Commits** dengan deskripsi berbahasa Indonesia:

```
<jenis>(<lingkup>): <ringkasan dalam huruf kecil, kalimat pendek>
```

Contoh yang ada di riwayat: `feat(admin): layar akun panel`,
`fix(navbar): tutup dropdown setelah navigasi, hilangkan submenu tumpang tindih`,
`docs(audit): catat hasil audit keamanan beserta koreksinya`.

| Jenis | Dipakai untuk | Kira-kira jumlah di 60 commit terakhir |
| --- | --- | --- |
| `fix` | memperbaiki perilaku | terbanyak |
| `feat` | fitur baru | banyak |
| `docs` | dokumentasi saja | sedang |
| `test` | menambah/mengubah tes | sedikit |
| `perf` | optimasi | sedikit |
| `ci`, `chore`, `refactor` | alat, rawatan, restruktur tanpa ubah perilaku | jarang |

Aturan:

1. **Jangan menulis nilai rahasia di pesan commit.** Commit message masuk riwayat
   permanen dan terbawa saat repo di-fork.
2. **Jangan `git add -A` / `git add .` tanpa membaca outputnya**; sebutkan berkas
   satu per satu atau periksa dulu dengan `git status`. Satu berkas `.env` yang
   ikut tak terlihat sudah cukup untuk kebocoran.
3. Satu perubahan logis per commit. Perbaikan di berkas yang juga memuat
   pekerjaan orang lain yang belum selesai jangan ikut di-commit tanpa izin pemiliknya.
4. Ringkasan menjelaskan **apa dan kenapa**, bukan nama berkas.

## 4. Sebelum membuka pull request

Daftar periksa (setara dengan gerbang CI; lihat [`docs/TESTING.md`](docs/TESTING.md)):

- [ ] `bun run lint` bersih
- [ ] `bun run test` lulus (tes aturan waktu memakai `vi.setSystemTime`)
- [ ] `bun run cek:konten` (bila menyentuh endpoint atau `snapshot/`)
- [ ] `bun run audit:teks` bersih (alat tulis kadang menyisipkan karakter asing)
- [ ] `bun run build` sukses (butuh internet ke Google Fonts), lalu `bun run cek:tautan`
- [ ] Halaman/komponen baru dicoba di peramban pada lebar 390, 768, dan 1200 px
- [ ] Bila menyentuh alur formulir/admin: `bun run test:e2e` (butuh build dan Chromium; alur ber-database butuh PostgreSQL, lihat `docs/TESTING.md`)
- [ ] Tidak ada rahasia di diff (`git diff --cached`) dan tidak ada berkas `.env*`
- [ ] Tidak ada dependensi baru tanpa persetujuan (`AGENTS.md`); `bun.lock` hanya berubah bila memang disengaja
- [ ] Dokumen yang terdampak diperbarui; angka yang berubah (jumlah tes/halaman) dihitung ulang, bukan ditebak
- [ ] Tidak menyentuh `archive/` (read-only) atau `docs/` milik pemilik repo kecuali diminta

`bun run verify` menjalankan `lint`, `test`, dan `build` berurutan, tetapi bukan
seluruh gerbang CI.

## 5. Gaya kode dan dokumen

- TypeScript strict; komentar menjelaskan **kenapa**, ditulis dalam bahasa Indonesia.
- **Jangan menulis `*/` di dalam komentar blok** (pernah memecah build dengan
  galat yang menunjuk baris yang salah).
- Fungsi aturan (validasi, tanggal) diekspor sebagai fungsi murni agar bisa diuji tanpa render.
- Nama tabel/kolom/rute dari input tidak pernah dirakit ke SQL; pakai daftar putih.
- Satu fakta ditulis di satu berkas; berkas lain menautkannya. Jangan menyalin angka
  README (halaman, endpoint, tes) ke dokumen lain.
- Tanda baca tebal/kode secukupnya; bahasa Indonesia baku.

## 6. Melaporkan masalah keamanan

Jangan membuka issue publik berisi kredensial atau detail celah yang bisa
dieksploitasi. Aturan penanganan kredensial dan apa yang harus dilakukan bila
terlanjur bocor ada di [`SECURITY.md`](SECURITY.md).
