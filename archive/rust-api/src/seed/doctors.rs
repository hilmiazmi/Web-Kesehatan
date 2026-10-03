//! Data awal untuk katalog medis: poliklinik, spesialis, dokter, dan jadwal.
//!
//! Seluruh nama di sini dibuat khusus untuk situs demo. Tidak ada nama, gelar,
//! nomor praktik, atau foto milik tenaga kesehatan nyata. Nama memakai bentuk
//! generik supaya tidak menyerupai orang sungguhan.

use sqlx::postgres::PgPool;
use sqlx::Transaction;

use crate::error::ApiResult;

type Tx<'a> = Transaction<'a, sqlx::Postgres>;

// ---------------------------------------------------------------------------
// Poliklinik
// ---------------------------------------------------------------------------

/// `(nama, slug, deskripsi, lokasi)`
const POLYCLINICS: &[(&str, &str, &str, &str)] = &[
    (
        "Poliklinik Umum",
        "poliklinik-umum",
        "Layanan dasar untuk pasien yang datang sendiri tanpa rujukan.",
        "Gedung A Lantai 1",
    ),
    (
        "Poliklinik Spesialis",
        "poliklinik-spesialis",
        "Konsultasi dengan dokter spesialis tanpa perlu rujukan dari poli umum.",
        "Gedung B Lantai 2",
    ),
    (
        "Poliklinik Ibu dan Anak",
        "poliklinik-ibu-anak",
        "Pemeriksaan kehamilan, tumbuh kembang anak, dan konsultasi psikologi anak.",
        "Gedung C Lantai 1",
    ),
    (
        "Poliklinik Penyakit Dalam",
        "poliklinik-penyakit-dalam",
        "Perawatan penyakit kronis dan pemeriksaan rutin pasien dewasa.",
        "Gedung B Lantai 3",
    ),
    (
        "Instalasi Gawat Darurat",
        "igd",
        "Layanan kegawatdaruratan 24 jam setiap hari, termasuk hari libur.",
        "Gedung A Lantai 1",
    ),
];

pub async fn polyclinics(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (name, slug, description, location)) in POLYCLINICS.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO polyclinics (name, slug, description, location, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (slug) DO UPDATE
               SET name = excluded.name,
                   description = excluded.description,
                   location = excluded.location,
                   sort_order = excluded.sort_order
            "#,
        )
        .bind(name)
        .bind(slug)
        .bind(description)
        .bind(location)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Spesialis
// ---------------------------------------------------------------------------

const SPECIALTIES: &[(&str, &str)] = &[
    ("Jantung dan Pembuluh Darah", "jantung"),
    ("Saraf dan Otak", "saraf"),
    ("Mata", "mata"),
    ("Penyakit Dalam", "penyakit-dalam"),
    ("Anak", "anak"),
    ("Kebidanian dan Kandungan", "kandungan"),
    ("Bedah Umum", "bedah"),
    ("Ortopedi dan Trauma", "ortopedi"),
    ("Penyakit Gigi dan Mulut", "gigi"),
    ("Kulit dan Kelamin", "kulit"),
    ("Telinga Hidung Tenggorok", "ent"),
    ("Paru-paru", "paru"),
    ("Ginekologi", "ginekologi"),
    ("Hemodialisa", "hemodialisa"),
    ("Tumor dan Kanker", "onkologi"),
    ("Rehabilitasi Medis", "rehabilitasi"),
    ("Nutrisi Klinik", "nutrisi"),
    ("Toksikologi", "toksikologi"),
];

pub async fn specialties(tx: &mut Tx<'_>) -> ApiResult<()> {
    for (index, (name, slug)) in SPECIALTIES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO specialties (name, slug, sort_order)
            VALUES ($1, $2, $3)
            ON CONFLICT (slug) DO UPDATE
               SET name = excluded.name,
                   sort_order = excluded.sort_order
            "#,
        )
        .bind(name)
        .bind(slug)
        .bind(index as i32)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Dokter
// ---------------------------------------------------------------------------

