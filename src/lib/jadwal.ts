/**
 * Hitungan tanggal untuk pendaftaran.
 *
 * Semua fungsi di sini murni dan tidak menyentuh DOM, jadi bisa diuji tanpa
 * merender komponen. Semuanya memakai UTC ditambah offset WIB eksplisit,
 * bukan waktu setempat mesin: server CI dan VPS bisa berjalan di UTC, dan
 * memakai `getMonth`/`getDate` membuat "hari ini" ikut zona waktu mesin.
 * Akibatnya antara pukul 00.00 dan 06.59 WIB tanggal yang dihitung menjadi
 * kemarin, dan hari praktik dokter yangPtraktis tertukar satu hari.
 *
 * Nomor hari mengikuti `isoWeekday()` di `src/server/db/repo/appointments.ts`:
 * `1` Senin sampai `7` Minggu. Nilai inilah yang tersimpan di kolom
 * `doctor_schedules.day_of_week`, jadi konversinya tidak boleh diubah.
 */

/** Selisih WIB terhadap UTC dalam jam. */
export const WIB_OFFSET_JAM = 7;

/** Nama hari sesuai nomor ISO, indeks 0 dipakai sebagai placeholder. */
export const NAMA_HARI = [
  "",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

/** Nama bulan bahasa Indonesia, indeks 0 = Januari. */
export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** Inisial hari untuk kepala kolom kalender, mulai Senin. */
export const INISIAL_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

/** Ubah milliseconds ke `YYYY-MM-DD` menurut UTC. */
function keIso(d: Date): string {
  const bulan = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hari = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${bulan}-${hari}`;
}

/** Tanggal hari ini menurut WIB, bentuk `YYYY-MM-DD`. */
export function isoHariIni(): string {
  return keIso(new Date(Date.now() + WIB_OFFSET_JAM * 3_600_000));
}

/** Ubah `YYYY-MM-DD` jadi tanggal UTC tengah malam, tanpa mengubah zona. */
export function dariIso(iso: string): Date | null {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!cocok) return null;
  const [, tahun, bulan, hari] = cocok;
  const d = new Date(Date.UTC(Number(tahun), Number(bulan) - 1, Number(hari)));
  // Tanggal seperti 2026-02-31 digeser otomatis oleh `Date.UTC` ke Maret, jadi
  // hasilnya harus dibandingkan balik dengan aslinya agar ditolak.
  return keIso(d) === iso ? d : null;
}

/** Tambah sejumlah hari ke `YYYY-MM-DD`. */
export function tambahHari(iso: string, jumlah: number): string {
  const d = dariIso(iso);
  if (d === null) return iso;
  d.setUTCDate(d.getUTCDate() + jumlah);
  return keIso(d);
}

/** Nomor hari ISO (1 Senin sampai 7 Minggu) dari `YYYY-MM-DD`. */
export function nomorHari(iso: string): number | null {
  const d = dariIso(iso);
  if (d === null) return null;
  const hari = d.getUTCDay();
  return hari === 0 ? 7 : hari;
}

/**
 * Tanggal terdekat dengan hari tertentu, tidak lebih dulu dari `mulaiIso`.
 *
 * Dipakai widget beranda untuk mengubah pilihan "Selasa" menjadi tanggal yang
 * konkret sebelum diteruskan ke formulir. Kalau hari yang samafalls pada
 * `mulaiIso`, tanggal itu yang dipakai; tidak ada penambahan tujuh hari,
 * karena hari itu memang masih bisa dipesan hari ini juga.
 */
export function tanggalDekat(mulaiIso: string, nomor: number): string | null {
  if (mulaiIso === "" || nomor < 1 || nomor > 7) return null;
  const mulai = dariIso(mulaiIso);
  if (mulai === null) return null;
  const selisih = (nomor - (mulai.getUTCDay() === 0 ? 7 : mulai.getUTCDay()) + 7) % 7;
  return keIso(new Date(mulai.getTime() + selisih * 86_400_000));
}

/** Daftar nomor hari unik dan terurut dari daftar jadwal. */
export function hariPraktik(dayOfWeek: number[]): number[] {
  const unik = new Set(
    dayOfWeek.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7),
  );
  return [...unik].sort((a, b) => a - b);
}

/** Tanggal Iso lokal dalam bentuk `dd/MM/yyyy`. */
export function tanggalPendek(iso: string): string {
  const d = dariIso(iso);
  if (d === null) return "";
  const bulan = String(d.getUTCMonth() + 1).padStart(2, "0");
  const hari = String(d.getUTCDate()).padStart(2, "0");
  return `${hari}/${bulan}/${d.getUTCFullYear()}`;
}

/** Tanggal panjang bahasa Indonesia, mis. "Rabu, 7 Oktober 2026". */
export function tanggalPanjang(iso: string): string {
  const d = dariIso(iso);
  if (d === null) return "";
  const nomor = nomorHari(iso);
  const hari = nomor === null ? "" : `${NAMA_HARI[nomor]}, `;
  return `${hari}${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Satu kotak kalender. */
export type SelKalender = {
  /** `YYYY-MM-DD`, selalu terisi walau kotaknya milik bulan sebelumnya. */
  iso: string;
  /** Angka tanggal di dalam bulan itu sendiri. */
  tanggal: number;
  /** False untuk kotak sisipan supaya tabel selalu punya 7 kolom. */
  dalamBulan: boolean;
};

/**
 * Kisi kalender satu bulan, mulai hari Senin dan selalu 6 baris × 7 kolom.
 *
 * Kotak sebelum tanggal 1 dan sesudah tanggal terakhir bulan itu tetap
 * dikembalikan dengan `dalamBulan: false` supaya barisnya penuh. Kalau
 * kotak sisipan dihilangkan, baris terakhir bisa berisi hanya satu atau dua
 * kotak dan tinggi kalender ikut bergeser setiap bulan.
 */
export function kisiKalender(tahun: number, bulan: number): SelKalender[] {
  // `bulan` 1 sampai 12 supaya pemanggil tidak perlu tahu indeks nol.
  const pertama = new Date(Date.UTC(tahun, bulan - 1, 1));
  const geser = (pertama.getUTCDay() + 6) % 7;
  const mulai = new Date(pertama.getTime() - geser * 86_400_000);
  const kotak: SelKalender[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(mulai.getTime() + i * 86_400_000);
    kotak.push({
      iso: keIso(d),
      tanggal: d.getUTCDate(),
      dalamBulan: d.getUTCMonth() === bulan - 1 && d.getUTCFullYear() === tahun,
    });
  }
  return kotak;
}

/** Keterangan bulan untuk kepala kalender, mis. "Oktober 2026". */
export function judulBulan(tahun: number, bulan: number): string {
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

/** Jumlah hari dalam satu bulan. */
export function hariDalamBulan(tahun: number, bulan: number): number {
  return new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
}
