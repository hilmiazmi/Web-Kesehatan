/**
 * Markdown dari database menjadi HTML yang aman untuk ditampilkan.
 *
 * Pendekatan di sini berbeda dari implementasi Rust yang diarsipkan, dan
 * perbedaannya disengaja: sanitize dilakukan dengan **tidak pernah membentuk
 * HTML dari sumber**, bukan dengan menyaring HTML yang sudah jadi.
 *
 * Setiap karakter `<`, `>`, `&`, dan `"` di dalam teks di-escape ketika
 * menulis, dan satu-satunya tag yang keluar adalah tag yang ditulis sendiri
 * oleh renderer ini. HTML mentah dari sumber diperlakukan sebagai teks biasa,
 * jadi `<script>` muncul sebagai tulisan yang terlihat, bukan sebagai tag.
 *
 * Yang perlu diperiksa kalau renderer ini diubah: setiap jalur baru yang
 * menulis tag harus memakai `esc` untuk teksnya. Itu satu-satunya syarat
 * sanitasi di seluruh file ini, dan `tests/markdown.test.ts` mengujinya.
 */

/**
 * Tag yang boleh muncul di body artikel, deskripsi layanan, dan isi halaman.
 *
 * Daftar ini tidak memuat `img`. Semua gambar di situs ini punya caption dan
 * alt yang dikelola terpisah lewat kolom `image_url`, dan mengizinkan gambar
 * inline dari Markdown membuat admin bisa menyisipkan gambar tanpa alt text.
 */
const BODY_TAGS = new Set([
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
]);

/** Escape teks supaya aman masuk ke badan dokumen maupun ke dalam atribut. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Periksa URL tautan.
 *
 * Yang ditolak hanya skemanya, dan penolakan terjadi pada bentuk yang sudah
 * dinormalisasi: huruf kecil semua, tanpa karakter kontrol. Tanpa itu,
 * `java\tscript:alert(1)` akan lolos pemeriksaan `startsWith` biasa dan tetap
 * dieksekusi browser.
 *
 * Mengembalikan bentuk yang sudah dinormalisasi, bukan aslinya. Menempelkan
 * URL mentah ke atribut `href` membuka jalan yang sama: browser membuang
 * karakter kontrol dari URL, jadi `java\nscript:` menjadi `javascript:`.
 */
export function safeUrl(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\u0000-\u0020\u007f]/g, "");
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  if (lower.startsWith("#") || lower.startsWith("/")) return cleaned;

  const skema = /^([a-z][a-z0-9+.-]*):/.exec(lower);
  if (!skema) return cleaned; // path relatif tanpa skema

  return ["http", "https", "mailto", "tel"].includes(skema[1]) ? cleaned : null;
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

/**
 * Render sepotong teks dalam satu paragraf.
 *
 * Penanda yang didukung: `**tebal**`, `*miring*`, `~~coret~~`, `` `kode` ``,
 * `[tautan](alamat "judul")`, dan `\\` untuk karakter escap.
 */
