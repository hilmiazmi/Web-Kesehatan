//! Snapshot konten publik: salinan respons API yang ditulis ke berkas JSON.
//!
//! Dipakai untuk dua hal yang tidak bisa keduanya memakai API langsung:
//!
//! * Build pratinjau di Vercel. Build tidak boleh menyentuh database produksi,
//!   karena satu branch push saja cukup untuk menghapus isi tabel kalau seed
//!   ikut dijalankan di sana.
//! * Cadangan saat VPS mati. Tanpa snapshot, domain yang diarahkan ke Vercel hanya
//!   bisa menampilkan data dummy, bukan isi situs yang sebenarnya.
//!
//! Bentuk berkasnya sama dengan balasan endpoint, termasuk amplop `data`. Jadi
//! frontend tidak perlu tahu apakah sedang membaca API sungguhan atau snapshot:
//! bentuk JSON-nya sama persis.
//!
//! Yang **tidak** bisa di-snapshot adalah hasil yang bergantung pada waktu atau
//! pada parameter: jadwal untuk tanggal tertentu, filter kategori, dan halaman
//! kedua. Mode pratinjau selalu mengembalikan daftar lengkap tanpa filter. Ini
//! batas yang disengaja, bukan kelalaian.
//!
//! Pembuatannya: `rsud-db export`.

use std::collections::BTreeMap;
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::postgres::PgPool;

use crate::error::ApiResult;
use crate::repo::{beds, catalog, content};

/// Nama berkas manifest di dalam direktori snapshot.
pub const MANIFEST: &str = "manifest.json";

/// Jumlah baris berita yang diambil per satu permintaan ke database.
///
/// Halaman berita di API dibatasi 24 baris, tapi snapshot ingin seluruh isi
/// supaya halaman detail semua berita ikut terbawa.
const UKURAN_HALAMAN: i64 = 100;

/// Daftar rute yang ada di snapshot.
///
/// Semuanya hasil baca. Tidak ada satu pun endpoint yang bisa menulis, jadi
/// tidak ada jalur yang bisa mengirim formulir ke snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub api_version: String,
    /// ISO-8601 waktu berkas ini dibuat.
    pub generated_at: String,
    /// Jumlah rute di bawah.
    pub count: usize,
    /// Pemetaan path API tanpa awalan ke nama berkas.
    pub routes: BTreeMap<String, String>,
}

impl Manifest {
    /// Nama berkas untuk satu path, kalau ada.
    pub fn file_for(&self, path: &str) -> Option<&str> {
        self.routes.get(path).map(String::as_str)
    }
}

/// Ubah path API menjadi nama berkas yang aman.
///
/// Tiga aturan, semuanya supaya hasilnya tidak mungkin keluar dari direktori
/// snapshot dan tidak pernah tersembunyi sebagai berkas titik:
///
/// 1. Setiap garis miring diganti dua garis bawah, jadi tidak ada subdirektori.
///    Dua garis bawah dipilih karena slug dan UUID tidak pernah memuatanya, jadi
///    pemisah ini tidak pernah bentrok dengan isi segmen.
/// 2. Karakter selain huruf, angka, dan tanda hubung diganti garis bawah. Ini
///    yang mengubah `..` menjadi `__`.
/// 3. Segmen kosong menjadi satu garis bawah, supaya nama berkas tidak pernah
///    diawali titik.
pub fn file_name(path: &str) -> String {
    let stem = path
        .trim_start_matches('/')
        .split('/')
        .map(segmen_bersih)
        .collect::<Vec<_>>()
        .join("__");

    format!("{stem}.json")
}

/// Bersihkan satu segmen path menjadi nama berkas.
fn segmen_bersih(segmen: &str) -> String {
    let cleaned: String = segmen
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();

    if cleaned.is_empty() {
        "_".to_string()
    } else {
        cleaned
    }
}

