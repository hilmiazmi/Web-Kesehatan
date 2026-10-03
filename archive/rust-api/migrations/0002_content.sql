-- 0002_content.sql
--
-- Tabel konten: layanan, paket MCU, berita, halaman statis, manajemen,
-- dokumen, dan seluruh konten section Home.

-- ---------------------------------------------------------------------------
-- Layanan (prioritas, fasilitas, diagnostik)
-- ---------------------------------------------------------------------------

-- Satu tabel untuk tiga jenis layanan supaya tidak ada duplikasi kolom.
-- URL tetap dibedakan oleh route, bukan oleh tabel:
--   priority  -> /pelayanan/prioritas/[slug]
--   facility  -> /pelayanan/fasilitas/[slug]
--   diagnostic -> /pelayanan/diagnostik/[slug]
CREATE TABLE services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        service_type NOT NULL,
  slug        varchar(180) NOT NULL,
  title       varchar(180) NOT NULL,
  tagline     varchar(255),
  summary     text,
  -- Isi Markdown. API mengembalikan HTML yang sudah disanitasi, bukan
  -- Markdown mentah, supaya frontend tidak perlu library parser kedua.
  body        text,
  image_url   text,
  -- Nama section Home yang memakai layanan ini, mis. "prioritas" atau
  -- "fasilitas". Ada supaya section Home bisa mengambil 6 dan 8 item dengan
  -- satu query tanpa perlu tahu asal-usul tiap route.
  section_key varchar(60),
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX services_slug_unique ON services (slug);
CREATE INDEX services_type_sort_idx ON services (type, is_active, sort_order);
CREATE INDEX services_section_idx ON services (section_key, is_active, sort_order);

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Paket MCU
-- ---------------------------------------------------------------------------

CREATE TABLE mcu_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        varchar(180) NOT NULL,
  name        varchar(180) NOT NULL,
  category    mcu_category NOT NULL DEFAULT 'reguler',
  summary     text,
  description text,
  -- Rupiah tanpa pemisah, mis. 1450000.00. numeric(12,2) supaya pembulatan
  -- uang tidak ikut aturan floating point. API mengembalikan integer agar
  -- frontend bisa langsung memformatnya dengan formatRupiah() yang sudah ada.
  price       numeric(12, 2) NOT NULL,
  image_url   text,
  preparation text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mcu_packages_price_nonneg CHECK (price >= 0)
);

CREATE UNIQUE INDEX mcu_packages_slug_unique ON mcu_packages (slug);
CREATE INDEX mcu_packages_category_sort_idx
  ON mcu_packages (category, is_active, sort_order);

CREATE TRIGGER mcu_packages_set_updated_at
  BEFORE UPDATE ON mcu_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE mcu_package_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES mcu_packages (id) ON DELETE CASCADE,
  group_name varchar(120) NOT NULL,
  item_name  varchar(200) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX mcu_package_items_package_idx
  ON mcu_package_items (package_id, sort_order);

-- ---------------------------------------------------------------------------
-- Berita dan artikel
-- ---------------------------------------------------------------------------

CREATE TABLE articles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         varchar(200) NOT NULL,
  title        varchar(220) NOT NULL,
  category     varchar(80),
  excerpt      text,
  body         text,
  cover_url    text,
  author       varchar(160),
  published_at timestamptz NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX articles_slug_unique ON articles (slug);
-- Wajib: articles(published_at DESC) per PRD bagian 7.3.
CREATE INDEX articles_published_at_idx ON articles (published_at DESC);
-- Indeks gabungan untuk daftar berita: satu indeks menutup sekaligus
-- kondisi filter is_published dan urutan kronologis.
CREATE INDEX articles_list_idx
  ON articles (is_published, published_at DESC);

CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Halaman statis
-- ---------------------------------------------------------------------------

