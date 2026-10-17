import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOCTORS } from "@/data/doctors";
import { DAY_ORDER } from "@/lib/poliklinik";

/**
 * Penjaga aturan jadwal tujuh hari: tidak boleh ada satu pun spesialisasi
 * tanpa dokter berjaga pada hari Senin sampai Minggu.
 *
 * Dua sumber dicek bersamaan karena keduanya hidup terpisah:
 *
 * - `DOCTORS` (statis) dipakai halaman saat database kosong atau mode
 *   snapshot. Kalau hanya database yang diisi, halaman beranda dan detail
 *   klinik diam-diam melompat satu hari penuh.
 * - `scripts/seed-data.json` (database) dipakai endpoint jadwal. Kalau
 *   statisnya diperbaiki dengan benar di sini tapi seed-nya tidak, halaman
 *   produksi balik lagi kosong saat kueri DB gagal atau datanya di-reset.
 */

const akar = path.resolve(import.meta.dirname, "..");

type SeedJadwal = {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  quota: number;
};

function selKosong(
  sumber: Record<string, Set<string>>,
): string[] {
  const luar = [] as string[];
  for (const [spesialisasi, hari] of Object.entries(sumber)) {
    for (const butir of DAY_ORDER) {
      if (!hari.has(butir)) luar.push(`${spesialisasi} / ${butir}`);
    }
  }
  return luar;
}

describe("statis DOCTORS menutup tujuh hari per spesialisasi", () => {
  it("setiap hari Senin sampai Minggu punya minimal satu dokter", () => {
    const sumber: Record<string, Set<string>> = {};
    for (const dokter of DOCTORS) {
      const hari = (sumber[dokter.specialty] ??= new Set());
      for (const j of dokter.schedule) hari.add(j.day);
    }
    expect(selKosong(sumber)).toEqual([]);
  });

  it("satu dokter tidak berjaga dua kali di hari yang sama", () => {
    for (const dokter of DOCTORS) {
      const hari = dokter.schedule.map((j) => j.day);
      expect(hari.length, dokter.slug).toBe(new Set(hari).size);
      expect(hari.length, dokter.slug).toBeLessThanOrEqual(7);
    }
  });
});

describe("seed doctorSchedules menutup tujuh hari per spesialisasi", () => {
  const seed = JSON.parse(
    readFileSync(path.join(akar, "scripts/seed-data.json"), "utf8"),
  ) as {
    tables: {
      doctors: Array<{
        id: string;
        fullName: string;
        specialtyId: string;
      }>;
      specialties: Array<{ id: string; name: string }>;
      doctorSchedules: SeedJadwal[];
    };
  };

  it("id jadwal unik dan hari bernomor 1 sampai 7", () => {
    const seen = new Set<string>();
    for (const baris of seed.tables.doctorSchedules) {
      expect(seen.has(baris.id), baris.id).toBe(false);
      seen.add(baris.id);
      expect(baris.dayOfWeek, baris.id).toBeGreaterThanOrEqual(1);
      expect(baris.dayOfWeek, baris.id).toBeLessThanOrEqual(7);
    }
  });

  it("setiap hari Senin sampai Minggu punya minimal satu dokter", () => {
    const namaSp = new Map(
      seed.tables.specialties.map((s) => [s.id, s.name]),
    );
    const spDokter = new Map(
      seed.tables.doctors.map((d) => [d.id, d.specialtyId]),
    );
    const sumber: Record<string, Set<string>> = {};
    for (const baris of seed.tables.doctorSchedules) {
      const sp = namaSp.get(spDokter.get(baris.doctorId) ?? "");
      if (!sp) continue;
      // Nomor hari ISO-8601 dipetakan dulu ke nama hari, karena DAY_ORDER
      // memakai nama, bukan nomor.
      (sumber[sp] ??= new Set()).add(String(DAY_ORDER[baris.dayOfWeek - 1]));
    }
    expect(selKosong(sumber)).toEqual([]);
  });

  it("satu dokter tidak berjaga dua kali di hari yang sama", () => {
    const kunci = new Set<string>();
    for (const baris of seed.tables.doctorSchedules) {
      const pasangan = `${baris.doctorId}#${baris.dayOfWeek}`;
      expect(kunci.has(pasangan)).toBe(false);
      kunci.add(pasangan);
    }
  });
});
