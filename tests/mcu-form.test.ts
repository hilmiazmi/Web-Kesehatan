import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MCU_HOLIDAY_PACKAGES, MCU_PACKAGES } from "@/data/home";
import { buildPayload, petakanKolomServer, validate, type Fields } from "@/components/forms/mcu-form";

/**
 * Formulir pendaftaran MCU.
 *
 * Dua hal yang diuji di sini tidak terlihat dari mata.
 *
 * 1. Slug paket harus sama antara halaman dan database. Endpoint mencari paket
 *    dengan `packageIdBySlug`, jadi halaman yang slug-nya tidak ada di
 *    `mcu_packages` akan menjawab 404 "paket MCU" tepat saat orang menekan
 *    tombol daftar. Dua daftar itu pernah berbeda pada enam dari tiga belas
 *    paket, jadi sekarang keduanya dibaca di tes ini.
 *
 * 2. Field yang kosong tidak dikirim. `birth_date` dan `preferred_date` dibaca
 *    server sebagai "tidak diisi" kalau tidak ada, dan sebagai tanggal rusak
 *    kalau dikirim sebagai string kosong.
 */

const akar = path.resolve(import.meta.dirname, "..");

/** Slug paket dari halaman, digabung untuk reguler dan Health Meets Holiday. */
const SLUG_HALAMAN = [
  ...MCU_PACKAGES.map((p) => p.slug),
  ...MCU_HOLIDAY_PACKAGES.map((p) => p.slug),
];

/** Slug paket yang tersimpan di seed database. */
function slugSeed(): string[] {
  const isi = JSON.parse(readFileSync(path.join(akar, "scripts/seed-data.json"), "utf8")) as {
    tables: { mcuPackages: { slug: string }[] };
  };
  return isi.tables.mcuPackages.map((p) => p.slug);
}

const SAH: Fields = {
  nama: "Budi Santoso",
  telepon: "081234567890",
  surel: "",
  perusahaan: "",
  gender: "",
  lahir: "",
  tanggal: "",
  peserta: "1",
  catatan: "",
  website: "",
};

describe("slug paket MCU", () => {
  it("setiap paket di halaman punya baris di seed database", () => {
    // Yang diuji hanya seed, bukan isi database yang sedang terhubung. Seed
    // adalah sumber yang ikut di-commit, jadi tes ini jalan tanpa server.
    const ada = new Set(slugSeed());
    const hilang = SLUG_HALAMAN.filter((s) => !ada.has(s));
    expect(hilang).toEqual([]);
  });

  it("tidak ada baris database yang tidak punya halaman", () => {
    // Baris tanpa halaman muncul di panel admin lalu tidak bisa dipilih siapa
    // pun. Lebih baik dihapus daripada diam-diam menggantung di sana.
    const diHalaman = new Set(SLUG_HALAMAN);
    const menggantung = slugSeed().filter((s) => !diHalaman.has(s));
    expect(menggantung).toEqual([]);
  });

  it("slug halaman berbentuk URL dan unik", () => {
    for (const s of SLUG_HALAMAN) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(SLUG_HALAMAN).size).toBe(SLUG_HALAMAN.length);
  });

  it("tidak ada slug lama yang masih dipakai di halaman", () => {
    // Dua slug lama pernah tertinggal di database. Kalau salah satunya
    // masih ada di halaman, tes "baris tanpa halaman" akan menutupinya dari
    // sisi lain, jadi kedua arahnya diperiksa.
    const lama = ["paket-pemeriksaan-bebas-narkotik", "anak-sekolah-basic", "anak-sekolah-medical"];
    for (const s of lama) expect(SLUG_HALAMAN).not.toContain(s);
  });
});

