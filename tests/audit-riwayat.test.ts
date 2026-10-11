import { describe, expect, it } from "vitest";
import { ringkasAudit, ringkasBaris, tabelAuditValid } from "@/server/admin/audit";

/**
 * Aturan riwayat audit.
 *
 * Diuji tanpa database karena seluruh bahayanya ada di penyeragaman teks, bukan
 * di query: ringkasan yang memuat baris baru akan memecah satu baris riwayat
 * menjadi dua di tampilan mana pun, dan teks yang lebih panjang dari kolomnya
 * akan membuat INSERT gagal seluruhnya.
 */

describe("ringkasAudit", () => {
  it("membuang baris baru dan menekan spasi berlebih", () => {
    const hasil = ringkasAudit("update", "articles", null, "Judul  berita\nkedua\tbaris");
    expect(hasil.summary).toBe("Judul berita kedua baris");
  });

  it("memangkas ringkasan yang lebih panjang dari kolomnya", () => {
    // Kolomnya varchar(255); PostgreSQL menolak nilai lebih panjang dengan galat,
    // bukan memotongnya diam-diam, jadi pemangkasan sudah harus terjadi di sini.
    const panjang = "a".repeat(400);
    const hasil = ringkasAudit("update", "articles", null, panjang);

    expect(hasil.summary.length).toBe(255);
    expect(hasil.summary.endsWith("…")).toBe(true);
  });

  it("menerima ringkasan kosong apa adanya", () => {
    // Tindakan tanpa judul (misalnya login) tetap harus tercatat.
    expect(ringkasAudit("login", "", null, "").summary).toBe("");
  });

  it("mempertahankan action, tabel, dan id baris tanpa diubah", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const hasil = ringkasAudit("delete", "doctors", id, "dr. Anita");

    expect(hasil.action).toBe("delete");
    expect(hasil.tableName).toBe("doctors");
    expect(hasil.rowId).toBe(id);
  });
});

describe("ringkasBaris", () => {
  it("mengambil judul dari kolom yang paling biasa dipakai", () => {
    // Urutannya penting: `title` didahulukan karena itulah kolom nama di hampir
    // semua tabel konten.
    expect(ringkasBaris({ title: "Berita baru", name: "Layanan" }, "Berita")).toBe("Berita baru");
    expect(ringkasBaris({ name: "Layanan" }, "Layanan")).toBe("Layanan");
    expect(ringkasBaris({ full_name: "dr. Anita" }, "Dokter")).toBe("dr. Anita");
    expect(ringkasBaris({ question: "Jam berapa?" }, "FAQ")).toBe("Jam berapa?");
  });

  it("jatuh ke bawaan kalau tidak ada kolom nama yang terisi", () => {
    // Baris tanpa nama masih harus punya ringkasan yang bisa dibaca; id UUID
    // tidak berarti apa-apa bagi orang yang membaca riwayat.
    expect(ringkasBaris({ id: "11111111-1111-4111-8111-111111111111" }, "Dokter")).toBe("Dokter");
    expect(ringkasBaris({ title: "   " }, "Dokter")).toBe("Dokter");
    expect(ringkasBaris({ title: 42 }, "Dokter")).toBe("Dokter");
  });
});

describe("tabelAuditValid", () => {
  it("menerima tabel yang memang dikelola panel", () => {
    expect(tabelAuditValid("articles")).toBe(true);
    expect(tabelAuditValid("users")).toBe(true);
  });

  it("menolak nama yang tidak ada di daftar putih", () => {
    // Nama tabel masuk ke SQL, jadi yang tidak dikenal harus tertolak sebelum
    // sampai ke query.
    expect(tabelAuditValid("admin_audit")).toBe(false);
    expect(tabelAuditValid("appointments")).toBe(false);
    expect(tabelAuditValid("")).toBe(false);
  });
});