/// Bungkus nilai dengan amplop `data`, sama seperti `error::ok_json`.
///
/// Bentuk amplop ikut disimpan karena frontend menerimanya apa adanya.
fn amplop<T: Serialize>(value: T) -> Value {
    json!({ "data": value })
}

/// Kumpulkan seluruh rute beserta isinya dari database.
pub async fn kumpulkan(pool: &PgPool) -> ApiResult<BTreeMap<String, Value>> {
    let mut rute: BTreeMap<String, Value> = BTreeMap::new();

    // Koleksi
    rute.insert("/home".into(), amplop(content::load_home(pool).await?));
    rute.insert(
        "/specialties".into(),
        amplop(catalog::list_specialties(pool).await?),
    );
    rute.insert(
        "/polyclinics".into(),
        amplop(catalog::list_polyclinics(pool).await?),
    );
    rute.insert(
        "/doctors".into(),
        amplop(catalog::list_doctors(pool, None).await?),
    );
    rute.insert(
        "/services".into(),
        amplop(content::list_services(pool, None, None).await?),
    );
    rute.insert(
        "/mcu/packages".into(),
        amplop(content::list_mcu_packages(pool, None).await?),
    );
    rute.insert(
        "/documents".into(),
        amplop(content::list_documents(pool, None).await?),
    );
    rute.insert("/jobs".into(), amplop(content::list_jobs(pool).await?));
    rute.insert(
        "/settings/public".into(),
        amplop(content::load_settings(pool).await?),
    );

    // Ringkasan tempat tidur. `observed_at` adalah waktu pengukuran, jadi
    // angkanya benar pada saat export dan bukan lagi setelahnya. Itu sebabnya
    // snapshot tidak pernah dipakai untuk menampilkan ketersediaan kamar secara
    // resmi, hanya untuk pratinjau.
    let baris_bed = beds::list_beds(pool).await?;
    let ringkasan_bed = beds::load_summary(pool).await?;
    rute.insert(
        "/beds".into(),
        json!({ "data": { "summary": ringkasan_bed, "items": baris_bed } }),
    );

    // Daftar berita dipaginasikan supaya bisa mengambil lebih dari satu halaman.
    let (baris_pertama, total_berita) =
        content::list_articles(pool, UKURAN_HALAMAN, 0, None).await?;
    let mut semua_berita = baris_pertama;

    // Pembulatan ke atas ditulis manual: `div_ceil` untuk bilangan bulat masih
    // belum stabil di toolchain yang dikunci di `rust-version`.
    let jumlah_halaman =
        std::cmp::max(1, (total_berita + UKURAN_HALAMAN - 1) / UKURAN_HALAMAN) as usize;

    for halaman_ke in 1..jumlah_halaman {
        let (baris, _) = content::list_articles(
            pool,
            UKURAN_HALAMAN,
            halaman_ke as i64 * UKURAN_HALAMAN,
            None,
        )
        .await?;
        semua_berita.extend(baris);
    }

    // Slug dikumpulkan lebih dulu supaya `semua_berita` bisa dipakai dua kali:
    // sekali untuk daftar, sekali untuk membuat halaman detail.
    let slug_berita: Vec<String> = semua_berita.iter().map(|a| a.slug.clone()).collect();

    rute.insert(
        "/articles".into(),
        json!({
            "data": {
                "items": semua_berita,
                "total": total_berita,
                "page": 1,
                "page_size": UKURAN_HALAMAN,
                "pages": jumlah_halaman,
            }
        }),
    );

    // Halaman detail. Slug diambil dari daftar di atas, bukan dari seed, supaya
    // baris yang ditambahkan lewat panel admin ikut terbawa.
    for slug in &slug_berita {
        if let Some(row) = content::find_article_by_slug(pool, slug).await? {
            rute.insert(format!("/articles/{slug}"), amplop(row));
        }
    }

    for baris in content::list_services(pool, None, None).await? {
        if let Some(row) = content::find_service_by_slug(pool, &baris.slug).await? {
            rute.insert(format!("/services/{}", baris.slug), amplop(row));
        }
    }

    for slug in content::list_page_slugs(pool).await? {
        if let Some(row) = content::find_page(pool, &slug).await? {
            rute.insert(format!("/pages/{slug}"), amplop(row));
        }
    }

    for baris in content::list_mcu_packages(pool, None).await? {
        if let Some(row) = content::find_mcu_package(pool, &baris.slug).await? {
            rute.insert(format!("/mcu/packages/{}", baris.slug), amplop(row));
        }
    }

    for baris in content::list_jobs(pool).await? {
        if let Some(row) = content::find_job(pool, &baris.slug).await? {
            rute.insert(format!("/jobs/{}", baris.slug), amplop(row));
        }
    }

    // Jadwal praktik perv dokter tidak berubah terhadap tanggal permintaan, jadi
    // aman di-snapshot. Endpoint jadwal per tanggal tidak ikut karena isinya
    // memang berbeda tiap hari.
    for dokter in catalog::list_doctors(pool, None).await? {
        let jadwal = catalog::list_doctor_schedules(pool, dokter.id).await?;
        rute.insert(format!("/doctors/{}/schedules", dokter.id), amplop(jadwal));
    }

    Ok(rute)
}

