import { describe, expect, it } from "vitest";
import { CLINIC_DETAILS } from "@/data/clinics";
import { DOCTORS } from "@/data/doctors";
import {
  countDoctors,
  doctorsForClinic,
  doctorsForSpecialty,
  sortSchedule,
} from "@/lib/poliklinik";

describe("data DOCTORS", () => {
  it("slug unik dan berbentuk URL", () => {
    const slug = DOCTORS.map((d) => d.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("setiap spesialisasi dipakai oleh minimal satu halaman detail klinik", () => {
    // Keterkaitan klinik ke dokter diambil dari `specialty` opsional pada data
    // detail. Kalau ada spesialis yang tidak dipakai klinik mana pun, data
    // dokter itu tidak akan pernah tampil di mana pun.
    const dipakai = new Set(
      CLINIC_DETAILS.map((d) => d.specialty).filter(Boolean)
    );
    const tidakDipakai = [...new Set(DOCTORS.map((d) => d.specialty))].filter(
      (s) => !dipakai.has(s)
    );
    expect(tidakDipakai).toEqual([]);
  });

  it("klinik yang menandai spesialis pasti punya dokter", () => {
    // Sebaliknya: `specialty` yang tidak ada padanya berarti klinik itu
    // menampilkan blok dokter kosong tanpa sengaja.
    const tanpa = CLINIC_DETAILS.filter(
      (d) => d.specialty && doctorsForClinic(d, DOCTORS).length === 0
    ).map((d) => d.slug);
    expect(tanpa).toEqual([]);
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

describe("doctorsForSpecialty, countDoctors, dan doctorsForClinic", () => {
  it("menyaring dokter per spesialisasi dan 0 bila tidak ada", () => {
    expect(
      doctorsForSpecialty("Jantung", DOCTORS).every((d) => d.specialty === "Jantung")
    ).toBe(true);
    expect(countDoctors("Spesialis Fiktif", DOCTORS)).toBe(0);
  });

  it("klinik tanpa spesialis mengembalikan daftar kosong", () => {
    expect(doctorsForClinic({}, DOCTORS)).toEqual([]);
  });

  it("klinik dengan spesialis mengembalikan dokternya", () => {
    const anak = CLINIC_DETAILS.find((d) => d.slug === "klinik-anak");
    expect(anak?.specialty).toBe("Anak");
    const hasil = doctorsForClinic(anak!, DOCTORS);
    expect(hasil.length).toBeGreaterThan(0);
    expect(hasil.every((d) => d.specialty === "Anak")).toBe(true);
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