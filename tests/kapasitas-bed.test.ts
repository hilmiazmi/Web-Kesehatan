import { describe, expect, it } from "vitest";
import { waktuTinjauan } from "@/components/beds/KapasitasBedPanel";
import { sisih } from "@/components/admin/BedsManager";
import { BIAYA_KELAS } from "@/server/db/repo/admissions";

/**
 * Panel ketersediaan tempat tidur.
 *
 * Dua hal yang diuji di sini tidak bisa dijamin mata.
 *
 * 1. Waktu peninjauan diterjemahkan ke WIB. Backend mengirim ISO dengan
 *    penanda `Z`, yaitu UTC. Kalau angkanya dibaca apa adanya, waktu yang tampil
 *    tertujuh jam dan terlihat seperti peninjauan semalam, dan itu membuat
 *    angka kapasitas yang basi terlihat baru.
 * 2. Nilai yang tidak ada dijawab `null`, bukan "0 Januari 1970" atau
 *    "Invalid Date". `observed_at` masih `null` kalau tabel `bed_capacity`
 *    belum diisi, dan dua-duanya akan tampil di halaman sebagai informasi
 *    peninjauan terakhir.
 */
describe("waktuTinjauan", () => {
  it("menerjemahkan UTC ke WIB", () => {
    // 02:00 UTC adalah 09:00 WIB di hari yang sama.
    expect(waktuTinjauan("2026-10-08T02:00:00Z")).toBe("8 Oktober 2026, 09.00 WIB");
  });

  it("tidak bergeser ke tanggal sebelumnya", () => {
    // 23:30 UTC tanggal 8 adalah 06:30 WIB tanggal 9. Kalau hanya jam yang
    // ditambah tanpa geser tanggal, hasilnya 8 Oktober dan salah sehari.
    expect(waktuTinjauan("2026-10-08T23:30:00Z")).toBe("9 Oktober 2026, 06.30 WIB");
  });

  it("mengembalikan null kalau belum ada waktu peninjauan", () => {
    expect(waktuTinjauan(null)).toBeNull();
    expect(waktuTinjauan("")).toBeNull();
  });

  it("mengembalikan null untuk teks yang bukan tanggal", () => {
    // Backend tidak mengirim begini, tapi snapshot bisa ditulis tangan dan satu
    // karakter salah akan tampil sebagai "Invalid Date" di halaman publik.
    expect(waktuTinjauan("kemarin")).toBeNull();
  });
});

/**
 * Sisa tempat tidur dan kelebihan isi satu ruang.
 *
 * Kelebihan dihitung terpisah dari sisa, dan itu inti dari tes di sini.
 * `available_beds` di backend dijepit di nol, jadi kalau panel ikut menjepit
 * saja, kasus terisi dan dipesan melebihi total akan terlihat sebagai ruang
 * yang tepat penuh. Itu salah di tempat yang paling perlu dilihat petugas:
 * angkanya harus lebih dari nol dan lebih dari kapasitas.
 */
describe("sisih", () => {
  it("menghitung sisa dari total, terisi, dan dipesan", () => {
    expect(sisih(12, 9, 1)).toEqual({ tersedia: 2, berlebih: 0 });
  });

  it("mengembalikan nol saat ruang tepat penuh", () => {
    expect(sisih(8, 6, 2)).toEqual({ tersedia: 0, berlebih: 0 });
  });

  it("menunjukkan kelebihan tanpa membuat sisa negatif", () => {
    // Terisi 7 dan dipesan 4 di ruang 10 tempat: sisa tidak boleh -1, dan
    // kelebihan harus terlihat.
    expect(sisih(10, 7, 4)).toEqual({ tersedia: 0, berlebih: 1 });
  });

  it("tidak salah menghitung ruang kosong", () => {
    expect(sisih(6, 0, 0)).toEqual({ tersedia: 6, berlebih: 0 });
  });
});

/**
 * Perkiraan biaya inap.
 *
 * Dipakai di sini supaya kelas yang tampil di halaman rawat inap dan kelas
 * yang dipakai `sisaTempatTidur` tidak bisa berbeda diam-diam. Satu angka
 * dipakai bersama oleh backend dan frontend; kalau berbeda, pengunjung
 * melihat angka yang tidak sama dengan yang muncul di struk.
 */
describe("biaya kamar per kelas", () => {
  it("memiliki biaya untuk setiap kelas yang boleh diminta", () => {
    const kelasDiminta = ["intensive", "intermediate", "regular", "private"];
    for (const kelas of kelasDiminta) {
      expect(BIAYA_KELAS[kelas], kelas).toBeGreaterThan(0);
    }
  });
});
