import { describe, expect, it } from "vitest";
import {
  render,
  renderSummary,
  safeUrl,
  stripTags,
  truncateWords,
} from "@/server/markdown";

/**
 * Yang diuji di sini adalah trustworthiness output, bukan kelengkapan sintaks
 * Markdown. Kalau renderer ini berhenti meng-escape teks, semua pengaman
 * bersamanya hilang dalam satu baris, jadi setiap jalur yang menulis tag punya
 * test sendiri di bawah.
 */

describe("render", () => {
  it("merender markdown dasar", () => {
    const out = render("## Judul\n\nTeks **tebal** dan [tautan](https://contoh.test).");

    expect(out).toContain("<h2>Judul</h2>");
    expect(out).toContain("<strong>tebal</strong>");
    expect(out).toContain('href="https://contoh.test"');
  });

  it("membuang tag script beserta isinya", () => {
    const out = render("Halo <script>alert(1)</script> dunia");

    // Tag beserta isinya hilang, sehingga tidak pernah menjadi HTML.
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toBe("<p>Halo  dunia</p>\n");
  });

  it("membuang atribut event dan iframe", () => {
    const out = render('<p onclick="jahat()">teks</p><iframe src="https://jahat.test"></iframe>');

    expect(out).not.toContain("onclick");
    expect(out).not.toContain("iframe");
    // Selalu berada di dalam satu paragraf, tidak ada tag yang mengapungkannya.
    expect(out).toBe("<p>teks</p>\n");
  });

  it("membuang isi script dan style, bukan hanya tagnya", () => {
    expect(render("a <style>body{display:none}</style> b")).toBe("<p>a  b</p>\n");
    expect(render("a <script>alert(1)</script> b")).toBe("<p>a  b</p>\n");
  });

  it("membiarkan tanda kurtil yang bukan tag tetap utuh", () => {
    expect(render("5 < 7 dan a < b")).toBe("<p>5 &lt; 7 dan a &lt; b</p>\n");
  });

  it("menolak skema javascript", () => {
    const out = render("[klik](javascript:alert(1))");

    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("href");
    // Teks tautannya tetap ada supaya kalimatnya tidak kehilangan isi.
    expect(out).toContain("klik");
  });

  it("menolak skema javascript yang disamarkan", () => {
    // Tanpa normalisasi karakter kontrol, `java\tscript:` lolos.
    expect(render("[klik](java\tscript:alert(1))")).not.toContain("href");
    expect(render("[klik](JaVaScRiPt:alert(1))")).not.toContain("href");
    expect(render("[klik]( javascript:alert(1) )")).not.toContain("href");
  });

  it("mempertahankan tabel untuk deskripsi layanan", () => {
    const out = render("| Layanan | Jam |\n|---|---|\n| IGD | 24 jam |");

    expect(out).toContain("<table>");
    expect(out).toContain("<td>IGD</td>");
  });

  it("menjaga heading dan paragraf", () => {
    const out = render("## Sub\n\nParagraf.");

    expect(out).toContain("<h2>Sub</h2>");
    expect(out).toContain("<p>Paragraf.</p>");
  });

  it("menurunkan heading tingkat satu ke h2", () => {
    // Halaman sudah punya satu h1 dari judul halaman.
    expect(render("# Judul")).toContain("<h2>Judul</h2>");
    expect(render("# Judul")).not.toContain("<h1");
  });

  it("menjaga teks di dalam kode sebaris tetap apa adanya", () => {
    const out = render("Gunakan `**tidak tebal**` di sini.");

    expect(out).toContain("<code>**tidak tebal**</code>");
    expect(out).not.toContain("<strong>tidak tebal</strong>");
  });

  it("menjaga isi blok kode", () => {
    const out = render("```bash\nbun run build\n```");

    expect(out).toContain("<pre><code>bun run build</code></pre>");
  });

  it("tidak memproses markdown di dalam blok kode", () => {
    const out = render("```\n**tebal**\n```");

    expect(out).toContain("**tebal**");
    expect(out).not.toContain("<strong>");
  });

  it("merender daftar berurutan dan tidak berurutan", () => {
    expect(render("- satu\n- dua")).toBe("<ul>\n<li>satu</li>\n<li>dua</li>\n</ul>\n");
    expect(render("1. satu\n2. dua")).toBe("<ol>\n<li>satu</li>\n<li>dua</li>\n</ol>\n");
  });

  it("merender daftar bertingkat", () => {
    const out = render("- satu\n  - satu a\n- dua");

    expect(out).toContain("<ul>");
    expect(out).toContain("<li>satu\n<ul>\n<li>satu a</li>\n</ul></li>");
  });

  it("merender blockquote", () => {
    expect(render("> Catatan")).toContain("<blockquote><p>Catatan</p>\n</blockquote>");
  });

  it("membuang gambar inline dan menyisakan teks alternatifnya", () => {
    const out = render("Lihat ![gedung utama](https://contoh.test/foto.jpg) ya.");

    expect(out).not.toContain("<img");
    expect(out).not.toContain("gedung utama.jpg");
    expect(out).toContain("gedung utama");
  });

  it("membuang gambar tanpa teks alternatif sepenuhnya", () => {
    const out = render("Lihat ![](https://contoh.test/foto.jpg) ya.");

    expect(out).not.toContain("foto.jpg");
  });
});

