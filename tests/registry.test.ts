import { describe, expect, it } from "vitest";
import {
  all,
  choicesOf,
  describeTables,
  field,
  find,
  kindName,
  sortableColumns,
  tableCount,
  writable,
  type FieldKind,
} from "@/server/admin/registry";

/**
 * Registry ini adalah satu-satunya daftar putih antara permintaan HTTP dan SQL.
 * Nama tabel masuk ke kueri tanpa tanda kutip, jadi yang diuji di bawah bukan
 * hanya kebenaran data, tapi juga bahwa tidak ada jalur yang bisa melewatinya.
 */

const VARIAN_KIND: readonly FieldKind[] = [
  { type: "short" },
  { type: "long" },
  { type: "markdown" },
  { type: "url" },
  { type: "email" },
  { type: "phone" },
  { type: "slug" },
  { type: "integer" },
  { type: "money" },
  { type: "date" },
  { type: "boolean" },
  { type: "choice", allowed: ["a", "b"] },
];

describe("daftar putih tabel", () => {
  it("tidak punya dua tabel dengan nama yang sama", () => {
    const nama = all().map((t) => t.table);
    expect(new Set(nama).size).toBe(nama.length);
  });

  it("tidak punya dua kolom dengan nama yang sama dalam satu tabel", () => {
    for (const spesifikasi of all()) {
      const kolom = spesifikasi.fields.map((f) => f.column);
      expect(new Set(kolom).size, `${spesifikasi.table} punya kolom kembar`).toBe(
        kolom.length,
      );
    }
  });

  it("tidak memuat tabel yang tidak bisa dihapus dari daftar putih", () => {
    // users, appointments, dan submission tidak boleh bisa dihapus lewat panel.
    // Kalau salah satu masuk daftar, panel akan menampilkan tombol hapus untuk
    // tabel yang menghapusnya berarti kehilangan data.
    const nama = all().map((t) => t.table);
    for (const terlarang of ["users", "appointments", "feedbacks", "site_settings"]) {
      expect(nama, `${terlarang} tidak boleh ada di daftar putih`).not.toContain(terlarang);
    }
  });

  it("menandai setiap tabel yang bisa dihapus", () => {
    const nama = all().filter((t) => t.deletable).map((t) => t.table);
    for (const terlarang of ["users", "appointments", "feedbacks", "site_settings"]) {
      expect(nama).not.toContain(terlarang);
    }
  });

  it("memberi default_order yang benar-benar ada di tabelnya", () => {
    for (const spesifikasi of all()) {
      const ada = spesifikasi.fields.some((f) => f.column === spesifikasi.defaultOrder);
      expect(ada, `${spesifikasi.table}: ${spesifikasi.defaultOrder}`).toBe(true);
    }
  });

  it("hanya menunjuk kolom yang ada di searchable", () => {
    for (const spesifikasi of all()) {
      for (const kolom of spesifikasi.searchColumns) {
        expect(
          field(spesifikasi, kolom),
          `${spesifikasi.table}.${kolom}`,
        ).toBeDefined();
      }
    }
  });

  it("memakai huruf kecil dan garis bawah saja untuk nama tabel", () => {
    // Nama tabel disisipkan ke SQL lewat sql.raw, jadi bentuknya harus
    // predictable dan tidak boleh butuh tanda kutip.
    for (const spesifikasi of all()) {
      expect(spesifikasi.table).toMatch(/^[a-z][a-z0-9_]*$/);
      for (const kolom of spesifikasi.fields) {
        expect(kolom.column, `${spesifikasi.table}.${kolom.column}`).toMatch(
          /^[a-z][a-z0-9_]*$/,
        );
      }
    }
  });
});

describe("find", () => {
  it("menemukan tabel yang terdaftar", () => {
    expect(find("faqs")?.table).toBe("faqs");
    expect(find("articles")?.table).toBe("articles");
  });

  it("menolak nama yang tidak ada", () => {
    // Nilai dikembalikan apa adanya supaya pemanggil bisa memilih 404 atau
    // 400. Menolaknya dengan galat di dalam fungsi ini membuat pemanggil tidak
    // bisa membedakan "tabel tidak ada" dari "server rusak".
    for (const nama of ["", "bukan_tabel", "FAQS", "faqs; DROP TABLE faqs", "__proto__"]) {
      expect(find(nama)).toBeUndefined();
    }
  });

  it("menolak nama yang tries menumpang ke prototype", () => {
    expect(find("constructor")).toBeUndefined();
    expect(find("toString")).toBeUndefined();
  });
});

