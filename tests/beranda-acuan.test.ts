import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Beranda harus tetap mengikuti situs acuan pada tiga hal yang mudah
 * berubah diam-diam: urutan section, garis dekoratif di bawah judul
 * section, dan pembagian kolom galeri.
 *
 * Semuanya diuji dengan membaca berkas sumber, bukan hasil render, karena
 * yang dikunci adalah aturan yang menghasilkan angka di acuan.
 *
 * Angka dekorasi diambil apa adanya dari `main.css` situs referensi pada
 * `.section-title h2:before` dan `::after`: garis tipis 160px x 1px, lalu
 * garis tebal 60px x 3px warna aksen tepat di atasnya. Section "Fasilitas &
 * Layanan" punya pengecualian, judulnya rata kiri dan kedua garisnya digeser
 * ke 120px dan 165px, bukan dipusatkan.
 */

const akar = path.resolve(import.meta.dirname, "..");

function sumber(rel: string): string {
  return readFileSync(path.join(akar, rel), "utf8");
}

/**
 * Buang komentar baris dan blok.
 *
 * Bukan soal kebersihan: komentar di `tokens.css` dan `home.css` menyebut
 * angka yang sama dengan aturan yang diuji, jadi tanpa komentar dibuang
 * pembacaan bisa menemukan angka di dalam penjelasan, bukan di dalam CSS.
 */
