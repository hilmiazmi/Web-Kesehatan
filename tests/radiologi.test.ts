import { describe, expect, it } from "vitest";
import { alatRadiologi, fasilitasRadiologi } from "../src/data/radiologi";

describe("konten radiologi", () => {
  it("fasilitas terisi", () => {
    expect(fasilitasRadiologi.length).toBeGreaterThan(0);
  });
  it("id alat unik dan tiap alat punya fungsi", () => {
    const ids = alatRadiologi.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of alatRadiologi) expect(a.fungsi.length).toBeGreaterThan(0);
  });
});
