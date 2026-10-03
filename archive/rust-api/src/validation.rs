//! Validasi input formulir di sisi server.
//!
//! Validasi klien (Zod di Next.js) hanya untuk memberi umpan balik cepat. Aturan
//! yang benar-benar tetapi ada di sini, karena klien bisa dilewati dengan satu
//! `curl`.
//!
//! Bentuknya sengaja bukan macro atau derive: daftar aturan untuk satu form
//! jadi beberapa baris biasa yang mudah dibaca, dan tiap validator mengembalikan
//! nilai yang sudah bersih supaya pemanggil tidak perlu mengulang `trim()`.

use crate::error::ApiError;
use chrono::{NaiveDate, Utc};
use std::collections::BTreeMap;

/// Kumpulan pesan error per field.
#[derive(Debug, Default)]
pub struct Errors(BTreeMap<String, String>);

impl Errors {
    pub fn new() -> Self {
        Self(BTreeMap::new())
    }

    pub fn add(&mut self, field: &str, message: impl Into<String>) {
        // Field pertama yang gagal tetap tercatat. Kalau ada dua aturan untuk
        // field yang sama, pesan pertama biasanya yang paling spesifik
        // ("wajib diisi") dan yang berikutnya hanya mungkin terjadi kalau
        // isiannya ada.
        self.0
            .entry(field.to_string())
            .or_insert_with(|| message.into());
    }

    /// Gabungkan error dari validator lain supaya bisa dipanggil berantai.
    pub fn merge(&mut self, other: Errors) {
        for (field, message) in other.0 {
            self.add(&field, message);
        }
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn into_api_error(self) -> ApiError {
        ApiError::Validation { errors: self.0 }
    }
}

/// Hasil akhir satu form.
pub fn finish(errors: Errors) -> Result<(), ApiError> {
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.into_api_error())
    }
}

/// Bersihkan dan periksa teks wajib isi.
pub fn text_required(
    errors: &mut Errors,
    field: &str,
    value: &str,
    min: usize,
    max: usize,
) -> Option<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        errors.add(field, "Wajib diisi.");
        return None;
    }

    // Panjang dihitung per karakter, bukan per byte, supaya nama dengan huruf
    // non-Latin tidak ikut terpotong diam-diam.
    let len = trimmed.chars().count();
    if len < min {
        errors.add(field, format!("Minimal {min} karakter."));
        return None;
    }
    if len > max {
        errors.add(field, format!("Maksimal {max} karakter."));
        return None;
    }

    Some(trimmed.to_string())
}

/// Bersihkan dan periksa teks opsional. String kosong jadi `None`.
pub fn text_optional(errors: &mut Errors, field: &str, value: &str, max: usize) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.chars().count() > max {
        errors.add(field, format!("Maksimal {max} karakter."));
        return None;
    }
    Some(trimmed.to_string())
}

/// Periksa alamat surel. Kosong diterima kalau `required` false.
pub fn email(errors: &mut Errors, field: &str, value: &str, required: bool) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        if required {
            errors.add(field, "Alamat surel wajib diisi.");
        }
        return None;
    }
    if trimmed.len() > 255 || !is_email(trimmed) {
        errors.add(field, "Format alamat surel tidak valid.");
        return None;
    }
    Some(trimmed.to_ascii_lowercase())
}

/// Nomor telepon Indonesia: `08...` atau `+628...`, spasi dan tanda hubung
///_allowed karena orang mengetik seperti yang tercetak di KTP.
pub fn phone_id(errors: &mut Errors, field: &str, value: &str, required: bool) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        if required {
            errors.add(field, "Nomor telepon wajib diisi.");
        }
        return None;
    }

    let digits: String = trimmed
        .chars()
        .filter(|c| !matches!(c, ' ' | '-' | '+' | '(' | ')'))
        .collect();

    if !digits.chars().all(|c| c.is_ascii_digit()) || digits.len() < 9 || digits.len() > 15 {
        errors.add(field, "Nomor telepon tidak valid.");
        return None;
    }

    Some(trimmed.to_string())
}

