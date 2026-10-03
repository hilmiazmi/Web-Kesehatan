use std::collections::HashSet;

use pulldown_cmark::{html, Options, Parser};

/// Tag yang boleh muncul di body artikel, deskripsi layanan, dan isi halaman.
///
/// Daftar ini sengaja tidak memuat `img`. Semua gambar di situs ini punya
/// caption dan alt yang dikelola terpisah lewat kolom `image_url`, dan
/// mengizinkan gambar inline dari Markdown membuat admin bisa menyisipkan
/// gambar yang tidak punya alt text.
const BODY_TAGS: &[&str] = &[
    "p",
    "br",
    "hr",
    "em",
    "strong",
    "del",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
    "div",
];

/// Tag untuk ringkasan satu paragraf: tidak ada heading, tabel, atau gambar
/// inline, karena isinya tampil di dalam kartu dengan tinggi terbatas.
const SUMMARY_TAGS: &[&str] = &["p", "br", "em", "strong", "del", "code", "span"];

/// Atribut yang boleh muncul di dalam `span` dan `div`.
const GENERIC_ATTRIBUTES: &[&str] = &["class"];

fn parser(source: &str, tables: bool) -> Parser<'_> {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    if tables {
        options.insert(Options::ENABLE_TABLES);
    }
    Parser::new_ext(source, options)
}

fn to_html(source: &str, tables: bool) -> String {
    let mut out = String::with_capacity(source.len() + source.len() / 4);
    html::push_html(&mut out, parser(source, tables));
    out
}

/// Ubah Markdown dari database menjadi HTML yang aman untuk ditampilkan.
///
/// Render dan sanitasi dilakukan di server, bukan di frontend, supaya
/// sanitasi tidak bisa dilewati. Kalau filter HTML ada di sisi klien, satu
/// halaman yang lupa memanggilnya berarti stored XSS, dan bug seperti itu baru
/// ketahuan setelahpayload tersimpan.
pub fn render(source: &str) -> String {
    let html = to_html(source, true);

    let mut builder = ammonia::Builder::new();
    builder
        .tags(HashSet::from_iter(BODY_TAGS.iter().copied()))
        .generic_attributes(HashSet::from_iter(GENERIC_ATTRIBUTES.iter().copied()))
        // Tautan dari konten yang disunting admin tetap boleh http, tapi
        // atribut `rel` tidak diberi nilai otomatis supaya tidak muncul
        // `rel="noopener"` yang tidak berarti di konteks ini.
        .link_rel(None)
        .url_relative(ammonia::UrlRelative::PassThrough);

    builder.clean(&html).to_string()
}

/// Sama seperti `render`, tapi untuk Markdown singkat seperti ringkasan paket
/// MCU atau kutipan testimoni.
pub fn render_summary(source: &str) -> String {
    let html = to_html(source, false);

    let mut builder = ammonia::Builder::new();
    builder
        .tags(HashSet::from_iter(SUMMARY_TAGS.iter().copied()))
        .generic_attributes(HashSet::from_iter(GENERIC_ATTRIBUTES.iter().copied()))
        .url_relative(ammonia::UrlRelative::PassThrough);

    builder.clean(&html).to_string()
}

