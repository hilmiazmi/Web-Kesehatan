import { describe, expect, it } from "vitest";
import {
  buildPayload,
  petakanKolomServer,
  validate,
  type Fields,
} from "@/components/forms/wbs-form";

/**
 * Formulir pelaporan Whistle Blowing System.
 *
 * Dua aturan di sini yang paling mudah rusak dan tidak terlihat dari mata.
 *
 * 1. Laporan anonim tidak boleh mengirim identitas. Backend sudah mengabaikan
 *    ketiga kolom itu untuk laporan anonim, jadi tes yang salah ukur akan tetap
 *    hijau di sisi server. Yang diperiksa di sini adalah sisi peramban, karena
 *    kalau nanti backend berubah dan mulai membaca kolom itu, isian lama di
 *    state masih ada dan akan ikut terkirim.
 * 2. Kolom bukti tidak boleh hilang. Endpoint hanya punya satu kolom uraian,
 *    jadi bukti digabungkan ke sana. Membuangnya berarti isian pelapor hilang
 *    tanpa pemberitahuan dan tidak bisa dibantah saat pemeriksaan.
 */

const SAH: Fields = {
  anonim: false,
  nama: "",
  surel: "",
  telepon: "",
  subjek: "Dugaan pemungutan di loket",
  kronologi: "Pada 3 Oktober 2026 ada yang meminta bayaran di luar kuitansi resmi.",
  tanggal: "",
  lokasi: "",
  unit: "",
  tingkat: "medium",
  bukti: "",
  website: "",
};

describe("validate WBS", () => {
  it("menerima laporan tanpa identitas pelapor", () => {
    // Nama, surel, dan telepon semuanya opsional. Pelaporan yang paling
    // berguna justru sering datang tanpa nama.
    expect(validate(SAH)).toEqual({});
  });

  it("menolak subjek yang terlalu pendek atau terlalu panjang", () => {
    expect(validate({ ...SAH, subjek: "abc" }).subjek).toBeTruthy();
    expect(validate({ ...SAH, subjek: "abcd" }).subjek).toBeTruthy();
    expect(validate({ ...SAH, subjek: "abcde" }).subjek).toBeUndefined();
    expect(validate({ ...SAH, subjek: "a".repeat(221) }).subjek).toBeTruthy();
  });

  it("menolak uraian yang tidak bisa diperiksa", () => {
    expect(validate({ ...SAH, kronologi: "buruk" }).kronologi).toBeTruthy();
    expect(validate({ ...SAH, kronologi: "a".repeat(19) }).kronologi).toBeTruthy();
    expect(validate({ ...SAH, kronologi: "a".repeat(20) }).kronologi).toBeUndefined();
    expect(validate({ ...SAH, kronologi: "a".repeat(10001) }).kronologi).toBeTruthy();
  });

  it("tidak memeriksa identitas saat laporan anonim", () => {
    // Kolomnya tidak tampil dan tidak dikirim, jadi pesan errornya juga tidak
    // boleh muncul. Kalau errornya muncul, isinya berarti bocor ke layar.
    const isi = { ...SAH, anonim: true, surel: "bukan-surel", telepon: "abc" };
    expect(validate(isi)).toEqual({});
  });

  it("memeriksa identitas saat laporan bukan anonim dan isinya diisi", () => {
    expect(validate({ ...SAH, surel: "bukan-surel" }).surel).toBeTruthy();
    expect(validate({ ...SAH, telepon: "123" }).telepon).toBeTruthy();
    expect(validate({ ...SAH, surel: "pelapor@contoh.test" }).surel).toBeUndefined();
  });
});

describe("buildPayload WBS", () => {
  it("mengirim subjek, uraian, dan tingkat keparahan", () => {
    const body = buildPayload(SAH);
    expect(body["is_anonymous"]).toBe(false);
    expect(body["subject"]).toBe(SAH.subjek);
    expect(body["description"]).toBe(SAH.kronologi);
    expect(body["severity"]).toBe("medium");
  });

  it("tidak mengirim identitas saat anonim", () => {
    const isi = {
      ...SAH,
      anonim: true,
      nama: "Budi",
      surel: "budi@contoh.test",
      telepon: "081234567890",
    };
    const body = buildPayload(isi);
    expect(body["is_anonymous"]).toBe(true);
    expect(body).not.toHaveProperty("reporter_name");
    expect(body).not.toHaveProperty("reporter_email");
    expect(body).not.toHaveProperty("reporter_phone");
  });

  it("mengirim identitas saat tidak anonim dan isinya ada", () => {
    const isi = { ...SAH, nama: "Budi", telepon: "081234567890" };
    const body = buildPayload(isi);
    expect(body["reporter_name"]).toBe("Budi");
    expect(body["reporter_phone"]).toBe("081234567890");
    expect(body).not.toHaveProperty("reporter_email");
  });

  it("menggabungkan bukti ke uraian, bukan membuangnya", () => {
    const isi = { ...SAH, bukti: "Ada foto nota di loket." };
    const body = buildPayload(isi);
    expect(String(body["description"])).toContain(SAH.kronologi);
    expect(String(body["description"])).toContain("Ada foto nota di loket.");
  });

  it("tidak mengirim incident_date kalau tanggalnya kosong", () => {
    expect(buildPayload(SAH)).not.toHaveProperty("incident_date");
    expect(buildPayload({ ...SAH, tanggal: "2026-10-03" })["incident_date"]).toBe("2026-10-03");
  });

  it("tetap mengirim kolom perangkap bot", () => {
    expect(buildPayload({ ...SAH, website: "https://spam.test" }).website).toBe(
      "https://spam.test",
    );
  });
});

describe("petakanKolomServer WBS", () => {
  it("mengubah nama kolom server ke nama field formulir", () => {
    const hasil = petakanKolomServer({
      description: "Uraian kejadian minimal 20 karakter.",
      reporter_email: "Format email tidak valid.",
    });
    expect(hasil.kronologi).toBeTruthy();
    expect(hasil.surel).toBeTruthy();
  });

  it("membuang nama kolom yang tidak dikenal", () => {
    expect(petakanKolomServer({ tidak_dikenal: "Pesan." })).toEqual({});
  });
});