/// Satu blok praktik: `(hari, mulai, selesai, ruang, kuota)`.
///
/// Hari memakai ISO-8601: 1 = Senin sampai 7 = Minggu.
type Block = (i32, &'static str, &'static str, &'static str, i32);

struct DoctorSeed {
    /// Id tetap, dihitung dari nama dan gelar.
    ///
    /// Dulu id dokter datang dari `gen_random_uuid()` milik database, sehingga
    /// setiap kali seed dijalankan ulang semua id berubah. Itu tidak masalah
    /// selama isinya hanya dibaca, tapi snapshot konten memakai id dokter pada
    /// nama berkasnya, jadi id yang berubah setiap seeding membuat diff snapshot
    /// penuh nama berkas yang tidak ada hubungannya dengan perubahan isi.
    /// Id di sini ditulis mati, dihitung sekali dengan UUID v5 dari nama dan
    /// gelar supaya tidak perlu ditebak ulang. Id tabel lain masih datang dari
    /// `gen_random_uuid()` milik database, jadi snapshot belum sepenuhnya bisa
    /// direproduksi ulang; campo yang bergeser tiap seeding dijelaskan di
    /// `api/snapshot/README.md`.
    id: &'static str,
    name: &'static str,
    title: &'static str,
    /// `None` untuk dokter tanpa spesialis. Ada supaya jalur `specialty_id`
    /// kosong ikut terisi: kalau data seed selalu lengkap, tampilan "Spesialis
    /// belum diisi" tidak pernah muncul saat diuji.
    specialty: Option<&'static str>,
    polyclinic: &'static str,
    photo: &'static str,
    blocks: &'static [Block],
}

/// Satu dokter per spesialis, kecuali penyakit dalam dan obstetri yang punya
/// dua orang karena memang butuh lebih dari satu dokternya.
const DOCTORS: &[DoctorSeed] = &[
    DoctorSeed {
        id: "2207cc2f-fde8-55bc-b2d7-bfa3e9c5e312",
        name: "Ayu Lestari",
        title: "dr. Sp.JK",
        specialty: Some("jantung"),
        polyclinic: "poliklinik-spesialis",
        photo: "https://picsum.photos/seed/dokter-ayu-lestari/480/600",
        blocks: &[
            (1, "08:00", "12:00", "B2-01", 40),
            (3, "08:00", "12:00", "B2-01", 40),
            (5, "08:00", "11:00", "B2-01", 25),
        ],
    },
    DoctorSeed {
        id: "0acdc5c3-9f16-518c-a831-6f4ac4e4f45d",
        name: "Bagus Prakoso",
        title: "dr. Sp.N",
        specialty: Some("saraf"),
        polyclinic: "poliklinik-spesialis",
        photo: "https://picsum.photos/seed/dokter-bagus-prakoso/480/600",
        blocks: &[
            (2, "09:00", "13:00", "B3-02", 35),
            (4, "09:00", "13:00", "B3-02", 35),
        ],
    },
    DoctorSeed {
        id: "cdb6c52f-85e7-5889-a24a-441c8c83257c",
        name: "Citra Wulandari",
        title: "dr. Sp.M",
        specialty: Some("mata"),
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-citra-wulandari/480/600",
        blocks: &[
            (1, "08:00", "12:00", "C1-03", 45),
            (2, "08:00", "12:00", "C1-03", 45),
            (4, "08:00", "12:00", "C1-03", 45),
        ],
    },
    DoctorSeed {
        id: "39fc741e-ec1b-511f-97c7-e6e1725b1b22",
        name: "Dimas Nugroho",
        title: "dr. Sp.B",
        specialty: Some("bedah"),
        polyclinic: "poliklinik-spesialis",
        photo: "https://picsum.photos/seed/dokter-dimas-nugroho/480/600",
        blocks: &[
            (1, "08:00", "12:00", "A1-01", 30),
            (3, "08:00", "12:00", "A1-01", 30),
        ],
    },
    DoctorSeed {
        id: "28a59fc0-2f56-5eee-a744-ef8ec299bde1",
        name: "Endah Permata",
        title: "dr. Sp.OG",
        specialty: Some("kandungan"),
        polyclinic: "poliklinik-ibu-anak",
        photo: "https://picsum.photos/seed/dokter-endah-permata/480/600",
        blocks: &[
            (1, "09:00", "13:00", "C1-05", 35),
            (2, "09:00", "13:00", "C1-05", 35),
            (4, "09:00", "13:00", "C1-05", 35),
            (6, "08:00", "11:00", "C1-05", 20),
        ],
    },
    DoctorSeed {
        id: "34c4cf92-5522-56f9-af90-c16b9eaf1e43",
        name: "Fajar Setiawan",
        title: "dr. Sp.A",
        specialty: Some("anak"),
        polyclinic: "poliklinik-ibu-anak",
        photo: "https://picsum.photos/seed/dokter-fajar-setiawan/480/600",
        blocks: &[
            (2, "08:00", "12:00", "C1-04", 40),
            (4, "08:00", "12:00", "C1-04", 40),
        ],
    },
    DoctorSeed {
        id: "082a95ba-6544-5358-b8aa-b1f4cdcd0961",
        name: "Gita Maharani",
        title: "dr. Sp.PD",
        specialty: Some("penyakit-dalam"),
        polyclinic: "poliklinik-penyakit-dalam",
        photo: "https://picsum.photos/seed/dokter-gita-maharani/480/600",
        blocks: &[
            (1, "08:00", "12:00", "B3-04", 50),
            (3, "08:00", "12:00", "B3-04", 50),
            (5, "08:00", "11:00", "B3-04", 35),
        ],
    },
    DoctorSeed {
        id: "2391238a-4eed-5a5f-af72-a9622a9bd820",
        name: "Hendra Kusuma",
        title: "dr. Sp.PD",
        specialty: Some("penyakit-dalam"),
        polyclinic: "poliklinik-penyakit-dalam",
        photo: "https://picsum.photos/seed/dokter-hendra-kusuma/480/600",
        blocks: &[
            (2, "08:00", "12:00", "B3-06", 50),
            (4, "08:00", "12:00", "B3-06", 50),
        ],
    },
    DoctorSeed {
        id: "7656676d-06bb-55f3-bad9-dfe67f349aba",
        name: "Indah Safitri",
        title: "dr. Sp.Orth",
        specialty: Some("ortopedi"),
        polyclinic: "poliklinik-spesialis",
        photo: "https://picsum.photos/seed/dokter-indah-safitri/480/600",
        blocks: &[
            (2, "09:00", "13:00", "B2-05", 30),
            (4, "09:00", "13:00", "B2-05", 30),
            (6, "08:00", "11:00", "B2-05", 20),
        ],
    },
    DoctorSeed {
        id: "e458d6b7-5bd2-524a-90e7-3f4fe7972c98",
        name: "Joko Santoso",
        title: "dr. Sp.BM",
        specialty: Some("gigi"),
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-joko-santoso/480/600",
        blocks: &[
            (1, "08:00", "12:00", "C2-01", 40),
            (3, "08:00", "12:00", "C2-01", 40),
            (5, "08:00", "11:00", "C2-01", 30),
        ],
    },
    DoctorSeed {
        id: "8ff250e2-6a10-5e7b-ad08-81f37ac1906d",
        name: "Kartika Dewi",
        title: "dr. Sp.THT-KL",
        specialty: Some("ent"),
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-kartika-dewi/480/600",
        blocks: &[
            (2, "08:00", "12:00", "B2-03", 35),
            (4, "08:00", "12:00", "B2-03", 35),
        ],
    },
    DoctorSeed {
        id: "ca12d06b-c5e1-5217-9cc7-7e56505d68ff",
        name: "Lina Marlina",
        title: "dr. Sp.KK",
        specialty: Some("kulit"),
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-lina-marlina/480/600",
        blocks: &[
            (1, "08:00", "11:00", "C1-06", 30),
            (3, "08:00", "11:00", "C1-06", 30),
            (5, "08:00", "11:00", "C1-06", 30),
        ],
    },
    DoctorSeed {
        id: "3cdbd28d-b37e-5d34-92e6-0b573f73a165",
        name: "Mahendra Yoga",
        title: "dr. Sp.Onk",
        specialty: Some("onkologi"),
        polyclinic: "poliklinik-spesialis",
        photo: "https://picsum.photos/seed/dokter-mahendra-yoga/480/600",
        blocks: &[
            (2, "09:00", "13:00", "B4-01", 25),
            (4, "09:00", "13:00", "B4-01", 25),
        ],
    },
    DoctorSeed {
        id: "f445db33-3b07-541e-b6cb-c1080439335f",
        name: "Nining Rahmawati",
        title: "dr. Sp.REH",
        specialty: Some("rehabilitasi"),
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-nining-rahmawati/480/600",
        blocks: &[
            (1, "08:00", "12:00", "C2-03", 30),
            (3, "08:00", "12:00", "C2-03", 30),
        ],
    },
    DoctorSeed {
        id: "57474606-867c-5d7b-be2b-46a43327c04c",
        name: "Oki Prasetyo",
        title: "dr. Sp.OG",
        specialty: Some("ginekologi"),
        polyclinic: "poliklinik-ibu-anak",
        photo: "https://picsum.photos/seed/dokter-oki-prasetyo/480/600",
        blocks: &[
            (2, "09:00", "13:00", "C1-07", 30),
            (4, "09:00", "13:00", "C1-07", 30),
        ],
    },
    DoctorSeed {
        id: "510625a7-7236-5dbd-91dd-43f2e1dfbc29",
        name: "Putri Anggraini",
        title: "dr.",
        specialty: None,
        polyclinic: "poliklinik-umum",
        photo: "https://picsum.photos/seed/dokter-putri-anggraini/480/600",
        blocks: &[
            (1, "08:00", "12:00", "A1-04", 45),
            (2, "08:00", "12:00", "A1-04", 45),
        ],
    },
    DoctorSeed {
        id: "d6fc647a-3239-5d09-8901-9c6c79388c91",
        name: "Rizky Ramadhan",
        title: "dr.",
        specialty: None,
        polyclinic: "igd",
        photo: "https://picsum.photos/seed/dokter-rizky-ramadhan/480/600",
        blocks: &[
            (1, "08:00", "14:00", "A1-01", 30),
            (2, "08:00", "14:00", "A1-01", 30),
            (3, "08:00", "14:00", "A1-01", 30),
            (4, "08:00", "14:00", "A1-01", 30),
            (5, "08:00", "14:00", "A1-01", 30),
        ],
    },
];

/// Sisipkan dokter dan jadwalnya.
///
/// Idempoten lewat `WHERE NOT EXISTS`, bukan `ON CONFLICT DO NOTHING`, karena
/// `doctors` tidak punya batasan unik: nama dan gelar adalah identitas alaminya
/// dan itu tidak dijamin database.
pub async fn doctors(tx: &mut Tx<'_>) -> ApiResult<()> {
    for seed in DOCTORS {
        sqlx::query(
            r#"
            INSERT INTO doctors (id, full_name, title, specialty_id, photo_url)
            SELECT $1::uuid,
                   $2,
                   $3,
                   (SELECT id FROM specialties WHERE slug = $4),
                   $5
             WHERE NOT EXISTS (
                   SELECT 1 FROM doctors
                    WHERE full_name = $2
                      AND title IS NOT DISTINCT FROM $3
             )
            "#,
        )
        .bind(seed.id)
        .bind(seed.name)
        .bind(seed.title)
        .bind(seed.specialty)
        .bind(seed.photo)
        .execute(&mut **tx)
        .await?;

        for (day, start, end, room, quota) in seed.blocks {
            sqlx::query(
                r#"
                INSERT INTO doctor_schedules (
                    doctor_id, polyclinic_id, day_of_week, start_time, end_time, room, quota
                )
                SELECT d.id, pc.id, $2, $3::time, $4::time, $5, $6
                  FROM doctors d
                  JOIN polyclinics pc ON pc.slug = $7
                 WHERE d.id = $1::uuid
                   AND NOT EXISTS (
                         SELECT 1 FROM doctor_schedules s
                          WHERE s.doctor_id = d.id
                            AND s.day_of_week = $2
                            AND s.start_time = $3::time
                       )
                "#,
            )
            .bind(seed.id)
            .bind(*day)
            .bind(*start)
            .bind(*end)
            .bind(*room)
            .bind(*quota)
            .bind(seed.polyclinic)
            .execute(&mut **tx)
            .await?;
        }
    }

    Ok(())
}

/// Jumlah dokter dan jadwal hasil seed, untuk laporan `db:seed`.
pub async fn counts(pool: &PgPool) -> ApiResult<(i64, i64)> {
    let doctors = sqlx::query_scalar::<_, i64>("SELECT count(*) FROM doctors")
        .fetch_one(pool)
        .await?;

    let schedules = sqlx::query_scalar::<_, i64>("SELECT count(*) FROM doctor_schedules")
        .fetch_one(pool)
        .await?;

    Ok((doctors, schedules))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn doctor_names_are_unique_in_the_seed() {
        // `WHERE NOT EXISTS` mencocokkan nama dan gelar. Dua dokter dengan nama
        // sama tapi gelar berbeda tetap bisa, dua dengan nama sama akan
        // diam-diam dilewati dan hanya baris kedua yang tersimpan.
        let mut seen = std::collections::HashSet::new();

        for seed in DOCTORS {
            assert!(
                seen.insert(seed.name),
                "nama dokter dobel di seed: {}",
                seed.name
            );
        }
    }

    #[test]
    fn every_block_day_is_in_iso_range() {
        for seed in DOCTORS {
            for (day, start, end, _, quota) in seed.blocks {
                assert!(
                    (1..=7).contains(day),
                    "hari {} di luar rentang ISO-8601 untuk {}",
                    day,
                    seed.name
                );
                assert!(start < end, "jam mulai >= jam selesai untuk {}", seed.name);
                assert!(*quota > 0, "kuota nol untuk {}", seed.name);
            }
        }
    }

    #[test]
    fn every_specialty_slug_exists_in_the_table() {
        let known: std::collections::HashSet<&str> =
            SPECIALTIES.iter().map(|(_, slug)| *slug).collect();

        for seed in DOCTORS {
            if let Some(slug) = seed.specialty {
                assert!(
                    known.contains(slug),
                    "slug spesialis '{slug}' tidak ada di SPECIALTIES"
                );
            }
        }
    }

    #[test]
    fn every_polyclinic_slug_exists_in_the_table() {
        let known: std::collections::HashSet<&str> =
            POLYCLINICS.iter().map(|(_, slug, _, _)| *slug).collect();

        for seed in DOCTORS {
            assert!(
                known.contains(seed.polyclinic),
                "slug poliklinik '{}' tidak ada di POLYCLINICS",
                seed.polyclinic
            );
        }
    }
}