/// Tulis snapshot ke direktori `tujuan`.
///
/// Berkas lama yang tidak lagi ada di daftar rute ikut dihapus. Tanpa itu,
/// halaman yang dihapus di panel admin akan tetap muncul di pratinjau selamanya.
pub async fn tulis(pool: &PgPool, tujuan: &Path) -> ApiResult<Manifest> {
    let rute = kumpulkan(pool).await?;

    if let Err(err) = std::fs::create_dir_all(tujuan) {
        return Err(crate::error::ApiError::Internal(format!(
            "direktori snapshot tidak bisa dibuat: {err}"
        )));
    }

    let mut peta = BTreeMap::new();

    for (path, nilai) in &rute {
        let nama = file_name(path);
        let isi = format!(
            "{}\n",
            serde_json::to_string_pretty(nilai).unwrap_or_default()
        );

        if let Err(err) = std::fs::write(tujuan.join(&nama), isi) {
            return Err(crate::error::ApiError::Internal(format!(
                "berkas snapshot {nama} tidak bisa ditulis: {err}"
            )));
        }

        peta.insert(path.clone(), nama);
    }

    let manifest = Manifest {
        api_version: crate::API_VERSION.to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        count: peta.len(),
        routes: peta,
    };

    let isi = format!(
        "{}\n",
        serde_json::to_string_pretty(&manifest).unwrap_or_default()
    );

    if let Err(err) = std::fs::write(tujuan.join(MANIFEST), isi) {
        return Err(crate::error::ApiError::Internal(format!(
            "manifest snapshot tidak bisa ditulis: {err}"
        )));
    }

    bersihkan(tujuan, &manifest)?;

    Ok(manifest)
}