describe("validate formulir MCU", () => {
  it("menerima nama dan telepon saja", () => {
    // Surel, perusahaan, jenis kelamin, tanggal, dan catatan semuanya opsional
    // di backend, jadi tidak boleh diwajibkan di sini.
    expect(validate(SAH)).toEqual({});
  });

  it("menolak nama yang terlalu pendek", () => {
    expect(validate({ ...SAH, nama: "Bu" }).nama).toBeTruthy();
    expect(validate({ ...SAH, nama: "Budi" }).nama).toBeUndefined();
  });

  it("menolak telepon yang tidak valid", () => {
    expect(validate({ ...SAH, telepon: "123" }).telepon).toBeTruthy();
    expect(validate({ ...SAH, telepon: "0812 3456-7890" }).telepon).toBeUndefined();
  });

  it("hanya memeriksa surel kalau diisi", () => {
    expect(validate({ ...SAH, surel: "" }).surel).toBeUndefined();
    expect(validate({ ...SAH, surel: "bukan-surel" }).surel).toBeTruthy();
  });

  it("menolak jumlah peserta di luar 1 sampai 50", () => {
    // Batasnya mengikuti CHECK di database. Kirim 0 akan ditolak server dengan
    // nama constraint, jadi batasnya dicegah lebih dulu di peramban.
    expect(validate({ ...SAH, peserta: "0" }).peserta).toBeTruthy();
    expect(validate({ ...SAH, peserta: "51" }).peserta).toBeTruthy();
    expect(validate({ ...SAH, peserta: "" }).peserta).toBeTruthy();
    expect(validate({ ...SAH, peserta: "1" }).peserta).toBeUndefined();
    expect(validate({ ...SAH, peserta: "50" }).peserta).toBeUndefined();
  });

  it("menolak catatan yang melebihi batas server", () => {
    expect(validate({ ...SAH, catatan: "a".repeat(1001) }).catatan).toBeTruthy();
    expect(validate({ ...SAH, catatan: "a".repeat(1000) }).catatan).toBeUndefined();
  });
});

describe("buildPayload MCU", () => {
  it("mengirim slug paket yang sedang dibuka", () => {
    // Slug selalu dikirim, termasuk kalau string kosong. Endpoint menjawab 400
    // dengan menyebut kolomnya, dan itu lebih berguna daripada 404 paket.
    expect(buildPayload(SAH, "paket-dasar-1")["package"]).toBe("paket-dasar-1");
  });

  it("mengirim nama, telepon, dan jumlah peserta", () => {
    const body = buildPayload(SAH, "paket-dasar-1");
    expect(body["name"]).toBe("Budi Santoso");
    expect(body["phone"]).toBe("081234567890");
    expect(body["participant_count"]).toBe("1");
  });

  it("tidak mengirim field opsional yang kosong", () => {
    const body = buildPayload(SAH, "paket-dasar-1");
    expect(body).not.toHaveProperty("birth_date");
    expect(body).not.toHaveProperty("preferred_date");
    expect(body).not.toHaveProperty("gender");
    expect(body).not.toHaveProperty("company_name");
    expect(body).not.toHaveProperty("notes");
  });

  it("memotong spasi di sekeliling nilai", () => {
    const body = buildPayload({ ...SAH, nama: "  Budi  ", catatan: " buka jam 9 " }, "paket-dasar-1");
    expect(body["name"]).toBe("Budi");
    expect(body["notes"]).toBe("buka jam 9");
  });

  it("tetap mengirim kolom perangkap bot", () => {
    expect(buildPayload({ ...SAH, website: "https://spam.test" }, "paket-dasar-1").website).toBe(
      "https://spam.test",
    );
  });
});

describe("petakanKolomServer MCU", () => {
  it("mengubah nama kolom server ke nama field formulir", () => {
    const hasil = petakanKolomServer({
      name: "Nama pemohon minimal 3 karakter.",
      participant_count: "Jumlah peserta harus antara 1 dan 50.",
    });
    expect(hasil.nama).toBeTruthy();
    expect(hasil.peserta).toBeTruthy();
  });

  it("membuang nama kolom yang tidak dikenal", () => {
    expect(petakanKolomServer({ tidak_dikenal: "Pesan." })).toEqual({});
  });
});

describe("berkas paket MCU", () => {
  it("kedua daftar paket tidak kosong dan punya harga", () => {
    expect(MCU_PACKAGES.length).toBeGreaterThan(0);
    expect(MCU_HOLIDAY_PACKAGES.length).toBeGreaterThan(0);
    for (const p of [...MCU_PACKAGES, ...MCU_HOLIDAY_PACKAGES]) {
      expect(p.price, p.slug).toBeGreaterThan(0);
      expect(p.items.length, p.slug).toBeGreaterThan(0);
    }
  });

  it("berkas migrasi untuk slug MCU ada kalau salah satu daftar berubah", () => {
    // Migrasi `0005` yang memindahkan slug. Kalau daftar paket berubah lagi
    // tanpa migrasi baru, database yang sudah ada akan punya slug yang tidak
    // sama dengan halaman dan tes slug di atas akan lulus tanpa memberi tahu.
    expect(existsSync(path.join(akar, "drizzle/0005_slug_paket_mcu.sql"))).toBe(true);
  });
});