describe("writable", () => {
  it("tidak pernah mengembalikan kolom terkunci", () => {
    for (const spesifikasi of all()) {
      for (const kolom of writable(spesifikasi)) {
        expect(kolom.locked).toBe(false);
      }
    }
  });

  it("membuang kolom yang terkunci tapi tetap menyertakan yang boleh ditulis", () => {
    const spesifikasi = all().find((t) => t.fields.some((f) => f.locked));
    if (!spesifikasi) return;

    const boleh = writable(spesifikasi).map((f) => f.column);
    expect(boleh.length).toBeGreaterThan(0);
    expect(boleh.length).toBeLessThan(spesifikasi.fields.length);
  });
});

describe("sortableColumns", () => {
  it("tidak pernah memuat nama yang bukan kolom", () => {
    // Nilai ini disalin ke ORDER BY tanpa tanda kutip, jadi daftar putihnya
    // adalah satu-satunya penghalang injeksi lewat parameter sort.
    for (const spesifikasi of all()) {
      const boleh = sortableColumns(spesifikasi);

      expect(boleh.has("id")).toBe(true);
      expect(boleh.has("created_at")).toBe(true);
      expect(boleh.has("updated_at")).toBe(true);
      expect(boleh.has("id; DROP TABLE faqs")).toBe(false);
    }
  });
});

describe("kindName dan choicesOf", () => {
  it("memberi nama untuk setiap varian yang dipakai registry", () => {
    // Panel membangun kontrol formulir dari nilai kind. Varian tanpa nama akan
    // terkirim sebagai undefined dan tampil sebagai kotak teks kosong.
    const dipakai = new Set(
      all().flatMap((t) => t.fields.map((f) => kindName(f.kind))),
    );

    for (const varian of VARIAN_KIND) {
      expect(dipakai.has(kindName(varian)), kindName(varian)).toBe(true);
    }
  });

  it("memberi daftar pilihan hanya untuk varian choice", () => {
    expect(choicesOf({ type: "choice", allowed: ["a", "b"] })).toEqual(["a", "b"]);
    expect(choicesOf({ type: "short" })).toBeNull();
    expect(choicesOf({ type: "boolean" })).toBeNull();
  });

  it("tidak pernah mengirim daftar kosong untuk varian choice", () => {
    for (const spesifikasi of all()) {
      for (const kolom of spesifikasi.fields) {
        const pilihan = choicesOf(kolom.kind);
        if (pilihan === null) continue;

        expect(
          pilihan.length,
          `${spesifikasi.table}.${kolom.column} punya pilihan kosong`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("describeTables", () => {
  it("mengirim bentuk yang sama untuk setiap tabel", () => {
    const { items } = describeTables() as { items: Record<string, unknown>[] };

    expect(items).toHaveLength(tableCount());

    for (const item of items) {
      for (const kunci of [
        "table",
        "label",
        "default_order",
        "deletable",
        "search_columns",
        "fields",
      ]) {
        expect(item, `${String(item.table)} tanpa ${kunci}`).toHaveProperty(kunci);
      }
    }
  });

  it("mengirim kunci null secara eksplisit, bukan menghilangkannya", () => {
    // Panel membaca `choices` dan `default`. Kunci yang hilang dibaca sebagai
    // undefined, dan bentuk keduanya tidak sama di JSON.
    const { items } = describeTables() as {
      items: { fields: Record<string, unknown>[] }[];
    };

    for (const kolom of items.flatMap((t) => t.fields)) {
      expect(Object.keys(kolom)).toContain("choices");
      expect(Object.keys(kolom)).toContain("default");
    }
  });

  it("tidak pernah mengirim label kosong", () => {
    const { items } = describeTables() as {
      items: { label: string; fields: { label: string }[] }[];
    };

    for (const tabel of items) {
      expect(tabel.label.trim()).not.toBe("");
      for (const kolom of tabel.fields) {
        expect(kolom.label.trim(), "label kolom kosong").not.toBe("");
      }
    }
  });
});
