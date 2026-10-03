//! Query untuk konten: layanan, berita, paket MCU, halaman statis, dokumen,
//! lowongan, pengaturan situs, dan bundel section Home.

use chrono::NaiveDate;
use serde_json::Value;
use sqlx::postgres::PgPool;
use sqlx::FromRow;

use crate::error::ApiResult;
use crate::markdown;

pub const ARTICLE_EXCERPT_LIMIT: usize = 200;
pub const META_DESCRIPTION_LIMIT: usize = 160;

// ---------------------------------------------------------------------------
// Layanan
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct ServiceRow {
    pub id: uuid::Uuid,
    pub r#type: String,
    pub slug: String,
    pub title: String,
    pub tagline: Option<String>,
    pub summary: Option<String>,
    /// Markdown sudah dirender jadi HTML yang aman di server.
    pub body_html: String,
    pub image_url: Option<String>,
    #[serde(skip_serializing)]
    pub section_key: Option<String>,
    #[serde(skip_serializing)]
    pub sort_order: i32,
}

const SERVICE_COLUMNS: &str = r#"
    id,
    type::text AS type,
    slug,
    title,
    tagline,
    summary,
    coalesce(body, '') AS body,
    image_url,
    section_key,
    sort_order
"#;

/// Semua layanan aktif dengan jenis tertentu, urut sesuai urutan tampil.
pub async fn list_services(
    pool: &PgPool,
    service_type: Option<&str>,
    section_key: Option<&str>,
) -> ApiResult<Vec<ServiceRow>> {
    let sql = format!(
        r#"
        SELECT {SERVICE_COLUMNS}
          FROM services
         WHERE is_active
           AND ($1::text IS NULL OR type::text = $1)
           AND ($2::text IS NULL OR section_key = $2)
         ORDER BY sort_order, title
        "#
    );

    let rows = sqlx::query_as::<_, ServiceRaw>(&sql)
        .bind(service_type)
        .bind(section_key)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(into_service_row)
        .collect();

    Ok(rows)
}

/// Satu layanan berdasarkan slug.
pub async fn find_service_by_slug(pool: &PgPool, slug: &str) -> ApiResult<Option<ServiceRow>> {
    let sql = format!(
        r#"
        SELECT {SERVICE_COLUMNS}
          FROM services
         WHERE slug = $1
           AND is_active
        "#
    );

    let row = sqlx::query_as::<_, ServiceRaw>(&sql)
        .bind(slug)
        .fetch_optional(pool)
        .await?;

    Ok(row.map(into_service_row))
}

/// Bentuk sebelum `body_html` dirender. Dipisah supaya `FromRow` bisa dipakai
/// langsung pada hasil query dan render Markdown tetap terkumpul di satu tempat.
#[derive(Debug, sqlx::FromRow)]
struct ServiceRaw {
    id: uuid::Uuid,
    r#type: String,
    slug: String,
    title: String,
    tagline: Option<String>,
    summary: Option<String>,
    body: String,
    image_url: Option<String>,
    section_key: Option<String>,
    sort_order: i32,
}

fn into_service_row(raw: ServiceRaw) -> ServiceRow {
    ServiceRow {
        id: raw.id,
        r#type: raw.r#type,
        slug: raw.slug,
        title: raw.title,
        tagline: raw.tagline,
        summary: raw.summary,
        body_html: markdown::render(&raw.body),
        image_url: raw.image_url,
        section_key: raw.section_key,
        sort_order: raw.sort_order,
    }
}

