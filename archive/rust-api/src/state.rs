use crate::config::Config;
use crate::ratelimit::RateLimiter;
use sqlx::postgres::PgPool;
use std::sync::Arc;

/// Semua yang dibutuhkan handler, dikumpulkan di satu tempat.
///
/// Dicerminkan lewat `Arc` dan dikirim ke setiap handler lewat extractor
/// `State`. Dengan begitu menambah dependency baru ke handler tidak mengubah
/// tanda tangannya, dan tidak ada handler yang bisa diam-diam membuka koneksi
/// sendiri ke database.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub limiter: Arc<RateLimiter>,
}

impl AppState {
    pub fn new(db: PgPool, config: Arc<Config>) -> Self {
        let limiter = RateLimiter::new(config.rate_limit_window, config.rate_limit_max);
        Self {
            db,
            config,
            limiter: Arc::new(limiter),
        }
    }
}
