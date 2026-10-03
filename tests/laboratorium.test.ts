import { describe, expect, it } from "vitest";
import { alurLab, faqLab, kategoriLab } from "../src/data/laboratorium";

describe("konten laboratorium", () => {
  it("id kategori unik dan tidak kosong", () => {
    const ids = kategoriLab.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of kategoriLab) {
      expect(k.nama.trim()).not.toBe("");
      expect(k.pemeriksaan.length).toBeGreaterThan(0);
    }
  });
  it("alur dan FAQ terisi", () => {
    expect(alurLab.length).toBeGreaterThanOrEqual(3);
    expect(faqLab.length).toBeGreaterThan(0);
  });
});
