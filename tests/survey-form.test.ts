import { describe, expect, it } from "vitest";
import {
  buildPayload,
  petakanKolomServer,
  validate,
  type Fields,
} from "@/components/forms/survey-form";

/**
 * Formulir survei kepuasan masyarakat.
 *
 * Dua aturan di sini yang paling mudah rusak dan tidak terlihat dari mata.
 *
 * 1. Skor tidak boleh dikirim. `overall_score` dihitung ulang oleh server dari
 *    `answers`. Kalau peramban ikut mengirimnya, angka yang tampil di panel bisa
 *    berbeda dari isian yang dilihat orang, dan tidak ada yang mengetahuinya
 *    karena keduanya terlihat benar.
 * 2. Pertanyaan yang belum dinilai tidak boleh dikirim sebagai `0`. Server
 *    menghitung rata-rata dari semua kunci yang ada, jadi satu angka nol
 *    diam-diam menurunkan nilai satu pertanyaan yang sebenarnya tidak dinilai.
 */

const SEBAGIAN: Fields = {
  jawaban: { kecepatan: 5, keramahan: 4 },
  unit: "",
  nama: "",
  surel: "",
  komentar: "",
  website: "",
};

describe("validate survei", () => {
  it("menerima satu pertanyaan yang dinilai saja", () => {
    // Server menerima satu jawaban sampai tiga puluh. Memblokir orang yang hanya
    // sempat menilai satu hal membuat mereka membuang penilaian yang sudah ada.
    const isi = { ...SEBAGIAN, jawaban: { kecepatan: 5 } };
    expect(validate(isi)).toEqual({});
  });

  it("menolak formulir tanpa satu pun nilai", () => {
    expect(validate({ ...SEBAGIAN, jawaban: {} }).jawaban).toBeTruthy();
  });

  it("menolak nilai di luar skala satu sampai lima", () => {
    // Nilai 0 dipakai di formulir sebagai "belum dinilai", jadi ia tidak boleh
    // dihitung sebagai penilaian yang sah.
    const isi = { ...SEBAGIAN, jawaban: { kecepatan: 0 } };
    expect(validate(isi).jawaban).toBeTruthy();
  });

  it("hanya memeriksa surel kalau diisi", () => {
    expect(validate({ ...SEBAGIAN, surel: "" }).surel).toBeUndefined();
    expect(validate({ ...SEBAGIAN, surel: "bukan-surel" }).surel).toBeTruthy();
    expect(validate({ ...SEBAGIAN, surel: "pasien@contoh.test" }).surel).toBeUndefined();
  });

  it("menolak komentar yang melebihi batas server", () => {
    expect(validate({ ...SEBAGIAN, komentar: "a".repeat(2001) }).komentar).toBeTruthy();
    expect(validate({ ...SEBAGIAN, komentar: "a".repeat(2000) }).komentar).toBeUndefined();
  });
});

describe("buildPayload survei", () => {
  it("mengirim jawaban sebagai objek angka", () => {
    const body = buildPayload(SEBAGIAN);
    expect(body.answers).toEqual({ kecepatan: 5, keramahan: 4 });
  });

  it("tidak mengirim skor keseluruhan", () => {
    // Kunci `overall_score` sengaja tidak ada. Server yang menghitungnya.
    const body = buildPayload(SEBAGIAN);
    expect(Object.keys(body)).not.toContain("overall_score");
    expect(Object.keys(body)).not.toContain("score");
  });

  it("membuang pertanyaan yang belum dinilai", () => {
    const isi = { ...SEBAGIAN, jawaban: { kecepatan: 5, kejelasan: 0, kenyamanan: 3 } };
    const body = buildPayload(isi);
    expect(Object.keys(body.answers).sort()).toEqual(["kecepatan", "kenyamanan"]);
    expect(body.answers).not.toHaveProperty("kejelasan");
  });

  it("tidak mengirim field opsional yang kosong", () => {
    const body = buildPayload(SEBAGIAN);
    expect(body).not.toHaveProperty("service_unit");
    expect(body).not.toHaveProperty("respondent_name");
    expect(body).not.toHaveProperty("comment");
  });

  it("tetap mengirim kolom perangkap bot", () => {
    expect(buildPayload({ ...SEBAGIAN, website: "https://spam.test" }).website).toBe(
      "https://spam.test",
    );
  });
});

describe("petakanKolomServer survei", () => {
  it("mengubah nama kolom server ke nama field formulir", () => {
    const hasil = petakanKolomServer({
      answers: "Isi jawaban harus berupa objek penilaian.",
      respondent_email: "Format email tidak valid.",
    });
    expect(hasil.jawaban).toBeTruthy();
    expect(hasil.surel).toBeTruthy();
  });

  it("membuang nama kolom yang tidak dikenal", () => {
    expect(petakanKolomServer({ tidak_dikenal: "Pesan." })).toEqual({});
  });
});
