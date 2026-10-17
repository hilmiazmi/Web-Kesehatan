import { describe, expect, it } from "vitest";
import {
  buangTanpaUrl,
  validasi,
  validasiSemua,
} from "@/components/admin/SettingsManager";
import { SETTING_DEFAULTS } from "@/server/db/repo/content";

/**
 * Validasi pengaturan situs.
 *
 * Aturan ini diuji di sini, bukan lewat klik di peramban, karena
 * `PUT /api/v1/admin/settings` **tidak memvalidasi per field di server**.
 * Server hanya menyalin key yang dikenal lalu melempar 400 kalau tidak ada satu
 * pun key yang cocok. Kalau validasiKlien ini longgar, satu Savesalah akan
 * tersimpan tanpa complaint apa pun, dan itu tidak akan terlihat di mana pun
 * kecuali test ini.
 */

describe("validasi satu field", () => {
  it("menolak isian kosong, karena server akan mengabaikannya", () => {
    // Ini satu-satunya yang bisa mengejutkan: server mengembalikan
    // nilai bawaan untuk teks kosong, jadi form yang mengosongkan field tidak
    // akan merasa gagal padahal tidak ada yang tersimpan.
    expect(validasi("hospital_name", "")).toMatch(/wajib diisi/i);
    expect(validasi("hospital_name", "   ")).toMatch(/wajib diisi/i);
  });

  it("menerima teks biasa", () => {
    expect(validasi("hospital_name", "RSUD Contoh Sehat")).toBe("");
    expect(validasi("tagline", "Rumah Sehat Untuk Semua")).toBe("");
  });

  it("menolak surel yang tidak berbentuk surel", () => {
    expect(validasi("email", "bukan-surel")).toMatch(/surel/i);
    expect(validasi("email", "a@b")).toMatch(/surel/i);
    expect(validasi("email", "a b@c.test")).toMatch(/surel/i);
    expect(validasi("email", "info@contoh-sehat.test")).toBe("");
  });

  it("memerlukan skema pada alamat peta", () => {
    expect(validasi("map_embed_url", "contoh.test/peta")).toMatch(/http/i);
    expect(validasi("map_embed_url", "https://contoh.test/peta")).toBe("");
    expect(validasi("map_embed_url", "http://localhost:3000")).toBe("");
  });
});

describe("validasiSemua", () => {
  /** Isian yang lolos semua aturan, dipakai sebagai dasar kasus di bawahnya. */
  const benar = Object.fromEntries(
    Object.keys(SETTING_DEFAULTS)
      .filter((k) => k !== "social_links" && k !== "map_embed_url")
      .map((k) => [k, String(SETTING_DEFAULTS[k as keyof typeof SETTING_DEFAULTS])]),
  );

  it("mengembalikan kosong kalau semua isian benar", () => {
    expect(validasiSemua(benar)).toEqual({});
  });

  it("mengumpulkan galat per key, bukan berhenti di yang pertama", () => {
    const galat = validasiSemua({ ...benar, hospital_name: "", email: "rusak" });
    // Dua-duanya harus muncul. Kalau validasinya berhenti di galat pertama,
    // petugas akan memperbaiki satu, menyetor, lalu kena galat berikutnya.
    expect(Object.keys(galat).sort()).toEqual(["email", "hospital_name"]);
  });

  it("tidak mengeluh tentang map_embed_url yang kosong", () => {
    // Peta memang opsional dan boleh kosong, jadi tidak boleh ikut memaksas.
    expect(validasiSemua({ ...benar, map_embed_url: "" })).toEqual({});
  });
});

describe("buangTanpaUrl", () => {
  it("membuang tautan yang alamatnya kosong", () => {
    const hasil = buangTanpaUrl([
      { network: "instagram", url: "https://contoh.test", label: "IG" },
      { network: "", url: "", label: "" },
      { network: "web", url: "   ", label: "Kosong" },
    ]);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].network).toBe("instagram");
  });

  it("membuang tautan yang hanya berisi spasi, bukan hanya yang benar-benar kosong", () => {
    // Server memakai `flatMap` dan membuang entri tanpa `url`. Kalau saringan di
    // sisi klien hanya memeriksa `=== ""`, baris berisi spasi akan terkirim,
    // dibuang server, lalu hilang begitu saja dari layar.
    expect(buangTanpaUrl([{ network: "web", url: "  ", label: "x" }])).toEqual([]);
  });
});