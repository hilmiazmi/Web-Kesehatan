import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Dua perubahan yang dijaga di sini tidak bisa dibuktikan lewat `cek:konten`.
 *
 * `cek:konten` memastikan berkasnya ada, tapi tidak memastikan rutenya membaca
 * berkas itu. Yang perlu dijaga di sini adalah dua hal yang bisa kembali rusak
 * tanpa membuat satu pun gerbang gagal.
 *
 * 1. Keberadaan `GET /api/v1/documents/{slug}`. Rute ini ditambahkan karena
 *    `documents` punya route daftar sejak awal, sedangkan lima sumber daya lain
 *    yang sama-sama punya slug punya route detail. Kalau rute detailnya dihapus
 *    lagi, tidak ada gerbang yang gagal: berkasnya masih ada, hanya tidak pernah
 *    dibaca.
 * 2. Pembatas jumlah permintaan pada `GET /api/v1/tickets/{kind}/{code}`.
 *    Endpoint ini melakukan satu kueri database per permintaan. Tanpa
 *    penghitung, satu alamat bisa mengirim ribuan permintaan dan tidak ada yang
 *    berkomentar.
 */

vi.mock("@/server/db/client", () => ({
  dbOrNull: vi.fn(),
}));

vi.mock("@/server/config", () => ({
  config: vi.fn(),
}));

const client = await import("@/server/db/client");
const serverConfig = await import("@/server/config");
const { GET: dokumenDetail } = await import("@/app/api/v1/documents/[slug]/route");
const { GET: tiketDetail } = await import("@/app/api/v1/tickets/[kind]/[code]/route");

const LINGKUNGAN = {
  API_MODE: "live",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/rsud_uji",
  AUTH_SECRET: "kunci-uji-lokal-minimal-32-karakter",
  RATE_LIMIT_MAX_REQUESTS: "3",
  RATE_LIMIT_WINDOW_SECONDS: "60",
} as const;

const ASLI = { ...process.env };

function alamat(ip: string): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

beforeEach(() => {
  Object.assign(process.env, LINGKUNGAN);
  vi.mocked(client.dbOrNull).mockReset();
  vi.mocked(serverConfig.config).mockReset();
  vi.mocked(serverConfig.config).mockReturnValue({
    apiMode: "live",
    rateLimitWindowSeconds: 60,
    rateLimitMax: 3,
  } as ReturnType<typeof serverConfig.config>);
});

afterEach(() => {
  process.env = { ...ASLI };
  vi.restoreAllMocks();
});

describe("GET /api/v1/documents/{slug}", () => {
  it("membaca satu dokumen lewat slug", async () => {
    // Mode snapshot: `denganSnapshot` membaca berkas, bukan database. Yang
    // diperiksa adalah rutenya ada dan membentuk respons yang benar.
    vi.mocked(client.dbOrNull).mockReturnValue(null);
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "snapshot",
    } as ReturnType<typeof serverConfig.config>);

    const respons = await dokumenDetail(
      new Request("http://localhost/api/v1/documents/standar-pelayanan") as never,
      { params: Promise.resolve({ slug: "standar-pelayanan" }) },
    );
    const amplop = (await respons.json()) as { data?: Record<string, unknown> };

    expect(respons.status).toBe(200);
    expect(amplop.data?.slug).toBe("standar-pelayanan");
    expect(typeof amplop.data?.title).toBe("string");
    expect(typeof amplop.data?.file_url).toBe("string");
  });

  it("membalas 404 untuk slug yang tidak ada", async () => {
    vi.mocked(client.dbOrNull).mockReturnValue(null);
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "snapshot",
    } as ReturnType<typeof serverConfig.config>);

    const respons = await dokumenDetail(
      new Request("http://localhost/api/v1/documents/tidak-ada") as never,
      { params: Promise.resolve({ slug: "tidak-ada" }) },
    );

    // Berkas snapshot-nya memang tidak ada, jadi `denganSnapshot` melempar 404.
    expect(respons.status).toBe(404);
  });

  it("tidak membungkus amplop dua lapis", async () => {
    // Isi berkas snapshot adalah muatan yang akan dibungkus `ok()`. Kalau amplop
    // ikut tersimpan, hasilnya `{ data: { data: ... } }` dan setiap pemanggil
    // harus membongkar dua lapis.
    vi.mocked(client.dbOrNull).mockReturnValue(null);
    vi.mocked(serverConfig.config).mockReturnValue({
      apiMode: "snapshot",
    } as ReturnType<typeof serverConfig.config>);

    const respons = await dokumenDetail(
      new Request("http://localhost/api/v1/documents/ppid") as never,
      { params: Promise.resolve({ slug: "ppid" }) },
    );
    const amplop = (await respons.json()) as Record<string, unknown>;

    expect(amplop.data).toBeDefined();
    expect((amplop.data as Record<string, unknown>).data).toBeUndefined();
  });
});

