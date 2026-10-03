import { describe, expect, it } from "vitest";
import { SPECIALTIES } from "@/data/home";
import { POLIKLINIK } from "@/data/poliklinik";
import { countDoctors, filterPoliklinik } from "@/lib/poliklinik";

describe("data POLIKLINIK", () => {
  it("slug unik dan berbentuk URL", () => {
    const slug = POLIKLINIK.map((p) => p.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("setiap spesialisasi ada di daftar SPECIALTIES", () => {
    for (const p of POLIKLINIK) {
      expect(SPECIALTIES).toContain(p.specialty);
    }
  });

  it("semua field teks terisi", () => {
    for (const p of POLIKLINIK) {
      expect(p.name.trim()).not.toBe("");
      expect(p.description.trim()).not.toBe("");
      expect(p.location.trim()).not.toBe("");
      expect(p.icon).toMatch(/^bi-/);
    }
  });
});

describe("filterPoliklinik", () => {
  it("kata kunci kosong atau spasi mengembalikan semuanya", () => {
    expect(filterPoliklinik(POLIKLINIK, "")).toHaveLength(POLIKLINIK.length);
    expect(filterPoliklinik(POLIKLINIK, "   ")).toHaveLength(POLIKLINIK.length);
  });

  it("tidak membedakan huruf besar dan kecil", () => {
    const hasil = filterPoliklinik(POLIKLINIK, "JANTUNG");
    expect(hasil.some((p) => p.slug === "jantung")).toBe(true);
  });

  it("mencocokkan deskripsi dan lokasi, bukan hanya nama", () => {
    expect(
      filterPoliklinik(POLIKLINIK, "imunisasi").map((p) => p.slug)
    ).toContain("anak");
    expect(filterPoliklinik(POLIKLINIK, "Gedung D").length).toBeGreaterThan(0);
  });

  it("kata kunci yang tidak ada mengembalikan array kosong", () => {
    expect(filterPoliklinik(POLIKLINIK, "xyzzy-tidak-ada")).toEqual([]);
  });
});

describe("countDoctors", () => {
  it("menghitung dokter per spesialisasi dan 0 bila tidak ada datanya", () => {
    const peta = { Anak: ["a", "b"] };
    expect(countDoctors("Anak", peta)).toBe(2);
    expect(countDoctors("Mata", peta)).toBe(0);
  });
});
