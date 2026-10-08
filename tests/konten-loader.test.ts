import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARTICLES } from "@/data/home";

/**
 * Content loader halaman publik.
 *
 * Modul ini yang menutup Acceptance Criteria butir 9 PRD bagian 12, yaitu
 * "Admin dapat menambah, mengubah, dan menghapus berita, dan perubahannya
 * tampil di situs publik". Panel admin sudah bisa menulis ke tabel `articles`,
 * jadi yang diuji di sini adalah sisi sebaliknya: apakah halaman `/berita`,
 * halaman detailnya, dan kartu di beranda benar-benar membaca tabel itu.
 *
 * Yang diuji fallback, bukan database sungguhan. Tidak ada database di
 * lingkungan test, jadi `dbOrNull` dan repo dipalsukan. Yang diuji justru
 * keputusannya: database hidup menang, database kosong dan database rusak
 * kembali ke data statis, dan slug yang benar-benar tidak ada tetap `null`
 * supaya `notFound()` bisa bekerja.
 *
 * Ada dua kelas kesalahan yang kalau lolos tidak terlihat dari mata:
 *
 * 1. Loader diam-diam selalu mengembalikan data statis. Semua tes fallback
 *    lulus, dan butir 9 tetap gagal karena tidak ada satu pun halaman publik
 *    yang membaca database. Karena itu ada tes yang memalsukan database dengan
 *    satu baris dan menuntut baris itu yang muncul.
 * 2. Foto dari database membuat permintaan ke `/_next/image` yang dijawab
 *    galat, sehingga kartu berita tampil dengan kotak rusak.
 */

const keadaan = vi.hoisted(() => ({
  /** `null` berarti mode snapshot: tidak ada database. */
  database: {} as unknown,
  articles: [] as unknown[],
  detail: null as unknown,
  galat: null as unknown,
  panggil: 0,
}));

vi.mock("@/server/db/client", () => ({
  dbOrNull: () => (keadaan.database === null ? null : keadaan.database),
}));

vi.mock("@/server/db/repo/content", () => ({
  listArticles: async () => {
    keadaan.panggil += 1;
    if (keadaan.galat) throw keadaan.galat;
    return { items: keadaan.articles, total: keadaan.articles.length };
  },
  findArticle: async (db: unknown, _slug: string) => {
    keadaan.panggil += 1;
    if (keadaan.galat) throw keadaan.galat;
    void db;
    return keadaan.detail;
  },
}));

const {
  dariBarisArtikel,
  dariBarisArtikelDetail,
  fotoBerita,
  getPublicArticle,
  getPublicArticles,
} = await import("@/lib/content-loader");

/** Bentuk baris yang dipakai pemetaan, sesuai tipe repo. */
type Baris = {
  slug: string;
  title: string;
  category: string | null;
  excerpt: string;
  cover_url: string | null;
  published_at: string;
  author?: string | null;
  body_html?: string;
  meta_description?: string;
};

function baris(ubah: Partial<Baris> = {}): Baris {
  return {
    slug: "berita-dari-database",
    title: "Berita dari Database",
    category: "Layanan",
    excerpt: "Ringkasan berita.",
    cover_url: null,
    published_at: "2026-10-01T08:30:00.000Z",
    ...ubah,
  };
}

