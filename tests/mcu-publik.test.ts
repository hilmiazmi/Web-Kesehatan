import { describe, expect, it, vi, beforeEach } from "vitest";
import { MCU_PACKAGES, MCU_HOLIDAY_PACKAGES } from "@/data/home";

const mockDbState = vi.hoisted(() => ({
  database: {} as unknown,
  packages: [] as unknown[],
  detail: null as unknown,
  error: null as unknown,
}));

vi.mock("@/server/db/client", () => ({
  dbOrNull: () => (mockDbState.database === null ? null : mockDbState.database),
}));

vi.mock("@/server/db/repo/content", () => ({
  listMcuPackages: async (_db: unknown, _category: string) => {
    if (mockDbState.error) throw mockDbState.error;
    return mockDbState.packages;
  },
  findMcuPackage: async (_db: unknown, slug: string) => {
    if (mockDbState.error) throw mockDbState.error;
    if (mockDbState.detail && (mockDbState.detail as { slug: string }).slug === slug) {
      return mockDbState.detail;
    }
    return null;
  },
  listArticles: async () => ({ items: [], total: 0 }),
  findArticle: async () => null,
  listDoctors: async () => [],
  listSchedules: async () => [],
}));

const { getPublicMcuPackages, getPublicMcuPackage } = await import(
  "@/lib/content-loader"
);

describe("getPublicMcuPackages & getPublicMcuPackage", () => {
  beforeEach(() => {
    mockDbState.database = {};
    mockDbState.packages = [];
    mockDbState.detail = null;
    mockDbState.error = null;
  });

  it("fallback ke data statis reguler saat database kosong atau snapshot", async () => {
    mockDbState.database = null;
    const reguler = await getPublicMcuPackages("reguler");
    expect(reguler.length).toBe(MCU_PACKAGES.length);
    expect(reguler[0].slug).toBe(MCU_PACKAGES[0].slug);
  });

  it("fallback ke data statis holiday saat kategori holiday diminta dan database kosong", async () => {
    mockDbState.database = null;
    const holiday = await getPublicMcuPackages("holiday");
    expect(holiday.length).toBe(MCU_HOLIDAY_PACKAGES.length);
    expect(holiday[0].slug).toBe(MCU_HOLIDAY_PACKAGES[0].slug);
  });

  it("mengambil paket MCU dari database saat data tersedia", async () => {
    mockDbState.database = {};
    mockDbState.packages = [
      {
        slug: "paket-spesial-eksekutif",
        name: "Paket Spesial Eksekutif",
        price: 3500000,
        summary: "Pemeriksaan menyeluruh",
        category: "reguler",
      },
    ];
    mockDbState.detail = {
      slug: "paket-spesial-eksekutif",
      name: "Paket Spesial Eksekutif",
      price: 3500000,
      summary: "Pemeriksaan menyeluruh",
      items: [
        { group_name: "Lab", item_name: "Darah Lengkap" },
        { group_name: "Radiologi", item_name: "Rontgen Thorax" },
      ],
    };

    const hasil = await getPublicMcuPackages("reguler");
    const ditemukan = hasil.find((p) => p.slug === "paket-spesial-eksekutif");
    expect(ditemukan).toBeDefined();
    expect(ditemukan?.title).toBe("Paket Spesial Eksekutif");
    expect(ditemukan?.price).toBe(3500000);
    expect(ditemukan?.items).toContain("Darah Lengkap");
  });

  it("getPublicMcuPackage mengembalikan detail paket", async () => {
    mockDbState.database = null;
    const pkg = await getPublicMcuPackage("reguler", "paket-dasar-1");
    expect(pkg).not.toBeNull();
    expect(pkg?.title).toBe(MCU_PACKAGES[0].title);
  });

  it("getPublicMcuPackage mengembalikan null jika slug tidak ditemukan sama sekali", async () => {
    mockDbState.database = null;
    const pkg = await getPublicMcuPackage("reguler", "slug-palsu-tidak-ada");
    expect(pkg).toBeNull();
  });
});
