use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Pembatas laju in-memory dengan jendela geser.
///
/// Cukup untuk satu instance, dan memang hanya itu situasinya: service ini
/// dijalankan satu kali di VPS. Kalau nanti di-scale horizontal, ganti store
/// ini ke Redis. Jangan tetap memakai memory lokal, karena setiap instance akan
/// punya hitungan sendiri dan batas efektif jadi N kali lebih longgar dari
/// yang dimaksud.
///
/// Yang dibutuhkan bukan pembatas jumlah permintaan *bersamaan*, melainkan
/// pembatas jumlah permintaan *dalam 60 detik terakhir*. Semaphore tidak bisa
/// merepresentasikan itu: kalau yang membatasi hanya permintaan bersamaan,
/// lalu form yang sama dikirim 500 kali berjeda 1 detik, semuanya lolos.
#[derive(Debug)]
pub struct RateLimiter {
    window: Duration,
    max_requests: u32,
    /// Key = "endpoint:alamat", value = waktu permintaan yang masih berada di
    /// dalam jendela.
    ///
    /// Disimpan sebagai vektor, bukan penghitung, karena jendela harus bisa
    /// bergeser: permintaan yang sudah lewat 60 detik harus dikeluarkan, bukan
    /// cuma dihitung. Dengan penghitung saja, batas bisa dilewati dengan
    /// menarik semua permintaan lalu menunggu jendela bergeser penuh.
    hits: Mutex<HashMap<String, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new(window: Duration, max_requests: u32) -> Self {
        Self {
            window,
            max_requests,
            hits: Mutex::new(HashMap::new()),
        }
    }

    /// Catat satu permintaan untuk `key`.
    ///
    /// Mengembalikan `Ok(())` kalau masih di bawah batas, atau
    /// `Err(retry_after_secs)` kalau sudah habis. Nilai kedua adalah berapa
    /// detik lagi jendela yang perlu ditunggu sampai permintaan berikutnya
    /// diterima, supaya frontend bisa menampilkan hitungan mundur.
    pub fn check(&self, key: &str) -> Result<(), u64> {
        let now = Instant::now();
        let cutoff = now.checked_sub(self.window);

        let mut hits = self.hits.lock().expect("kunci rate limiter poisoned");

        // Buang entri yang sudah keluar dari jendela, untuk semua kunci.
        //
        // Ini harus dilakukan di level map, bukan hanya untuk kunci yang sedang
        // dipanggil. Kalau hanya kunci aktif yang dibersihkan, setiap alamat IP
        // yang pernah mencoba akan meninggalkan jejaknya selamanya dan pemakaian
        // memori tumbuh sepanjang uptime.
        //
        // Biayanya O(jumlah kunci aktif), bukan O(jumlah kunci sepanjang waktu),
        // karena kunci yang sudah lewat jendela dibuang pada setiap panggilan.
        if let Some(limit) = cutoff {
            hits.retain(|_, times| times.iter().any(|at| *at > limit));
        }

        let entry = hits.entry(key.to_string()).or_default();

        if entry.len() as u32 >= self.max_requests {
            // Tunggu sampai permintaan TERLAMA keluar dari jendela, bukan sampai
            // jendela bergeser penuh. Ini memberi waktu tunggu sesingkat mungkin
            // tanpa pernah melampaui batas.
            let oldest = entry.first().copied().unwrap_or(now);
            let wait = oldest
                .elapsed()
                .checked_add(self.window)
                .map(|d| d.as_secs().max(1))
                .unwrap_or(self.window.as_secs().max(1));
            return Err(wait);
        }

        entry.push(now);
        Ok(())
    }

    /// Jumlah key yang sedang dilacak, untuk keperluan pengujian.
    #[cfg(test)]
    pub fn tracked_keys(&self) -> usize {
        self.hits.lock().expect("kunci rate limiter poisoned").len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limiter(window_ms: u64, max: u32) -> RateLimiter {
        RateLimiter::new(Duration::from_millis(window_ms), max)
    }

    #[test]
    fn allows_up_to_limit_then_blocks() {
        let rl = limiter(1000, 3);
        assert!(rl.check("a").is_ok());
        assert!(rl.check("a").is_ok());
        assert!(rl.check("a").is_ok());

        let err = rl.check("a").expect_err("permintaan keempat harus ditolak");
        assert!(err >= 1, "waktu tunggu minimal 1 detik, dapat {err}");
    }

    #[test]
    fn keys_are_independent() {
        let rl = limiter(1000, 1);
        assert!(rl.check("ip-a").is_ok());
        assert!(rl.check("ip-b").is_ok(), "key lain tidak boleh terpengaruh");
        assert!(rl.check("ip-a").is_err());
    }

    #[test]
    fn window_slides_so_old_requests_expire() {
        // Jendela 60 ms dan maksimum 1: permintaan kedua harus diterima setelah
        // jendela bergeser, bukan ditolak selamanya.
        let rl = limiter(60, 1);
        assert!(rl.check("a").is_ok());
        assert!(rl.check("a").is_err());
        std::thread::sleep(Duration::from_millis(90));
        assert!(rl.check("a").is_ok(), "permintaan lama harus dikeluarkan");
    }

    #[test]
    fn expired_keys_are_dropped() {
        // Jendela 20 ms: setelah jendela bergeser, kunci lama harus hilang dari
        // map. Kalau tidak, satu kunci menetap untuk setiap alamat IP yang
        // pernah mencoba dan pemakaian memori tumbuh terus.
        let rl = limiter(20, 5);
        for i in 0..200 {
            let _ = rl.check(&format!("ip-{i}"));
        }
        std::thread::sleep(Duration::from_millis(60));
        let _ = rl.check("ip-baru");

        assert!(
            rl.tracked_keys() <= 1,
            "kunci lama harus dibuang, tersisa {}",
            rl.tracked_keys()
        );
    }

    #[test]
    fn active_keys_are_kept() {
        let rl = limiter(60_000, 5);
        for i in 0..10 {
            let _ = rl.check(&format!("ip-{i}"));
        }
        assert_eq!(rl.tracked_keys(), 10);
    }
}
