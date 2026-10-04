import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPayload,
  labelDokter,
  labelSlot,
  paymentTypeFor,
  petakanKolomServer,
  sisaSlot,
  slotPenuh,
  validate,
  waktuPendek,
  type Dokter,
  type Fields,
  type Slot,
} from "@/components/forms/registration-form";

/**
 * Aturan formulir E-Pasien.
 *
 * `validate` sengaja diuji sebagai fungsi murni. Dulu aturan ini pernah
 * ditolak semua waktu karena pemanggilnya lupa memasang hasil ke state, jadi
 * tidak ada satu pun tes yang menyentuh kode ini sebelum ini.
 *
 * Fungsi penerjemah juga diuji di sini: nama field formulir berbahasa
 * Indonesia, nama field API berbahasa Inggris. Kalau salah satu nama itu
 * berubah, permintaan yang terkirim akan ditolak server dengan 400 dan tes
 * ini yang akan menangkapnya lebih dulu.
 */

/**
 * Tanggal WIB ditambah offset hari, bukan tanggal setempat mesin.
 *
 * Implementasi yang diuji menghitung WIB dari UTC eksplisit, jadi helper tes
 * harus memakai cara yang sama. Kalau helper memakai `getMonth`/`getDate`
 * mesin, keduanya berbeda satu hari pada 00:00-06:59 WIB di mesin UTC, dan tes
 * yang tidak memakai jam palsu gagal hanya di zona itu.
 */
