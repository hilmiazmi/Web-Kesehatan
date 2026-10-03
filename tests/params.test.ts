import { describe, expect, it } from "vitest";
import {
  bilangan,
  bilanganTerbatas,
  boolean,
  tanggal,
  teks,
  uuid,
} from "@/server/api/params";
import { ApiError } from "@/server/api/error";

/**
 * Helper di sini yang dipakai setiap route handler. Kesalahannya muncul sebagai
 * galat yang menyebut field yang tidak ada, atau sebagai jawaban diam-diam yang
 * salah bentuk, jadi yang diuji adalah normalisasi dan pesan galatnya.
 */

const SEGMENT: Record<string, string> = {
  id: "159d67cc-ab55-4fa0-ade5-52cab57952f3",
  jadwal: "9e88c48b-d078-4e4e-a33b-40290b7c9ba9",
};

function q(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("teks", () => {
  it("mengembalikan string yang sudah dipangkas", () => {
    expect(teks(q("name=%20Budi%20"), "name")).toBe("Budi");
  });

  it("mengubah yang kosong menjadi null", () => {
    // Kalau string kosong diteruskan, setiap filter harus memeriksa dua bentuk
    // "tidak ada filter", dan satu pemeriksaan yang lupa akan mengubah
    // `?category=` menjadi "hanya kategori kosong".
    expect(teks(q("category="), "category")).toBeNull();
    expect(teks(q("category=%20%20"), "category")).toBeNull();
    expect(teks(q(""), "category")).toBeNull();
  });

  it("mengambil nilai pertama saat parameter berulang", () => {
    // `URLSearchParams.get` selalu mengembalikan yang pertama. Membaca yang
    // terakhir akan membuat attacker bisa menyembunyikan nilai aslinya di
    // belakang nilai kedua.
    expect(teks(q("id=pertama&id=kedua"), "id")).toBe("pertama");
  });

  it("membaca dari segmen path", () => {
    expect(teks(SEGMENT, "id")).toBe(SEGMENT.id);
  });
});


describe("bilangan", () => {
  it("mengubah teks angka menjadi bilangan", () => {
    expect(bilangan(q("page=3"), "page", 1)).toBe(3);
    expect(bilangan(q("page=-2"), "page", 1)).toBe(-2);
  });

  it("memakai nilai bawaan saat parameter tidak ada atau kosong", () => {
    expect(bilangan(q(""), "page", 1)).toBe(1);
    expect(bilangan(q("page="), "page", 7)).toBe(7);
  });

  it("menolak teks yang bukan bilangan", () => {
    // `?page=dua` yang diam-diam jadi halaman satu membuat panel terlihat
    // rusak tanpa penjelasan.
    for (const buruk of ["dua", "1.5", "1e3", "0x10", " 1 2 "]) {
      expect(() => bilangan(q(`page=${encodeURIComponent(buruk)}`), "page", 1)).toThrow(
        ApiError,
      );
    }
  });

  it("menyebut nama parameternya dalam pesan galat", () => {
    try {
      bilangan(q("page=dua"), "page", 1);
      expect.unreachable("tidak seharusnya melempar");
    } catch (err) {
      expect((err as ApiError).fields).toEqual({ page: "Harus bilangan bulat." });
      expect((err as ApiError).status).toBe(422);
    }
  });
});

describe("bilanganTerbatas", () => {
  it("menjepit nilai di luar rentang, bukan menolaknya", () => {
    // Panel yang mengirim page_size=1000 lebih baik dilayani sepuluh penuh
    // daripada ditolak.
    expect(bilanganTerbatas(q("page_size=1000"), "page_size", 25, 1, 100)).toBe(100);
    expect(bilanganTerbatas(q("page_size=0"), "page_size", 25, 1, 100)).toBe(1);
    expect(bilanganTerbatas(q("page_size=50"), "page_size", 25, 1, 100)).toBe(50);
  });

  it("memakai nilai bawaan saat parameter tidak ada", () => {
    expect(bilanganTerbatas(q(""), "page_size", 25, 1, 100)).toBe(25);
  });

  it("tetap menolak teks yang bukan bilangan", () => {
    expect(() => bilanganTerbatas(q("page_size=banyak"), "page_size", 25, 1, 100)).toThrow(
      ApiError,
    );
  });
});

describe("boolean", () => {
  it("mengenali bentuk ya yang lazim dipakai panel", () => {
    for (const nilai of ["1", "true", "TRUE", "yes", "on", "ya"]) {
      expect(boolean(q(`flag=${nilai}`), "flag"), nilai).toBe(true);
    }
  });

  it("menganggap bentuk lain sebagai tidak", () => {
    // `desc=0` berarti tidak menurun, bukan berarti menurun.
    for (const nilai of ["0", "false", "no", "off", "", "  ", "mungkin"]) {
      expect(boolean(q(`flag=${nilai}`), "flag"), nilai).toBe(false);
    }
  });

  it("menganggap parameter yang tidak ada sebagai tidak", () => {
    expect(boolean(q(""), "desc")).toBe(false);
  });
});

describe("uuid", () => {
  it("menerima UUID dalam huruf besar dan huruf kecil", () => {
    const atas = SEGMENT.id.toUpperCase();
    expect(uuid(atas, "id")).toBe(atas);
    expect(uuid(SEGMENT.id, "id")).toBe(SEGMENT.id);
  });

  it("menerima UUID v5 dari seed", () => {
    // Seed memakai UUID v5 supaya id-nya bisa dihitung. Menolak v5 membuat
    // seluruh isi seed tidak bisa dijangkau lewat API.
    const v5 = "2207cc2f-fde8-55bc-b2d7-bfa3e9c5e312";
    expect(uuid(v5, "doctor")).toBe(v5);
  });

  it("memangkas spasi di sekitar", () => {
    expect(uuid(`  ${SEGMENT.id}  `, "id")).toBe(SEGMENT.id);
  });

  it("menolak yang bukan UUID dan menyebut nama field", () => {
    for (const buruk of ["", "   ", "bukan-uuid", SEGMENT.id.slice(0, -1), "1-2-3-4-5"]) {
      try {
        uuid(buruk, "doctor");
        expect.unreachable("tidak seharusnya melempar");
      } catch (err) {
        expect((err as ApiError).fields, buruk).toEqual({
          doctor: "Format ID tidak valid.",
        });
      }
    }
  });

  it("menolak nilai yang tidak ada", () => {
    try {
      uuid(undefined, "doctor");
      expect.unreachable("tidak seharusnya melempar");
    } catch (err) {
      expect((err as ApiError).fields).toEqual({ doctor: "Format ID tidak valid." });
    }
  });

  it("menyebut nama yang diminta, bukan nama segmen URL", () => {
    // Nama field di pesan galat adalah yang diisi formulir, bukan nama segmen
    // di URL. Kalau tertukar, pesan muncul di bawah input yang salah.
    for (const nama of ["doctor", "schedule_id", "id"]) {
      try {
        uuid("", nama);
        expect.unreachable("tidak seharusnya melempar");
      } catch (err) {
        expect(Object.keys((err as ApiError).fields ?? {}), nama).toEqual([nama]);
      }
    }
  });
});

describe("tanggal", () => {
  it("menerima format YYYY-MM-DD", () => {
    const hasil = tanggal(q("date=2026-10-05"), "date");

    if (!hasil.ada) expect.unreachable("tidak seharusnya ditolak");
    expect(hasil.nilai).toBe("2026-10-05");
  });

  it("menerima tanggal lengkap dengan jam", () => {
    // Beberapa klien mengirim nilai dari input tanggal bersama jam WIB, dan
    // menolaknya hanya akan memaksa klien memangkas sendiri.
    const hasil = tanggal(q("date=2026-10-05T00:00:00.000Z"), "date");

    if (!hasil.ada) expect.unreachable("tidak seharusnya ditolak");
    expect(hasil.nilai).toBe("2026-10-05");
  });

  it("mengembalikan tanda tidak-ada tanpa nilai saat parameter tidak ada", () => {
    // Bentuknya discriminated union, bukan nilai kosong. `ada: false` tanpa
    // `nilai` membuat pemanggil tidak bisa salah membaca `""` sebagai tanggal.
    const hasil = tanggal(q(""), "date");

    expect(hasil).toEqual({ ada: false });
  });

  it("menolak bentuk lain dan menyebut nama parameternya", () => {
    for (const buruk of ["05-10-2026", "2026/10/05", "besok", "2026-13-01"]) {
      try {
        tanggal(q(`date=${encodeURIComponent(buruk)}`), "date");
        expect.unreachable("tidak seharusnya melempar");
      } catch (err) {
        expect(Object.keys((err as ApiError).fields ?? {}), buruk).toEqual(["date"]);
      }
    }
  });
});