function kodeSaja(teks: string): string {
  return teks.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const pageTsx = sumber("src/app/page.tsx");
const awardsGallery = sumber("src/components/home/AwardsGallery.tsx");
const tokensCss = kodeSaja(sumber("src/styles/tokens.css"));
const homeCss = kodeSaja(sumber("src/styles/home.css"));

/** Isi satu blok CSS, dari `{` pembuka sampai `}` penutupnya. */
function blokCss(teks: string, selektor: string): string {
  const pola = new RegExp(
    `${selektor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const cocok = teks.match(pola);
  if (!cocok) throw new Error(`blok ${selektor} tidak ada`);
  return cocok[1];
}

/** Nilai satu properti di dalam blok CSS, appetinya belum dibuang. */
function nilai(blok: string, properti: string): string {
  const cocok = blok.match(new RegExp(`${properti}:\\s*([^;]+)`));
  if (!cocok) throw new Error(`${properti} tidak ada di blok itu`);
  return cocok[1].trim();
}

describe("urutan 13 section beranda", () => {
  it("sama dengan urutan DOM situs acuan", () => {
    // Diperiksa lewat daftar yang dibaca dari render `page.tsx`, karena
    // urutanlah yang dijaga, bukan nama file. Daftar ini persis urutan
    // `docs/design-tokens-terverifikasi.md` bagian 4.
    const urutan = [...pageTsx.matchAll(/<([A-Z]\w+)\b[^>]*\/>/g)].map((m) => m[1]);

    expect(urutan).toEqual([
      "HeroSlider",
      "DoctorSearchCard",
      "PriorityServices",
      "FacilityTabs",
      "McuPackages",
      "NewsSection",
      "AwardsSection",
      "GallerySection",
      "RegistrationSection",
      "SocialMediaSection",
      "TestimonialsSection",
      "InsuranceSection",
      "FaqSection",
    ]);
  });

  it("Social Media dan Testimoni tidak tertukar urutan", () => {
    // Pasangan ini yang paling mudah keliru. Di acuan, Sosial Media
    // (section 10) lebih dulu dan Testimoni (section 11) sesudahnya.
    const urutan = [...pageTsx.matchAll(/<([A-Z]\w+)\b[^>]*\/>/g)].map((m) => m[1]);
    expect(urutan.indexOf("SocialMediaSection")).toBeLessThan(
      urutan.indexOf("TestimonialsSection"),
    );
  });
});

describe("garis dekoratif di bawah judul section", () => {
  it("h2 punya position relative sebagai titik jangkar", () => {
    // Tanpa ini `::before` dan `::after` tidak punya tempat melekat dan
    // justru melayang di halaman.
    expect(nilai(blokCss(tokensCss, ".section-title h2"), "position")).toBe(
      "relative",
    );
  });

  it("garis tipis 160px x 1px di bawah garis tebal", () => {
    const garis = blokCss(tokensCss, ".section-title h2::before");
    expect(nilai(garis, "width")).toBe("160px");
    expect(nilai(garis, "height")).toBe("1px");
    expect(nilai(garis, "bottom")).toBe("1px");
  });

  it("garis tebal 60px x 3px memakai warna aksen", () => {
    const garis = blokCss(tokensCss, ".section-title h2::after");
    expect(nilai(garis, "width")).toBe("60px");
    expect(nilai(garis, "height")).toBe("3px");
    expect(nilai(garis, "background")).toBe("var(--rs-accent)");
    expect(nilai(garis, "bottom")).toBe("0");
  });

  it("kedua garis dipusatkan di section selain Fasilitas", () => {
    for (const selektor of [
      ".section-title h2::before",
      ".section-title h2::after",
    ]) {
      const garis = blokCss(tokensCss, selektor);
      expect(nilai(garis, "left")).toBe("0");
      expect(nilai(garis, "right")).toBe("0");
      expect(nilai(garis, "margin")).toBe("auto");
    }
  });

  it("ukuran dan jarak h2 tetap 42px, 50.4px, dan 20px", () => {
    const h2 = blokCss(tokensCss, ".section-title h2");
    expect(nilai(h2, "font-size")).toBe("var(--rs-fs-h2-section)");
    expect(nilai(h2, "line-height")).toBe("var(--rs-lh-h2-section)");
    expect(nilai(h2, "margin-bottom")).toBe("20px");
    expect(nilai(h2, "padding-bottom")).toBe("20px");
  });
});

describe("judul section Fasilitas dan Layanan", () => {
  it("rata kiri, bukan rata tengah seperti section lain", () => {
    expect(
      nilai(blokCss(homeCss, ".departments .section-title"), "text-align"),
    ).toBe("left");
  });

  it("garis dekoratif digeser ke 120px dan 165px tanpa dipusatkan", () => {
    const sebelum = blokCss(homeCss, ".departments .section-title h2::before");
    expect(nilai(sebelum, "left")).toBe("120px");
    expect(nilai(sebelum, "margin")).toBe("0");

    const sesudah = blokCss(homeCss, ".departments .section-title h2::after");
    expect(nilai(sesudah, "left")).toBe("165px");
    expect(nilai(sesudah, "margin")).toBe("0");
  });
});

describe("kartu akreditasi", () => {
  it("memakai kotak kartu dan pembungkus gambar dari acuan", () => {
    // `.penghargaan-item` dan `.penghargaan-title` yang ada di `style.css`
    // acuan adalah CSS mati: nol pemakaian di markup sana. Yang hidup
    // `.card` plus `.penghargaan-img`. Menyalin aturan yang mati akan
    // menghasilkan halaman yang tetap salah.
    expect(awardsGallery).toMatch(/<div className="card" key=\{a\}>/);
    expect(awardsGallery).toMatch(/className="penghargaan-img text-center"/);
    expect(homeCss).not.toMatch(/\.award-item/);
    expect(homeCss).not.toMatch(/\.award-title/);
  });

  it("gambar di dalam kotak selebar 50% kartu", () => {
    const img = blokCss(homeCss, ".card .penghargaan-img");
    expect(nilai(img, "width")).toBe("50%");
    expect(nilai(img, "margin-inline")).toBe("auto");
  });
});

describe("galeri beranda", () => {
  it("empat kolom di desktop, mengikuti col-lg-3 milik acuan", () => {
    // Enam kolom pernah ada di sini dan bertentangan dengan docstring
    // komponen yang menyebut empat kolom.
    const lebar = homeCss.match(
      /@media \(min-width: 992px\) \{\s*\.gallery-grid \{\s*grid-template-columns:\s*repeat\((\d+)/,
    );
    expect(lebar).not.toBeNull();
    expect(Number(lebar?.[1])).toBe(4);
  });

  it("tinggi thumbnail 215px", () => {
    // Dari `.gallery-item .img-fluid { height: 215px }` di `style.css` acuan.
    expect(awardsGallery).toMatch(/height=\{215\}/);
  });
});