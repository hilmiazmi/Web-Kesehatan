import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { admissions } from "@/server/db/schema";

/**
 * Endpoint rawat inap diuji di sini, bukan hanya lewat `cek:tulis`.
 *
 * Yang dijaga di sini adalah bentuk respons, batas jumlah malam yang boleh
 * diminta, dan dua aturan yang mudah hilang tanpa membuat gerbang lain gagal:
 *
 * 1. NIK tidak pernah ikut ke query. Nya dikembalikan ke pengunjung sebagai
 *    bagian dari konfirmasi, jadi tes memakai NIK yang jelas berbeda dari
 *    digit yang tersimpan. Kalau NIK ikut diteruskan, tes ini masih hijau selama
 *    respons tidak berubah, dan data identitas pasien ikut masuk ke database.
 * 2. `estimated_nights` wajib diisi. Nilai kosong/default membuat permintaan yang
 *    tidak sengaja terasa sah, dan jumlah malam dipakai untuk memperkirakan
 *    kebutuhan tempat tidur.
 *
 * Rute ini memakai `jalankanForm`, jadi honeypot, pembacaan body, dan rate limit
 * ikut berlaku. Perilaku rate limit-nya sendiri sudah diuji di
 * `tests/form-rate-limit.test.ts`; di sini hanya dipasang batas kecil supaya
 * tes ini tidak bisa melewati penghitung.
 */

vi.mock("@/server/db/client", () => ({
  dbOrNull: vi.fn(),
}));

vi.mock("@/server/config", () => ({
  config: vi.fn(),
}));

const client = await import("@/server/db/client");
const serverConfig = await import("@/server/config");
const { POST } = await import("@/app/api/v1/admissions/route");

const ASLI = { ...process.env };

/**
 * Tanggal yang selalu di dalam jendela `MIN_LEAD_DAYS` sampai `MAX_LEAD_DAYS`.
 *
 * `dateWithinDays` dibandingkan terhadap hari UTC, jadi offset beberapa hari ke
 * depan dipakai supaya tes tidak ikut gagal hanya karena sekarang lewat tengah
 * malam WIB.
 */
const TANGGAL_MASUK = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  Object.assign(process.env, {
    API_MODE: "live",
    DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
    AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
    RATE_LIMIT_MAX_REQUESTS: "50",
    RATE_LIMIT_WINDOW_SECONDS: "60",
  });
  vi.mocked(client.dbOrNull).mockReset();
  vi.mocked(serverConfig.config).mockReset();
  vi.mocked(serverConfig.config).mockReturnValue({
    apiMode: "live",
    rateLimitWindowSeconds: 60,
    rateLimitMax: 50,
    minLeadDays: 0,
    maxLeadDays: 90,
  } as ReturnType<typeof serverConfig.config>);
});

afterEach(() => {
  process.env = { ...ASLI };
  vi.restoreAllMocks();
});

/** Basis dari `NewAdmission`, dipakai lalu diubah per kasus. */
function isiForm(ubah: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    patient_name: "Siti Aminah",
    nik: "3273014501900001",
    phone: "081211112222",
    email: "siti@contoh.test",
    address: "Jl. Uji No. 9",
    referral_source: "Poliklinik Umum",
    requested_class: "regular",
    entry_date: TANGGAL_MASUK,
    estimated_nights: "3",
    complaint: "Demam tiga hari",
    payment_type: "general",
    website: "",
    ...ubah,
  };
}

/**
 * Database palsu yang mencatat nilai yang dikirim ke `insert`.
 *
 * Nilai dikembalikan apa adanya sebagai satu baris, supaya bentuk konfirmasi
 * yang dibacaroutehandler sama dengan yang akan dibaca database sungguhan.
 */
function dbPalsu(): { db: unknown; nilai: () => Record<string, unknown> | null } {
  let tersimpan: Record<string, unknown> | null = null;
  const db = {
    insert: () => {
      const builder = {
        values: (v: Record<string, unknown>) => {
          tersimpan = v;
          return builder;
        },
        returning: () => [
          {
            id: "1d0f0e3a-0000-4000-8000-000000000001",
            ticketCode: (tersimpan as Record<string, unknown>).ticketCode,
            patientName: (tersimpan as Record<string, unknown>).patientName,
            requestedClass: (tersimpan as Record<string, unknown>).requestedClass,
            entryDate: (tersimpan as Record<string, unknown>).entryDate,
            estimatedNights: (tersimpan as Record<string, unknown>).estimatedNights,
            status: "pending",
          },
        ],
      };
      return builder;
    },
  };
  return { db, nilai: () => tersimpan };
}

