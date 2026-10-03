import { describe, expect, it } from "vitest";
import {
  Errors,
  choice,
  digitsExact,
  email,
  formatIsoDate,
  integerRange,
  isHoneypotTrap,
  parseIsoDate,
  phoneId,
  searchPattern,
  textOptional,
  textRequired,
} from "@/server/validation";

/**
 * Aturan validasi diuji di sini karena tidak bisa dijamin mata: satu pesan
 * yang berubah teks atau satu batas yang bergeser membuat panel menampilkan
 * kesalahan yang tidak ada, atau membiarkan kesalahan yang ada lolos.
 */

/** Kumpulkan pesan galat menjadi objek biasa supaya bisa dibandingkan. */
function pesan(errors: Errors): Record<string, string> {
  return Object.fromEntries(errors.entries());
}

describe("textRequired", () => {
  it("menerima teks yang berada di dalam rentang", () => {
    const errors = new Errors();
    expect(textRequired(errors, "nama", "Budi Santoso", 3, 160)).toBe("Budi Santoso");
    expect(errors.isEmpty).toBe(true);
  });

  it("memangkas spasi di kedua ujung", () => {
    const errors = new Errors();
    expect(textRequired(errors, "nama", "   Budi   ", 3, 160)).toBe("Budi");
  });

  it("menolak teks kosong dan hanya spasi", () => {
    for (const kosong of ["", "   ", "\n\t"]) {
      const errors = new Errors();
      expect(textRequired(errors, "nama", kosong, 3, 160)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("menolak teks yang lebih pendek dari batas minimum", () => {
    const errors = new Errors();
    expect(textRequired(errors, "nama", "Bu", 3, 160)).toBeNull();
    expect(pesan(errors).nama).toMatch(/Minimal 3 karakter/);
  });

  it("menolak teks yang lebih panjang dari batas maksimum", () => {
    const errors = new Errors();
    expect(textRequired(errors, "nama", "a".repeat(161), 3, 160)).toBeNull();
    expect(pesan(errors).nama).toMatch(/Maksimal 160 karakter/);
  });

  it("menerima tepat di kedua batas", () => {
    const errors = new Errors();
    expect(textRequired(errors, "nama", "abc", 3, 160)).toBe("abc");
    expect(textRequired(errors, "nama2", "b".repeat(160), 3, 160)).toHaveLength(160);
    expect(errors.isEmpty).toBe(true);
  });

  it("menyebut nama field yang dilanggar", () => {
    // Panel menampilkan pesan di bawah input yang salah, jadi nama field di
    // dalam pesan harus sama dengan nama field di formulir.
    const errors = new Errors();
    textRequired(errors, "patient_name", "", 3, 160);
    expect(Object.keys(pesan(errors))).toEqual(["patient_name"]);
  });
});

describe("textOptional", () => {
  it("mengubah kosong menjadi null, bukan string kosong", () => {
    // Kolom database harus menyimpan null. String kosong dan null berbeda di
    // laporan, dan "sudah diisi" bukan artinya isinya ada.
    const errors = new Errors();
    expect(textOptional(errors, "catatan", "   ", 1000)).toBeNull();
    expect(errors.isEmpty).toBe(true);
  });

  it("tetap memangkas teks yang ada", () => {
    const errors = new Errors();
    expect(textOptional(errors, "catatan", " ACD  ", 1000)).toBe("ACD");
  });

  it("tetap menolak yang melebihi batas", () => {
    const errors = new Errors();
    expect(textOptional(errors, "catatan", "a".repeat(1001), 1000)).toBeNull();
    expect(errors.isEmpty).toBe(false);
  });
});

describe("email", () => {
  it("menerima alamat yang wajar", () => {
    for (const alamat of [
      "admin@contoh.test",
      "nama.dengan.titik@subdomain.contoh.id",
      "ada+tag@contoh.test",
    ]) {
      const errors = new Errors();
      expect(email(errors, "email", alamat, true)).toBe(alamat);
      expect(errors.isEmpty).toBe(true);
    }
  });

  it("menolak alamat yang tidak mungkin", () => {
    for (const alamat of [
      "tanpa-at-sign.test",
      "@tanpa-nama.test",
      "tanpa-domain@",
      "dua@@at.com",
      "spasi di@ dalam.test",
      "",
    ]) {
      const errors = new Errors();
      expect(email(errors, "email", alamat, true)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("tidak mewajibkan surel saat required false", () => {
    const errors = new Errors();
    expect(email(errors, "email", "", false)).toBeNull();
    expect(errors.isEmpty).toBe(true);
  });

  it("tetap menolak alamat rusak walau tidak diwajibkan", () => {
    // Opsional berarti boleh dikosongkan, bukan berarti isinya bebas.
    const errors = new Errors();
    expect(email(errors, "email", "bukan-surel", false)).toBeNull();
    expect(errors.isEmpty).toBe(false);
  });
});

describe("phoneId", () => {
  it("menerima nomor Indonesia dalam beberapa bentuk", () => {
    for (const nomor of [
      "081234567890",
      "+6281234567890",
      "6281234567890",
      "0812-3456-7890",
      "0812 3456 7890",
      "(0812) 3456-7890",
      "+62 812-3456-7890",
    ]) {
      const errors = new Errors();
      expect(phoneId(errors, "phone", nomor, true)).not.toBeNull();
      expect(errors.isEmpty).toBe(true);
    }
  });

  it("menolak huruf dan tanda baca lain", () => {
    for (const nomor of ["0812abc45678", "0812#3456#7890", "bukan-nomor"]) {
      const errors = new Errors();
      expect(phoneId(errors, "phone", nomor, true)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("menolak nomor yang terlalu pendek", () => {
    const errors = new Errors();
    expect(phoneId(errors, "phone", "0812", true)).toBeNull();
    expect(errors.isEmpty).toBe(false);
  });

  it("tidak mewajibkan nomor saat required false", () => {
    const errors = new Errors();
    expect(phoneId(errors, "phone", "", false)).toBeNull();
    expect(errors.isEmpty).toBe(true);
  });
});

describe("digitsExact", () => {
  it("menerima tepat enam belas digit", () => {
    const errors = new Errors();
    digitsExact(errors, "nik", "3201234567890123", 16);
    expect(errors.isEmpty).toBe(true);
  });

  it("meloloskan spasi dan tanda hubung lalu memangkas keduanya", () => {
    // Orang mengetik NIK persis seperti yang tercetak di KTP. Menolaknya hanya
    // memaksa menebak format yang benar.
    for (const nik of [
      "3201 2345 6789 0123",
      "3201-2345-6789-0123",
      "  3201234567890123  ",
    ]) {
      const errors = new Errors();
      expect(digitsExact(errors, "nik", nik, 16)).toBe("3201234567890123");
      expect(errors.isEmpty).toBe(true);
    }
  });

  it("menolak huruf dan tanda baca lain", () => {
    for (const nik of ["320123456789012a", "3201.2345.6789.0123", "+320123456789012"]) {
      const errors = new Errors();
      expect(digitsExact(errors, "nik", nik, 16)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("menolak panjang yang salah", () => {
    for (const nik of ["320123456789012", "32012345678901234"]) {
      const errors = new Errors();
      digitsExact(errors, "nik", nik, 16);
      expect(errors.isEmpty).toBe(false);
    }
  });
});

describe("choice", () => {
  it("menerima nilai yang ada dalam daftar", () => {
    const errors = new Errors();
    expect(choice(errors, "severity", "high", ["low", "medium", "high"])).toBe("high");
    expect(errors.isEmpty).toBe(true);
  });

  it("menolak nilai di luar daftar", () => {
    const errors = new Errors();
    expect(choice(errors, "severity", "sangat-tinggi", ["low", "high"])).toBeNull();
    expect(pesan(errors).severity).toBe("Pilihan tidak dikenali.");
  });

  it("membandingkan persis, bukan longgar", () => {
    const errors = new Errors();
    expect(choice(errors, "gender", "Male", ["male", "female"])).toBeNull();
    expect(errors.isEmpty).toBe(false);
  });
});

describe("integerRange", () => {
  it("menerima bilangan bulat di dalam rentang", () => {
    const errors = new Errors();
    expect(integerRange(errors, "skor", 3, 1, 5)).toBe(3);
    expect(errors.isEmpty).toBe(true);
  });

  it("menolak nilai di luar rentang", () => {
    for (const nilai of [0, 6, -1, 100]) {
      const errors = new Errors();
      expect(integerRange(errors, "skor", nilai, 1, 5)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("menolak bilangan pecahan dan bukan angka", () => {
    for (const nilai of [2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const errors = new Errors();
      expect(integerRange(errors, "skor", nilai, 1, 5)).toBeNull();
      expect(errors.isEmpty).toBe(false);
    }
  });

  it("menerima tepat di kedua batas", () => {
    const errors = new Errors();
    expect(integerRange(errors, "skor", 1, 1, 5)).toBe(1);
    expect(integerRange(errors, "skor2", 5, 1, 5)).toBe(5);
    expect(errors.isEmpty).toBe(true);
  });
});

describe("tanggal", () => {
  it("mengubah tanggal ISO menjadi objek Date di UTC", () => {
    // Tanggal yang sama harus menghasilkan objek yang sama di server mana pun.
    // Kalau parsing memakai waktu lokal, satu tanggal bisa bergeser satu hari.
    const tanggal = parseIsoDate("2026-10-05");
    expect(tanggal).not.toBeNull();
    expect(formatIsoDate(tanggal!)).toBe("2026-10-05");
  });

  it("menolak bentuk lain", () => {
    for (const buruk of [
      "05-10-2026",
      "2026/10/05",
      "2026-13-01",
      "2026-02-30",
      "bukan tanggal",
      "2026-10-05T10:00:00",
    ]) {
      expect(parseIsoDate(buruk)).toBeNull();
    }
  });

  it("membulatkan format ISO dengan jam ke bawah", () => {
    // Pembulatan ke bawah, bukan ke atas: 23:59 pada hari yang sama harus tetap
    // hari yang sama, bukan melompat ke besok.
    expect(formatIsoDate(new Date("2026-10-05T23:59:59.999Z"))).toBe("2026-10-05");
    expect(formatIsoDate(new Date("2026-10-05T00:00:00.000Z"))).toBe("2026-10-05");
  });
});

describe("searchPattern", () => {
  it("mengubah kata kunci menjadi pola yang mencocokkan substring", () => {
    expect(searchPattern("jam")).toBe("%jam%");
  });

  it("mengembalikan string kosong untuk kata kunci kosong", () => {
    // Ini yang membuat pemanggil wajib memilih tidak menambahkan klausa
    // pencarian sama sekali. `kolom ILIKE ''` tidak pernah bernilai benar, jadi
    // menempelkan klausanya membuat daftar selalu kosong.
    expect(searchPattern("")).toBe("");
    expect(searchPattern("   ")).toBe("");
    expect(searchPattern("\n\t")).toBe("");
  });

  it("meloloskan wildcard di dalam teks", () => {
    // Tanpa pelolosan, satu `%` saja akan cocok dengan seluruh tabel dan
    // `100%` akan terbaca sebagai "mulai dengan 100".
    expect(searchPattern("100%")).toBe("%100\\%%");
    expect(searchPattern("a_b")).toBe("%a\\_b%");
    expect(searchPattern("a\\b")).toBe("%a\\\\b%");
  });

  it("menghasilkan pola yang tidak bisa keluar dari kueri", () => {
    // Penanda backslash dipakai supaya setiap kueri yang memakai hasil fungsi
    // ini wajib menyertakan ESCAPE, dan sql.raw tidak pernah ikut terpakai.
    for (const masukan of ["% _ \\"]) {
      const pola = searchPattern(masukan);
      expect(pola.startsWith("%")).toBe(true);
      expect(pola.endsWith("%")).toBe(true);
    }
  });

  it("memangkas spasi yang tidak perlu", () => {
    expect(searchPattern("  jam\t\n  layanan  ")).toBe("%jam layanan%");
  });
});

describe("isHoneypotTrap", () => {
  it("menandai field perangkap yang terisi", () => {
    // Kolom perangkap diisi robot dan tidak pernah diisi manusia.
    expect(isHoneypotTrap("https://spam.example")).toBe(true);
    expect(isHoneypotTrap("   x")).toBe(true);
  });

  it("tidak menandai field yang kosong", () => {
    for (const kosong of ["", "   ", "\n"]) {
      expect(isHoneypotTrap(kosong)).toBe(false);
    }
  });
});
