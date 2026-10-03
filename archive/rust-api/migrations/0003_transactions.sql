-- 0003_transactions.sql
--
-- Tabel yang menerima data dari pengunjung: pendaftaran E-Pasien, registrasi
-- MCU, kritik dan saran, laporan WBS, dan survei kepuasan.
--
-- Prinsip yang berlaku di seluruh file ini: TIDAK ADA ON DELETE CASCADE dari
-- konten ke data pengunjung. Kalau admin menghapus satu berita atau satu paket
-- MCU, seluruh riwayat pendaftaran dan laporan pengaduan harus tetap utuh
-- karena itu arsip, bukan data turunan.

-- ---------------------------------------------------------------------------
-- Kuota terpakai per dokter per tanggal
-- ---------------------------------------------------------------------------

-- Disediakan lebih dulu karena appointments bergantung padanya.
--
-- Fungsi tabel ini: menyediakan satu baris yang bisa dikunci dengan
-- SELECT ... FOR UPDATE untuk menghitung nomor antrean. Kalau tidak ada tabel
-- ini, penghitungan harus melakukan "SELECT count(*) lalu INSERT", dan dua
-- permintaan yang datang bersamaan bisa mendapat nomor antrean yang sama.
CREATE TABLE doctor_visit_quotas (
  doctor_id  uuid NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  taken      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT doctor_visit_quotas_pk PRIMARY KEY (doctor_id, visit_date),
  CONSTRAINT doctor_visit_quotas_taken_nonneg CHECK (taken >= 0)
);

CREATE TRIGGER doctor_visit_quotas_set_updated_at
  BEFORE UPDATE ON doctor_visit_quotas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Pendaftaran E-Pasien
-- ---------------------------------------------------------------------------

CREATE TABLE appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kode tiket yang ditampilkan ke pasien. Berbeda dari nomor antrean:
  -- nomor antrean direset tiap hari, kode tiket tetap unik seumur record.
  ticket_code   varchar(24) NOT NULL,
  doctor_id     uuid NOT NULL REFERENCES doctors (id) ON DELETE RESTRICT,
  polyclinic_id uuid NOT NULL REFERENCES polyclinics (id) ON DELETE RESTRICT,
  patient_name  varchar(160) NOT NULL,
  -- 16 digit. Formulir memintanya dan aturan validasinya sudah diuji di
  -- tests/registration-form.test.ts. Constraint di bawah memastikan hanya
  -- angka nol yang tersimpan supaya tidak bisa dipakai sebagai data nyata.
  nik           char(16) NOT NULL,
  birth_date    date,
  phone         varchar(30) NOT NULL,
  email         varchar(255),
  address       text,
  complaint     text,
  visit_date    date NOT NULL,
  -- Disimpan denormalisasi supaya riwayat tidak berubah saat admin mengedit
  -- jadwal di kemudian hari.
  schedule_id   uuid REFERENCES doctor_schedules (id) ON DELETE SET NULL,
  payment_type  payment_type NOT NULL,
  queue_number  integer NOT NULL,
  status        appointment_status NOT NULL DEFAULT 'pending',
  admin_note    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT appointments_nik_simulasi
    CHECK (nik ~ '^[0]{16}$'),
  CONSTRAINT appointments_queue_positive CHECK (queue_number > 0),
  CONSTRAINT appointments_email_format
    CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX appointments_ticket_code_unique ON appointments (ticket_code);

-- Wajib: appointments(doctor_id, visit_date) per PRD bagian 7.3.
CREATE INDEX appointments_doctor_visit_idx
  ON appointments (doctor_id, visit_date);
-- Inbox admin: daftar terbaru per status.
CREATE INDEX appointments_inbox_idx ON appointments (status, created_at DESC);
CREATE INDEX appointments_visit_date_idx ON appointments (visit_date DESC);

-- Lapisan kedua pengaman nomor antrean.alaupun tabel doctor_visit_quotas
-- sudah mengunci baris, constraint unik ini membuat nomor antrean ganda jadi
-- kegagalan database, bukan record yang tersimpan diam-diam.
CREATE UNIQUE INDEX appointments_queue_unique
  ON appointments (doctor_id, visit_date, queue_number);

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Registrasi MCU
-- ---------------------------------------------------------------------------

CREATE TABLE mcu_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code       varchar(24) NOT NULL,
  package_id        uuid NOT NULL REFERENCES mcu_packages (id) ON DELETE RESTRICT,
  name              varchar(160) NOT NULL,
  phone             varchar(30) NOT NULL,
  email             varchar(255),
  gender            varchar(20),
  birth_date        date,
  company_name      varchar(180),
  participant_count integer NOT NULL DEFAULT 1,
  preferred_date    date,
  notes             text,
  status            submission_status NOT NULL DEFAULT 'new',
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mcu_registrations_participants_positive
    CHECK (participant_count > 0 AND participant_count <= 50),
  CONSTRAINT mcu_registrations_email_format
    CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX mcu_registrations_ticket_code_unique
  ON mcu_registrations (ticket_code);
