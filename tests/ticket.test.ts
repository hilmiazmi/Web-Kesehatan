import { describe, expect, it } from "vitest";
import {
  PREFIX,
  TICKET_LENGTH,
  generateTicket,
  isTicketShapeValid,
  ticketKindFromCode,
} from "@/server/ticket";

/**
 * Kode tiket adalah satu-satunya kunci yang diberikan ke orang yang tidak punya
 * akun. Empat sifat di bawah ini yang membuatnya berguna: awalan yang bisa
 * dibaca orang, panjang tetap, alphabet yang tidak meniru angka, dan bentuk
 * yang bisa diperiksa sebelum menyentuh database.
 */

describe("generateTicket", () => {
  it("memakai awalan tiap jenis formulir", () => {
    for (const [jenis, awalan] of Object.entries(PREFIX)) {
      const kode = generateTicket(jenis as keyof typeof PREFIX);
      expect(kode.startsWith(`${awalan}-`)).toBe(true);
    }
  });

  it("menghasilkan panjang yang selalu sama", () => {
    // Kolomnya varchar(24). Panjang tetap berarti menambah jenis formulir baru
    // tidak perlu mengubah skema.
    for (let i = 0; i < 200; i += 1) {
      expect(generateTicket("appointment")).toHaveLength(TICKET_LENGTH);
    }
  });

  it("tidak memakai huruf yang mirip angka", () => {
    // Kode tiket sering dictate lewat telepon. Huruf I, O, dan angka 0 serta 1
    // membuat salah dengar, dan itu bug yang sulit dilacak karena kode diurus
    // orang berbeda setiap kali.
    for (let i = 0; i < 300; i += 1) {
      const kode = generateTicket("feedback");
      expect(kode).not.toMatch(/[IO01]/);
    }
  });

  it("membuat kode berbeda pada panggilan berturut-turut", () => {
    const kode = new Set<string>();
    for (let i = 0; i < 500; i += 1) kode.add(generateTicket("wbs"));

    // 31 pilihan untuk tiap delapan posisi, jadi 500 kode harus hampir pasti
    // unik. Tabrakan di sini berarti generator memakai sumber acak yang salah.
    expect(kode.size).toBeGreaterThanOrEqual(495);
  });
});

describe("ticketKindFromCode", () => {
  it("mengenali semua jenis yang ada", () => {
    for (const jenis of Object.keys(PREFIX) as (keyof typeof PREFIX)[]) {
      expect(ticketKindFromCode(generateTicket(jenis))).toBe(jenis);
    }
  });

  it("menerima awalan huruf kecil", () => {
    expect(ticketKindFromCode("ks-2345678a")).toBe("feedback");
  });

  it("menolak awalan yang tidak dikenal", () => {
    expect(ticketKindFromCode("XX-2345678A")).toBeNull();
    expect(ticketKindFromCode("")).toBeNull();
  });

  it("tidak salah membaca kode tanpa garis hubung", () => {
    // Tanpa garis hubung, `indexOf` mengembalikan -1 dan `slice(0, -1)`
    // mengambil seluruh string dikurangi satu karakter. Hasilnya harus tetap
    // ditolak, bukan dianggap salah satu jenis yang ada.
    expect(ticketKindFromCode("EP2345678A")).toBeNull();
  });
});

describe("isTicketShapeValid", () => {
  it("menerima kode yang dihasilkan sendiri", () => {
    for (const jenis of Object.keys(PREFIX) as (keyof typeof PREFIX)[]) {
      expect(isTicketShapeValid(generateTicket(jenis))).toBe(true);
    }
  });

  it("menolak huruf yang tidak ada di alphabet", () => {
    expect(isTicketShapeValid("EP-0123456A")).toBe(false);
    expect(isTicketShapeValid("EP-2345678I")).toBe(false);
  });

  it("menolak panjang yang salah", () => {
    expect(isTicketShapeValid("EP-2345678")).toBe(false);
    expect(isTicketShapeValid("EP-2345678AB")).toBe(false);
  });

  it("menolak awalan yang terlalu panjang", () => {
    expect(isTicketShapeValid("ABCDE-2345678A")).toBe(false);
  });

  it("menolak input kosong", () => {
    expect(isTicketShapeValid("")).toBe(false);
    expect(isTicketShapeValid("   ")).toBe(false);
  });
});
