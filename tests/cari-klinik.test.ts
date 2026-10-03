import { describe, expect, it } from "vitest";
import {
  cariKlinik,
  type DokterCari,
  type DetailCari,
  type KlinikCari,
} from "@/lib/cari-klinik";

/**
 * Data contoh. Sengaja dibuat kecil supaya setiap aturan bisa diuji satu per
 * satu tanpa ikut campur data enam belas klinik yang sebenarnya.
 */
const KLINIK: KlinikCari[] = [
  {
    slug: "anak",
    name: "ANAK",
    description: "Klinik untuk pasien anak.",
    services: ["Vaksinasi Anak", "Konseling Tumbuh Kembang"],
    hours: "Senin sampai Jumat",
  },
  {
    slug: "gizi-klinik",
    name: "GIZI KLINIK",
    description: "Konseling pola makan bagi pasien yang sedang dalam perawatan.",
    services: ["Konseling Pola Makan", "Evaluasi Gizi"],
    hours: "Senin sampai Jumat",
  },
  {
    slug: "mata",
    name: "MATA",
    description: "Pemeriksaan kesehatan penglihatan dan kacamata.",
    services: ["Katarak", "Glaukoma"],
    hours: "Selasa dan Kamis",
  },
];

const DETAIL: DetailCari[] = [
  {
    slug: "anak",
    name: "ANAK",
    clinicSlug: "anak",
    specialty: "Anak",
  },
  {
    slug: "gizi-klinik",
    name: "GIZI KLINIK",
    clinicSlug: "gizi-klinik",
    specialty: "Gizi Klinik",
  },
  // Tanpa spesialis. Kartu seperti ini tidak boleh menarik dokter mana pun.
  { slug: "mata-tanpa-spesialis", name: "MATA", clinicSlug: "mata" },
];

const DOKTER: DokterCari[] = [
  { slug: "dr-annisa", name: "dr. Annisa Rahma, Sp.A", specialty: "Anak" },
  { slug: "dr-bagas", name: "dr. Bagas Pratama, Sp.A", specialty: "Anak" },
  { slug: "dr-citra", name: "dr. Citra Lestari, Sp.G", specialty: "Gizi Klinik" },
  // Spesialis ini tidak dipakai kartu detail klinik mana pun pada data
  // contoh, jadi dokter ini tidak boleh muncul di klinik mana pun.
  { slug: "dr-yuli", name: "dr. Yuli Wulandari, Sp.M", specialty: "Mata" },
];

const cari = (q: string) => cariKlinik(KLINIK, DETAIL, DOKTER, q);
const slug = (hasil: { klinik: KlinikCari[] }) => hasil.klinik.map((k) => k.slug);

describe("cariKlinik tanpa kata kunci", () => {
  it("mengembalikan seluruh klinik", () => {
    expect(cari("").klinik).toHaveLength(3);
  });

  it("menganggap spasi yang tidak sengaja diketik sebagai kosong", () => {
    expect(cari("   ").klinik).toHaveLength(3);
  });

  it("mengembalikan seluruh kartu detail milik tiap klinik", () => {
    expect(cari("").detail["anak"]).toHaveLength(1);
    expect(cari("").detail["mata"]).toHaveLength(1);
  });

  it("tidak menampilkan dokter, supaya bentuk panel awal tetap sama", () => {
    // Tanpa kata kunci, panel menampilkan seluruh layanan dan seluruh kartu
    // detail. Daftar dokter baru muncul kalau pengguna memang menyaring.
    expect(cari("").dokter["anak"]).toEqual([]);
  });
});

describe("cariKlinik mencocokkan isi klinik", () => {
  it("menyaring dari nama klinik", () => {
    expect(slug(cari("gizi"))).toEqual(["gizi-klinik"]);
  });

  it("mengabaikan huruf besar di kata kunci", () => {
    expect(slug(cari("GIZI"))).toEqual(["gizi-klinik"]);
  });

  it("mengabaikan spasi yang tidak sengaja diketik", () => {
    // "zi" adalah potongan dari "gizi" dan "klin" dari "klinik". Spasi
    // berulang dan spasi di ujung tidak boleh membuat kata kunci gagal.
    expect(slug(cari("  zi   klin "))).toEqual(["gizi-klinik"]);
  });

  it("menyaring dari deskripsi, bukan hanya dari nama", () => {
    // "kacamata" hanya ada di deskripsi MATA.
    expect(slug(cari("kacamata"))).toEqual(["mata"]);
  });

  it("menyaring dari daftar layanan", () => {
    // "Vaksinasi" tidak ada di nama klinik mana pun, hanya di layanan ANAK.
    expect(slug(cari("vaksinasi"))).toEqual(["anak"]);
  });

  it("tidak mengubah urutan klinik yang tersisa", () => {
    // Urutan harus tetap mengikuti masukan, bukan urutan kata kunci.
    const hasil = cari("klinik");
    expect(slug(hasil)).toEqual(["anak", "gizi-klinik"]);
  });
});