/// Buang seluruh tag dan kembalikan teks polos.
///
/// Dipakai untuk meta description, yang masuk ke atribut HTML dan ke dalam
/// `content` Open Graph. Tag di meta description tidak merusak halaman, tapi
/// akan terlihat salah di hasil pencarian.
pub fn strip_tags(source: &str) -> String {
    let mut out = String::new();
    for event in parser(source, false) {
        if let pulldown_cmark::Event::Text(text) = event {
            out.push_str(&text);
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Potong teks polos pada batas kata.
///
/// Panjang dihitung per karakter. Pemotongan selalu terjadi di spasi terdekat,
/// dan tanda baca di akhir kalimat dibuang supaya tidak muncul "sakit." kalau
/// aslinya terpotong di tengah "sakit kepala".
pub fn truncate_words(source: &str, max: usize) -> String {
    let flat = strip_tags(source);
    if flat.chars().count() <= max {
        return flat;
    }

    let mut cut = String::new();
    let mut used = 0usize;
    for word in flat.split_whitespace() {
        let next = used + word.chars().count() + 1;
        if next > max {
            break;
        }
        if !cut.is_empty() {
            cut.push(' ');
        }
        cut.push_str(word);
        used = next;
    }

    cut.trim_end_matches(['.', ',', ';', ':', '!', '?'])
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_basic_markdown() {
        let out = render("## Judul\n\nTeks **tebal** dan [tautan](https://contoh.test).");
        assert!(out.contains("<h2>Judul</h2>"), "dapat {out}");
        assert!(out.contains("<strong>tebal</strong>"), "dapat {out}");
        assert!(out.contains("href=\"https://contoh.test\""), "dapat {out}");
    }

    #[test]
    fn strips_script_tags() {
        let out = render("Halo <script>alert(1)</script> dunia");
        assert!(!out.contains("<script"), "script lolos: {out}");
        assert!(!out.contains("alert(1)"), "isi script lolos: {out}");
    }

    #[test]
    fn strips_event_handlers_and_iframes() {
        let out =
            render("<p onclick=\"jahat()\">teks</p><iframe src=\"https://jahat.test\"></iframe>");
        assert!(!out.contains("onclick"), "atribut event lolos: {out}");
        assert!(!out.contains("iframe"), "iframe lolos: {out}");
    }

    #[test]
    fn strips_javascript_urls() {
        let out = render("[klik](javascript:alert(1))");
        assert!(
            !out.contains("javascript:"),
            "skema javascript lolos: {out}"
        );
    }

    #[test]
    fn keeps_tables_for_service_descriptions() {
        let out = render("| Layanan | Jam |\n|---|---|\n| IGD | 24 jam |");
        assert!(out.contains("<table>"), "tabel hilang: {out}");
        assert!(out.contains("<td>IGD</td>"), "sel tabel hilang: {out}");
    }

    #[test]
    fn summary_drops_block_elements() {
        let out = render_summary("# Judul besar\n\nTeks ringkas.");
        assert!(
            !out.contains("<h1"),
            "heading tidak boleh masuk ringkasan: {out}"
        );
        assert!(
            !out.contains("<table"),
            "tabel tidak boleh masuk ringkasan: {out}"
        );
        assert!(out.contains("Teks ringkas."), "dapat {out}");
    }

    #[test]
    fn body_keeps_block_elements() {
        let out = render("## Sub\n\nParagraf.");
        assert!(out.contains("<h2>Sub</h2>"), "dapat {out}");
        assert!(out.contains("<p>Paragraf.</p>"), "dapat {out}");
    }

    #[test]
    fn strip_tags_returns_plain_text() {
        assert_eq!(strip_tags("**tebal** dan *miring*"), "tebal dan miring");
        assert_eq!(strip_tags("  spasi   banyak  "), "spasi banyak");
    }

    #[test]
    fn truncate_never_splits_a_word() {
        let text = "satu dua tiga empat lima enam tujuh";
        let short = truncate_words(text, 20);

        assert!(short.chars().count() <= 20, "melebihi batas: {short}");

        // Hasil harus berupa potongan utuh dari kata-kata asal, diurutkan, tanpa
        // satu pun kata yang terpisah dari kata aslinya.
        let source_words: Vec<&str> = text.split_whitespace().collect();
        let taken = short.split_whitespace().count();
        let expected = source_words[..taken].join(" ");
        assert_eq!(short, expected, "ada kata yang terpisah dari aslinya");
        assert!(taken < source_words.len(), "tidak ada yang dipotong");
    }

    #[test]
    fn truncate_drops_trailing_punctuation() {
        // Pemotongan di tengah kalimat tidak boleh menyisakan tanda baca menggantung.
        let text = "Sakit kepala disertai pusing berat.";
        let short = truncate_words(text, 30);
        assert!(!short.ends_with('.'), "tanda baca menggantung: {short}");
    }

    #[test]
    fn truncate_keeps_short_text_untouched() {
        assert_eq!(truncate_words("pendek", 100), "pendek");
    }
}