describe("GET /api/v1/tickets/{kind}/{code}", () => {
  /**
   * Slug jenis tiket di path adalah bentuk jamak, mengikuti nama inbox di
   * `src/server/admin/inbox.ts`, bukan awalan kode tiket di `src/server/ticket.ts`.
   *Slug jenis yang salah akan ditolak `parseKind` dengan 404 sebelum kode tiketnya sempat diperiksa, jadi tesnya akan salah ukur tanpa sengaja.
   */
  const JENIS = "appointments";
  const KODE = "EP-23456789";

  async function minta(
    alamatIp: string,
    kode: string,
  ): Promise<Response> {
    return tiketDetail(
      new Request(`http://localhost/api/v1/tickets/${JENIS}/${kode}`, {
        headers: alamat(alamatIp),
      }) as never,
      { params: Promise.resolve({ kind: JENIS, code: kode }) },
    );
  }

  it("membatasi jumlah permintaan per alamat", async () => {
    // Batasnya `RATE_LIMIT_MAX_REQUESTS` yaitu 3 pada lingkungan uji.
    vi.mocked(client.dbOrNull).mockReturnValue({} as never);

    const status: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      status.push((await minta("10.1.1.1", KODE)).status);
    }

    // Status tiga yang pertama tidak diperiksa di sini, karena itu bergantung pada
    // apa yang dilakukan database palsu. Yang dijaga hanya bentuknya: bukan 429.
    // Keempat harus 429, dan itulah bukti-satunya bahwa penghitungnya benar-benar
    // dipasang, bukan sekadar ada di berkas.
    expect(status.slice(0, 3).every((s) => s !== 429)).toBe(true);
    expect(status[3]).toBe(429);
  });

  it("memisahkan penghitung per alamat", async () => {
    // Satu penyerang yang salah alamat tidak boleh mengunci orang lain di alamat
    // berbeda.
    vi.mocked(client.dbOrNull).mockReturnValue({} as never);

    for (let i = 0; i < 3; i += 1) {
      await minta("10.1.1.1", KODE);
    }

    const dariAlamatLain = await minta("10.2.2.2", KODE);

    // Kalau penghitungnya tidak dipisah per alamat, permintaan ini ikut 429.
    expect(dariAlamatLain.status).not.toBe(429);
  });

  it("memakai kuota juga untuk kode yang bentuknya salah", async () => {
    // Ini yang membuat pembatasnya berguna, bukan hanya sebagai hiasan. Permintaan
    // dengan bentuk salah tidak pernah menyentuh database, jadi kalau tidak ikut
    // dihitung, bot cukup mengirim bentuk salah selamanya dan tidak pernah
    // tersentuh pembatas.
    //
    // `0` tidak ada di alfabet kode tiket yang sah, jadi tiga permintaan di bawah
    // semuanya ditolak validasi, bukan Pembatas.
    vi.mocked(client.dbOrNull).mockReturnValue({} as never);

    const statusBuruk: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      statusBuruk.push((await minta("10.3.3.3", "EP-00000000")).status);
    }

    expect(statusBuruk).toEqual([422, 422, 422]);

    // Keempat memakai kode yang bentuknya benar. Kalau tiga permintaan buruk di
    // atas ikut memotong kuota, yang ini sudah kehabisan sebelum database
    // disentuh. Kalau tidak, ia akan sampai ke database dan jawabannya bukan 429.
    const keempat = await minta("10.3.3.3", KODE);

    expect(keempat.status).toBe(429);
  });
});