CREATE INDEX mcu_registrations_inbox_idx
  ON mcu_registrations (status, created_at DESC);

CREATE TRIGGER mcu_registrations_set_updated_at
  BEFORE UPDATE ON mcu_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Kritik dan saran
-- ---------------------------------------------------------------------------

CREATE TABLE feedbacks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code  varchar(24) NOT NULL,
  type         feedback_type NOT NULL DEFAULT 'suggestion',
  -- Nama, email, dan telepon boleh kosong: pengaduan anonim tetap diterima,
  -- tapi kolom yang terisi tetap bisa dipakai front office untuk menghubungi.
  name         varchar(160),
  email        varchar(255),
  phone        varchar(30),
  subject      varchar(220),
  message      text NOT NULL,
  service_unit varchar(160),
  status       submission_status NOT NULL DEFAULT 'new',
  admin_note   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT feedbacks_message_len CHECK (length(message) BETWEEN 10 AND 5000),
  CONSTRAINT feedbacks_email_format
    CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX feedbacks_ticket_code_unique ON feedbacks (ticket_code);
CREATE INDEX feedbacks_inbox_idx ON feedbacks (status, created_at DESC);
CREATE INDEX feedbacks_type_idx ON feedbacks (type, created_at DESC);

CREATE TRIGGER feedbacks_set_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Whistleblowing system
-- ---------------------------------------------------------------------------

CREATE TABLE wbs_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code     varchar(24) NOT NULL,
  subject         varchar(220) NOT NULL,
  description     text NOT NULL,
  incident_date   date,
  location        varchar(180),
  involved_unit   varchar(160),
  is_anonymous    boolean NOT NULL DEFAULT false,
  reporter_name   varchar(160),
  reporter_email  varchar(255),
  reporter_phone  varchar(30),
  severity        wbs_severity NOT NULL DEFAULT 'medium',
  status          submission_status NOT NULL DEFAULT 'new',
  admin_note      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Jaminan anonimitas ditegakkan di level database, bukan hanya disembunyikan
  -- di antarmuka. Kalau laporan ditandai anonim, identitas pelapor tidak boleh
  -- tersimpan sama sekali.
  CONSTRAINT wbs_reports_anonymous_no_identity CHECK (
    is_anonymous = false
    OR (
      reporter_name IS NULL
      AND reporter_email IS NULL
      AND reporter_phone IS NULL
    )
  ),
  CONSTRAINT wbs_reports_description_len
    CHECK (length(description) BETWEEN 20 AND 10000),
  CONSTRAINT wbs_reports_email_format
    CHECK (reporter_email IS NULL OR reporter_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX wbs_reports_ticket_code_unique ON wbs_reports (ticket_code);
CREATE INDEX wbs_reports_inbox_idx ON wbs_reports (status, severity, created_at DESC);

CREATE TRIGGER wbs_reports_set_updated_at
  BEFORE UPDATE ON wbs_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Survei kepuasan masyarakat
-- ---------------------------------------------------------------------------

CREATE TABLE survey_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code      varchar(24) NOT NULL,
  service_unit     varchar(160),
  respondent_name  varchar(160),
  respondent_email varchar(255),
  -- Bentuk jawaban berubah mengikuti pertanyaan survei, jadi disimpan sebagai
  -- JSONB. Nilainya sudah dinormalisasi ke skala 1-5 oleh lapisan validasi
  -- sebelum disimpan, sehingga agregasi tetap bisa dilakukan di SQL.
  answers          jsonb NOT NULL,
  overall_score    integer NOT NULL,
  comment          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT survey_responses_score_range
    CHECK (overall_score BETWEEN 1 AND 5),
  CONSTRAINT survey_responses_answers_object
    CHECK (jsonb_typeof(answers) = 'object'),
  CONSTRAINT survey_responses_email_format
    CHECK (respondent_email IS NULL OR respondent_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

CREATE UNIQUE INDEX survey_responses_ticket_code_unique
  ON survey_responses (ticket_code);
CREATE INDEX survey_responses_score_idx ON survey_responses (overall_score);
CREATE INDEX survey_responses_unit_idx ON survey_responses (service_unit);

CREATE TRIGGER survey_responses_set_updated_at
  BEFORE UPDATE ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bantu dashboard admin: rata-rata per unit layanan dalam satu query.
CREATE INDEX survey_responses_unit_score_idx
  ON survey_responses (service_unit, overall_score);