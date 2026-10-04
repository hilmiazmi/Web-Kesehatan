import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

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