/// NIK 16 digit. Nilai yang lolos tetap diperiksa lagi di database lewat CHECK,
/// karena sini tidak bisa melihat apakah isinya dummy atau bukan.
pub fn digits_exact(errors: &mut Errors, field: &str, value: &str, len: usize) -> Option<String> {
    let trimmed: String = value.chars().filter(|c| !matches!(c, ' ' | '-')).collect();
    if trimmed.len() != len || !trimmed.chars().all(|c| c.is_ascii_digit()) {
        errors.add(field, format!("Harus {len} digit angka."));
        return None;
    }
    Some(trimmed)
}

/// Periksa tanggal `YYYY-MM-DD`.
pub fn date_iso(
    errors: &mut Errors,
    field: &str,
    value: &str,
    required: bool,
) -> Option<NaiveDate> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        if required {
            errors.add(field, "Tanggal wajib diisi.");
        }
        return None;
    }

    match NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        Ok(date) => Some(date),
        Err(_) => {
            errors.add(field, "Tanggal tidak valid.");
            None
        }
    }
}

/// Pastikan tanggal berada di antara `min_days` dan `max_days` dari hari ini.
///
/// Perbandingan dilakukan di server memakai tanggal UTC supaya hasilnya tidak
/// tergantung zona waktu server yang berubah.
pub fn date_within_days(
    errors: &mut Errors,
    field: &str,
    date: NaiveDate,
    min_days: i64,
    max_days: i64,
) -> Option<NaiveDate> {
    let today = Utc::now().date_naive();
    let earliest = today + chrono::Duration::days(min_days);
    let latest = today + chrono::Duration::days(max_days);

    if date < earliest {
        errors.add(field, "Tanggal terlalu cepat.");
        return None;
    }
    if date > latest {
        errors.add(field, "Tanggal terlalu jauh ke depan.");
        return None;
    }
    Some(date)
}

/// Pastikan nilai ada di dalam daftar yang diizinkan.
pub fn choice(errors: &mut Errors, field: &str, value: &str, allowed: &[&str]) -> Option<String> {
    let trimmed = value.trim();
    if allowed.contains(&trimmed) {
        Some(trimmed.to_string())
    } else {
        errors.add(field, "Pilihan tidak dikenali.");
        None
    }
}

/// Periksa bilangan bulat dengan rentang.
pub fn integer_range(
    errors: &mut Errors,
    field: &str,
    value: i64,
    min: i64,
    max: i64,
) -> Option<i64> {
    if value < min || value > max {
        errors.add(field, format!("Nilai harus antara {min} dan {max}."));
        return None;
    }
    Some(value)
}