// ---------------------------------------------------------------------------
// Berita
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct ArticleSummary {
    pub slug: String,
    pub title: String,
    pub category: Option<String>,
    pub excerpt: String,
    pub cover_url: Option<String>,
    pub author: Option<String>,
    /// ISO-8601. Dikirim apa adanya supaya format tanggal mengikuti
    /// `src/lib/format.ts` yang sudah dipakai di seluruh situs.
    pub published_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ArticleDetail {
    pub slug: String,
    pub title: String,
    pub category: Option<String>,
    pub excerpt: Option<String>,
    pub body_html: String,
    pub cover_url: Option<String>,
    pub author: Option<String>,
    pub published_at: String,
    pub meta_description: String,
    /// Tiga berita lain, untuk blok "baca juga" di halaman detail.
    pub related: Vec<ArticleSummary>,
}

/// Daftar berita terbaru dengan pagination.
///
/// `total` dihitung dengan `count(*) OVER ()` di query yang sama supaya halaman
/// daftar dan jumlah halamannya tidak pernah berbeda, bahkan kalau ada berita
/// baru yang muncul di antara dua request.
#[derive(Debug, Clone, FromRow, serde::Serialize)]
struct ArticlePage {
    slug: String,
    title: String,
    category: Option<String>,
    excerpt: Option<String>,
    cover_url: Option<String>,
    author: Option<String>,
    published_at: String,
    total: i64,
}

/// Halaman daftar berita beserta jumlah total.
pub async fn list_articles(
    pool: &PgPool,
    limit: i64,
    offset: i64,
    category: Option<&str>,
) -> ApiResult<(Vec<ArticleSummary>, i64)> {
    let rows = sqlx::query_as::<_, ArticlePage>(
        r#"
        SELECT slug,
               title,
               category,
               excerpt,
               cover_url,
               author,
               published_at::text AS published_at,
               count(*) OVER () AS total
          FROM articles
         WHERE is_published
           AND ($3::text IS NULL OR category = $3)
         ORDER BY published_at DESC, slug
         LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .bind(category)
    .fetch_all(pool)
    .await?;

    let total = rows.first().map(|r| r.total).unwrap_or(0);

    let items = rows
        .into_iter()
        .map(|r| ArticleSummary {
            excerpt: r.excerpt.unwrap_or_default(),
            slug: r.slug,
            title: r.title,
            category: r.category,
            cover_url: r.cover_url,
            author: r.author,
            published_at: r.published_at,
        })
        .collect();

    Ok((items, total))
}

/// Satu berita beserta berita terkait.
#[derive(Debug, FromRow)]
struct ArticleRaw {
    slug: String,
    title: String,
    category: Option<String>,
    excerpt: Option<String>,
    /// Isinya masih Markdown. Disanitasi dan dirender di bawah supaya kolom
    /// database tetap menyimpan sumber yang bisa disunting admin.
    body_markdown: String,
    cover_url: Option<String>,
    author: Option<String>,
    published_at: String,
}

pub async fn find_article_by_slug(pool: &PgPool, slug: &str) -> ApiResult<Option<ArticleDetail>> {
    let row = sqlx::query_as::<_, ArticleRaw>(
        r#"
        SELECT slug,
               title,
               category,
               excerpt,
               coalesce(body, '') AS body_markdown,
               cover_url,
               author,
               published_at::text AS published_at
          FROM articles
         WHERE slug = $1
           AND is_published
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    let Some(article) = row else {
        return Ok(None);
    };

    let meta_description = markdown::truncate_words(
        article.excerpt.as_deref().unwrap_or(&article.title),
        META_DESCRIPTION_LIMIT,
    );

    let related = if let Some(category) = article.category.as_deref() {
        sqlx::query_as::<_, ArticleSummary>(
            r#"
            SELECT slug,
                   title,
                   category,
                   coalesce(excerpt, '') AS excerpt,
                   cover_url,
                   author,
                   published_at::text AS published_at
              FROM articles
             WHERE is_published
               AND category = $1
               AND slug <> $2
             ORDER BY published_at DESC
             LIMIT 3
            "#,
        )
        .bind(category)
        .bind(&article.slug)
        .fetch_all(pool)
        .await?
    } else {
        Vec::new()
    };

    Ok(Some(ArticleDetail {
        body_html: markdown::render(&article.body_markdown),
        related,
        slug: article.slug,
        title: article.title,
        category: article.category,
        excerpt: article.excerpt,
        cover_url: article.cover_url,
        author: article.author,
        published_at: article.published_at,
        meta_description,
    }))
}

// ---------------------------------------------------------------------------
// Paket MCU
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct McuPackageRow {
    pub slug: String,
    pub name: String,
    pub category: String,
    pub summary: String,
    pub description_html: String,
    /// Rupiah sebagai bilangan bulat, supaya frontend bisa langsung memakai
    /// `formatRupiah()` yang sudah ada tanpa parse ulang.
    pub price: i64,
    pub image_url: Option<String>,
    #[serde(skip_serializing)]
    pub preparation: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct McuPackageItem {
    pub group_name: String,
    pub item_name: String,
}

#[derive(Debug, Clone, FromRow)]
struct McuPackageRaw {
    slug: String,
    name: String,
    category: String,
    /// Sudah di-`coalesce` di `MCU_COLUMNS`, jadi tidak mungkin null.
    summary: String,
    /// Sudah di-`coalesce` di `MCU_COLUMNS`, jadi tidak mungkin null.
    description: String,
    price: i64,
    image_url: Option<String>,
    preparation: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct McuPackageDetail {
    #[serde(flatten)]
    pub package: McuPackageRow,
    pub items: Vec<McuPackageItem>,
}

const MCU_COLUMNS: &str = r#"
    slug,
    name,
    category::text AS category,
    coalesce(summary, '') AS summary,
    coalesce(description, '') AS description,
    price::bigint AS price,
    image_url,
    preparation
"#;

/// Daftar paket aktif, dikelompokkan per kategori.
pub async fn list_mcu_packages(
    pool: &PgPool,
    category: Option<&str>,
) -> ApiResult<Vec<McuPackageRow>> {
    let sql = format!(
        r#"
        SELECT {MCU_COLUMNS}
          FROM mcu_packages
         WHERE is_active
           AND ($1::text IS NULL OR category::text = $1)
         ORDER BY sort_order, name
        "#
    );

    let rows = sqlx::query_as::<_, McuPackageRaw>(&sql)
        .bind(category)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(into_mcu_row)
        .collect();

    Ok(rows)
}

/// Satu paket beserta daftar pemeriksaannya, dikelompokkan per organ.
pub async fn find_mcu_package(pool: &PgPool, slug: &str) -> ApiResult<Option<McuPackageDetail>> {
    let sql = format!(
        r#"
        SELECT {MCU_COLUMNS}
          FROM mcu_packages
         WHERE slug = $1
           AND is_active
        "#
    );

    let Some(raw) = sqlx::query_as::<_, McuPackageRaw>(&sql)
        .bind(slug)
        .fetch_optional(pool)
        .await?
    else {
        return Ok(None);
    };

    let items = sqlx::query_as::<_, McuPackageItem>(
        r#"
        SELECT group_name, item_name
          FROM mcu_package_items
         WHERE package_id = (SELECT id FROM mcu_packages WHERE slug = $1)
         ORDER BY sort_order, group_name
        "#,
    )
    .bind(slug)
    .fetch_all(pool)
    .await?;

    Ok(Some(McuPackageDetail {
        package: into_mcu_row(raw),
        items,
    }))
}

/// ID paket MCU berdasarkan slug.
///
/// Dipisah dari `find_mcu_package` karena pendaftaran hanya butuh ID paket, dan
/// memuat seluruh daftar pemeriksaannya hanya menambah kerja tanpa perlu.
pub async fn package_id_by_slug(pool: &PgPool, slug: &str) -> ApiResult<Option<uuid::Uuid>> {
    let id = sqlx::query_scalar::<_, uuid::Uuid>(
        "SELECT id FROM mcu_packages WHERE slug = $1 AND is_active",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(id)
}

fn into_mcu_row(raw: McuPackageRaw) -> McuPackageRow {
    McuPackageRow {
        description_html: markdown::render(&raw.description),
        summary: markdown::truncate_words(&raw.summary, ARTICLE_EXCERPT_LIMIT),
        slug: raw.slug,
        name: raw.name,
        category: raw.category,
        price: raw.price,
        image_url: raw.image_url,
        preparation: raw.preparation,
    }
}

// ---------------------------------------------------------------------------
// Halaman statis
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct PageRow {
    pub slug: String,
    pub title: String,
    pub eyebrow: Option<String>,
    pub summary: Option<String>,
    pub body_html: String,
    pub hero_image_url: Option<String>,
    pub meta_description: String,
    pub meta_keywords: Option<String>,
}

/// Slug seluruh halaman yang sudah terbit.
///
/// Endpoint publik hanya bisa membuka satu halaman lewat slug, sedangkan
/// snapshot perlu menyimpan semuanya. Fungsi ini menjadi satu-satunya jalan
/// untuk mendapatkan daftar slug tanpa mengulang query yang sama di
/// pemanggil.
pub async fn list_page_slugs(pool: &PgPool) -> ApiResult<Vec<String>> {
    let rows = sqlx::query_scalar::<_, String>(
        r#"
        SELECT slug
          FROM pages
         WHERE is_published
         ORDER BY sort_order, slug
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Satu halaman statis berdasarkan slug.
pub async fn find_page(pool: &PgPool, slug: &str) -> ApiResult<Option<PageRow>> {
    let row = sqlx::query_as::<_, PageRaw>(
        r#"
        SELECT slug,
               title,
               eyebrow,
               summary,
               coalesce(body_markdown, '') AS body_markdown,
               hero_image_url,
               coalesce(meta_description, '') AS meta_description,
               meta_keywords
          FROM pages
         WHERE slug = $1
           AND is_published
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|raw| {
        // Fallback-nya dihitung lebih dulu supaya tidak ada referensi ke nilai
        // sementara yang sudah dibuang, dan supaya `raw.summary` masih bisa
        // dipindahkan ke bawah tanpa jadi terpakai dua kali.
        let fallback = if raw.meta_description.is_empty() {
            raw.summary.clone().unwrap_or_else(|| raw.title.clone())
        } else {
            raw.meta_description.clone()
        };

        PageRow {
            body_html: markdown::render(&raw.body_markdown),
            meta_description: markdown::truncate_words(&fallback, META_DESCRIPTION_LIMIT),
            slug: raw.slug,
            title: raw.title,
            eyebrow: raw.eyebrow,
            summary: raw.summary,
            hero_image_url: raw.hero_image_url,
            meta_keywords: raw.meta_keywords,
        }
    }))
}

#[derive(Debug, sqlx::FromRow)]
struct PageRaw {
    slug: String,
    title: String,
    eyebrow: Option<String>,
    summary: Option<String>,
    body_markdown: String,
    hero_image_url: Option<String>,
    meta_description: String,
    meta_keywords: Option<String>,
}

// ---------------------------------------------------------------------------
// Dokumen dan lowongan
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct DocumentRow {
    pub slug: String,
    pub title: String,
    pub category: String,
    pub description: Option<String>,
    pub file_url: String,
    pub file_size: Option<i32>,
    pub year: Option<i32>,
}

pub async fn list_documents(pool: &PgPool, category: Option<&str>) -> ApiResult<Vec<DocumentRow>> {
    let rows = sqlx::query_as::<_, DocumentRow>(
        r#"
        SELECT slug,
               title,
               category::text AS category,
               description,
               file_url,
               file_size,
               year
          FROM documents
         WHERE is_published
           AND ($1::text IS NULL OR category::text = $1)
         ORDER BY sort_order, title
        "#,
    )
    .bind(category)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct JobRow {
    pub slug: String,
    pub title: String,
    pub department: String,
    pub employment_type: Option<String>,
    pub quota: i32,
    pub deadline: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct JobDetail {
    #[serde(flatten)]
    pub job: JobRow,
    pub requirements: Option<String>,
    pub responsibilities: Option<String>,
}

#[derive(Debug, FromRow)]
struct JobRaw {
    slug: String,
    title: String,
    department: String,
    employment_type: Option<String>,
    quota: i32,
    deadline: Option<String>,
    requirements: Option<String>,
    responsibilities: Option<String>,
}

pub async fn list_jobs(pool: &PgPool) -> ApiResult<Vec<JobRow>> {
    let rows = sqlx::query_as::<_, JobRow>(
        r#"
        SELECT slug,
               title,
               department,
               employment_type,
               quota,
               deadline::text AS deadline
          FROM job_vacancies
         WHERE is_open
           AND (deadline IS NULL OR deadline >= CURRENT_DATE)
         ORDER BY deadline NULLS LAST, title
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn find_job(pool: &PgPool, slug: &str) -> ApiResult<Option<JobDetail>> {
    let row = sqlx::query_as::<_, JobRaw>(
        r#"
        SELECT slug,
               title,
               department,
               employment_type,
               quota,
               deadline::text AS deadline,
               requirements,
               responsibilities
          FROM job_vacancies
         WHERE slug = $1
           AND is_open
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|raw| JobDetail {
        job: JobRow {
            slug: raw.slug,
            title: raw.title,
            department: raw.department,
            employment_type: raw.employment_type,
            quota: raw.quota,
            deadline: raw.deadline,
        },
        requirements: raw.requirements,
        responsibilities: raw.responsibilities,
    }))
}

// ---------------------------------------------------------------------------
// Pengaturan situs
// ---------------------------------------------------------------------------

/// Bentuk pengaturan yang dikirim ke frontend.
///
/// Struct-nya bukan `HashMap<String, Value>` supaya kunci yang salah ketik
/// menjadi error compile, bukan layar kosong di footer.
#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct SettingBundle {
    pub hospital_name: String,
    pub tagline: String,
    pub hospital_type: String,
    pub address: String,
    pub phone: String,
    pub whatsapp: String,
    pub email: String,
    pub outpatient_hours: String,
    pub emergency_note: String,
    pub map_embed_url: Option<String>,
    pub social_links: Vec<SocialLink>,
    pub footer_note: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SocialLink {
    pub network: String,
    pub url: String,
    pub label: String,
}

/// Baca pengaturan situs, dengan nilai bawaan kalau key belum diisi.
///
/// Nilai bawaan ada supaya frontend yang sedang berjalan tanpa seed pun tetap
/// menampilkan nama rumah sakit, bukan kosong.
pub async fn load_settings(pool: &PgPool) -> ApiResult<SettingBundle> {
    let rows = sqlx::query_as::<_, SettingRow>("SELECT key, value FROM site_settings")
        .fetch_all(pool)
        .await?;

    let get = |key: &str| -> Option<Value> {
        rows.iter().find(|r| r.key == key).map(|r| r.value.clone())
    };

    let text = |key: &str, fallback: &str| -> String {
        get(key)
            .and_then(|v| v.as_str().map(str::to_string))
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| fallback.to_string())
    };

    let social_links = get("social_links")
        .and_then(|v| v.as_array().cloned())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let url = item.get("url")?.as_str()?.to_string();
                    let network = item
                        .get("network")
                        .and_then(|v| v.as_str())
                        .unwrap_or("web")
                        .to_string();
                    let label = item
                        .get("label")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&network)
                        .to_string();
                    Some(SocialLink {
                        network,
                        url,
                        label,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(SettingBundle {
        hospital_name: text("hospital_name", "RSUD Contoh Sehat"),
        tagline: text("tagline", "Rumah Sehat Untuk Semua"),
        hospital_type: text("hospital_type", "Rumah Sakit Umum Daerah Tipe B"),
        address: text("address", "Jalan Contoh Sehat Nomor 1, Jakarta Selatan"),
        phone: text("phone", "(021) 5000 0000"),
        whatsapp: text("whatsapp", "+6280000000000"),
        email: text("email", "info@contoh-sehat.test"),
        outpatient_hours: text("outpatient_hours", "Senin sampai Jumat, 07.30 sampai 14.00"),
        emergency_note: text("emergency_note", "Instalasi gawat darurat 24 jam"),
        map_embed_url: get("map_embed_url").and_then(|v| v.as_str().map(str::to_string)),
        social_links,
        footer_note: text(
            "footer_note",
            "Situs demo untuk keperluan portofolio. Nama, kontak, dan seluruh isi bersifat fiktif.",
        ),
    })
}

#[derive(Debug, sqlx::FromRow)]
struct SettingRow {
    key: String,
    value: Value,
}

// ---------------------------------------------------------------------------
// Bundel Home
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct HeroSlide {
    pub title: String,
    pub subtitle: Option<String>,
    pub image_url: Option<String>,
    pub link_url: Option<String>,
    pub alt_text: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct AwardRow {
    pub title: String,
    pub issuer: Option<String>,
    pub year: Option<i32>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct GalleryRow {
    pub title: String,
    pub caption: Option<String>,
    pub image_url: String,
    pub category: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct TestimonialRow {
    pub display_name: String,
    pub role_label: Option<String>,
    pub quote: String,
    pub photo_url: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct InsuranceRow {
    pub name: String,
    pub logo_url: Option<String>,
    pub website_url: Option<String>,
}

#[derive(Debug, Clone, FromRow, serde::Serialize)]
pub struct FaqRow {
    pub question: String,
    pub answer: String,
}

/// Seluruh isi section Home dalam satu respons.
///
/// Alasan mengambil seluruh section dalam satu respons: halaman beranda butuh 15 section, jadi 15 bolak-balik bila tiap section diambil lewat endpoint sendiri.
/// masing-masing diambil lewat endpoint sendiri, satu kunjungan halaman beranda
/// jadi 15 bolak-balik, dan itu langsung terasa di VPS 2 vCPU.
#[derive(Debug, Clone, serde::Serialize)]
pub struct HomeBundle {
    pub hero_slides: Vec<HeroSlide>,
    pub priority_services: Vec<ServiceRow>,
    pub facilities: Vec<ServiceRow>,
    pub mcu_packages: Vec<McuPackageRow>,
    pub articles: Vec<ArticleSummary>,
    pub awards: Vec<AwardRow>,
    pub gallery: Vec<GalleryRow>,
    pub testimonials: Vec<TestimonialRow>,
    pub insurance_partners: Vec<InsuranceRow>,
    pub faqs: Vec<FaqRow>,
    pub specialties: Vec<crate::repo::SpecialtyRow>,
    pub settings: SettingBundle,
}

/// Ambil semua section Home dalam satu kali bolak-balik ke database.
///
/// Tiga query dijalankan berurutan, bukan paralel. Alasannya: `sqlx` mengambil
/// koneksi dari pool, dan pada VPS kecil menjalankan tiga query sekaligus hanya
/// menambah tekanan ke tiga koneksi berbeda tanpa membuat halaman lebih cepat.
pub async fn load_home(pool: &PgPool) -> ApiResult<HomeBundle> {
    let hero_slides = sqlx::query_as::<_, HeroSlide>(
        r#"
        SELECT title, subtitle, image_url, link_url, alt_text
          FROM hero_slides
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let priority_services = list_services(pool, Some("priority"), Some("prioritas")).await?;
    let facilities = list_services(pool, Some("facility"), Some("fasilitas")).await?;

    let mcu_packages = list_mcu_packages(pool, Some("reguler")).await?;

    let (articles, _) = list_articles(pool, 8, 0, None).await?;

    let awards = sqlx::query_as::<_, AwardRow>(
        r#"
        SELECT title, issuer, year, image_url
          FROM awards
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let gallery = sqlx::query_as::<_, GalleryRow>(
        r#"
        SELECT title, caption, image_url, category
          FROM gallery_items
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let testimonials = sqlx::query_as::<_, TestimonialRow>(
        r#"
        SELECT display_name, role_label, quote, photo_url
          FROM testimonials
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let insurance_partners = sqlx::query_as::<_, InsuranceRow>(
        r#"
        SELECT name, logo_url, website_url
          FROM insurance_partners
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let faqs = sqlx::query_as::<_, FaqRow>(
        r#"
        SELECT question, answer
          FROM faqs
         WHERE is_active
         ORDER BY sort_order
        "#,
    )
    .fetch_all(pool)
    .await?;

    let specialties = crate::repo::catalog::list_specialties(pool).await?;
    let settings = load_settings(pool).await?;

    Ok(HomeBundle {
        hero_slides,
        priority_services,
        facilities,
        mcu_packages,
        articles,
        awards,
        gallery,
        testimonials,
        insurance_partners,
        faqs,
        specialties,
        settings,
    })
}

/// Tanggal hari ini dalam UTC, dipakai untuk batas tanggal kunjungan.
pub fn today() -> NaiveDate {
    chrono::Utc::now().date_naive()
}

// ---------------------------------------------------------------------------
// Menyimpan pengaturan
// ---------------------------------------------------------------------------

/// Nama key pengaturan yang boleh ditulis lewat panel admin.
///
/// Dipakai sebagai daftar putih, sama seperti `admin::registry` untuk tabel.
/// Tanpa daftar ini, `PUT /admin/settings` dengan `{"namaRS": "..."}` akan
/// membuat baris pengaturan baru yang tidak pernah dibaca siapa pun, dan
/// operator akan mengira nama situs sudah berubah padahal tidak.
pub const WRITABLE_SETTING_KEYS: &[&str] = &[
    "hospital_name",
    "tagline",
    "hospital_type",
    "address",
    "phone",
    "whatsapp",
    "email",
    "outpatient_hours",
    "emergency_note",
    "map_embed_url",
    "social_links",
    "footer_note",
];

/// Simpan pengaturan situs dan kembalikan bundel yang sudah diperbarui.
///
/// Semua key ditulis ulang dalam satu transaksi supaya tidak pernah ada keadaan
/// setengah terperbarui, misalnya nama sudah diganti tapi alamat masih yang lama.
pub async fn save_settings(
    pool: &PgPool,
    input: &serde_json::Map<String, Value>,
) -> ApiResult<SettingBundle> {
    let mut errors = crate::validation::Errors::new();

    let prepared = prepare_settings(input, &mut errors);
    crate::validation::finish(errors)?;

    if prepared.is_empty() {
        return Err(crate::error::ApiError::BadRequest(
            "Tidak ada pengaturan yang dikirim.".into(),
        ));
    }

    let mut tx = pool.begin().await?;

    for (key, value) in &prepared {
        sqlx::query(
            r#"
            INSERT INTO site_settings (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value
            "#,
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    load_settings(pool).await
}

/// Periksa dan bersihkan setiap pasangan key-value sebelum ditulis.
fn prepare_settings(
    input: &serde_json::Map<String, Value>,
    errors: &mut crate::validation::Errors,
) -> Vec<(String, Value)> {
    let mut out = Vec::new();

    for (key, raw) in input {
        if !WRITABLE_SETTING_KEYS.contains(&key.as_str()) {
            // Diabaikan, bukan ditolak. Panel admin mengirim seluruh formulir
            // dalam satu objek, jadi field yang tidak dikenal akan selalu ada
            // setiap kali ada pengaturan baru yang ditambahkan ke halaman.
            continue;
        }

        match key.as_str() {
            "email" => {
                if let Some(value) =
                    crate::validation::email(errors, key, raw.as_str().unwrap_or(""), false)
                {
                    out.push((key.clone(), Value::String(value)));
                }
            }
            "map_embed_url" => {
                if let Some(value) =
                    crate::validation::text_optional(errors, key, raw.as_str().unwrap_or(""), 500)
                {
                    if !value.starts_with("http://") && !value.starts_with("https://") {
                        errors.add(key, "URL peta harus diawali http:// atau https://");
                        continue;
                    }
                    out.push((key.clone(), Value::String(value)));
                }
            }
            "social_links" => {
                if let Some(value) = clean_social_links(errors, raw) {
                    out.push((key.clone(), value));
                }
            }
            _ => {
                let max = setting_max_len(key);
                if let Some(value) =
                    crate::validation::text_optional(errors, key, raw.as_str().unwrap_or(""), max)
                {
                    out.push((key.clone(), Value::String(value)));
                }
            }
        }
    }

    out
}

fn setting_max_len(key: &str) -> usize {
    match key {
        "hospital_name" | "tagline" | "hospital_type" => 160,
        "address" | "outpatient_hours" | "emergency_note" | "footer_note" => 500,
        _ => 60,
    }
}

/// Terima `social_links` hanya sebagai larik objek dengan `url`, `network`, dan
/// `label`. Bentuk lain ditolak supaya tidak ada tautan tanpa label yang
/// tampil sebagai kotak kosong di footer.
fn clean_social_links(errors: &mut crate::validation::Errors, raw: &Value) -> Option<Value> {
    let items = raw.as_array()?;

    if items.len() > 10 {
        errors.add("social_links", "Maksimal 10 tautan sosial media.");
        return None;
    }

    let mut cleaned = Vec::new();

    for item in items {
        let url = item
            .get("url")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string();

        if !url.starts_with("http://") && !url.starts_with("https://") {
            errors.add(
                "social_links",
                "Tautan sosial media harus diawali http:// atau https://",
            );
            return None;
        }

        let network = item
            .get("network")
            .and_then(Value::as_str)
            .unwrap_or("web")
            .trim()
            .chars()
            .take(40)
            .collect::<String>();

        let label = item
            .get("label")
            .and_then(Value::as_str)
            .unwrap_or(&network)
            .trim()
            .chars()
            .take(80)
            .collect::<String>();

        cleaned.push(serde_json::json!({
            "url": url,
            "network": if network.is_empty() { "web".to_string() } else { network },
            "label": if label.is_empty() { "Situs".to_string() } else { label },
        }));
    }

    Some(Value::Array(cleaned))
}

#[cfg(test)]
mod prepare_settings_tests {
    use super::*;
    use crate::validation::Errors;
    use serde_json::json;

    fn object(pairs: &[(&str, Value)]) -> serde_json::Map<String, Value> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect()
    }

    #[test]
    fn unknown_keys_are_ignored_not_rejected() {
        let mut errors = Errors::new();
        let input = object(&[("namaRS", json!("Salah"))]);
        let prepared = prepare_settings(&input, &mut errors);

        assert!(prepared.is_empty());
        assert!(errors.is_empty());
    }

    #[test]
    fn text_settings_are_trimmed() {
        let mut errors = Errors::new();
        let input = object(&[("hospital_name", json!("  RSUD Contoh  "))]);
        let prepared = prepare_settings(&input, &mut errors);

        assert_eq!(prepared.len(), 1);
        assert_eq!(prepared[0].1, json!("RSUD Contoh"));
        assert!(errors.is_empty());
    }

    #[test]
    fn oversized_text_is_rejected() {
        let mut errors = Errors::new();
        let input = object(&[("hospital_name", json!("x".repeat(200)))]);
        let prepared = prepare_settings(&input, &mut errors);

        assert!(prepared.is_empty());
        assert!(!errors.is_empty());
    }

    #[test]
    fn map_embed_url_must_be_http() {
        let mut errors = Errors::new();
        let input = object(&[("map_embed_url", json!("javascript:alert(1)"))]);
        let prepared = prepare_settings(&input, &mut errors);

        assert!(prepared.is_empty());
        assert!(!errors.is_empty());
    }

    #[test]
    fn social_links_keep_only_known_fields() {
        let mut errors = Errors::new();
        let input = object(&[(
            "social_links",
            json!([{ "url": "https://contoh.test", "network": "instagram", "label": "Instagram", "phishing": true }]),
        )]);
        let prepared = prepare_settings(&input, &mut errors);

        assert_eq!(prepared.len(), 1);
        let first = &prepared[0].1;
        assert_eq!(first[0]["url"], json!("https://contoh.test"));
        assert!(first[0].get("phishing").is_none());
        assert!(errors.is_empty());
    }

    #[test]
    fn social_links_reject_dangerous_scheme() {
        let mut errors = Errors::new();
        let input = object(&[("social_links", json!([{ "url": "javascript:alert(1)" }]))]);
        let prepared = prepare_settings(&input, &mut errors);

        assert!(prepared.is_empty());
        assert!(!errors.is_empty());
    }

    #[test]
    fn every_writable_key_has_a_maximum_length() {
        // Tanpa batas panjang, panel admin bisa menulis satu megabyte ke kolom
        // yang muncul di footer setiap halaman.
        for key in WRITABLE_SETTING_KEYS {
            if matches!(*key, "social_links" | "map_embed_url") {
                continue;
            }
            assert!(setting_max_len(key) > 0, "{key} tidak punya batas panjang");
            assert!(setting_max_len(key) <= 500, "{key} batasnya terlalu besar");
        }
    }
}

#[cfg(test)]
mod settings_bundle_tests {
    use super::*;
    #[allow(unused_imports)]
    use serde_json::json;

    #[test]
    fn bundle_keys_are_a_subset_of_writable_keys() {
        // Kalau ada field di `SettingBundle` yang tidak ada di daftar putih,
        // nilainya akan selalu memakai nilai bawaan dan tidak pernah bisa diubah.
        for key in [
            "hospital_name",
            "tagline",
            "hospital_type",
            "address",
            "phone",
            "whatsapp",
            "email",
            "outpatient_hours",
            "emergency_note",
            "map_embed_url",
            "social_links",
            "footer_note",
        ] {
            assert!(
                WRITABLE_SETTING_KEYS.contains(&key),
                "{key} tidak bisa ditulis"
            );
        }
    }
}
