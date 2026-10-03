-- 0004_ops.sql
--
-- Tabel operasional: kapasitas bed, lowongan kerja, dan pengaturan situs.

-- ---------------------------------------------------------------------------
-- Kapasitas bed
-- ---------------------------------------------------------------------------

-- Satu baris per kelas tidur, bukan per ruang fisik, supaya tabel publik tetap
-- ringkas: "Anggrek 2, Kelas VIP, 12 tempat, 9 terisi".
--
-- occupied_beds dan reserved_beds dipisahkan karena keduanya punya sumber
-- berbeda. Terisi berasal dari admisi, sedangkan "reservasi" berasal dari
-- penundaan yang sudah disepakati tapi pasien belum datang. Menjumlahkannya
-- jadi satu kolom membuat admin tidak bisa tahu bagian mana yang bisa
-- dipulihkan dengan cepat.
CREATE TABLE bed_capacity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_name     varchar(160) NOT NULL,
  class_name    varchar(80) NOT NULL,
  room_code     varchar(40),
  total_beds    integer NOT NULL DEFAULT 0,
  occupied_beds integer NOT NULL DEFAULT 0,
  reserved_beds integer NOT NULL DEFAULT 0,
  gender_policy varchar(40),
  note          varchar(200),
  -- Waktu peninjauan manual terakhir. Ditampilkan di tabel publik supaya
  -- pengunjung bisa menilai seberapa baru angkanya, bukan hanya melihat
  -- angka yang terlihat selalu mutlak.
  observed_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bed_capacity_total_nonneg CHECK (total_beds >= 0),
  CONSTRAINT bed_capacity_occupied_nonneg CHECK (occupied_beds >= 0),
  CONSTRAINT bed_capacity_reserved_nonneg CHECK (reserved_beds >= 0),
  -- Bagian yang tidak bisa melayani pasien baru harus selalu punya sisa.
  -- Constraint ini membuat angka kapasitas yang tidak masuk akal ditolak di
  -- level database, bukan tampil sebagai baris minus di halaman publik.
  CONSTRAINT bed_capacity_within_total
    CHECK (occupied_beds + reserved_beds <= total_beds)
);

CREATE INDEX bed_capacity_ward_idx ON bed_capacity (ward_name, class_name);

CREATE UNIQUE INDEX bed_capacity_ward_class_unique
  ON bed_capacity (ward_name, class_name);

CREATE TRIGGER bed_capacity_set_updated_at
  BEFORE UPDATE ON bed_capacity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Lowongan kerja
-- ---------------------------------------------------------------------------

CREATE TABLE job_vacancies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              varchar(200) NOT NULL,
  title             varchar(200) NOT NULL,
  department        varchar(160) NOT NULL,
  employment_type   varchar(80),
  quota             integer NOT NULL DEFAULT 1,
  requirements      text,
  responsibilities  text,
  deadline          date,
  is_open           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT job_vacancies_quota_positive CHECK (quota > 0 AND quota <= 500)
);

CREATE UNIQUE INDEX job_vacancies_slug_unique ON job_vacancies (slug);
CREATE INDEX job_vacancies_open_idx ON job_vacancies (is_open, deadline);

CREATE TRIGGER job_vacancies_set_updated_at
  BEFORE UPDATE ON job_vacancies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Pengaturan situs
-- ---------------------------------------------------------------------------

-- Key-value dengan nilai jsonb supaya bentuk tiap pengaturan bebas berbeda:
-- nama_rs berupa string, jam_operasional berupa object, kontak berupa object.
--
-- Daftar key yang dikenal ada di `SettingBundle` (src/repo/content.rs).
-- Pembacaan pengaturan memakai daftar itu, jadi key yang salah ketik tidak
-- membuat baris baru diam-diam; key asing hanya diabaikan.
CREATE TABLE site_settings (
  key         varchar(80) PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_by  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();