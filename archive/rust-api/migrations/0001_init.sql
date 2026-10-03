-- 0001_init.sql
--
-- Inti skema: enum, identitas, poliklinik, spesialis, dokter, jadwal.
--
-- Konvensi yang dipakai di seluruh migrasi:
--   * kolom        snake_case
--   * primary key  uuid DEFAULT gen_random_uuid()
--   * waktu        timestamptz, bukan timestamp tanpa zona
--
-- `gen_random_uuid()` sudah jadi bagian inti PostgreSQL sejak versi 13, jadi
-- tidak perlu ekstensi pgcrypto. Dipasang di server Ubuntu 26.04 (PostgreSQL
-- 18), jadi aman tanpa perlu ekstensi tambahan.

-- ---------------------------------------------------------------------------
-- Fungsi pemelihara updated_at
-- ---------------------------------------------------------------------------

-- Dipasang sebagai trigger ke setiap tabel yang punya kolom updated_at, supaya
-- aplikasi tidak perlu mengingat untuk selalu mengirim updated_at = now().
-- Gotcha yang dihindari: kalau diisi manual, satu jalur lupa update (mis. saat
-- panel admin memakai pembaruan massal) bisa membiarkan baris terlihat lebih baru dari
-- kenyataannya.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('super_admin', 'editor', 'front_office');

CREATE TYPE service_type AS ENUM ('priority', 'facility', 'diagnostic');

CREATE TYPE mcu_category AS ENUM ('reguler', 'health_meets_holiday');

CREATE TYPE appointment_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'no_show'
);

CREATE TYPE payment_type AS ENUM ('general', 'bpjs', 'insurance');

CREATE TYPE submission_status AS ENUM (
  'new', 'in_progress', 'resolved', 'rejected'
);

CREATE TYPE feedback_type AS ENUM (
  'suggestion', 'complaint', 'praise', 'question'
);

CREATE TYPE wbs_severity AS ENUM ('low', 'medium', 'high');

CREATE TYPE document_category AS ENUM (
  'standar_pelayanan',
  'kompensasi_pelayanan',
  'pengaduan_masyarakat',
  'regulasi_zona_integritas',
  'ppid',
  'brosur',
  'lainnya'
);

-- ---------------------------------------------------------------------------
-- Poliklinik
-- ---------------------------------------------------------------------------

CREATE TABLE polyclinics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(160) NOT NULL,
  slug        varchar(180) NOT NULL,
  description text,
  location    varchar(255),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX polyclinics_slug_unique ON polyclinics (slug);
CREATE INDEX polyclinics_sort_idx ON polyclinics (is_active, sort_order);

CREATE TRIGGER polyclinics_set_updated_at
  BEFORE UPDATE ON polyclinics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Spesialis
-- ---------------------------------------------------------------------------

CREATE TABLE specialties (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(160) NOT NULL,
  slug       varchar(180) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT specialties_name_unique UNIQUE (name)
);

CREATE UNIQUE INDEX specialties_slug_unique ON specialties (slug);

CREATE TRIGGER specialties_set_updated_at
  BEFORE UPDATE ON specialties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Akun admin
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         varchar(255) NOT NULL,
  -- Format argon2id dari src/auth/password.rs: $argon2id$v=19$m=...$salt$hash.
  -- Panjang variabel dan bisa bertambah kalau parameternya dinaikkan,
  -- jadi text bukan varchar(255).
  password_hash text NOT NULL,
  name          varchar(160) NOT NULL,
  role          user_role NOT NULL DEFAULT 'front_office',
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Email dipakai untuk login dan selalu dinormalisasi ke huruf kecil oleh
-- aplikasi, tapi indeksnya dibuat case-insensitive (lower()) supaya akun
-- "Admin@X.test" tidak bisa terdaftar dua kali berbeda huruf besar.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Dokter
-- ---------------------------------------------------------------------------

CREATE TABLE doctors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable supaya dokter yang belum ditugaskan ke spesialis tidak perlu
  -- dibuat kategori "(belum ditentukan)".
  specialty_id   uuid REFERENCES specialties (id) ON DELETE SET NULL,
  full_name      varchar(200) NOT NULL,
  title          varchar(120),
  photo_url      text,
  practice_number varchar(60),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Wajib: doctors(specialty_id) per PRD bagian 7.3.
CREATE INDEX doctors_specialty_id_idx ON doctors (specialty_id);
CREATE INDEX doctors_is_active_idx ON doctors (is_active, full_name);

CREATE TRIGGER doctors_set_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Jadwal praktik
-- ---------------------------------------------------------------------------

CREATE TABLE doctor_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     uuid NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  polyclinic_id uuid NOT NULL REFERENCES polyclinics (id) ON DELETE RESTRICT,
  -- ISO-8601: 1 = Senin ... 7 = Minggu. Nilai 0 tidak dipakai supaya konversi
  -- dari getDay() di JavaScript (0 = Minggu) selalu terlihat eksplisit di kode.
  day_of_week   integer NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  room          varchar(80),
  quota         integer NOT NULL DEFAULT 50,
  note          varchar(200),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT doctor_schedules_day_range CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT doctor_schedules_time_order CHECK (start_time < end_time),
  CONSTRAINT doctor_schedules_quota_nonneg CHECK (quota >= 0)
);

-- Wajib: doctor_schedules(doctor_id, day_of_week) per PRD bagian 7.3.
CREATE INDEX doctor_schedules_doctor_day_idx
  ON doctor_schedules (doctor_id, day_of_week);
CREATE INDEX doctor_schedules_polyclinic_day_idx
  ON doctor_schedules (polyclinic_id, day_of_week);
-- Mendukung pengecekan jadwal aktif untuk satu tanggal tertentu saat menghitung
-- nomor antrean.
CREATE INDEX doctor_schedules_active_idx
  ON doctor_schedules (doctor_id, is_active);

CREATE TRIGGER doctor_schedules_set_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Satu dokter tidak boleh punya dua blok dengan jam yang sama di hari yang sama.
-- Ini yang menjaga agar nomor antrean tidak pernah menghitung slot ganda.
CREATE UNIQUE INDEX doctor_schedules_no_overlap
  ON doctor_schedules (doctor_id, day_of_week, start_time)
  WHERE is_active;