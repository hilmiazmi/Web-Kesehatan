import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tombol kembali ke atas dikunci pada angka yang diukur.
 *
 * Angka di blok `.scroll-top` pada `src/styles/site.css` bukan pilihan taste.
 * Semuanya diambil dari CSS situs acuan, `rsudpasarminggu.jakarta.go.id`, pada
 * 4 Oktober 2026: selector `.scroll-top` di `/v2/assets/css/main.css`, bagian
 * "Scroll Top Button", dan ambang `window.scrollY > 100` di `main.js`.
 *
 * Repo ini punya aturan yang sama untuk navbar dan untuk bagian beranda: angka
 * warna dan ukuran harus berasal dari `getComputedStyle()` pada situs acuan,
 * bukan dikira. Aturan itu tidak bisa dijaga hanya lewat disiplin, karena
 * orang yang mengubah CSS tidak bisa melihat sumber aslinya. Tes inilah yang
 * menjaganya.
 *
 * Kalau salah satu angka di sini memang perlu diubah, ubah sumbernya lebih
 * dulu:ukur ulang di situs acuan, catat tanggalnya di blok komentar CSS, lalu
 * perbarui nilai di sini. Mengubah angka supaya cocok dengan mata saja, tanpa
 * pengukuran ulang, membuat tes ini berbohong.
 */

const akar = path.resolve(import.meta.dirname, "..");

const cssMentah = readFileSync(path.join(akar, "src/styles/site.css"), "utf8");

/**
 * CSS tanpa komentar.
 *
 * Komentar dibuang dulu, bukan cuma diabaikan. `site.css` sering menulis
 * penjelasan di midstripe, dan penjelasan itu sendiri mengandung teks seperti
 * `transition: all`, sehingga pencarian setelah nama properti bisa tersangkut di
 * dalam komentar alih-alih menemukan aturan sungguhan. Menghapus komentar lebih
 * andal daripada mencoba menebak karakter apa saja yang boleh mendahului nama
 * properti.
 */
const siteCss = cssMentah.replace(/\/\*[\s\S]*?\*\//g, "");
const komponen = readFileSync(
  path.join(akar, "src/components/layout/BackToTop.tsx"),
  "utf8",
);
const layout = readFileSync(path.join(akar, "src/app/layout.tsx"), "utf8");

/** Nilai mentah satu properti CSS dari blok pertama selector itu. */
function nilai(selector: string, properti: string): string {
  const polaBlok = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const blok = siteCss.match(polaBlok);
  if (!blok) return "";
  const cocok = blok[1].match(
    new RegExp(`(?:^|[{;])\\s*${properti}\\s*:\\s*([^;]+)`),
  );
  return cocok ? cocok[1].trim() : "";
}

/**
 * Semua nilai numerik satu properti CSS di seluruh blok berlabel selector itu.
 *
 * Mengembalikan larik, bukan satu nilai, karena beberapa selector punya lebih
 * dari satu blok. `.navmenu` misalnya: blok dasarnya tidak menyebut `z-index`
 * sama sekali, dan angka 1200-nya ada di blok kedua yang berada di dalam media
 * query. Kalau hanya blok pertama yang dibaca, hasilnya kosong dan
 * perbandingan yang dilakukan jadi tidak masuk akal.
 */
function angkaSemua(selector: string, properti: string): number[] {
  const polaBlok = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    "g",
  );
  const cari = new RegExp(`(?:^|[{;])\\s*${properti}\\s*:\\s*(-?[\\d.]+)`, "g");
  const hasil: number[] = [];

  for (const blok of siteCss.matchAll(polaBlok)) {
    for (const cocok of blok[1].matchAll(cari)) {
      hasil.push(Number(cocok[1]));
    }
  }

  return hasil;
}

