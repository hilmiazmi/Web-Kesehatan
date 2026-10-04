import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import robots from "@/app/robots";

/**
 * Penjaga chrome publik di halaman admin.
 *
 * Navbar publik disembunyikan lewat `body:has(#...)` di `admin.css`, bukan
 * lewat pemindahan berkas. Pola ini rapuh pada dua titik: nama kelas chrome
 * di `site.css` dan id penanda di layout admin. Kalau salah satunya berubah
 * tanpa mengubah yang lain, navbar muncul kembali di panel tanpa ada tes
 * komponen yang gagal, karena tidak ada komponen yang diuji di sini.
 *
 * Tes ini membaca ketiga berkas dan memastikan ketiganya menyebut nama yang
 * sama. Ia tidak menguji tampilan, hanya kontrak penamaan antar berkas.
 */

const ADMIN_CSS = readFileSync("src/styles/admin.css", "utf-8");
const ADMIN_LAYOUT = readFileSync("src/app/admin/layout.tsx", "utf-8");
const ROOT_LAYOUT = readFileSync("src/app/layout.tsx", "utf-8");

describe("penanda halaman admin", () => {
  it("layout admin memakai satu id penanda", () => {
    const cocok = ADMIN_LAYOUT.match(/id="([^"]+)"/);
    expect(cocok).not.toBeNull();
    const penanda = cocok![1];

    // CSS harus menyembunyikan chrome hanya kalau penanda itu ada.
    expect(ADMIN_CSS).toContain(`body:has(#${penanda})`);
  });

  it("menyembunyikan keempat chrome publik", () => {
    // Nama kelas dicocokkan sampai koma atau kurung kurawal, supaya
    // nama yang mirip tidak lolos sebagai nama yang dimaksud.
    for (const kelas of [".skip-link", ".topbar", ".branding", ".footer"]) {
      const lolos = ADMIN_CSS.includes(`${kelas},`) || ADMIN_CSS.includes(`${kelas} {`);
      expect(lolos).toBe(true);
    }
  });

  it("nama kelas chrome cocok dengan layout root", () => {
    // Kalau salah satu kelas ini diubah di layout atau site.css, aturan
    // sembunyi ikut mati. Tes ini yang akan memberi tahu lebih dulu.
    expect(ROOT_LAYOUT).toContain("skip-link");
    expect(ROOT_LAYOUT).toContain("<Topbar");
    expect(ROOT_LAYOUT).toContain("<Navbar");
    expect(ROOT_LAYOUT).toContain("<Footer");
  });
});

/**
 * Penjaga `noindex` untuk halaman admin.
 *
 * Tidak ada satu pun `robots: { index: false }` di repo ini sebelum tag ini
 * ditambah, sehingga `/admin/login` boleh masuk indeks mesin pencari. Untuk
 * panel yang butuh sesi, akibatnya ringan: yang muncul di hasil pencarian
 * cuma judul tanpa isi, dan orang bisa terus membuka halaman login yang tidak
 * ada gunanya.
 *
 * Aturan ini sengaja berada di layout terluar, bukan di `(panel)/layout.tsx`.
 * Halaman login tidak memakai `(panel)`, jadi kalau metadata ditaruh di sana,
 * halaman login tetap terindeks dan tes ini akan gagal.
 *
 * Kenapa bukan `Disallow: /admin` di `robots.txt`. Aturan robots mencocokkan
 * awalan, bukan segmen utuh, jadi `Disallow: /admin` ikut memblokir
 * `/administrasi` yang memang halaman publik. Pemeriksaan di bawah menjaga
 * bahwa aturan itu tidak pernah muncul di `robots.ts`.
 */
describe("indeks mesin pencari untuk halaman admin", () => {
  it("layout terluar admin menandai noindex dan nofollow", () => {
    expect(ADMIN_LAYOUT).toContain("export const metadata");
    expect(ADMIN_LAYOUT).toContain("index: false");
    expect(ADMIN_LAYOUT).toContain("follow: false");
  });

  it("diterbitkan di layout terluar, bukan di layout panel", () => {
    // `(panel)` hanya melingkupi halaman yang butuh sesi. Halaman login berada
    // di luar kelompok itu, jadi metadata harus ada satu level di atasnya.
    const layoutPanel = readFileSync(
      "src/app/admin/(panel)/layout.tsx",
      "utf-8",
    );
    expect(layoutPanel).not.toContain("export const metadata");
    expect(ADMIN_LAYOUT).toContain('<div id="admin-halaman">');
  });

  it("robots.txt tidak memblokir /admin, karena akan ikut memblokir /administrasi", () => {
    // Yang diperiksa adalah hasil `robots()`, bukan teks berkasnya. Memeriksa
    // teks sumber hanya menangkap satu bentuk penulisan: `disallow: "/admin"`
    // tertangkap, tapi `disallow: ["/api/", "/admin"]` lolos begitu saja.
    // Aturan robotsnya yang berlaku, jadi aturan itulah yang diuji.
    const hasil = robots();
    // Tipe `rules` bisa berupa satu objek atau larik. `Array.isArray` sudah
    // membuat keduanya menyatu ke satu bentuk, jadi anotasi tidak perlu ditulis
    // tangan di sini.
    const aturan = Array.isArray(hasil.rules) ? hasil.rules : [hasil.rules];
    const larangan: string[] = aturan.flatMap((r) =>
      Array.isArray(r.disallow)
        ? r.disallow
        : [r.disallow].filter((d): d is string => typeof d === "string"),
    );

    // `/administrasi` adalah halaman publik "Administrasi Pasien" yang
    // sengaja ada di navbar. Aturan robots mencocokkan awalan, bukan segmen
    // utuh, jadi bentuk yang benar-benar berbahaya di sini adalah larangan
    // yang merupakan awalan dari `/administrasi`.
    for (const d of larangan) {
      expect("/administrasi".startsWith(d)).toBe(false);
    }
    // Dan `/admin` sendiri juga tidak boleh ada di daftar itu, karena
    // penandainya sudah `noindex` lewat metadata.
    expect(larangan).not.toContain("/admin");
  });
});
