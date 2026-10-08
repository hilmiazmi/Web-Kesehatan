import { describe, expect, it } from "vitest";
import { BROSUR_CATEGORIES, BROSURS } from "@/data/brosur";
import { CLINICS, CLINIC_DETAILS } from "@/data/clinics";
import { PPID_SUBPAGES } from "@/data/ppid";
import { NAV_PPID_CHILDREN } from "@/data/ppid-nav";

/**
 * Bentuk data brosur, klinik, dan PPID.
 *
 * Tiga kumpulan ini sama-sama dibaca route dengan `generateStaticParams` dan
 * `dynamicParams = false`, jadi satu slug salah eja akan membuat route itu
 * tidak pernah tampil tanpa error build yang jelas.
 */

describe("brosur digital", () => {
  it("setiap brosur punya kategori yang memang ada di BROSUR_CATEGORIES", () => {
    const kategori = new Set(BROSUR_CATEGORIES.map((c) => c.slug));
    const asing = BROSURS.filter((b) => !kategori.has(b.category));
    expect(asing.map((b) => b.slug)).toEqual([]);
  });

  it("setiap kategori punya minimal satu brosur", () => {
    // Tab tanpa isi akan terlihat seperti halaman kosong di /informasi-publik/brosur.
    const kosong = BROSUR_CATEGORIES.filter(
      (c) => !BROSURS.some((b) => b.category === c.slug),
    ).map((c) => c.slug);
    expect(kosong).toEqual([]);
  });

  it("slug brosur unik dan berbentuk URL", () => {
    const slug = BROSURS.map((b) => b.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("setiap brosur punya pembuka dan minimal satu seksi berisi butir", () => {
    for (const b of BROSURS) {
      expect(b.title.trim(), b.slug).not.toBe("");
      expect(b.lead.trim(), b.slug).not.toBe("");
      expect(b.sections.length, b.slug).toBeGreaterThan(0);
      for (const s of b.sections) {
        expect(s.heading.trim(), b.slug).not.toBe("");
        expect(s.points.length, `${b.slug} > ${s.heading}`).toBeGreaterThan(0);
        for (const p of s.points) expect(p.trim(), b.slug).not.toBe("");
      }
    }
  });
});

describe("detail klinik", () => {
  it("slug detail unik dan berbentuk URL", () => {
    const slug = CLINIC_DETAILS.map((d) => d.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("setiap entri detail menunjuk klinik induk yang ada", () => {
    const induk = new Set(CLINICS.map((c) => c.slug));
    const yatim = CLINIC_DETAILS.filter((d) => !induk.has(d.clinicSlug));
    expect(yatim.map((d) => d.slug)).toEqual([]);
  });

  it("setiap klinik punya minimal satu kartu detail", () => {
    // Tab tanpa kartu akan membuat panel /pelayanan/poliklinik terasa kosong.
    const kosong = CLINICS.filter((c) => c.details.length === 0).map((c) => c.slug);
    expect(kosong).toEqual([]);
  });
});

describe("halaman PPID", () => {
  it("submenu navbar dan isi halaman memakai sumber yang sama", () => {
    // Dua array ini tidak boleh berbeda: kalau nav menambah halaman yang tidak
    // ada di PPID_SUBPAGES, menunya berakhir jadi tautan mati.
    const dariNav = NAV_PPID_CHILDREN.map((c) => c.href);
    const dariData = PPID_SUBPAGES.map((p) => `/ppid/${p.slug}`);
    expect(dariNav).toEqual(dariData);
  });

  it("slug PPID unik dan berbentuk URL", () => {
    const slug = PPID_SUBPAGES.map((p) => p.slug);
    expect(new Set(slug).size).toBe(slug.length);
    for (const s of slug) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("halaman berformulir punya isian dan tombol kirim", () => {
    const form = PPID_SUBPAGES.filter((p) => p.form);
    expect(form.length).toBeGreaterThan(0);
    for (const p of form) {
      expect(p.form!.fields.length, p.slug).toBeGreaterThan(0);
      expect(p.form!.submitLabel.trim(), p.slug).not.toBe("");
    }
  });

  it("setiap halaman punya isi, bukan cuma judul", () => {
    // Tiga halaman formulir pernah punya `sections: []`, jadi yang tampil hanya
    // daftar isian. Halaman PPID tanpa penjelasan tidak bisa dipakai untuk
    // menjawab pertanyaan pemohon.
    for (const p of PPID_SUBPAGES) {
      expect(p.lead.trim(), p.slug).not.toBe("");
      expect(p.blok.length, p.slug).toBeGreaterThan(0);
      expect(p.blok.some((b) => b.jenis !== "catatan"), p.slug).toBe(true);
    }
  });

  it("halaman tanpa formulir punya minimal satu tabel atau langkah", () => {
    // Tanpa tabel atau langkah bernomor, halaman penjelasan berubah jadi daftar
    // kalimat yang tidak bisa dipakai: tidak ada angka target waktu, tidak ada
    // urutan kerja.
    const tanpaForm = PPID_SUBPAGES.filter((p) => !p.form);
    expect(tanpaForm.length).toBeGreaterThan(0);
    for (const p of tanpaForm) {
      const punya = p.blok.some((b) => b.jenis === "tabel" || b.jenis === "langkah");
      expect(punya, p.slug).toBe(true);
    }
  });

  it("tiap butir daftar punya teks yang tidak kosong", () => {
    // Butir kosong dirender sebagai elemen `<li>` kosong yang tetap menambah
    // tinggi baris, jadi halaman terlihat punya lebih banyak isi daripada
    // yang sebenarnya ada.
    const kosong: string[] = [];
    for (const p of PPID_SUBPAGES) {
      for (const b of p.blok) {
        if (b.jenis === "daftar") {
          b.butir.forEach((t, i) => {
            if (t.trim() === "") kosong.push(`${p.slug} daftar[${i}]`);
          });
        }
        if (b.jenis === "daftar-tebal") {
          b.butir.forEach((t, i) => {
            if (t.tebal.trim() === "" || t.isi.trim() === "") kosong.push(`${p.slug} tebal[${i}]`);
          });
        }
        if (b.jenis === "langkah") {
          b.butir.forEach((t, i) => {
            if (t.trim() === "") kosong.push(`${p.slug} langkah[${i}]`);
          });
        }
      }
    }
    expect(kosong).toEqual([]);
  });

  it("angka laporan PPID konsisten dengan tabel penyelesaannya", () => {
    // Angka rekapitulasi dan angka tabel harus saling cocok: total
    // permintaan harus sama dengan jumlah yang diberikan ditambah yang tidak
    // dapat diberikan.
    const laporan = PPID_SUBPAGES.find((p) => p.slug === "laporan-ppid")!;
    const statistik = laporan.blok.find((b) => b.jenis === "statistik");
    const tabel = laporan.blok.find((b) => b.jenis === "tabel");
    if (statistik?.jenis !== "statistik" || tabel?.jenis !== "tabel") {
      throw new Error("blok laporan tidak ditemukan");
    }

    const angka = (label: string): number => {
      const butir = statistik.butir.find((b) => b.label === label);
      if (butir === undefined) throw new Error(`statistik "${label}" tidak ada`);
      return Number(butir.nilai);
    };
    const jumlah = (kolom: number): number =>
      tabel.baris.reduce((n, b) => n + Number(b[kolom]), 0);

    const diminta = jumlah(1);
    const diberikan = jumlah(2);
    const ditolak = jumlah(3);

    expect(diminta).toBe(angka("Permintaan diterima"));
    expect(diberikan).toBe(angka("Dijawab sesuai jangka waktu"));
    expect(ditolak).toBe(angka("Tidak dapat diberikan"));
    // Permintaan yang tidak dijelaskan jawabnya harus nol, kalau tidak
    // ada kategori yang belum tercatat.
    expect(diberikan + ditolak).toBe(diminta);
  });
});