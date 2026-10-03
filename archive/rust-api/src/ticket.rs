use rand::Rng;

/// Awalan kode tiket per jenis formulir.
///
/// Awalan dipakai supaya kode bisa dibaca orang yang menerima tiket lewat SMS
/// atau WhatsApp: "EP" untuk E-Pasien langsung memberi tahu itu pendaftaran,
/// bukan pengaduan. Panjang selalu sama (3 karakter + 8 karakter acak) supaya
/// kolom `varchar(24)` tidak perlu berubah kalau nanti ada jenis formulir baru.
pub const PREFIX_APPOINTMENT: &str = "EP";
pub const PREFIX_MCU: &str = "MCU";
pub const PREFIX_FEEDBACK: &str = "KS";
pub const PREFIX_WBS: &str = "WBS";
pub const PREFIX_SURVEY: &str = "SKM";

/// Alfabet untuk bagian acak kode tiket.
///
/// Huruf I, O, 0, dan 1 sengaja tidak dipakai. Kode tiket sering dictate lewat
/// telepon, dan huruf yang mirip angka membuat salah dengar menjadi bug yang
/// sulit dilacak.
const ALPHABET: &[u8; 32] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const RANDOM_LEN: usize = 8;

/// Hasilkan satu kode tiket, misalnya `EP-7K2M9QX`.
///
/// Fungsi ini hanya menghasilkan karakter acak; keunikan dijamin unique index
/// di database. Kalau tabrakan, pemanggil memanggil fungsi ini lagi di dalam
/// loop, bukan menerima kode yang sama dua kali.
pub fn generate(prefix: &str) -> String {
    let mut rng = rand::rng();
    let suffix: String = (0..RANDOM_LEN)
        .map(|_| ALPHABET[rng.random_range(0..ALPHABET.len())] as char)
        .collect();

    format!("{prefix}-{suffix}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn respects_prefix_and_length() {
        let code = generate(PREFIX_APPOINTMENT);
        assert_eq!(code.len(), 11, "harus 'EP-' + 8 karakter");
        assert!(code.starts_with("EP-"));
    }

    #[test]
    fn avoids_ambiguous_characters() {
        // Semua kode yang dihasilkan dalam jumlah besar tidak boleh memuat
        // karakter yang mudah tertukar saat dictate lewat telepon.
        for _ in 0..500 {
            let code = generate(PREFIX_WBS);
            for ch in code.chars() {
                assert!(
                    !matches!(ch, 'I' | 'O' | '0' | '1' | 'i' | 'o' | 'l'),
                    "karakter ambigu {ch} muncul di {code}"
                );
            }
        }
    }

    #[test]
    fn codes_are_not_identical() {
        let a = generate(PREFIX_MCU);
        let b = generate(PREFIX_MCU);
        assert_ne!(a, b);
    }
}
