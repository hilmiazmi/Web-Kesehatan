pub mod admin;
pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod markdown;
pub mod ratelimit;
pub mod repo;
pub mod routes;
pub mod seed;
pub mod snapshot;
pub mod state;
pub mod ticket;
pub mod validation;

/// Versi API. Naikkan setiap ada perubahan yang tidak kompatibel.
pub const API_VERSION: &str = "v1";

/// Awalan rute API.
///
/// Dipasang di Nginx atau Traefik, bukan di router axum, supaya aplikasi tidak
/// perlu tahu soal awalan saat dipakai dari lokal tanpa proxy sama sekali.
pub const ROUTE_PREFIX: &str = "/api/v1";