async function kirim(
  body: Record<string, unknown>,
  ip = "10.9.0.1",
): Promise<{ status: number; json: Record<string, unknown> }> {
  const respons = await POST(
    new Request("http://localhost/api/v1/admissions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }) as never,
  );
  return { status: respons.status, json: (await respons.json()) as Record<string, unknown> };
}

describe("POST /api/v1/admissions", () => {
  it("menyimpan permintaan dan mengembalikan tiket berawalan RI", async () => {
    const { db, nilai } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm(), "10.9.0.1");
    const data = json.data as Record<string, unknown>;

    expect(status).toBe(201);
    expect(String(data.ticket_code)).toMatch(/^RI-[A-Z0-9]+$/);
    expect(data.patient_name).toBe("Siti Aminah");
    expect(data.requested_class).toBe("regular");
    expect(data.estimated_nights).toBe(3);
    expect(data.status).toBe("pending");
    // Angka biaya ikut dikembalikan supaya struk di layar konfirmasi memakai
    // angka yang sama dengan backend, bukan salinan yang bisa berbeda.
    expect(data.estimated_cost_per_night).toBe(1_400_000);

    // Bentuk yang benar-benar masuk ke tabel juga diperiksa, bukan hanya
    // balasan: nama kolom di sini adalah nama enum yang disimpan database.
    expect(nilai()).toMatchObject({
      patientName: "Siti Aminah",
      requestedClass: "regular",
      entryDate: TANGGAL_MASUK,
      estimatedNights: 3,
    });
  });

  it("tidak pernah menyimpan NIK yang dikirim pengunjung", async () => {
    const { db, nilai } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    await kirim(isiForm({ nik: "3273014501900001" }), "10.9.0.2");

    // Sixteen digit nol adalah nilai simulasi yang dipakai tabel `appointments`
    // juga, dan check constraint `admissions_nik_simulasi` menolak yang lain.
    expect((nilai() as Record<string, unknown>).nik).toBe("0000000000000000");
  });

  it("menolak jumlah malam yang kosong, bukan diisi satu secara diam-diam", async () => {
    const { db } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm({ estimated_nights: "" }), "10.9.0.3");

    expect(status).toBe(422);
    expect((json.error as { fields?: Record<string, string> }).fields?.estimated_nights).toBeDefined();
  });

  it("menolak jumlah malam di luar 1 sampai 30", async () => {
    const { db } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const nol = await kirim(isiForm({ estimated_nights: "0" }), "10.9.0.4");
    const terlalu = await kirim(isiForm({ estimated_nights: "31" }), "10.9.0.5");

    expect(nol.status).toBe(422);
    expect(terlalu.status).toBe(422);
  });

  it("menolak kelas perawatan yang tidak dikenal", async () => {
    const { db } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm({ requested_class: "deluxe" }), "10.9.0.6");

    expect(status).toBe(422);
    expect(
      (json.error as { fields?: Record<string, string> }).fields?.requested_class,
    ).toBeDefined();
  });

  it("menolak tanggal masuk yang tidak bisa diformat sebagai tanggal", async () => {
    const { db } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm({ entry_date: "besok" }), "10.9.0.7");

    expect(status).toBe(422);
    expect((json.error as { fields?: Record<string, string> }).fields?.entry_date).toBeDefined();
  });

  it("balas 422 untuk NIK yang bukan 16 digit", async () => {
    const { db } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm({ nik: "1234" }), "10.9.0.8");

    expect(status).toBe(422);
    expect((json.error as { fields?: Record<string, string> }).fields?.nik).toBeDefined();
  });

  it("menjawab honeypot dengan tiket palsu tanpa menyentuh database", async () => {
    const { db, nilai } = dbPalsu();
    vi.mocked(client.dbOrNull).mockReturnValue(db as never);

    const { status, json } = await kirim(isiForm({ website: "https://spam.test" }), "10.9.0.9");
    const data = json.data as Record<string, unknown>;

    // Status 201, bukan 400: bot yang mendapat 400 akan belajar field mana yang
    // membuatnya ditolak lalu berhenti mengirimnya, sehingga honeypot berhenti
    // berguna sejak percobaan pertama.
    expect(status).toBe(201);
    expect(data.status).toBe("received");
    expect(String(data.ticket_code)).toMatch(/^RI-/);
    expect(nilai()).toBeNull();
  });

  it("membatasi jumlah permintaan dari satu alamat", async () => {
    // Penghitung sengaja dipasang dua, lalu dipakai dengan permintaan yang
    // gagal validasi. Permintaan yang berhasil akan mengosongkan penghitung
    // sendiri, jadi mengujinya dengan data valid tidak pernah menyentuh batas.
    // Yang diuji di sini justru aturan yang berlaku: permintaan gagal tetap
    // memakai haknya, supaya orang tidak mendapat percobaan tak terbatas dengan
    // mengirim data salah berulang kali.
    vi.mocked(client.dbOrNull).mockReturnValue(dbPalsu().db as never);
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "live",
      rateLimitWindowSeconds: 60,
      rateLimitMax: 2,
      minLeadDays: 0,
      maxLeadDays: 90,
    } as ReturnType<typeof serverConfig.config>);

    const status: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      status.push((await kirim(isiForm({ nik: "1234" }), "10.9.1.1")).status);
    }

    expect(status).toEqual([422, 422, 429]);
  });

  it("tidak menulis apa pun tanpa database", async () => {
    // Mode baca-saja menjawab 503, bukan dilaporkan berhasil dengan kode tiket
    // yang tidak pernah bisa dipakai untuk mengecek status.
    vi.mocked(client.dbOrNull).mockReturnValue(null);

    const { status } = await kirim(isiForm(), "10.9.2.1");

    expect(status).toBe(503);
  });
});