function tanggalSetempat(offsetHari = 0): string {
  const d = new Date(Date.now() + (7 + offsetHari * 24) * 3_600_000);
  const bulan = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hari = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${bulan}-${hari}`;
}

const BESOK = tanggalSetempat(1);

const SAH: Fields = {
  nama: "Budi Santoso",
  nik: "3201234567890123",
  telepon: "081234567890",
  email: "budi@contoh.id",
  dokter: "34c4cf92-5522-56f9-af90-c16b9eaf1e43",
  tanggal: BESOK,
  slot: "ae8a406c-bd85-400c-8b9f-af1916733c6a",
  keluhan: "",
  metode: "jkn",
  setuju: true,
  website: "",
};

const DOKTER: Dokter = {
  id: "34c4cf92-5522-56f9-af90-c16b9eaf1e43",
  full_name: "Fajar Setiawan",
  title: "dr. Sp.A",
  specialty: "Anak",
};

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: "ae8a406c-bd85-400c-8b9f-af1916733c6a",
    start_time: "08:00:00",
    end_time: "12:00:00",
    room: "C1-04",
    polyclinic: "Poliklinik Ibu dan Anak",
    quota: 40,
    note: null,
    remaining: 12,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("validate", () => {
  it("menerima data yang lengkap dan benar", () => {
    expect(validate(SAH)).toEqual({});
  });

  it("menolak formulir kosong di seluruh field", () => {
    const kosong: Fields = {
      nama: "",
      nik: "",
      telepon: "",
      email: "",
      dokter: "",
      tanggal: "",
      slot: "",
      keluhan: "",
      metode: "jkn",
      setuju: false,
      website: "",
    };
    const e = validate(kosong);
    // Semua field wajib terisi. Keluhan tidak masuk daftar karena kosongnya
    // itu jawaban yang sah, begitu juga metode yang punya nilai bawaan.
    expect(Object.keys(e).sort()).toEqual(
      ["dokter", "email", "nama", "nik", "setuju", "slot", "tanggal", "telepon"].sort(),
    );
  });

  it("menolak NIK yang bukan 16 digit", () => {
    expect(validate({ ...SAH, nik: "123" }).nik).toBeTruthy();
    expect(validate({ ...SAH, nik: "32012345678901234" }).nik).toBeTruthy();
    expect(validate({ ...SAH, nik: "32012345678901a" }).nik).toBeTruthy();
  });

  it("menerima NIK 16 digit", () => {
    expect(validate({ ...SAH, nik: "3201234567890123" }).nik).toBeUndefined();
  });

  it("menolak email tanpa tanda @! atau domain", () => {
    expect(validate({ ...SAH, email: "bukan-email" }).email).toBeTruthy();
    expect(validate({ ...SAH, email: "budi@localhost" }).email).toBeTruthy();
    expect(validate({ ...SAH, email: "budi@contoh.id" }).email).toBeUndefined();
  });

  it("menolak nama yang hanya spasi", () => {
    expect(validate({ ...SAH, nama: "   " }).nama).toBeTruthy();
  });

  it("menolak nama di bawah 3 karakter", () => {
    expect(validate({ ...SAH, nama: "Bu" }).nama).toBeTruthy();
  });

  it("menolak nama yang melebihi batas kolom database", () => {
    expect(validate({ ...SAH, nama: "a".repeat(161) }).nama).toBeTruthy();
    expect(validate({ ...SAH, nama: "a".repeat(160) }).nama).toBeUndefined();
  });

  it("menerima nomor telepon Indonesia", () => {
    expect(validate({ ...SAH, telepon: "081234567890" }).telepon).toBeUndefined();
    expect(validate({ ...SAH, telepon: "+6281234567890" }).telepon).toBeUndefined();
    expect(validate({ ...SAH, telepon: "0812 3456-7890" }).telepon).toBeUndefined();
  });

  it("menolak nomor telepon yang tidak masuk akal", () => {
    expect(validate({ ...SAH, telepon: "12345" }).telepon).toBeTruthy();
  });

  it("menolak tanggal yang sudah lewat", () => {
    expect(validate({ ...SAH, tanggal: tanggalSetempat(-1) }).tanggal).toBeTruthy();
  });

  it("menerima tanggal hari ini dan sesudahnya", () => {
    expect(validate({ ...SAH, tanggal: tanggalSetempat(0) }).tanggal).toBeUndefined();
    expect(validate({ ...SAH, tanggal: BESOK }).tanggal).toBeUndefined();
  });

  /*
   * Dua tes di bawah dikunci ke jam palsu karena bug-nya cuma muncul di
   * jendela tujuh jam. WIB tujuh jam di depan UTC, jadi antara 00:00 dan 06:59
   * waktu setempat, `toISOString()` masih memberi tanggal kemarin. Dengan
   * implementasi lamanya, booking kemarin lolos di jam-jam itu saja, jadi tes
   * yang memakai jam sebenarnya bisa lulus selama bertahun-tahun tanpa pernah
   * menyentuh jalurnya.
   */
  it("menolak kemarin antara pukul 00.00 dan 06.59 waktu setempat", () => {
    // 2026-03-10T21:30:00Z = 2026-03-11 04:30 WIB. Tanggal UTC masih 10 Maret.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T21:30:00Z"));

    expect(validate({ ...SAH, tanggal: "2026-03-10" }).tanggal).toBeTruthy();
    expect(validate({ ...SAH, tanggal: "2026-03-11" }).tanggal).toBeUndefined();
  });

  it("tetap memakai tanggal setempat, bukan UTC, di detik pertama hari", () => {
    // 2026-03-10T17:00:00Z = 2026-03-11 00:00 WIB, detik pertama hari baru.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T17:00:00Z"));

    expect(validate({ ...SAH, tanggal: "2026-03-11" }).tanggal).toBeUndefined();
    expect(validate({ ...SAH, tanggal: "2026-03-10" }).tanggal).toBeTruthy();
  });

  it("mewahajibkan dokter dan jam kunjungan", () => {
    expect(validate({ ...SAH, dokter: "" }).dokter).toBeTruthy();
    expect(validate({ ...SAH, slot: "" }).slot).toBeTruthy();
  });

  it("me mewajibkan persetujuan dicentang", () => {
    expect(validate({ ...SAH, setuju: false }).setuju).toBeTruthy();
  });

  it("membolehkan keluhan kosong dan menolak yang melebihi 1000 karakter", () => {
    expect(validate({ ...SAH, keluhan: "" }).keluhan).toBeUndefined();
    expect(validate({ ...SAH, keluhan: "sakit kepala" }).keluhan).toBeUndefined();
    expect(validate({ ...SAH, keluhan: "x".repeat(1001) }).keluhan).toBeTruthy();
  });

  it("tidak menyalahkan kolom perangkap bot yang kosong", () => {
    // Kolom itu tidak pernah diisi manusia, jadi kosongnya bukan kesalahan
    // yang perlu dilaporkan ke pengunjung.
    expect(validate({ ...SAH, website: "" }).website).toBeUndefined();
  });

  it("mengembalikan pesan dalam bahasa Indonesia", () => {
    const e = validate({ ...SAH, nik: "1" });
    expect(e.nik).toMatch(/NIK/);
  });
});

describe("paymentTypeFor", () => {
  it("memetakan ketiga cara pembayaran ke enum database", () => {
    expect(paymentTypeFor("jkn")).toBe("bpjs");
    expect(paymentTypeFor("asuransi")).toBe("insurance");
    expect(paymentTypeFor("mandiri")).toBe("general");
  });

  it("menjadi biaya mandiri untuk nilai yang tidak dikenal", () => {
    // Server menolak apa pun yang bukan general, bpjs, atau insurance, jadi
    // nilai yang tidak dikenal lebih baik menjadi general daripada terkirim.
    expect(paymentTypeFor("")).toBe("general");
    expect(paymentTypeFor("BPJS")).toBe("general");
  });
});

describe("buildPayload", () => {
  it("mengirim nama field yang diminta endpoint", () => {
    const body = buildPayload(SAH);
    expect(body.patient_name).toBe("Budi Santoso");
    expect(body.nik).toBe("3201234567890123");
    expect(body.phone).toBe("081234567890");
    expect(body.email).toBe("budi@contoh.id");
    expect(body.visit_date).toBe(SAH.tanggal);
    expect(body.schedule_id).toBe(SAH.slot);
    expect(body.payment_type).toBe("bpjs");
  });

  it("memangkas spasi di nama, telepon, dan email", () => {
    const body = buildPayload({
      ...SAH,
      nama: "  Budi Santoso  ",
      telepon: " 081234567890 ",
      email: " budi@contoh.id ",
    });
    expect(body.patient_name).toBe("Budi Santoso");
    expect(body.phone).toBe("081234567890");
    expect(body.email).toBe("budi@contoh.id");
  });

  it("tidak mengirim keluhan yang kosong", () => {
    // Field opsional yang dikirim sebagai string kosong dibaca server sebagai
    // "tidak diisi", jadi mengirimnya tidak mengubah apa pun.
    expect(buildPayload(SAH)).not.toHaveProperty("complaint");
    expect(buildPayload({ ...SAH, keluhan: "   " })).not.toHaveProperty("complaint");
    expect(buildPayload({ ...SAH, keluhan: "sakit kepala" }).complaint).toBe("sakit kepala");
  });

  it("mengirim kolom perangkap bot apa adanya", () => {
    // Nilai kosongnya yang membuat server tidak menganggap permintaan bot.
    expect(buildPayload(SAH).website).toBe("");
    expect(buildPayload({ ...SAH, website: "https://bot.example" }).website).toBe(
      "https://bot.example",
    );
  });
});

describe("petakanKolomServer", () => {
  it("memetakan nama kolom database ke nama field formulir", () => {
    expect(
      petakanKolomServer({
        patient_name: "Nama minimal 3 karakter.",
        schedule_id: "Slot jadwal yang dipilih tidak tersedia.",
        visit_date: "Tanggal terlalu cepat.",
      }),
    ).toEqual({
      nama: "Nama minimal 3 karakter.",
      slot: "Slot jadwal yang dipilih tidak tersedia.",
      tanggal: "Tanggal terlalu cepat.",
    });
  });

  it("membuang kolom yang tidak ada padanannya", () => {
    expect(petakanKolomServer({ address: "Alamat terlalu panjang." })).toEqual({});
    expect(petakanKolomServer({ payment_type: "Nilai tidak dikenal." })).toEqual({
      metode: "Nilai tidak dikenal.",
    });
  });

  it("tidak melempar galat saat kolom kosong", () => {
    expect(petakanKolomServer({})).toEqual({});
  });
});

describe("waktuPendek", () => {
  it("memangkas detik dan mengganti titik dua dengan titik", () => {
    expect(waktuPendek("08:00:00")).toBe("08.00");
    expect(waktuPendek("14:30:00")).toBe("14.30");
  });

  it("mengembalikan string kosong untuk waktu yang tidak ada", () => {
    // Jadwal tanpa jam selesai masih punya jam mulai, tapi label tidak boleh
    // menampilkan "undefined" di depan pengunjung.
    expect(waktuPendek(null)).toBe("");
  });
});

describe("labelDokter", () => {
  it("menyusun gelar dan spesialis jadi satu baris", () => {
    expect(labelDokter(DOKTER)).toBe("dr. Sp.A Fajar Setiawan — Anak");
  });

  it("tetap terbaca kalau gelar atau spesialisnya tidak ada", () => {
    expect(labelDokter({ ...DOKTER, title: null })).toBe("Fajar Setiawan — Anak");
    expect(labelDokter({ id: "x", full_name: "Tanpa Spesialis", title: "dr." })).toBe(
      "dr. Tanpa Spesialis",
    );
  });
});

describe("slotPenuh dan sisaSlot", () => {
  it("membuat slot yang kuotanya tersisa sebagai bisa dipesan", () => {
    expect(sisaSlot(slot({ remaining: 3 }))).toBe(3);
    expect(slotPenuh(slot({ remaining: 3 }))).toBe(false);
  });

  it("menandai slot yang kuotanya habis", () => {
    expect(slotPenuh(slot({ remaining: 0 }))).toBe(true);
    expect(slotPenuh(slot({ remaining: -1 }))).toBe(true);
  });

  it("tidak menandai slot yang sisa kuotanya tidak diketahui", () => {
    // Daftar jadwal umum tidak punya tanggal acuan, jadi tidak ada angka
    // sisa yang bisa ditampilkan. Menandainya penuh akan memblokir jadwal
    // yang sebenarnya masih bisa dipesan.
    const tanpaSisa = slot();
    delete tanpaSisa.remaining;
    expect(sisaSlot(tanpaSisa)).toBeNull();
    expect(slotPenuh(tanpaSisa)).toBe(false);
  });
});

describe("labelSlot", () => {
  it("menyusun jam, poliklinik, dan ruang", () => {
    expect(labelSlot(slot())).toBe("08.00-12.00 · Poliklinik Ibu dan Anak · Ruang C1-04");
  });

  it("menambahkan catatan dari panel admin", () => {
    expect(labelSlot(slot({ note: "Khusus BPJS" }))).toContain("Khusus BPJS");
  });

  it("menandai slot yang penuh supaya tidak dikira tidak ada jadwal", () => {
    expect(labelSlot(slot({ remaining: 0 }))).toContain("(penuh)");
  });

  it("tetap tampil tanpa ruang", () => {
    expect(labelSlot(slot({ room: null }))).toBe("08.00-12.00 · Poliklinik Ibu dan Anak");
  });
});