/** Tanpa komentar baris dan blok, supaya hanya menyisakan kode yang dijalankan. */
function kodeSaja(sumber: string): string {
  return sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("tombol kembali ke atas — angka terverifikasi", () => {
  it("blok .scroll-top ada di site.css, bukan di home.css", () => {
    // Aturan ini global karena komponennya dipasang di layout, jadi dipakai di
    // seluruh halaman. Kalau ditaruh di home.css, halaman lain tidak akan punya
    // tombol sama sekali.
    expect(nilai(".scroll-top", "width")).toBe("40px");
    const homeCss = readFileSync(path.join(akar, "src/styles/home.css"), "utf8");
    expect(homeCss).not.toContain(".scroll-top");
  });

  it("ukuran, posisi, dan bentuk sama dengan situs acuan", () => {
    expect(nilai(".scroll-top", "width")).toBe("40px");
    expect(nilai(".scroll-top", "height")).toBe("40px");
    expect(nilai(".scroll-top", "bottom")).toBe("15px");
    expect(nilai(".scroll-top", "border-radius")).toBe("4px");
    expect(nilai(".scroll-top", "transition")).toBe("all 0.4s");
    expect(nilai(".scroll-top", "position")).toBe("fixed");
  });

  it("sisi horizontalnya menyimpang dari situs acuan, dan alasannya tercatat", () => {
    // Situs acuan mengukur 15px dari tepi kanan. Nilai itu tidak bisa dipakai
    // mentah karena situs acuan tidak punya bilah aksi cepat, sedangkan repo ini
    // punya: `.quick-action` juga melayang di pojok kanan bawah, dengan z-index
    // 1020 di bawah 1199 tombol ini. Kalau tombol ini tetap di kanan, dia
    // menutupi butir paling bawah bilah aksi cepat dan memblokir kliknya.
    // Dipindah ke tepi kiri, jadi jaraknya tetap 15px seperti hasil pengukuran
    // dan tidak ada dua elemen yang berebut ruang.
    expect(nilai(".scroll-top", "left")).toBe("15px");
    // `nilai` mengembalikan string kosong untuk properti yang tidak ada, jadi
    // ini yang memeriksa `right` benar-benar hilang, bukan menyetel ulang ke 0.
    expect(nilai(".scroll-top", "right")).toBe("");

    const tokensCss = readFileSync(
      path.join(akar, "src/styles/tokens.css"),
      "utf8",
    );
    const blokBilah = tokensCss.match(/\.quick-action\s*\{([^}]*)\}/);
    expect(blokBilah).not.toBeNull();
    expect(blokBilah?.[1]).toMatch(/right:\s*1rem/);
    expect(blokBilah?.[1]).not.toMatch(/left:/);

    // Alasannya harus tertulis di CSS. Penyimpangan tanpa catatan akan dibaca
    // sebagai kesalahan orang berikutnya dan dikembalikan ke kanan.
    expect(cssMentah).toContain(".quick-action");
  });

  it("warna memakai token yang sudah diverifikasi, bukan hex mentah", () => {
    // Situs acuan menulis `var(--accent-color)` dan `var(--contrast-color)`,
    // yang di sana bernilai #1977cc dan #ffffff. Dua-duanya sudah jadi token
    // di repo ini, jadi menulis hex mentah akan memutus kesamaan itu.
    expect(nilai(".scroll-top", "background-color")).toBe("var(--rs-accent)");
    expect(nilai(".scroll-top i", "color")).toBe("var(--rs-white)");
    expect(nilai(".scroll-top i", "font-size")).toBe("24px");
    expect(nilai(".scroll-top i", "line-height")).toBe("0");
    // `color-mix(... transparent 20%)` di sumbernya berarti aksen 80% pekat.
    expect(nilai(".scroll-top:hover", "background-color")).toBe(
      "rgba(var(--rs-accent-rgb), 0.8)",
    );
  });

  it("keadaan awal tersembunyi dan keadaan aktif terlihat", () => {
    expect(nilai(".scroll-top", "visibility")).toBe("hidden");
    expect(nilai(".scroll-top", "opacity")).toBe("0");
    expect(nilai(".scroll-top.active", "visibility")).toBe("visible");
    expect(nilai(".scroll-top.active", "opacity")).toBe("1");
  });

  it("ada indikator fokus yang terlihat", () => {
    // Tidak ada di situs acuan. Tombol ini tautan, jadi harus bisa difokuskan
    // oleh keyboard, dan harus ada yang berubah saat itu terjadi.
    expect(nilai(".scroll-top:focus-visible", "outline")).toBe(
      "3px solid var(--rs-white)",
    );
  });

  it("z-index di bawah kedua lapisan penutup, tapi di atas isi halaman", () => {
    // Situs acuan memakai 99999. Di sini tidak bisa, karena ada dua lapisan
    // penutup yang harus menang: panel navigasi off-canvas 1200 dan lightbox
    // 10000. Dengan 99999 tombolnya tetap bisa diklik di atas keduanya.
    // 1199 menaruhnya tepat di bawah keduanya.
    const z = angkaSemua(".scroll-top", "z-index");
    expect(z).toHaveLength(1);
    expect(z[0]).toBe(1199);
    expect(z[0]).toBeLessThan(Math.max(...angkaSemua(".navmenu", "z-index")));
    expect(z[0]).toBeLessThan(Math.max(...angkaSemua(".lightbox", "z-index")));
    // Masih di atas isi halaman biasa, yang tidak pernah di atas 10.
    expect(z[0]).toBeGreaterThan(10);
  });
});