describe("cariKlinik dengan beberapa kata", () => {
  it("mencocokkan kata yang tersebar di beberapa kolom klinik yang sama", () => {
    // "konseling" ada di layanan GIZI KLINIK dan "anak" ada di nama klinik
    // ANAK. Karena kata dicari di seluruh teks klinik, GIZI KLINIK tetap
    // lolos lewat kata "konseling", dan ANAK lolos lewat "anak".
    const hasil = slug(cari("vaksinasi tumbuh"));
    expect(hasil).toContain("anak");
  });

  it("menyaring klinik yang punya kedua kata, walau ada klinik lain yang hanya punya satu", () => {
    // "konseling" ada di GIZI KLINIK dan "glaukoma" ada di MATA. Tidak ada
    // klinik yang punya keduanya, jadi hasilnya kosong. Ini yang diharapkan
    // orang dari kotak pencarian: setiap kata harus menemukan clinic.
    expect(cari("konseling glaukoma").klinik).toEqual([]);
  });

  it("menyaring klinik yang kata kuncinya ada di kolom berbeda", () => {
    // "gizi" ada di nama GIZI KLINIK dan "pola" ada di layanannya.
    expect(slug(cari("gizi pola"))).toEqual(["gizi-klinik"]);
  });
});

describe("cariKlinik dan dokter", () => {
  it("memunculkan klinik ketika nama dokter diketik", () => {
    expect(slug(cari("annisa"))).toEqual(["anak"]);
  });

  it("menampilkan hanya dokter yang namanya cocok", () => {
    expect(cari("annisa").dokter["anak"].map((d) => d.slug)).toEqual([
      "dr-annisa",
    ]);
  });

  it("bisa menampilkan lebih dari satu dokter", () => {
    // Kedua dokter ANAK sama-sama punya gelar "Sp.A". Huruf kecil dari
    // "sp" ada di keduanya.
    expect(cari("sp").dokter["anak"].map((d) => d.slug)).toEqual([
      "dr-annisa",
      "dr-bagas",
    ]);
  });

  it("memunculkan klinik ketika spesialis dokter diketik", () => {
    const hasil = cari("gizi klinik");
    expect(slug(hasil)).toEqual(["gizi-klinik"]);
    expect(hasil.dokter["gizi-klinik"].map((d) => d.slug)).toEqual(["dr-citra"]);
  });

  it("tidak menampilkan dokter yang spesialisnya tidak dipakai klinik mana pun", () => {
    // dr. Yuli berdokter spesialis Mata, tapi kartu detail MATA pada data
    // contoh sengaja tidak punya spesialis.
    expect(cari("yuli").klinik).toEqual([]);
  });

  it("tidak menempelkan dokter ke klinik yang kartunya tidak punya spesialis", () => {
    // dr-annisa tidak boleh ikut muncul di panel MATA.
    expect(cari("mata").dokter["mata"]).toEqual([]);
  });

  it("menampilkan dokter dengan spesialis yang cocok ketika kliniknya cocok", () => {
    // Kata kunci "anak" cocok dengan nama klinik ANAK, tapi hanya
    // dr-annisa yang namanya mengandung kata itu.
    expect(cari("anak").dokter["anak"].map((d) => d.slug)).toEqual([
      "dr-annisa",
      "dr-bagas",
    ]);
  });
});

describe("cariKlinik dan kartu detail", () => {
  it("menyaring kartu detail di dalam klinik yang cocok", () => {
    const hasil = cari("gizi klinik");
    expect(hasil.detail["gizi-klinik"].map((d) => d.slug)).toEqual([
      "gizi-klinik",
    ]);
  });

  it("membuang kartu detail yang tidak cocok ketika kliniknya sendiri cocok", () => {
    // "glaukoma" cocok dengan layanan MATA, jadi klinik MATA lolos, tetapi
    // kartu MATA di dalamnya tidak punya kata itu dan jadi dibuang.
    const hasil = cari("glaukoma");
    expect(slug(hasil)).toEqual(["mata"]);
    expect(hasil.detail["mata"]).toEqual([]);
  });

  it("tidak pernah memberi daftar detail untuk klinik yang sudah disingkirkan", () => {
    const hasil = cari("kacamata");
    expect(slug(hasil)).toEqual(["mata"]);
    expect(hasil.detail["anak"]).toBeUndefined();
    expect(hasil.dokter["anak"]).toBeUndefined();
  });
});

describe("cariKlinik tanpa hasil", () => {
  it("mengembalikan daftar kosong dan bukan objek berisi undefined", () => {
    const hasil = cari("zzzz");
    expect(hasil.klinik).toEqual([]);
    expect(hasil.detail).toEqual({});
    expect(hasil.dokter).toEqual({});
  });

  it("tidak melempar exception saat data masukannya kosong", () => {
    expect(() => cariKlinik([], [], [], "apa saja")).not.toThrow();
    expect(cariKlinik([], [], [], "apa saja").klinik).toEqual([]);
  });
});