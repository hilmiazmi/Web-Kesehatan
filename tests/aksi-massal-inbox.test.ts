import { describe, expect, it } from "vitest";
import {
  BATAS_AKSI_MASSAL,
  periksaAksiMassal,
  type InboxKind,
} from "@/server/admin/inbox";

/**
 * Aturan aksi massal ubah status.
 *
 * Diuji tanpa database karena seluruh bahayanya ada di validasi, bukan di
 * query: satu kiriman yang separah jalan lebih berbahaya daripada yang ditolak,
 * dan batas jumlah adalah penjaga kecelakaan yang mustahil diperiksa lewat
 * peramban.
 */

/** Jenis inbox berpilihan, cukup untuk menguji aturan tanpa database. */
const BERSTATUS: InboxKind = {
  slug: "feedbacks",
  table: "feedbacks",
  icon: "bi-chat-square-text",
  searchColumns: ["name", "subject", "message", "ticket_code"],
  hasStatus: true,
  statuses: ["new", "in_progress", "resolved", "rejected"],
};

const TANPA_STATUS: InboxKind = {
  slug: "survey-responses",
  table: "survey_responses",
  icon: "bi-clipboard-data",
  searchColumns: ["respondent_name", "ticket_code", "service_unit", "comment"],
  hasStatus: false,
  statuses: [],
};

const ID = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];

describe("periksaAksiMassal", () => {
  it("menerima daftar id dan status yang dikenal", () => {
    const hasil = periksaAksiMassal(BERSTATUS, ID, "resolved");
    expect(hasil).toEqual({ ids: ID, status: "resolved" });
  });

  it("membuang id yang dikirim dua kali", () => {
    // Angka `updated` tidak boleh lebih besar dari baris yang benar-benar
    // berubah hanya karena satu id muncul dua kali di daftar pilihan.
    const hasil = periksaAksiMassal(BERSTATUS, [ID[0], ID[0], ID[1]], "new");
    expect(hasil.ids).toEqual(ID);
  });

  it("menolak kiriman tanpa baris terpilih", () => {
    expect(() => periksaAksiMassal(BERSTATUS, [], "new")).toThrow(
      /Belum ada baris yang dipilih/,
    );
  });

  it("menolak pilihan yang melewati batas", () => {
    // Batas ini penjaga kecelakaan: satu klik tak sengaja tidak boleh
    // menyentuh ratusan baris sekaligus.
    const banyak = Array.from(
      { length: BATAS_AKSI_MASSAL + 1 },
      (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
    );

    expect(() => periksaAksiMassal(BERSTATUS, banyak, "new")).toThrow(/maksimal/);
  });

  it("masih menerima pilihan tepat sebesar batas", () => {
    const tepat = Array.from(
      { length: BATAS_AKSI_MASSAL },
      (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
    );

    expect(periksaAksiMassal(BERSTATUS, tepat, "new").ids).toHaveLength(BATAS_AKSI_MASSAL);
  });

  it("menolak status yang tidak dikenal untuk jenis ini", () => {
    expect(() => periksaAksiMassal(BERSTATUS, ID, "no_show")).toThrow(/Status tidak dikenal/);
  });

  it("menjelaskan bahwa survei memang tidak punya status", () => {
    // Pesannya harus menyebut sebabnya, bukan sekadar "tidak dikenal", supaya
    // operator tidak mengira panel rusak.
    expect(() => periksaAksiMassal(TANPA_STATUS, ID, "new")).toThrow(/tidak punya status/);
  });
});
