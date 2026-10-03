import { describe, expect, it } from "vitest";
import { DETAIL_CONTENT } from "@/data/detail-content";
import {
  ABOUT_SECTIONS,
  DIAGNOSTIC_SERVICES,
  MANAGEMENT,
} from "@/data/informasi";
import { FACILITIES, PRIORITY_SERVICES } from "@/data/home";

/**
 * Bentuk data halaman detail.
 *
 * Halaman detail di bawah `/pelayanan` membaca `DETAIL_CONTENT` dengan kunci
 * berupa slug. Kalau ada slug yang tidak punya entri, halamannya masih
 * dirender tetapi isinya kosong; kalau ada kunci yang tidak dipakai, isinya
 * tidak akan pernah tampil. Keduanya lolos dari pemeriksaan tipe, jadi diuji
 * di sini.
 */

const slugFasilitas = FACILITIES.map((f) => f.slug);

function slugPrioritas(): string[] {
  return PRIORITY_SERVICES.map((p) => p.slug);
}


describe("isi halaman detail", () => {
  const terpakai = [
    ...slugPrioritas(),
    ...slugFasilitas,
    ...DIAGNOSTIC_SERVICES.map((d) => d.slug),
  ];

  it("setiap slug punya isi", () => {
    const tanpa = terpakai.filter((s) => !DETAIL_CONTENT[s]);
    expect(tanpa).toEqual([]);
  });

  it("tidak ada isi yang tidak terpakai", () => {
    const dikenal = new Set<string>(terpakai);
    const yatim = Object.keys(DETAIL_CONTENT).filter((k) => !dikenal.has(k));
    expect(yatim).toEqual([]);
  });

  it("setiap isi punya butir yang tidak kosong", () => {
    for (const [slug, isi] of Object.entries(DETAIL_CONTENT)) {
      expect(isi.points.length, `butir ${slug}`).toBeGreaterThan(0);
      for (const p of isi.points) expect(p.trim(), `butir ${slug}`).not.toBe("");
    }
  });
});

describe("seksi profil", () => {
  it("memuat lima seksi sesuai urutan halaman acuan", () => {
    expect(ABOUT_SECTIONS.map((s) => s.title)).toEqual([
      "Visi dan Misi",
      "Budaya Kerja",
      "Company Profile",
      "Sejarah",
      "Maklumat Pelayanan",
    ]);
  });

  it("punya slug unik dan isi yang tidak kosong", () => {
    const slug = ABOUT_SECTIONS.map((s) => s.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of ABOUT_SECTIONS) {
      expect(s.lead.trim()).not.toBe("");
      expect(s.points.length, `butir ${s.slug}`).toBeGreaterThan(0);
    }
  });
});

describe("manajemen", () => {
  it("memuat delapan pimpinan dengan nama unik", () => {
    expect(MANAGEMENT).toHaveLength(8);
    const nama = MANAGEMENT.map((m) => m.name);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("mengisi nama dan jabatan", () => {
    for (const m of MANAGEMENT) {
      expect(m.name.trim()).not.toBe("");
      expect(m.role.trim()).not.toBe("");
    }
  });
});

describe("layanan diagnostik", () => {
  it("memuat laboratorium dan radiologi", () => {
    expect(DIAGNOSTIC_SERVICES.map((d) => d.slug)).toEqual([
      "laboratorium",
      "radiologi",
    ]);
  });

  it("tiap layanan punya grup dan butir yang tidak kosong", () => {
    for (const d of DIAGNOSTIC_SERVICES) {
      expect(d.description.trim()).not.toBe("");
      expect(d.groups.length, `grup ${d.slug}`).toBeGreaterThan(0);
      for (const g of d.groups) {
        expect(g.name.trim()).not.toBe("");
        expect(g.points.length, `butir ${g.name}`).toBeGreaterThan(0);
      }
    }
  });
});
