import { describe, expect, it, vi } from "vitest";
import { keCsv, namaBerkasCsv } from "@/lib/csv";

/**
 * Aturan pembuatan CSV.
 *
 * Diuji karena dua kegagalannya tidak terlihat di layar: BOM yang hilang hanya
 * berbuah huruf rusak saat berkas dibuka di Excel Windows, dan formula injection
 * hanya berbuah saat ada yang benar-benar mengeklik hasil ekspor yang berisi
 * rumus. Keduanya mustahil dicari dengan membaca kode komponen.
 */

describe("keCsv", () => {
  it("menulis judul kolom lalu satu baris per baris data", () => {
    const teks = keCsv(["nama", "kota"], [
      { nama: "Anita", kota: "Bandung" },
      { nama: "Bimo", kota: "Yogyakarta" },
    ]);

    expect(teks).toBe("\uFEFFnama,kota\r\nAnita,Bandung\r\nBimo,Yogyakarta\r\n");
  });

  it("diawali BOM supaya Excel Windows tidak salah membaca encoding", () => {
    // Tanpa BOM, Excel memakai halaman kode lokal dan nama beraksen rusak.
    const teks = keCsv(["nama"], [{ nama: "Citra Níngrum" }]);
    expect(teks.startsWith("\uFEFF")).toBe(true);
  });

  it("memakai CRLF sebagai akhir baris, termasuk baris terakhir", () => {
    const teks = keCsv(["a"], [{ a: "1" }, { a: "2" }]);
    expect(teks.endsWith("\r\n")).toBe(true);
    expect(teks.split("\r\n")).toEqual(["\uFEFFa", "1", "2", ""]);
  });

  it("membungkus nilai yang memuat koma atau tanda kutip", () => {
    const teks = keCsv(["pesan"], [{ pesan: 'Satu, "dua", tiga' }]);
    expect(teks).toBe('\uFEFFpesan\r\n"Satu, ""dua"", tiga"\r\n');
  });

  it("membungkus nilai yang memuat baris baru", () => {
    // Kritik-saran bisa memuat baris baru; tanpa pembungkus, satu kiriman
    // berubah jadi dua baris CSV dan kolom berikutnya ikut bergeser.
    const teks = keCsv(["kronologi"], [{ kronologi: "baris satu\nbaris dua" }]);
    expect(teks).toBe('\uFEFFkronologi\r\n"baris satu\nbaris dua"\r\n');
  });

  it("tidak membiarkan nilai berawalan rumus masuk sebagai formula", () => {
    // Isi formulir publik bebas diisi apa saja, jadi ekspor harus menetralkan
    // awalan yang dieksekusi Excel sebagai rumus.
    const serangan = ["=1+1", "+1", "-1", "@x", "\t1", "\r1"];
    for (const nilai of serangan) {
      const teks = keCsv(["x"], [{ x: nilai }]);
      const sel = teks.split("\r\n")[1].replace(/^"/, "");
      expect(sel.startsWith("'")).toBe(true);
    }
  });

  it("mengosongkan sel untuk null dan undefined", () => {
    const teks = keCsv(["a", "b"], [{ a: null, b: undefined }]);
    expect(teks).toBe("\uFEFFa,b\r\n,\r\n");
  });

  it("menulis objek sebagai JSON, bukan [object Object]", () => {
    const teks = keCsv(["meta"], [{ meta: { unit: "IGD", skor: 4 } }]);
    expect(teks).toBe('\uFEFFmeta\r\n"{""unit"":""IGD"",""skor"":4}"\r\n');
  });

  it("mengabaikan kolom yang tidak ada di baris", () => {
    const teks = keCsv(["a", "tidak_ada"], [{ a: "1" }]);
    expect(teks).toBe("\uFEFFa,tidak_ada\r\n1,\r\n");
  });

  it("memakai judul yang bisa dibaca manusia untuk kepala kolom", () => {
    // Header CSV harus sama dengan yang tampil di tabel panel, bukan nama kolom
    // database seperti `created_at`.
    const teks = keCsv(
      ["ticket_code", "created_at"],
      [{ ticket_code: "KS-ABCD1234", created_at: "2026-10-10T03:00:00Z" }],
      { ticket_code: "Kode tiket", created_at: "Masuk" },
    );
    expect(teks).toBe(
      "\uFEFFKode tiket,Masuk\r\nKS-ABCD1234,2026-10-10T03:00:00Z\r\n",
    );
  });

  it("tetap memakai nama kolom untuk kolom tanpa judul", () => {
    const teks = keCsv(["x"], [{ x: "1" }], { lain: "Judul lain" });
    expect(teks).toBe("\uFEFFx\r\n1\r\n");
  });
});

describe("namaBerkasCsv", () => {
  it("memakai tanggal hari ini supaya ekspor berulang tidak saling menimpa", () => {
    // Aturan waktu memakai jam palsu, bukan jam sebenarnya: tanpa itu tes ini
    // lulus hari ini dan gagal besok tanpa ada kode yang berubah.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T03:04:05.000Z"));

    expect(namaBerkasCsv("inbox-feedbacks")).toBe("inbox-feedbacks-2026-10-10.csv");

    vi.useRealTimers();
  });

  it("menerima tanggal eksplisit supaya pemanggil bisa mematok waktunya", () => {
    expect(namaBerkasCsv("records-doctors", new Date("2026-01-02T00:00:00.000Z"))).toBe(
      "records-doctors-2026-01-02.csv",
    );
  });
});