function inline(source: string): string {
  let out = "";
  let i = 0;

  while (i < source.length) {
    const rest = source.slice(i);
    const ch = source[i];

    // Escape: karakter berikutnya diambil apa adanya.
    if (ch === "\\" && i + 1 < source.length) {
      out += esc(source[i + 1]);
      i += 2;
      continue;
    }

    // Kode sebaris. Isinya tidak diproses lagi, supaya `**` di dalam kode
    // tidak berubah menjadi tebal.
    if (ch === "`") {
      const tutup = rest.indexOf("`", 1);
      if (tutup > 0) {
        out += `<code>${esc(rest.slice(1, tutup))}</code>`;
        i += tutup + 1;
        continue;
      }
    }

    // Gambar. Tidak ada tag img di daftar yang diizinkan, jadi yang tersisa
    // hanyalah teks alt-nya, dan kalau tidak ada teks alt maka dihapus.
    // `parseLink` mencari tanda `[` pada indeks yang diberi, jadi untuk gambar
    // indeksnya 1 karena `!` sudah dilewati.
    if (rest.startsWith("![")) {
      const gambar = parseLink(rest, 1);
      if (gambar) {
        out += esc(gambar.label);
        i += gambar.end;
        continue;
      }
    }

    if (ch === "[") {
      const tautan = parseLink(rest, 0);
      if (tautan) {
        const url = safeUrl(tautan.target);
        if (url) {
          out += `<a href="${esc(url)}">${inline(tautan.label)}</a>`;
        } else {
          // Skema berbahaya: teks tautan tetap ditampilkan supaya isi
          // kalimatnya tidak hilang, tapi tautannya tidak dibuat.
          out += inline(tautan.label);
        }
        i += tautan.end;
        continue;
      }
    }

    const coret = /^~~([\s\S]+?)~~/.exec(rest);
    if (coret) {
      out += `<del>${inline(coret[1])}</del>`;
      i += coret[0].length;
      continue;
    }

    const tebal = /^(\*\*|__)([\s\S]+?)\1/.exec(rest);
    if (tebal) {
      out += `<strong>${inline(tebal[2])}</strong>`;
      i += tebal[0].length;
      continue;
    }

    const miring = /^([*_])([\s\S]+?)\1/.exec(rest);
    if (miring) {
      out += `<em>${inline(miring[2])}</em>`;
      i += miring[0].length;
      continue;
    }

    // Tag HTML mentah. Dilewati, bukan di-escape: isinya ditampilkan sebagai
    // teks dari pemanggil yang menulis HTML, dan menampilkannya apa adanya
    // akan terlihat rusak di halaman. Isi `<script>` dan `<style>` ikut hilang
    // karena di situ isinya bukan teks yang pernah dilihat pembaca.
    if (ch === "<") {
      const tag = RE_TAG_MERAH.exec(rest);
      if (tag) {
        i += tag[0].length;
        continue;
      }
    }

    // Dua spasi di akhir baris berarti pemengalan keras.
    if (ch === "\n") {
      if (source[i - 1] === " " && source[i - 2] === " ") {
        out = `${out.replace(/ {2,}$/, "")}<br />\n`;
      } else {
        out += "\n";
      }
      i += 1;
      continue;
    }

    out += esc(ch);
    i += 1;
  }

  return out;
}

/**
 * Baca `[label](target "judul")` atau `![label](target)` dari posisi tertentu.
 *
 * Mengembalikan `null` kalau bentuknya tidak lengkap, supaya teks `[` biasa
 * tidak ikut hilang.
 */
function parseLink(
  source: string,
  start: number,
): { label: string; target: string; end: number } | null {
  if (source[start] !== "[") return null;

  let depth = 0;
  let labelEnd = -1;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    else if (source[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        labelEnd = i;
        break;
      }
    }
  }
  if (labelEnd < 0 || source[labelEnd + 1] !== "(") return null;

  const parenEnd = findClosingParen(source, labelEnd + 1);
  if (parenEnd < 0) return null;

  const dalam = source.slice(labelEnd + 2, parenEnd).trim();
  // Judul dalam tanda kutip dibuang: tidak ada tempat memakainya di daftar
  // tag yang diizinkan, jadi lebih baik dibuang daripada disimpan sia-sia.
  const target = dalam.replace(/\s+"[^"]*"$/, "").trim();

  return { label: source.slice(start + 1, labelEnd), target, end: parenEnd + 1 };
}

