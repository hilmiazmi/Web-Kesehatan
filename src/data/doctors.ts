/**
 * Data dokter beserta jadwal praktik.
 *
 * SEMUA ISI DI SINI FIKTIF (PRD bagian 9). `specialty` HARUS sama persis
 * dengan `specialty` di `src/data/poliklinik.ts` (dijaga oleh tes).
 * Jadwal berada dalam jam pelayanan rawat jalan: Senin sampai Jumat,
 * 07.30 sampai 14.00.
 *
 * Saat backend siap, ganti dengan Route Handler (PRD bagian 6.4).
 */

export type Day = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat";

export type DoctorSchedule = {
  day: Day;
  /** Format "08.00–12.00". */
  time: string;
};

export type Doctor = {
  slug: string;
  name: string;
  specialty: string;
  schedule: DoctorSchedule[];
};

const j = (day: Day, time: string): DoctorSchedule => ({ day, time });

export const DOCTORS: Doctor[] = [
  // Anak
  { slug: "dr-annisa-rahma-spa", name: "dr. Annisa Rahma, Sp.A", specialty: "Anak",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  { slug: "dr-bagas-pratama-spa", name: "dr. Bagas Pratama, Sp.A", specialty: "Anak",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  // Penyakit Dalam
  { slug: "dr-citra-lestari-sppd", name: "dr. Citra Lestari, Sp.PD", specialty: "Penyakit Dalam",
    schedule: [j("Senin", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-dimas-nugroho-sppd", name: "dr. Dimas Nugroho, Sp.PD", specialty: "Penyakit Dalam",
    schedule: [j("Selasa", "08.00–12.00"), j("Rabu", "10.00–14.00"), j("Jumat", "08.00–11.00")] },
  // Jantung
  { slug: "dr-eka-wijaya-spjp", name: "dr. Eka Wijaya, Sp.JP", specialty: "Jantung",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-fajar-hidayat-spjp", name: "dr. Fajar Hidayat, Sp.JP", specialty: "Jantung",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00"), j("Jumat", "09.00–12.00")] },
  // Kebidanan dan Kandungan
  { slug: "dr-gita-permata-spog", name: "dr. Gita Permata, Sp.OG", specialty: "Kebidanan dan Kandungan",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  { slug: "dr-hana-safitri-spog", name: "dr. Hana Safitri, Sp.OG", specialty: "Kebidanan dan Kandungan",
    schedule: [j("Selasa", "10.00–14.00"), j("Kamis", "10.00–14.00")] },
  // Bedah Umum
  { slug: "dr-indra-kusuma-spb", name: "dr. Indra Kusuma, Sp.B", specialty: "Bedah Umum",
    schedule: [j("Senin", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-jihan-maharani-spb", name: "dr. Jihan Maharani, Sp.B", specialty: "Bedah Umum",
    schedule: [j("Rabu", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Saraf
  { slug: "dr-krisna-aditya-spn", name: "dr. Krisna Aditya, Sp.N", specialty: "Saraf",
    schedule: [j("Senin", "08.00–12.00"), j("Selasa", "08.00–12.00")] },
  { slug: "dr-laras-wulandari-spn", name: "dr. Laras Wulandari, Sp.N", specialty: "Saraf",
    schedule: [j("Rabu", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  // Mata
  { slug: "dr-mahesa-putra-spm", name: "dr. Mahesa Putra, Sp.M", specialty: "Mata",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-nadia-oktaviani-spm", name: "dr. Nadia Oktaviani, Sp.M", specialty: "Mata",
    schedule: [j("Selasa", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // THT
  { slug: "dr-oscar-firmansyah-spthtbkl", name: "dr. Oscar Firmansyah, Sp.T.H.T.B.K.L.", specialty: "THT",
    schedule: [j("Senin", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-putri-ayuningtyas-spthtbkl", name: "dr. Putri Ayuningtyas, Sp.T.H.T.B.K.L.", specialty: "THT",
    schedule: [j("Selasa", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Kulit dan Kelamin
  { slug: "dr-qori-amalia-spdv", name: "dr. Qori Amalia, Sp.D.V.E.", specialty: "Kulit dan Kelamin",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-rizky-ramadhan-spdv", name: "dr. Rizky Ramadhan, Sp.D.V.E.", specialty: "Kulit dan Kelamin",
    schedule: [j("Selasa", "10.00–14.00"), j("Kamis", "10.00–14.00")] },
  // Paru
  { slug: "dr-salsabila-nur-sppar", name: "dr. Salsabila Nur, Sp.P", specialty: "Paru",
    schedule: [j("Senin", "09.00–13.00"), j("Rabu", "09.00–13.00")] },
  { slug: "dr-teguh-santoso-sppar", name: "dr. Teguh Santoso, Sp.P", specialty: "Paru",
    schedule: [j("Selasa", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Ortopedi
  { slug: "dr-umar-hakim-spot", name: "dr. Umar Hakim, Sp.OT", specialty: "Ortopedi",
    schedule: [j("Senin", "08.00–12.00"), j("Kamis", "08.00–12.00")] },
  { slug: "dr-vina-anggraini-spot", name: "dr. Vina Anggraini, Sp.OT", specialty: "Ortopedi",
    schedule: [j("Rabu", "09.00–13.00"), j("Jumat", "09.00–12.00")] },
  // Gizi Klinik
  { slug: "dr-wulan-sari-spgk", name: "dr. Wulan Sari, Sp.GK", specialty: "Gizi Klinik",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-yoga-prasetyo-spgk", name: "dr. Yoga Prasetyo, Sp.GK", specialty: "Gizi Klinik",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
];
