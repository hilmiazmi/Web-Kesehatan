-- Perbaiki teks rusak yang ikut ter-seed ke database.
--
-- Dua isian lahir dari penulisan yang rusak, bukan dari salah pilih kata:
--
-- 1. `articles.excerpt` untuk "Kelas Pelatihan Tenaga Kesehatan" memuat
--    "yang akanutherford bekerja di sini". Kata tengahnya menggabungkan
--    "akan" dengan potongan lain sehingga kalimatnya tidak bisa dibaca.
--
-- 2. `mcu_packages.summary` untuk "Paket Eksekutif Pria" memuat
--    "untuk signifyingessional kedikte", campuran bahasa Inggris dan
--    potongan kata. Paket Eksekutif Wanita memakai pola
--    "Pemeriksaan menyeluruh dengan pemeriksaan khusus perempuan", jadi
--    versi pria dibuat sewajar dengan itu.
--
-- `scripts/seed-data.json` diperbarui dengan isi yang sama, tapi database
-- yang sudah ter-seed tidak berubah dari seed karena `db:seed` memakai
-- `onConflictDoNothing`. Migrasi inilah yang membuat keduanya efektif sama,
-- dan sekaligus memperbaiki basis yang sudah jalan.
UPDATE "articles" SET "excerpt" = 'Pelatihan tiga hari untuk tenaga kesehatan yang akan bekerja di sini.' WHERE "slug" = 'kelas-pelatihan-tenaga-kesehatan';--> statement-breakpoint
UPDATE "mcu_packages" SET "summary" = 'Pemeriksaan menyeluruh dengan pemeriksaan khusus pria.' WHERE "slug" = 'paket-eksekutif-pria';
