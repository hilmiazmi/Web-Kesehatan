import { describe, expect, it } from "vitest";
import { jenisPemeriksaanLab, layananLab } from "../src/data/laboratorium";

describe("konten laboratorium", () => {
  it("jenis pemeriksaan terisi", () => {
    expect(jenisPemeriksaanLab.length).toBeGreaterThan(0);
  });
  it("id layanan unik dan deskripsi tidak kosong", () => {
    const ids = layananLab.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of layananLab) expect(l.deskripsi.trim()).not.toBe("");
  });
});
