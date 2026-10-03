import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateTicket } from "@/server/ticket";

/**
 * Percobaan ulang kode tiket di `withUniqueTicket`.
 *
 * Kode tiket dibuat sebelum baris disimpan, jadi ada kalanya kode yang
 * kebetulan sama sudah dipakai. Jalur itu ditangani dengan mencoba lagi, dan
 * tiga hal yang menentukan apakah penanganannya benar diuji di bawah.
 *
 * Pertama, hanya pelanggaran unique yang dicoba lagi. Galat lain langsung
 * dinaikkan. Kalau semua galat dicoba lagi, kesalahan yang tidak disengaja akan
 * tertutup oleh pesan "gagal membuat kode tiket unik", dan penyebabnya sulit
 * ditemukan.
 *
 * Kedua, percobaan dibatasi. Empat kali sudah jauh melebihi tabrakan yang
 * wajar, jadi berulang terus berarti ada yang salah di kodenya.
 *
 * Ketiga, kode yang berhasil dikembalikan, bukan kode yang dicoba terakhir.
 *
 * `generateTicket` dimock supaya tabrakan bisa dibentuk. Tanpa itu kode yang
 * dihasilkan hampir selalu berbeda, jalur retry tidak akan pernah tersentuh,
 * dan tesnya akan hijau tanpa menguji apa pun.
 */

vi.mock("@/server/ticket", async (importOriginal) => {
  const asli = await importOriginal<typeof import("@/server/ticket")>();
  return { ...asli, generateTicket: vi.fn() };
});

const submissions = await import("@/server/db/repo/submissions");

/** Galat PostgreSQL pelanggaran unique, seperti yang dilempar driver. */
function tabrakanUnik(): Error {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
    constraint_name: "mcu_registrations_ticket_code_key",
  });
}

/** Galat lain yang harus langsung dinaikkan tanpa dicoba lagi. */
function galatLain(): Error {
  return Object.assign(new Error("column cannot be null"), { code: "23502" });
}

/**
 * Database yang melempar `galat` setiap kali `returning` dipanggil, sambil
 * menghitung berapa kali `insert` dipanggil.
 *
 * Rantai Drizzle (`insert().values().returning()`) ditiru dengan objek yang
 * mengembalikan dirinya sendiri, supaya kegagalan berhenti tepat di tempat
 * pemicu dan tidak diteruskan ke lapisan lain.
 */
function dbYangSelaluGagal(galat: () => unknown): { db: unknown; percobaan: () => number } {
  let dipanggil = 0;
  const db = {
    insert: () => {
      dipanggil += 1;
      const builder = {
        values: () => builder,
        returning: () => {
          throw galat();
        },
      };
      return builder;
    },
  };
  return { db, percobaan: () => dipanggil };
}

/** Database yang berhasil pada percobaan ke-(berhasilPada+1). */
function dbYangBerhasilPada(
  berhasilPada: number,
  kode: string,
): { db: unknown; percobaan: () => number } {
  let dipanggil = 0;
  const db = {
    insert: () => {
      dipanggil += 1;
      const builder = {
        values: () => builder,
        returning: async () => {
          if (dipanggil <= berhasilPada) throw tabrakanUnik();
          return [{ ticket_code: kode }];
        },
      };
      return builder;
    },
  };
  return { db, percobaan: () => dipanggil };
}

const SURVEY = {
  service_unit: "Instalasi",
  respondent_name: "Pengunjung",
  respondent_email: null,
  answers: [{ question: "q", answer: "a" }],
  overall_score: 5,
  comment: null,
};

describe("percobaan ulang kode tiket", () => {
  beforeEach(() => {
    vi.mocked(generateTicket).mockReset();
    let urut = 0;
    vi.mocked(generateTicket).mockImplementation(() => {
      urut += 1;
      return `SKM-KODE${urut}`;
    });
  });

  it("langsung berhasil saat kode tidak bertabrakan", async () => {
    const rows = [{ ticket_code: "SKM-KODE1" }];
    let dipanggil = 0;
    const db = {
      insert: () => {
        dipanggil += 1;
        const builder = { values: () => builder, returning: async () => rows };
        return builder;
      },
    };

    const hasil = await submissions.insertSurveyResponse(db as never, SURVEY);

    expect(hasil).toBe("SKM-KODE1");
    expect(dipanggil).toBe(1);
  });

  it("mencoba lagi saat kode bertabrakan, lalu mengembalikan kode yang berhasil", async () => {
    const { db, percobaan } = dbYangBerhasilPada(2, "SKM-KODE3");

    const hasil = await submissions.insertSurveyResponse(db as never, SURVEY);

    expect(hasil).toBe("SKM-KODE3");
    expect(percobaan()).toBe(3);
  });

  it("menghasilkan kode baru pada setiap percobaan", async () => {
    // Kalau kodenya sama persis di percobaan kedua, percobaan ulang tidak akan
    // pernah berhasil karena tabrakannya identik.
    const { db } = dbYangSelaluGagal(tabrakanUnik);

    await expect(submissions.insertSurveyResponse(db as never, SURVEY)).rejects.toThrow();

    // Yang dibandingkan adalah kode yang dihasilkan, bukan argumen yang
    // masuk ke `generateTicket`. Argumennya selalu "survey", jadi membandingkannya
    // tidak menyatakan apa pun.
    const hasil = vi.mocked(generateTicket).mock.results.map((r) => r.value as string);
    expect(hasil.length).toBeGreaterThan(1);
    expect(new Set(hasil).size).toBe(hasil.length);
  });

  it("berhenti setelah empat percobaan dan melempar galat aslinya", async () => {
    const { db, percobaan } = dbYangSelaluGagal(tabrakanUnik);

    // Galat yang dilempar harus yang asli. Kalau yang dilempar pesan generik,
    // penyebab sebenarnya ikut hilang.
    await expect(submissions.insertSurveyResponse(db as never, SURVEY)).rejects.toThrow(
      /duplicate key/,
    );
    expect(percobaan()).toBe(4);
  });

  it("tidak mencoba lagi untuk galat selain tabrakan unique", async () => {
    const { db, percobaan } = dbYangSelaluGagal(galatLain);

    await expect(submissions.insertSurveyResponse(db as never, SURVEY)).rejects.toThrow(
      /cannot be null/,
    );
    // Satu kali saja: galat ini tidak akan hilang dengan mencoba kode lain.
    expect(percobaan()).toBe(1);
  });

  it("tidak mencoba lagi kalau galatnya tidak punya kode PostgreSQL sama sekali", async () => {
    const { db, percobaan } = dbYangSelaluGagal(() => new Error("jaringan putus"));

    await expect(submissions.insertSurveyResponse(db as never, SURVEY)).rejects.toThrow(
      /jaringan putus/,
    );
    expect(percobaan()).toBe(1);
  });

  it("memakai awalan yang sesuai untuk tiap jenis formulir", async () => {
    // Tiap jenis punya awalan sendiri supaya orang yang membaca kode lewat
    // telepon tahu itu pendaftaran atau pengaduan.
    const db = {
      insert: () => {
        const builder = {
          values: () => builder,
          returning: async () => [{ ticket_code: "APASIL" }],
        };
        return builder;
      },
    };

    await submissions.insertFeedback(db as never, {
      feedback_type: "saran",
      name: null,
      email: null,
      phone: null,
      subject: null,
      message: "Isi pesan",
      service_unit: null,
    });

    expect(generateTicket).toHaveBeenCalledWith("feedback");
  });
});