/// Buang semua spasi ganda dan spasi di awal/bawah.
///
/// Diterapkan pada kolom pencarian admin supaya spasi berlebih tidak
/// membuat pencarian yang sama memberi hasil berbeda.
pub fn squash(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Ubah kata kunci pencarian menjadi pola `ILIKE`.
///
/// Dua hal dikerjakan di sini, dan keduanya soal apa yang dilakukan server
/// terhadap teks yang dikirim pengguna.
///
/// **Dibungkus wildcard.** `ILIKE` tanpa `%` berarti pencocokan seluruh nilai,
/// jadi mengetik "gigi" di kotak pencarian tidak akan menemukan baris yang
/// isinya "Penyakit Gigi dan Mulut". Pola yang benar selalu punya `%` di kedua
/// ujungnya.
///
/// **Wildcard di dalam teks di-escape.** Tanpa ini, `100%` terbaca sebagai
/// "mulai dengan 100", dan satu `%` saja cocok dengan seluruh tabel. Backslash
/// dipakai sebagai penandanya, jadi setiap query yang memakai hasil fungsi ini
/// wajib menyertakan `ESCAPE '\\'`. Tanpa klausa itu, backslash ikut dibaca
/// sebagai karakter biasa dan setiap pola yang di-escape tidak akan cocok dengan
/// apa pun.
///
/// Fungsi ini hanya mengubah bentuk teksnya, bukan kelayakannya: kata kunci
/// kosong menghasilkan string kosong, dan pemanggil wajib memilih untuk tidak
/// menambahkan klausa pencarian sama sekali. `kolom ILIKE ''` tidak pernah
/// bernilai benar, jadi menempelkan klausanya membuat daftar selalu kosong.
pub fn search_pattern(needle: &str) -> String {
    let teks = squash(needle);
    if teks.is_empty() {
        return String::new();
    }

    let mut keluar = String::with_capacity(teks.len() + 2);
    keluar.push('%');
    for ch in teks.chars() {
        if matches!(ch, '\\' | '%' | '_') {
            keluar.push('\\');
        }
        keluar.push(ch);
    }
    keluar.push('%');
    keluar
}

/// Validasi honeypot.
///
/// Kolom perangkap diisi robot dan tidak pernah diisi manusia. Jadi kalau ada
/// isinya, Permintaan dianggap bot. Return `true` kalau terisi.
pub fn is_honeypot_trap(value: &str) -> bool {
    !value.trim().is_empty()
}

fn is_email(value: &str) -> bool {
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    if local.is_empty() || local.len() > 64 || domain.is_empty() {
        return false;
    }
    if value.contains(char::is_whitespace) {
        return false;
    }
    // butuh titik di domain, dan tidak boleh diawali atau diakhiri titik
    domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_text_rejects_blank_and_short() {
        let mut e = Errors::new();
        assert_eq!(text_required(&mut e, "nama", "   ", 3, 100), None);
        assert!(e.0.contains_key("nama"));

        let mut e = Errors::new();
        assert_eq!(text_required(&mut e, "nama", "ab", 3, 100), None);

        let mut e = Errors::new();
        assert_eq!(
            text_required(&mut e, "nama", "  Budi  ", 3, 100),
            Some("Budi".into())
        );
        assert!(e.is_empty());
    }

    #[test]
    fn required_text_enforces_maximum() {
        let mut e = Errors::new();
        let long = "a".repeat(101);
        assert_eq!(text_required(&mut e, "nama", &long, 3, 100), None);
        assert!(e.0["nama"].contains("Maksimal"));
    }

    #[test]
    fn optional_text_maps_blank_to_none() {
        let mut e = Errors::new();
        assert_eq!(text_optional(&mut e, "catatan", "   ", 100), None);
        assert_eq!(
            text_optional(&mut e, "catatan", " halo ", 100),
            Some("halo".into())
        );
        assert!(e.is_empty());
    }

    #[test]
    fn email_is_normalized_and_checked() {
        let mut e = Errors::new();
        assert_eq!(
            email(&mut e, "email", " petugas@Contoh.Test ", false),
            Some("petugas@contoh.test".into())
        );

        for bad in [
            "bukan-email",
            "@contoh.test",
            "a@",
            "a @b.test",
            "a@b",
            "a b@c.test",
        ] {
            let mut e = Errors::new();
            assert_eq!(
                email(&mut e, "email", bad, true),
                None,
                "{bad} seharusnya ditolak"
            );
            assert!(
                e.0.contains_key("email"),
                "{bad} tidak menghasilkan pesan error"
            );
        }
    }

    #[test]
    fn optional_email_allows_blank() {
        let mut e = Errors::new();
        assert_eq!(email(&mut e, "email", "", false), None);
        assert!(e.is_empty());
    }

    #[test]
    fn phone_accepts_common_formats() {
        for good in [
            "081234567890",
            "0812 3456 7890",
            "0812-3456-7890",
            "+6281234567890",
        ] {
            let mut e = Errors::new();
            assert!(
                phone_id(&mut e, "telp", good, true).is_some(),
                "{good} ditolak"
            );
            assert!(e.is_empty(), "{good} menghasilkan error: {:?}", e.0);
        }
    }

    #[test]
    fn phone_rejects_letters_and_wrong_length() {
        for bad in ["abc", "0812", "08123456789012345", "+62abc"] {
            let mut e = Errors::new();
            assert_eq!(
                phone_id(&mut e, "telp", bad, true),
                None,
                "{bad} seharusnya ditolak"
            );
        }
    }

    #[test]
    fn digits_exact_strips_separators() {
        let mut e = Errors::new();
        assert_eq!(
            digits_exact(&mut e, "nik", "0000 0000 0000 0000", 16),
            Some("0000000000000000".into())
        );

        let mut e = Errors::new();
        assert_eq!(digits_exact(&mut e, "nik", "12345", 16), None);
    }

    #[test]
    fn date_iso_requires_iso_format() {
        let mut e = Errors::new();
        assert!(date_iso(&mut e, "tanggal", "2026-10-02", true).is_some());

        // Format yang lazim di form Indonesia harus ditolak supaya tidak ada
        // dua bentuk tanggal yang bisa masuk ke kolom yang sama.
        let mut e = Errors::new();
        assert_eq!(date_iso(&mut e, "tanggal", "02/10/2026", true), None);
        assert_eq!(date_iso(&mut e, "tanggal", "2026-13-01", true), None);
        assert_eq!(date_iso(&mut e, "tanggal", "nanti", true), None);
    }

    #[test]
    fn date_within_days_rejects_far_dates() {
        let mut e = Errors::new();
        let too_far = Utc::now().date_naive() + chrono::Duration::days(400);
        assert_eq!(date_within_days(&mut e, "tanggal", too_far, 0, 90), None);

        let mut e = Errors::new();
        let yesterday = Utc::now().date_naive() - chrono::Duration::days(1);
        assert_eq!(date_within_days(&mut e, "tanggal", yesterday, 0, 90), None);

        let mut e = Errors::new();
        let tomorrow = Utc::now().date_naive() + chrono::Duration::days(1);
        assert!(date_within_days(&mut e, "tanggal", tomorrow, 0, 90).is_some());
        assert!(e.is_empty());
    }

    #[test]
    fn choice_only_accepts_allowlist() {
        let mut e = Errors::new();
        assert_eq!(
            choice(&mut e, "metode", "bpjs", &["general", "bpjs", "insurance"]),
            Some("bpjs".into())
        );

        let mut e = Errors::new();
        assert_eq!(
            choice(&mut e, "metode", "kartu", &["general", "bpjs"]),
            None
        );
    }

    #[test]
    fn honeypot_detects_any_content() {
        assert!(!is_honeypot_trap(""));
        assert!(!is_honeypot_trap("   "));
        assert!(is_honeypot_trap("https://spam.test"));
    }

    #[test]
    fn squash_collapses_whitespace() {
        assert_eq!(squash("  a   b\tc  "), "a b c");
    }

    #[test]
    fn search_pattern_wraps_in_wildcards() {
        assert_eq!(search_pattern("gigi"), "%gigi%");
        assert_eq!(search_pattern("  Poli  gigI "), "%Poli gigI%");
    }

    #[test]
    fn search_pattern_is_empty_for_blank_needle() {
        // Yang memaksa pemanggil tidak menambahkan klausa pencarian sama
        // sekali. `kolom ILIKE ''` tidak pernah bernilai benar.
        assert_eq!(search_pattern(""), "");
        assert_eq!(search_pattern("   "), "");
    }

    #[test]
    fn search_pattern_escapes_wildcards() {
        // Tanpa escape, satu `%` saja akan mencocokkan seluruh isi tabel.
        assert_eq!(search_pattern("%"), "%\\%%");
        assert_eq!(search_pattern("_"), "%\\_%");
        assert_eq!(search_pattern("100%"), "%100\\%%");
        assert_eq!(search_pattern("a_b"), "%a\\_b%");
        // Backslash sendiri harus di-escape dua kali, kalau tidak penandanya
        // hilang dan wildcard berikutnya kembali punya arti.
        assert_eq!(search_pattern("a\\%b"), "%a\\\\\\%b%");
    }

    #[test]
    fn search_pattern_leaves_sql_characters_untouched() {
        // Karakter yang berarti bagi SQL tidak di-escape, dan tidak seharusnya:
        // polanya dikirim sebagai parameter, bukan disisipkan ke teks SQL, jadi
        // `standard_conforming_strings` tidak bisa mengubah maknanya. Satu-
        // satunya hal yang menentukan adalah `ESCAPE` di klausa `ILIKE`.
        assert_eq!(search_pattern("a b\\c"), "%a b\\\\c%");
        assert_eq!(search_pattern("quote'"), "%quote'%");
        assert_eq!(search_pattern("\"; drop table --"), "%\"; drop table --%");
    }
}