describe("inbox admin untuk permintaan inap", () => {
  it("terdaftar sebagai jenis inbox yang punya status", async () => {
    const { parseKind, allKinds } = await import("@/server/admin/inbox");
    const jenis = parseKind("admissions");

    expect(jenis).toBeDefined();
    expect(jenis?.table).toBe("admissions");
    expect(jenis?.hasStatus).toBe(true);
    // Status yang di sini harus persis sama dengan enum `admission_status`.
    // `no_show` sengaja tidak ada: tidak ada nomor antrean per dokter yang tidak
    // datang, jadi status itu hanya akan jadi opsi yang tidak pernah dipakai.
    expect(jenis?.statuses).toEqual(["pending", "confirmed", "cancelled"]);
    expect(allKinds().map((k) => k.slug)).toContain("admissions");
  });

  it("tidak mencari kolom yang tidak ada di tabel", async () => {
    const { parseKind } = await import("@/server/admin/inbox");
    const jenis = parseKind("admissions");

// Nama kolom masuk ke SQL apa adanya tanpa tanda kutip tambahan, jadi salah
    // ketik di sini tidak terlihat sampai petugas mengetik kata kunci di kotak
    // pencarian admin dan jawabannya 500. Bandingkan dengan nama SQL, bukan
    // nama properti TypeScript: `searchColumns` memakai `ticket_code`, sementara
    // properti tabelnya `ticketCode`.
    const namaKolom = new Set(
      Object.values(getTableColumns(admissions)).map((c) => c.name),
    );

    for (const kolom of jenis?.searchColumns ?? []) {
      expect(namaKolom.has(kolom)).toBe(true);
    }
  });

  it("menolak status yang bukan bagian dari himpunan status", async () => {
    const { parseKind, listInbox, updateStatus } = await import("@/server/admin/inbox");
    const jenis = parseKind("admissions")!;
    const dbPalsu = { execute: async () => [] } as never;

    await expect(
      listInbox(dbPalsu, jenis, { status: "no_show", page: 1, pageSize: 25 }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(updateStatus(dbPalsu, jenis, "1d0f0e3a-0000-4000-8000-000000000001", "no_show", null))
      .rejects.toMatchObject({ status: 400 });
  });

  it("memberi label yang bisa dibaca manusia, bukan slug", async () => {
    const { inboxLabel } = await import("@/lib/admin-inbox-label");

    expect(inboxLabel("admissions")).toBe("Permintaan Rawat Inap");
    // Slug yang belum punya label harus jatuh ke dirinya sendiri, bukan ke
    // `undefined`, karena judul halaman tetap dirender di `generateMetadata`.
    expect(inboxLabel("belum-ada")).toBe("belum-ada");
  });
});