describe("tombol kembali ke atas — perilaku", () => {
  it("ambang kemunculan 100px, diukur dari skrip situs acuan", () => {
    // Bukan 200, bukan 300. Skrip situs acuan menulis `window.scrollY > 100`.
    expect(komponen).toContain("window.scrollY > 100");
  });

  it("tidak memakai setState di dalam useEffect", () => {
    // Aturan eslint `react-hooks/set-state-in-effect` memang aktif, tapi tes
    // ini tetap ditulis karena aturan itu bisa dinonaktifkan diam-diam lewat
    // perubahan eslint.config, dan yang rusak nanti adalah performanya:
    // React menggambar ulang seluruh pohon pada setiap peristiwa gulir.
    const efek = komponen.slice(
      komponen.indexOf("useEffect("),
      komponen.indexOf("}, []);"),
    );
    expect(efek).not.toMatch(/set[A-Z]\w*\(/);
  });

  it("target tautannya ada di layout, bukan hash kosong", () => {
    // Situs acuan memakai `href="#"` yang butuh JavaScript untuk tidak
    // melakukan apa-apa. Di sini targetnya harus benar-benar ada, supaya
    // tombol tetap berguna tanpa JavaScript.
    // `kodeSaja` dipakai karena docstring komponen ini sendiri menyebut
    // `href="#"` sebagai contoh yang dihindari. Yang diperiksa adalah atribut
    // yang benar-benar ditulis, bukan penyebutan di dalam komentar.
    const kode = kodeSaja(komponen);
    expect(kode).toContain('href="#main-content"');
    expect(kode).not.toContain('href="#"');
    expect(layout).toContain('id="main-content"');
    expect(layout).toContain("<BackToTop />");
  });

  it("punya nama terbaca untuk pembaca layar", () => {
    // Ikon panah tanpa nama tidak pernah menjelaskan bentuknya.
    expect(komponen).toContain("aria-hidden");
    expect(komponen).toContain("Kembali ke atas halaman");
  });

  it("dipasang sekali di layout, di luar main", () => {
    const jumlah = layout.split("<BackToTop />").length - 1;
    expect(jumlah).toBe(1);
    // Posisi tetap di layar, jadi tidak boleh ikut bergeser bersama isi.
    expect(layout.indexOf("<BackToTop />")).toBeGreaterThan(
      layout.indexOf("<main id="),
    );
  });
});