-- slug disimpan tanpa garis miring depan supaya sama persis dengan segmen
-- catch-all di src/app/[...slug]/page.tsx.
CREATE TABLE pages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             varchar(200) NOT NULL,
  title            varchar(220) NOT NULL,
  meta_description varchar(320),
  meta_keywords    varchar(320),
  eyebrow          varchar(120),
  summary          text,
  body_markdown    text,
  hero_image_url   text,
  sort_order       integer NOT NULL DEFAULT 0,
  is_published     boolean NOT NULL DEFAULT true,
  updated_by       uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pages_slug_unique ON pages (slug);
CREATE INDEX pages_published_idx ON pages (is_published, sort_order);

CREATE TRIGGER pages_set_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Manajemen
-- ---------------------------------------------------------------------------

CREATE TABLE management_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(160) NOT NULL,
  position   varchar(180) NOT NULL,
  unit       varchar(120),
  photo_url  text,
  phone      varchar(30),
  email      varchar(255),
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX management_members_sort_idx
  ON management_members (is_active, sort_order);

CREATE TRIGGER management_members_set_updated_at
  BEFORE UPDATE ON management_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Dokumen
-- ---------------------------------------------------------------------------

CREATE TABLE documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         varchar(200) NOT NULL,
  title        varchar(220) NOT NULL,
  category     document_category NOT NULL DEFAULT 'lainnya',
  description  text,
  file_url     text NOT NULL,
  file_name    varchar(255),
  -- Ukuran dalam byte untuk ditampilkan sebagai "1,2 MB".
  file_size    integer,
  year         integer,
  sort_order   integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT documents_file_size_nonneg CHECK (file_size IS NULL OR file_size >= 0)
);

CREATE UNIQUE INDEX documents_slug_unique ON documents (slug);
CREATE INDEX documents_category_idx ON documents (category, is_published, sort_order);

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Konten section Home
-- ---------------------------------------------------------------------------

CREATE TABLE hero_slides (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      varchar(200) NOT NULL,
  subtitle   varchar(255),
  image_url  text,
  -- URL internal untuk tombol CTA slide, mis.
  -- /pelayanan/prioritas/jantung-terpadu
  link_url   varchar(300),
  alt_text   varchar(255),
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Mencegah tautan keluar dari situs, mis. ke domain lain, yang tidak
  -- diizinkan untuk tombol CTA resmi rumah sakit.
  CONSTRAINT hero_slides_link_internal
    CHECK (link_url IS NULL OR link_url ~ '^/[a-z0-9/_-]*$')
);

CREATE INDEX hero_slides_sort_idx ON hero_slides (is_active, sort_order);

CREATE TRIGGER hero_slides_set_updated_at
  BEFORE UPDATE ON hero_slides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE awards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      varchar(220) NOT NULL,
  issuer     varchar(180),
  year       integer,
  image_url  text,
  link_url   varchar(300),
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX awards_sort_idx ON awards (is_active, sort_order);

CREATE TRIGGER awards_set_updated_at
  BEFORE UPDATE ON awards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE gallery_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      varchar(200) NOT NULL,
  caption    text,
  image_url  text NOT NULL,
  category   varchar(80),
  taken_at   date,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gallery_items_sort_idx ON gallery_items (is_active, sort_order);
CREATE INDEX gallery_items_category_idx ON gallery_items (category, sort_order);

CREATE TRIGGER gallery_items_set_updated_at
  BEFORE UPDATE ON gallery_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE testimonials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar(160) NOT NULL,
  role_label   varchar(160),
  quote        text NOT NULL,
  photo_url    text,
  rating       integer,
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT testimonials_rating_range
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE INDEX testimonials_sort_idx ON testimonials (is_active, sort_order);

CREATE TRIGGER testimonials_set_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE insurance_partners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(160) NOT NULL,
  logo_url     text,
  website_url  varchar(300),
  sort_order   integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX insurance_partners_sort_idx ON insurance_partners (is_active, sort_order);

CREATE TRIGGER insurance_partners_set_updated_at
  BEFORE UPDATE ON insurance_partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE faqs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   varchar(300) NOT NULL,
  answer     text NOT NULL,
  category   varchar(80),
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX faqs_sort_idx ON faqs (is_active, sort_order);

CREATE TRIGGER faqs_set_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();