/** Cari penutup `)` yang sesuai, memperhitungkan kurung di dalam label. */
function findClosingParen(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "(") depth += 1;
    else if (source[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Block
// ---------------------------------------------------------------------------

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_HR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_FENCE = /^(`{3,}|~{3,})\s*([\w-]*)\s*$/;
const RE_UL = /^(\s*)([-*+])\s+(.*)$/;
const RE_OL = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;

/**
 * Tag HTML yang ditulis langsung di Markdown.
 *
 * `<div>` selalu ditolak, jadi `5 < 7` dan `a < b` tetap aman: pola ini
 * mensyaratkan huruf setelah `<`.
 *
 * Urutan alternatif penting. Varian `<script>...</script>` harus lebih dulu:
 * kalau tidak, hanya tag pembuka yang kena dan isi skripnya terbaca sebagai
 * teks biasa.
 */
const RE_TAG_MERAH = /^<(script|style)\b[\s\S]*?<\/\1\s*>|<\/?[a-zA-Z][^>]*>|<!--[\s\S]*?-->/i;

/** Ubah Markdown dari database menjadi HTML yang aman untuk ditampilkan. */
export function render(source: string): string {
  return renderBlocks(source, BODY_TAGS, true);
}

function renderBlocks(source: string, tags: Set<string>, tables: boolean): string {
  const baris = source.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  while (i < baris.length) {
    const barisSekarang = baris[i];

    if (barisSekarang.trim() === "") {
      i += 1;
      continue;
    }

    // Blok kode berpagar.
    const fence = RE_FENCE.exec(barisSekarang);
    if (fence) {
      const penanda = fence[1];
      const isi: string[] = [];
      i += 1;
      while (i < baris.length && !baris[i].startsWith(penutup(penanda))) {
        isi.push(baris[i]);
        i += 1;
      }
      if (i < baris.length) i += 1; // lewati penutup
      const kode = `<pre><code>${esc(isi.join("\n"))}</code></pre>`;
      out.push(tags.has("pre") ? kode : `<p>${esc(isi.join("\n"))}</p>`);
      continue;
    }

    // Heading.
    const heading = RE_HEADING.exec(barisSekarang);
    if (heading) {
      // Hanya heading tingkat satu yang diturunkan ke `h2`: halaman sudah punya
      // satu `h1` dari judul halaman, dan dua `h1` di satu halaman buruk untuk
      // pembaca layar. Level dua sampai enam diteruskan apa adanya supaya
      // struktur sub-judul di dalam isi tetap utuh.
      const level = heading[1].length === 1 ? 2 : heading[1].length;
      const tag = `h${level}`;
      const isi = inline(heading[2].trim());
      out.push(tags.has(tag) ? `<${tag}>${isi}</${tag}>` : isi);
      i += 1;
      continue;
    }

    if (RE_HR.test(barisSekarang)) {
      out.push(tags.has("hr") ? "<hr />" : "");
      i += 1;
      continue;
    }

    // Blockquote. Isinya diproses lagi sebagai blok supaya daftar dan paragraf
    // di dalam kutipan tetap punya struktur.
    if (RE_QUOTE.test(barisSekarang)) {
      const isi: string[] = [];
      while (i < baris.length && baris[i].trim() !== "") {
        const m = RE_QUOTE.exec(baris[i]);
        isi.push(m ? m[1] : baris[i].trim());
        i += 1;
      }
      const dalam = renderBlocks(isi.join("\n"), tags, tables);
      out.push(tags.has("blockquote") ? `<blockquote>${dalam}</blockquote>` : dalam);
      continue;
    }

    // Tabel, hanya kalau diizinkan.
    if (tables && isTableRow(barisSekarang) && isDelimiterRow(baris[i + 1] ?? "")) {
      const { html, next } = renderTable(baris, i);
      out.push(html);
      i = next;
      continue;
    }

    // Daftar.
    if (RE_UL.test(barisSekarang) || RE_OL.test(barisSekarang)) {
      const { html, next } = renderList(baris, i, tags);
      out.push(html);
      i = next;
      continue;
    }

    // Paragraf: kumpulkan sampai baris kosong atau awal blok lain.
    const paragrap: string[] = [];
    while (i < baris.length) {
      const now = baris[i];
      if (
        now.trim() === "" ||
        RE_HEADING.test(now) ||
        RE_HR.test(now) ||
        RE_FENCE.test(now) ||
        RE_QUOTE.test(now) ||
        RE_UL.test(now) ||
        RE_OL.test(now) ||
        (tables && isTableRow(now))
      ) {
        break;
      }
      paragrap.push(now);
      i += 1;
    }

    const isi = inline(paragrap.join("\n").trim());
    out.push(tags.has("p") ? `<p>${isi}</p>` : isi);
  }

  // Blok terakhir juga diikuti baris baru. Tanpa itu, HTML hasil render
  // berbeda satu byte dari bentuk yang dipakai berkas snapshot, dan
  // perbandingan keduanya selalu menganggap berbeda padahal isinya sama.
  if (out.length === 0) return "";
  return `${out.join("\n")}\n`;
}

/** Penanda penutup blok kode: dua backtick atau dua tilde sudah cukup. */
function penutup(penanda: string): string {
  return penanda[0].repeat(3);
}

function splitRow(baris: string): string[] {
  const sel = baris.trim().replace(/^\|/, "").replace(/\|$/, "");
  return sel.split(/(?<!\\)\|/).map((sel) => sel.replace(/\\\|/g, "|").trim());
}

function isTableRow(baris: string): boolean {
  return baris.includes("|") && baris.trim() !== "";
}

function isDelimiterRow(baris: string): boolean {
  return /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(baris) && baris.includes("-");
}

function renderTable(baris: string[], mulai: number): { html: string; next: number } {
  const kepala = splitRow(baris[mulai]);
  const perataan = splitRow(baris[mulai + 1]).map((sel) => {
    if (/^:-+:$/.test(sel)) return "center";
    if (/-+:$/.test(sel)) return "right";
    if (/^:-+$/.test(sel)) return "left";
    return "";
  });

  const isi: string[][] = [];
  let i = mulai + 2;
  while (i < baris.length && isTableRow(baris[i])) {
    isi.push(splitRow(baris[i]));
    i += 1;
  }

  const kolom = Math.max(kepala.length, ...isi.map((row) => row.length), 1);
  const gaya = (index: number): string =>
    perataan[index] ? ` style="text-align: ${perataan[index]}"` : "";

  const head = kepala.map((sel, idx) => `<th${gaya(idx)}>${inline(sel)}</th>`).join("");

  const body = isi
    .map((row) => {
      const sel = Array.from({ length: kolom }, (_, idx) => {
        const isiSel = row[idx] ?? "";
        return `<td${gaya(idx)}>${inline(isiSel)}</td>`;
      });
      return `<tr>${sel.join("")}</tr>`;
    })
    .join("");

  return {
    html: `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    next: i,
  };
}

/**
 * Daftar bertingkat.
 *
 * Item anak dikenali dari indentasi yang lebih menjorok daripada item
 * pertama. Mekanismenya sengaja sederhana dan cukup untuk isi dokumentasi
 * sakit; daftar bertingkat lebih dalam dari tiga tingkat tidak dihitung.
 */
function renderList(baris: string[], mulai: number, tags: Set<string>): { html: string; next: number } {
  const berurutan = RE_OL.test(baris[mulai]);
  const tag = berurutan ? "ol" : "ul";

  // Isi per item pada level ini. Item anak disisipkan sebagai HTML daftar
  // yang sudah jadi, jadi tidak perlu di-escape setelah digabungkan.
  const butir: string[] = [];
  let i = mulai;
  let dasar: number | null = null;

  while (i < baris.length) {
    const sekarang = baris[i];
    if (sekarang.trim() === "") {
      // Baris kosong di tengah daftar hanya berakhir kalau baris berikutnya
      // bukan kelanjutan daftar.
      const berikutnya = baris[i + 1] ?? "";
      if (!RE_UL.test(berikutnya) && !RE_OL.test(berikutnya)) break;
      i += 1;
      continue;
    }

    const m = RE_UL.exec(sekarang) ?? RE_OL.exec(sekarang);
    if (!m) break;

    const indentasi = m[1].length;
    if (dasar === null) dasar = indentasi;

    if (indentasi > dasar && butir.length > 0) {
      const anak = renderList(baris, i, tags);
      // Baris baru sebelum daftar anak supaya keduanya terpisah saat HTML
      // mentah dilihat, dan tinggi kartu tidak terpengaruh karena whitespace
      // di antara blok tidak dirender.
      butir[butir.length - 1] += `\n${anak.html}`;
      i = anak.next;
      continue;
    }

    if (indentasi < dasar) break;

    butir.push(inline(m[3]));
    i += 1;
  }

  // Baris baru di antara butir, bukan hanya antar tag. Bentuk ini yang
  // dipakai berkas snapshot yang sudah di-commit, jadi keduanya tetap bisa
  // dibandingkan langsung saat memverifikasi port ke database.
  const gabung = butir.map((isi) => `<li>${isi}</li>`).join("\n");
  return { html: tags.has(tag) ? `<${tag}>\n${gabung}\n</${tag}>` : gabung, next: i };
}

/**
 * Buang seluruh tag dan kembalikan teks polos.
 *
 * Dipakai untuk meta description, yang masuk ke atribut HTML dan ke dalam
 * `content` Open Graph. Tag di meta description tidak merusak halaman, tapi
 * akan terlihat salah di hasil pencarian.
 */
export function stripTags(source: string): string {
  const html = renderBlocks(source, new Set(), false);
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Potong teks polos pada batas kata.
 *
 * Panjang dihitung per karakter. Pemotongan selalu terjadi di spasi terdekat,
 * dan tanda baca di akhir kalimat dibuang supaya tidak muncul "sakit." kalau
 * aslinya terpotong di tengah "sakit kepala".
 */
export function truncateWords(source: string, max: number): string {
  const flat = stripTags(source);
  const panjang = [...flat];
  if (panjang.length <= max) return flat;

  const potong: string[] = [];
  let terpakai = 0;
  for (const word of flat.split(/\s+/)) {
    const berikut = terpakai + [...word].length + 1;
    if (berikut > max) break;
    potong.push(word);
    terpakai = berikut;
  }

  return potong.join(" ").replace(/[.,;:!?]+$/, "");
}