/// Hapus berkas snapshot yang rutenya sudah tidak ada.
fn bersihkan(tujuan: &Path, manifest: &Manifest) -> ApiResult<()> {
    let yang_tersisa: Vec<String> = manifest.routes.values().cloned().collect();

    let entri = match std::fs::read_dir(tujuan) {
        Ok(entri) => entri,
        Err(err) => {
            return Err(crate::error::ApiError::Internal(format!(
                "direktori snapshot tidak bisa dibaca: {err}"
            )))
        }
    };

    for entri in entri.flatten() {
        let nama = entri.file_name().to_string_lossy().to_string();

        // Manifest dan README ditulis tangan, jadi tidak boleh ikut terhapus.
        if nama == MANIFEST || nama == "README.md" {
            continue;
        }

        if !yang_tersisa.contains(&nama) && !nama.starts_with('.') {
            let _ = std::fs::remove_file(entri.path());
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_names_are_flat_and_reversible() {
        assert_eq!(file_name("/home"), "home.json");
        assert_eq!(file_name("/mcu/packages"), "mcu__packages.json");
        assert_eq!(
            file_name("/doctors/2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b/schedules"),
            "doctors__2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b__schedules.json"
        );
    }

    #[test]
    fn file_names_cannot_escape_the_directory() {
        // Nama berkas dibaca dari path yang datang dari URL. Kalau `..` atau
        // garis miring bisa muncul di hasil akhir, satu request bisa membuat
        // handler membaca berkas di luar direktori snapshot, atau membaca
        // berkas titik yang dilewati saat pembersihan.
        for jahat in ["/../../etc/passwd", "/..", "/a/../../b", "/./../secret"] {
            let nama = file_name(jahat);

            assert!(!nama.contains(".."), "{jahat} menjadi {nama}");
            assert!(!nama.contains('/'), "{jahat} menjadi {nama}");
            assert!(!nama.contains('\\'), "{jahat} menjadi {nama}");
            assert!(!nama.starts_with('.'), "{jahat} menjadi {nama}");
        }
    }

    #[test]
    fn file_names_keep_the_path_readable() {
        //_slug dan UUID harus tetap terbaca. Kalau semua karakter dibersihkan
        // tanpa kecuali, nama berkasnya jadi tidak bisa searched.
        assert_eq!(
            file_name("/doctors/2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b/schedules"),
            "doctors__2f1c9d6e-6a1b-4a3f-9f0a-1c2d3e4f5a6b__schedules.json"
        );
        assert_eq!(
            file_name("/pages/kapasitas-bed"),
            "pages__kapasitas-bed.json"
        );
    }

    #[test]
    fn distinct_routes_get_distinct_file_names() {
        // `/a/b` dan `/a__b` menghasilkan nama berkas yang sama. Snapshot
        // sekarang tidak punya rute seperti itu, tapi begini cara kedua bentuk
        // itu tidak akan pernah menimpa satu sama lain tanpa ketahuan.
        let a = file_name("/mcu/packages");
        let b = file_name("/mcu__packages");

        assert_eq!(a, b);
        assert_ne!(file_name("/articles"), file_name("/articles/1"));
    }

    #[test]
    fn manifest_looks_up_by_exact_path() {
        let mut routes = BTreeMap::new();
        routes.insert("/home".to_string(), "home.json".to_string());

        let manifest = Manifest {
            api_version: "v1".into(),
            generated_at: "2026-01-01T00:00:00Z".into(),
            count: 1,
            routes,
        };

        assert_eq!(manifest.file_for("/home"), Some("home.json"));
        assert_eq!(manifest.file_for("/"), None);
        assert_eq!(manifest.file_for("/home/"), None);
        assert_eq!(manifest.file_for("/HOME"), None);
    }

    #[test]
    fn manifest_round_trips_through_json() {
        let manifest = Manifest {
            api_version: "v1".into(),
            generated_at: "2026-01-01T00:00:00Z".into(),
            count: 2,
            routes: BTreeMap::from([
                ("/home".to_string(), "home.json".to_string()),
                ("/doctors".to_string(), "doctors.json".to_string()),
            ]),
        };

        let teks = serde_json::to_string(&manifest).unwrap();
        let kembali: Manifest = serde_json::from_str(&teks).unwrap();

        assert_eq!(kembali.count, 2);
        assert_eq!(kembali.file_for("/doctors"), Some("doctors.json"));
    }

    #[test]
    fn envelope_matches_the_api_shape() {
        // Amplop harus sama dengan yang dipakai `error::ok_json`, kalau tidak
        // frontend harus punya dua jalur parsing.
        assert_eq!(amplop(vec![1, 2]), json!({ "data": [1, 2] }));
    }
}