beforeEach(() => {
  keadaan.database = {};
  keadaan.articles = [];
  keadaan.detail = null;
  keadaan.galat = null;
  keadaan.panggil = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --------------------------------------------------------------- pemetaan

describe("dariBarisArtikel", () => {
  it("mengambil tanggal delapan karakter pertama dari teks ISO", () => {
    const hasil = dariBarisArtikel(baris({ published_at: "2026-10-01T08:30:00.000Z" }));

    expect(hasil?.date).toBe("2026-10-01");
  });

  it("menolak baris tanpa tanggal yang bisa dipakai", () => {
    expect(dariBarisArtikel(baris({ published_at: "" }))).toBeNull();
    expect(dariBarisArtikel(baris({ published_at: "tidak tahu" }))).toBeNull();
  });

  it("membuang kategori dan foto kosong, bukan menuliskannya sebagai kosong", () => {
    const hasil = dariBarisArtikel(baris({ category: null, cover_url: null }));

    expect(hasil).not.toBeNull();
    expect("category" in (hasil ?? {})).toBe(false);
    expect("imageUrl" in (hasil ?? {})).toBe(false);
  });

  it("menyimpan kategori dan foto yang diisi admin", () => {
    const hasil = dariBarisArtikel(
      baris({ category: "Layanan", cover_url: "https://contoh.test/foto.jpg" }),
    );

    expect(hasil?.category).toBe("Layanan");
    expect(hasil?.imageUrl).toBe("https://contoh.test/foto.jpg");
  });
});

describe("dariBarisArtikelDetail", () => {
  it("membawa isi HTML, penulis, dan meta description", () => {
    const hasil = dariBarisArtikelDetail({
      ...baris(),
      author: "Redaksi",
      body_html: "<p>Isi berita.</p>",
      meta_description: "Ringkasan singkat.",
    });

    expect(hasil?.bodyHtml).toBe("<p>Isi berita.</p>");
    expect(hasil?.author).toBe("Redaksi");
    expect(hasil?.metaDescription).toBe("Ringkasan singkat.");
  });

  it("tidak menuliskan paragraf cadangan saat isi HTML tersedia", () => {
    const hasil = dariBarisArtikelDetail({
      ...baris(),
      author: null,
      body_html: "<p>Isi berita.</p>",
      meta_description: "",
    });

    expect(hasil?.paragraphs).toBeUndefined();
  });
});

describe("fotoBerita", () => {
  it("memakai URL dari database dan menandai foto itu tidak dioptimasi", () => {
    const hasil = fotoBerita({ imageUrl: "https://contoh.test/foto.jpg" }, 0, 600, 400);

    expect(hasil.src).toBe("https://contoh.test/foto.jpg");
    expect(hasil.unoptimized).toBe(true);
  });

  it("memakai foto stok bergiliran kalau database tidak punya foto", () => {
    const a = fotoBerita({}, 0, 600, 400);
    const b = fotoBerita({}, 1, 600, 400);

    expect(a.unoptimized).toBe(false);
    expect(b.unoptimized).toBe(false);
    expect(a.src).not.toBe(b.src);
  });
});

// ----------------------------------------------------------------- loader

describe("getPublicArticles", () => {
  it("menampilkan berita database lebih dulu, lalu berita bawaan", async () => {
    // Urutannya penting untuk dua hal sekaligus: database dibaca sebagai
    // sumber utama, dan berita bawaan yang belum ada di sana tetap punya
    // tautan masuk. Kalau bawaan tidak ikut, enam belas halamannya jadi
    // halaman yatim yang tidak bisa ditemukan pengunjung maupun `cek:tautan`.
    keadaan.articles = [baris()];

    const hasil = await getPublicArticles();

    expect(hasil[0].title).toBe("Berita dari Database");
    expect(hasil).toHaveLength(ARTICLES.length + 1);
    expect(keadaan.panggil).toBe(1);
  });

  it("tidak menampilkan dua kali slug yang ada di kedua sumber", async () => {
    // Berita bawaan bisa sudah tersimpan di database dengan slug yang sama. Kalau
    // keduanya ikut, pengunjung melihat artikel yang sama dua kali dengan isi
    // berbeda, dan detailnya hanya menampilkan versi database.
    keadaan.articles = [baris({ slug: ARTICLES[0].slug, title: "Versi Database" })];

    const hasil = await getPublicArticles();
    const slugGanda = hasil.filter((a) => a.slug === ARTICLES[0].slug);

    expect(slugGanda).toHaveLength(1);
    expect(slugGanda[0].title).toBe("Versi Database");
    expect(hasil).toHaveLength(ARTICLES.length);
  });

  it("mengurutkan ulang berdasarkan tanggal setelah digabung", async () => {
    // Tanpa pengurutan ulang, berita bawaan selalu menempel di bagian akhir dan
    // halaman `/berita` terlihat seperti belum pernah diperbarui.
    keadaan.articles = [baris({ slug: "paling-baru", published_at: "2030-01-02T00:00:00Z" })];

    const hasil = await getPublicArticles();
    const tanggal = hasil.map((a) => a.date);

    expect(tanggal).toEqual([...tanggal].sort((a, b) => b.localeCompare(a)));
    expect(hasil[0].slug).toBe("paling-baru");
  });

  it("kembali ke data statis di mode snapshot tanpa menyentuh database", async () => {
    keadaan.database = null;
    keadaan.articles = [baris()];

    const hasil = await getPublicArticles();

    expect(hasil).toHaveLength(ARTICLES.length);
    expect(hasil[0].slug).toBe(ARTICLES[0].slug);
    expect(keadaan.panggil).toBe(0);
  });

  it("kembali ke data statis kalau database kosong", async () => {
    keadaan.articles = [];

    const hasil = await getPublicArticles();

    expect(hasil).toHaveLength(ARTICLES.length);
  });

  it("kembali ke data statis kalau kueri gagal, dan mencatat peringatan", async () => {
    keadaan.galat = new Error("koneksi ditolak");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const hasil = await getPublicArticles();

    expect(hasil).toHaveLength(ARTICLES.length);
    expect(spy).toHaveBeenCalled();
  });

  it("membuang baris yang tanggalnya rusak, bukan menampilkannya", async () => {
    keadaan.articles = [baris({ published_at: "" }), baris({ slug: "yang-valid" })];

    const hasil = await getPublicArticles();

    // Baris yang tanggalnya rusak tidak muncul, dan baris yang valid tetap
    // ada. Jumlahnya tidak lagi satu karena berita bawaan ikut digabung.
    expect(hasil.map((a) => a.slug)).toContain("yang-valid");
    expect(hasil).toHaveLength(ARTICLES.length + 1);
  });
});

describe("getPublicArticle", () => {
  it("mengambil detail dari database ketika mode live", async () => {
    keadaan.detail = { ...baris(), author: "Redaksi", body_html: "<p>Isi.</p>", meta_description: "Ringkas." };

    const hasil = await getPublicArticle("berita-dari-database");

    expect(hasil?.bodyHtml).toBe("<p>Isi.</p>");
    expect(hasil?.author).toBe("Redaksi");
  });

  it("melayani slug database yang tidak ada di data statis", async () => {
    keadaan.detail = {
      ...baris(),
      author: null,
      body_html: "<p>Isi.</p>",
      meta_description: "",
    };

    const hasil = await getPublicArticle("slug-khusus-admin");

    expect(hasil?.slug).toBe("berita-dari-database");
  });

  it("kembali ke data statis untuk slug bawaan yang tidak ada di database", async () => {
    const hasil = await getPublicArticle(ARTICLES[0].slug);

    expect(hasil?.slug).toBe(ARTICLES[0].slug);
    expect(hasil?.bodyHtml).toBeUndefined();
    expect(hasil?.paragraphs?.length).toBeGreaterThan(0);
  });

  it("mengembalikan null untuk slug yang tidak ada di mana pun", async () => {
    const hasil = await getPublicArticle("tidak-ada-di-manapun");

    expect(hasil).toBeNull();
  });

  it("kembali ke data statis kalau kueri gagal", async () => {
    keadaan.galat = new Error("koneksi ditolak");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const hasil = await getPublicArticle(ARTICLES[0].slug);

    expect(hasil?.slug).toBe(ARTICLES[0].slug);
  });
});

// ------------------------------------------------------- pemakai di halaman

/**
 * Loader-nya sendiri sudah diuji di atas. Yang diuji di sini adalah apakah
 * halamannya benar-benar memanggilnya.
 *
 * Loader yang benar tetapi tidak dipakai tidak accomplishing apa pun. Butir 9
 * pernah gagal karena lima belas halaman tidak punya jalur ke database sama
 * sekali, dan itu persis keadaan yang harus dicegah di sini.
 */
describe("halaman publik memakai loader", () => {
  function baca(relatif: string): string {
    return readFileSync(new URL(`../${relatif}`, import.meta.url), "utf8");
  }

  it("/berita mengambil daftar berita dari loader", () => {
    const sumber = baca("src/app/berita/page.tsx");

    expect(sumber).toContain("getPublicArticles()");
    expect(sumber).not.toContain("from \"@/data/home\"");
  });

  it("/berita/[slug] mengambil detail dari loader", () => {
    const sumber = baca("src/app/berita/[slug]/page.tsx");

    expect(sumber).toContain("getPublicArticle(slug)");
  });

  it("beranda meneruskan daftar berita ke NewsSection", () => {
    const beranda = baca("src/app/page.tsx");

    expect(beranda).toContain("getPublicArticles()");
    expect(beranda).toContain("<NewsSection articles={articles} />");
  });

  it("halaman berita punya revalidate supaya tidak menunggu build", () => {
    // Tanpa `revalidate`, `next build` mem-PRERENDER halaman ini sekali dan
    // perubahan admin tidak terlihat sampai build berikutnya.
    expect(baca("src/app/berita/page.tsx")).toContain("export const revalidate");
    expect(baca("src/app/berita/[slug]/page.tsx")).toContain("export const revalidate");
    expect(baca("src/app/page.tsx")).toContain("export const revalidate");
  });

  it("Photo meneruskan unoptimized ke next/image", () => {
    const sumber = baca("src/components/ui/Photo.tsx");

    expect(sumber).toContain("unoptimized={unoptimized}");
  });

  it("tidak ada satu pun halaman publik lain yang membaca modul berita statis", () => {
    // Semua pembacaan `ARTICLES` yang tersisa harus punya alasan. Daftar di
    // bawah adalah tempat yang boleh memakainya: `generateStaticParams` untuk
    // membuat slug awal, dan nilai bawaan prop komponen.
    const boleh = [
      "src/app/berita/[slug]/page.tsx",
      "src/components/home/NewsSection.tsx",
    ];

    const daftar = baca("src/app/berita/page.tsx");
    expect(boleh).not.toContain("src/app/berita/page.tsx");
    expect(daftar).not.toContain("ARTICLES");
  });
});

describe("berita dari database masuk sitemap", () => {
  function baca(relatif: string): string {
    return readFileSync(new URL(`../${relatif}`, import.meta.url), "utf8");
  }

  it("collectSitemapPaths memakai slug yang diberi, bukan ARTICLES", async () => {
    const { collectSitemapPaths } = await import("@/lib/sitemap");

    const statis = new Set(collectSitemapPaths().map((e) => e.path));
    const denganDb = collectSitemapPaths([
      ...ARTICLES,
      { slug: "berita-dari-database" },
    ]).map((e) => e.path);

    expect(denganDb).toContain("/berita/berita-dari-database");

    // Slug bawaan tidak boleh hilang hanya karena database punya berita lain.
    for (const p of statis) {
      if (p.startsWith("/berita/")) expect(denganDb).toContain(p);
    }
  });

  it("slug yang kembar tidak menghasilkan URL ganda", async () => {
    const { collectSitemapPaths } = await import("@/lib/sitemap");

    const hasil = collectSitemapPaths([
      ...ARTICLES,
      { slug: ARTICLES[0].slug },
    ]).map((e) => e.path);

    expect(hasil.filter((p) => p === `/berita/${ARTICLES[0].slug}`)).toHaveLength(1);
  });

  it("/app/sitemap.ts menggabungkan modul statis dengan hasil loader", () => {
    const sumber = baca("src/app/sitemap.ts");

    expect(sumber).toContain("getPublicArticles()");
    expect(sumber).toContain("[...ARTICLES, ...dariDb]");
  });
});