describe("renderSummary", () => {
  it("tidak memasukkan heading dan tabel", () => {
    const out = renderSummary("# Judul besar\n\nTeks ringkas.");

    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<table");
    expect(out).toContain("Teks ringkas.");
  });

  it("tetap menampilkan isi heading sebagai teks", () => {
    // Membuang blok beserta isinya akan membuat kalimat kehilangan bagiannya.
    expect(renderSummary("# Judul besar\n\nTeks.")).toContain("Judul besar");
  });
});

describe("stripTags", () => {
  it("mengembalikan teks polos", () => {
    expect(stripTags("**tebal** dan *miring*")).toBe("tebal dan miring");
  });

  it("menyatukan spasi yang banyak", () => {
    expect(stripTags("  spasi   banyak  ")).toBe("spasi banyak");
  });

  it("mengubah kembali teks yang ter-escape", () => {
    expect(stripTags("A & B < C")).toBe("A & B < C");
  });
});

describe("truncateWords", () => {
  it("tidak memotong di tengah kata", () => {
    const teks = "satu dua tiga empat lima enam tujuh";
    const pendek = truncateWords(teks, 20);

    expect([...pendek].length).toBeLessThanOrEqual(20);

    const kataAsal = teks.split(/\s+/);
    const diambil = pendek.split(/\s+/).length;
    expect(pendek).toBe(kataAsal.slice(0, diambil).join(" "));
    expect(diambil).toBeLessThan(kataAsal.length);
  });

  it("membuang tanda baca menggantung", () => {
    const pendek = truncateWords("Sakit kepala disertai pusing berat.", 30);

    expect(pendek).not.toMatch(/[.,;:!?]$/);
  });

  it("membiarkan teks pendek apa adanya", () => {
    expect(truncateWords("pendek", 100)).toBe("pendek");
  });
});

describe("safeUrl", () => {
  it("menerima skema yang memang wajar untuk tautan", () => {
    expect(safeUrl("https://contoh.test")).toBe("https://contoh.test");
    expect(safeUrl("http://contoh.test/a?b=1")).toBe("http://contoh.test/a?b=1");
    expect(safeUrl("mailto:halo@contoh.test")).toBe("mailto:halo@contoh.test");
    expect(safeUrl("tel:+621234")).toBe("tel:+621234");
  });

  it("menerima path relatif dan anchor", () => {
    expect(safeUrl("/berita/jadwal-igd")).toBe("/berita/jadwal-igd");
    expect(safeUrl("#bagian")).toBe("#bagian");
    expect(safeUrl("berita/jadwal")).toBe("berita/jadwal");
  });

  it("menolak skema berbahaya", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeUrl("file:///etc/passwd")).toBeNull();
  });

  it("menolak skema yang disembunyikan di balik karakter kontrol", () => {
    expect(safeUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeUrl("java\nscript:alert(1)")).toBeNull();
    expect(safeUrl("javascript:alert(1)")).toBeNull();
  });

  it("menolak URL kosong", () => {
    expect(safeUrl("   ")).toBeNull();
  });
});