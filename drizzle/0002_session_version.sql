-- Kolom session_version pada tabel users.
--
-- Menyimpan angka yang ikut disalin ke dalam token sesi sebagai klaim `sv`.
-- Setiap kali password, peran, atau status aktif berubah, angka ini
-- dinaikkan, sehingga token yang sudah terbit otomatis ditolak tanpa perlu
-- menunggu masa kedaluwarsanya habis.
--
-- Kolom diisi 0 untuk semua baris yang sudah ada. Token lama tidak punya klaim
-- `sv` sama sekali, jadi semuanya ditolak setelah migrasi ini; pemasuk harus
-- login ulang. Itu memang yang diinginkan: token yang tidak bisa dicabut lebih
-- dulu tidak boleh tetap berlaku.

ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;