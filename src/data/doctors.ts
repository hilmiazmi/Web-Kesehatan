/**
 * Data dokter beserta jadwal praktik.
 *
 * SEMUA ISI DI SINI FIKTIF (PRD bagian 9). `specialty` HARUS sama persis
 * dengan `specialty` di `src/data/clinics.ts` (dijaga oleh tes
 * `tests/poliklinik.test.ts`).
 * Jadwal berada dalam jam pelayanan rawat jalan: Senin sampai Jumat,
 * 07.30 sampai 14.00.
 *
 * Ini satu-satunya sumber nama dokter di repo. Beranda pun menurunkannya lewat
 * `DOCTORS_BY_SPECIALTY` di bawah, bukan menyimpan daftarnya sendiri, karena
 * sebelumnya ada dua daftar terpisah dan spesialis "Anak" punya nama berbeda
 * tergantung halaman yang sedang dibuka.
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
  // Anestesi
  { slug: "dr-santi-wijaya-span", name: "dr. Santi Wijaya, Sp.An", specialty: "Anestesi",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-budi-hartono-span", name: "dr. Budi Hartono, Sp.An", specialty: "Anestesi",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  // Bedah Digestive
  { slug: "dr-agus-setiawan-spb", name: "dr. Agus Setiawan, Sp.B", specialty: "Bedah Digestive",
    schedule: [j("Senin", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-dewi-anggraini-spb", name: "dr. Dewi Anggraini, Sp.B", specialty: "Bedah Digestive",
    schedule: [j("Selasa", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Bedah Onkologi
  { slug: "dr-fajar-ramadhan-spb", name: "dr. Fajar Ramadhan, Sp.B", specialty: "Bedah Onkologi",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "10.00–14.00")] },
  { slug: "dr-intan-permata-spb", name: "dr. Intan Permata, Sp.B", specialty: "Bedah Onkologi",
    schedule: [j("Kamis", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // Bedah Saraf
  { slug: "dr-hendra-gunawan-spbs", name: "dr. Hendra Gunawan, Sp.BS", specialty: "Bedah Saraf",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-kartika-sari-spbs", name: "dr. Kartika Sari, Sp.BS", specialty: "Bedah Saraf",
    schedule: [j("Senin", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Bedah Toraks dan Kardiovaskular
  { slug: "dr-lukman-hakim-spbtkv", name: "dr. Lukman Hakim, Sp.BTKV", specialty: "Bedah Toraks dan Kardiovaskular",
    schedule: [j("Senin", "09.00–13.00"), j("Rabu", "09.00–13.00")] },
  { slug: "dr-maya-putri-spbtkv", name: "dr. Maya Putri, Sp.BTKV", specialty: "Bedah Toraks dan Kardiovaskular",
    schedule: [j("Kamis", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Gigi Spesialis Bedah Mulut
  { slug: "drg-nanda-rizki-spbm", name: "drg. Nanda Rizki, Sp.BM", specialty: "Gigi Spesialis Bedah Mulut",
    schedule: [j("Senin", "08.00–12.00"), j("Kamis", "08.00–12.00")] },
  { slug: "drg-ratna-dewi-spbm", name: "drg. Ratna Dewi, Sp.BM", specialty: "Gigi Spesialis Bedah Mulut",
    schedule: [j("Selasa", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // Gigi Spesialis Endodonsi
  { slug: "drg-sony-kurnia-spkg", name: "drg. Sony Kurnia, Sp.KG", specialty: "Gigi Spesialis Endodonsi",
    schedule: [j("Senin", "09.00–13.00"), j("Rabu", "09.00–13.00")] },
  { slug: "drg-tania-wulandari-spkg", name: "drg. Tania Wulandari, Sp.KG", specialty: "Gigi Spesialis Endodonsi",
    schedule: [j("Kamis", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Gigi Spesialis Ortodonti
  { slug: "drg-wahyu-hidayat-sport", name: "drg. Wahyu Hidayat, Sp.Ort", specialty: "Gigi Spesialis Ortodonti",
    schedule: [j("Selasa", "08.00–12.00"), j("Kamis", "08.00–12.00")] },
  { slug: "drg-yulia-ningsih-sport", name: "drg. Yulia Ningsih, Sp.Ort", specialty: "Gigi Spesialis Ortodonti",
    schedule: [j("Senin", "10.00–14.00"), j("Rabu", "10.00–14.00")] },
  // Gigi Spesialis Pedodontis
  { slug: "drg-andi-saputra-spkga", name: "drg. Andi Saputra, Sp.KGA", specialty: "Gigi Spesialis Pedodontis",
    schedule: [j("Senin", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  { slug: "drg-bella-cintya-spkga", name: "drg. Bella Cintya, Sp.KGA", specialty: "Gigi Spesialis Pedodontis",
    schedule: [j("Rabu", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  // Gigi Spesialis Prostodonsia
  { slug: "drg-candra-kirana-sppros", name: "drg. Candra Kirana, Sp.Pros", specialty: "Gigi Spesialis Prostodonsia",
    schedule: [j("Selasa", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  { slug: "drg-dinda-aulia-sppros", name: "drg. Dinda Aulia, Sp.Pros", specialty: "Gigi Spesialis Prostodonsia",
    schedule: [j("Senin", "08.00–12.00"), j("Kamis", "08.00–12.00")] },
  // Ginekologi Onkologi
  { slug: "dr-farah-diba-spog", name: "dr. Farah Diba, Sp.OG", specialty: "Ginekologi Onkologi",
    schedule: [j("Senin", "09.00–13.00"), j("Rabu", "09.00–13.00")] },
  { slug: "dr-gilang-mahardika-spog", name: "dr. Gilang Mahardika, Sp.OG", specialty: "Ginekologi Onkologi",
    schedule: [j("Kamis", "10.00–14.00"), j("Jumat", "08.00–11.00")] },
  // Onkologi Radiasi (Radioterapi)
  { slug: "dr-hesti-puspita-sponkrad", name: "dr. Hesti Puspita, Sp.Onk.Rad", specialty: "Onkologi Radiasi (Radioterapi)",
    schedule: [j("Senin", "08.00–12.00"), j("Selasa", "08.00–12.00")] },
  { slug: "dr-irfan-maulana-sponkrad", name: "dr. Irfan Maulana, Sp.Onk.Rad", specialty: "Onkologi Radiasi (Radioterapi)",
    schedule: [j("Rabu", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // Penyakit Dalam Hematologi Onkologi Medik
  { slug: "dr-kirana-ayu-sppdkhom", name: "dr. Kirana Ayu, Sp.PD-KHOM", specialty: "Penyakit Dalam Hematologi Onkologi Medik",
    schedule: [j("Senin", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "dr-bagas-wicaksono-sppdkhom", name: "dr. Bagas Wicaksono, Sp.PD-KHOM", specialty: "Penyakit Dalam Hematologi Onkologi Medik",
    schedule: [j("Selasa", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Psikiatri
  { slug: "dr-laksmi-dewi-spkj", name: "dr. Laksmi Dewi, Sp.KJ", specialty: "Psikiatri",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-pandu-wira-spkj", name: "dr. Pandu Wira, Sp.KJ", specialty: "Psikiatri",
    schedule: [j("Kamis", "09.00–13.00"), j("Jumat", "09.00–12.00")] },
  // Psikologi (tenaga psikolog, gelarnya M.Psi. — bukan dokter spesialis)
  { slug: "sinta-maharani-psikolog", name: "Sinta Maharani, M.Psi., Psikolog", specialty: "Psikologi",
    schedule: [j("Senin", "09.00–13.00"), j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
  { slug: "rizal-fachri-psikolog", name: "Rizal Fachri, M.Psi., Psikolog", specialty: "Psikologi",
    schedule: [j("Rabu", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // Rehab Medik
  { slug: "dr-novita-sari-spkfr", name: "dr. Novita Sari, Sp.KFR", specialty: "Rehab Medik",
    schedule: [j("Senin", "08.00–12.00"), j("Kamis", "08.00–12.00")] },
  { slug: "dr-yoga-saputra-spkfr", name: "dr. Yoga Saputra, Sp.KFR", specialty: "Rehab Medik",
    schedule: [j("Selasa", "09.00–13.00"), j("Jumat", "08.00–11.00")] },
  // TB DOTS (ditangani dokter paru)
  { slug: "dr-ratih-puspita-spp", name: "dr. Ratih Puspita, Sp.P", specialty: "TB DOTS",
    schedule: [j("Senin", "09.00–13.00"), j("Rabu", "09.00–13.00")] },
  { slug: "dr-deni-kurniawan-spp", name: "dr. Deni Kurniawan, Sp.P", specialty: "TB DOTS",
    schedule: [j("Kamis", "08.00–12.00"), j("Jumat", "08.00–11.00")] },
  // Urologi
  { slug: "dr-fikri-haikal-spu", name: "dr. Fikri Haikal, Sp.U", specialty: "Urologi",
    schedule: [j("Senin", "08.00–12.00"), j("Rabu", "08.00–12.00")] },
  { slug: "dr-winda-lestari-spu", name: "dr. Winda Lestari, Sp.U", specialty: "Urologi",
    schedule: [j("Selasa", "09.00–13.00"), j("Kamis", "09.00–13.00")] },
];

/**
 * Nama dokter dikelompokkan menurut spesialisasinya.
 *
 * Diturunkan dari `DOCTORS`, bukan ditulis tangan. Widget "Cari Jadwal Dokter"
 * di beranda butuh bentuk ini — daftar nama untuk satu spesialisasi — dan
 * sebelumnya membacanya dari daftar terpisah yang tidak pernah sama dengan
 * `DOCTORS`. Spesialis "Anak" karena itu punya nama berbeda tergantung halaman
 * yang sedang dibuka: tiga nama di beranda, dua nama di halaman dokter.
 *
 * Menurunkan dari sini menutup celah itu: daftar kedua tidak bisa dibuat
 * tanpa sengaja mengambil data ini, dan `tests/data.test.ts` menjaga supaya
 * setiap nama yang muncul benar-benar ada di `DOCTORS`.
 *
 * Urutan SPECIALTIES di `src/data/home.ts` tidak ikut di sini; kuncinya hanya
 * berisi spesialisasi yang benar-benar punya dokter.
 */
export const DOCTORS_BY_SPECIALTY: Record<string, string[]> = DOCTORS.reduce<
  Record<string, string[]>
>((kelompok, dokter) => {
  (kelompok[dokter.specialty] ??= []).push(dokter.name);
  return kelompok;
}, {});
