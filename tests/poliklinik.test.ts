import { describe, expect, it } from "vitest";
import { SPECIALTIES } from "@/data/home";
import { DOCTORS } from "@/data/doctors";
import { POLIKLINIK } from "@/data/poliklinik";
import {
  countDoctors,
  doctorsForSpecialty,
  filterPoliklinik,
  findPoliklinik,
  sortSchedule,
} from "@/lib/poliklinik";

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

  it("setiap poliklinik punya minimal satu dokter", () => {
    for (const p of POLIKLINIK) {
      expect(countDoctors(p.specialty, DOCTORS)).toBeGreaterThan(0);
    }
  });
});

describe("data DOCTORS", () => {
  it("slug unik dan spesialisasi cocok dengan poliklinik", () => {
    const slug = DOCTORS.map((d) => d.slug);
    expect(new Set(slug).size).toBe(slug.length);
    const spesialis = POLIKLINIK.map((p) => p.specialty);
    for (const d of DOCTORS) {
      expect(spesialis).toContain(d.specialty);
    }
  });

  it("jadwal terisi, hari tidak ganda, jam dalam 07.30 sampai 14.00", () => {
    for (const d of DOCTORS) {
      expect(d.schedule.length).toBeGreaterThan(0);
      const hari = d.schedule.map((s) => s.day);
      expect(new Set(hari).size).toBe(hari.length);
      for (const s of d.schedule) {
        const m = s.time.match(/^(\d{2})\.(\d{2})–(\d{2})\.(\d{2})$/);
        expect(m).not.toBeNull();
        const mulai = Number(m![1]) * 60 + Number(m![2]);
        const selesai = Number(m![3]) * 60 + Number(m![4]);
        expect(mulai).toBeGreaterThanOrEqual(7 * 60 + 30);
        expect(selesai).toBeLessThanOrEqual(14 * 60);
        expect(selesai).toBeGreaterThan(mulai);
      }
    }
  });
});

describe("findPoliklinik", () => {
  it("menemukan berdasarkan slug dan undefined bila tidak ada", () => {
    expect(findPoliklinik(POLIKLINIK, "jantung")?.name).toBe(
      "Poliklinik Jantung"
    );
    expect(findPoliklinik(POLIKLINIK, "tidak-ada")).toBeUndefined();
  });
});

describe("doctorsForSpecialty dan countDoctors", () => {
  it("menyaring dokter per spesialisasi dan 0 bila tidak ada", () => {
    expect(
      doctorsForSpecialty("Jantung", DOCTORS).every(
        (d) => d.specialty === "Jantung"
      )
    ).toBe(true);
    expect(countDoctors("Spesialis Fiktif", DOCTORS)).toBe(0);
  });
});

describe("sortSchedule", () => {
  it("mengurutkan Senin sampai Jumat tanpa mengubah array asli", () => {
    const asli = [
      { day: "Jumat" as const, time: "08.00–11.00" },
      { day: "Senin" as const, time: "08.00–12.00" },
    ];
    expect(sortSchedule(asli).map((s) => s.day)).toEqual(["Senin", "Jumat"]);
    expect(asli[0].day).toBe("Jumat");
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
