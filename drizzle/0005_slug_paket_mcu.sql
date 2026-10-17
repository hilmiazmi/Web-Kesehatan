-- Samakan slug paket MCU dengan slug halaman paket.
--
-- Halaman paket dan tabel `mcu_packages` punya dua daftar yang terpisah.
-- Endpoint `POST /api/v1/mcu-registrations` mencari paket dengan
-- `packageIdBySlug`, jadi halaman yang slug-nya tidak ada di tabel akan
-- menjawab 404 "paket MCU" tepat saat orang menekan tombol daftar.
--
-- Tiga baris dipindahkan, bukan disalin: id dan `mcu_package_items` yang
-- menunjuk ke id itu ikut terbawa. Tiga baris lain ditambah karena halamannya
-- ada, sedangkan barisnya tidak.
--
-- `scripts/seed-data.json` diperbarui dengan isi yang sama. Database yang
-- sudah punya baris tidak akan ikut berubah dari seed karena `db:seed`
-- memakai `onConflictDoNothing`, jadi migrasi ini yang membuat keduanya
-- efektif sama.
UPDATE "mcu_packages" SET "slug" = 'paket-pemeriksaan-bebas-narkoba', "name" = 'MCU Paket Pemeriksaan Bebas Narkoba' WHERE "slug" = 'paket-pemeriksaan-bebas-namot' OR "slug" = 'paket-pemeriksaan-bebas-narkotik';--> statement-breakpoint
UPDATE "mcu_packages" SET "slug" = 'anak-sekolah-basic-health-fun' WHERE "slug" = 'anak-sekolah-basic';--> statement-breakpoint
UPDATE "mcu_packages" SET "slug" = 'anak-sekolah-medical-explore' WHERE "slug" = 'anak-sekolah-medical';--> statement-breakpoint
INSERT INTO "mcu_packages" ("id", "slug", "name", "category", "summary", "description", "price", "image_url", "preparation", "is_active", "sort_order", "created_at", "updated_at")
VALUES ('0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', 'paket-pemeriksaan-sehat-rohani', 'MCU Paket Pemeriksaan Sehat Rohani', 'reguler', 'Pemeriksaan kesehatan yang disertai pemeriksaan oleh psikolog.', 'Digunakan untuk keperluan pengajuan kerja dan pemeriksaan tambahan.', 400000, 'https://picsum.photos/seed/paket-pemeriksaan-sehat-rohani/960/640', 'Tidak memerlukan persiapan khusus.', true, 7, '2026-10-03T02:19:48.980Z', '2026-10-03T02:19:48.980Z')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "mcu_packages" ("id", "slug", "name", "category", "summary", "description", "price", "image_url", "preparation", "is_active", "sort_order", "created_at", "updated_at")
VALUES ('1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e', 'anak-sekolah-fun-talent', 'MCU Anak Sekolah Fun Talent', 'health_meets_holiday', 'Pemeriksaan kesehatan untuk peserta kegiatan sekolah.', 'Digunakan untuk pemeriksaan kesehatan sebelum kegiatan sekolah.', 700000, 'https://picsum.photos/seed/anak-sekolah-fun-talent/960/640', 'Tidak memerlukan persiapan khusus.', true, 9, '2026-10-03T02:19:48.980Z', '2026-10-03T02:19:48.980Z')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "mcu_packages" ("id", "slug", "name", "category", "summary", "description", "price", "image_url", "preparation", "is_active", "sort_order", "created_at", "updated_at")
VALUES ('2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f', 'screening-cancer-female', 'Skrining Kanker Wanita', 'health_meets_holiday', 'Pemeriksaan untuk deteksi dini kanker pada wanita.', 'Digunakan untuk pemeriksaan deteksi dini pada wanita.', 950000, 'https://picsum.photos/seed/screening-cancer-female/960/640', 'Tidak memerlukan persiapan khusus.', true, 10, '2026-10-03T02:19:48.980Z', '2026-10-03T02:19:48.980Z')
ON CONFLICT ("slug") DO NOTHING;
