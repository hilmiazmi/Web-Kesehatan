import type { IsiHalaman } from "./types";

/**
 * Halaman "Tentang Kami".
 *
 * Mengikuti kelengkapan halaman profil situs acuan (visi-misi, budaya kerja,
 * profil singkat, sejarah, maklumat pelayanan), tetapi seluruh kalimat ditulis
 * ulang untuk RS fiktif ini. Tidak ada satu kalimat pun yang disalin dari
 * situs acuan.
 *
 * Halaman induk, jadi daftar subhalamannya diambil dari pohon navigasi lewat
 * blok `tautan-anak`, bukan ditulis manual. Kalau subhalaman dipindah, tautan
 * di sini ikut benar tanpa perlu disentuh.
 */
export const TENTANG: Record<string, IsiHalaman> = {
  "tentang-kami": {
    ringkas:
      "Rumah sakit pemerintah daerah kelas B, melayani rawat inap dan rawat jalan dalam satu lokasi.",
    blok: [
      {
        jenis: "paragraf",
        teks:
          "RSUD Contoh Sehat berdiri supaya warga di satu wilayah tidak perlu jauh untuk mendapat layanan dasar maupun rujukan.",
      },
      {
        jenis: "paragraf",
        teks:
          "Poliklinik spesialis, gawat darurat, ruang inap, laboratorium, radiologi, dan instalasi rehabilitasi berada dalam satu gedung.",
      },
      {
        jenis: "paragraf",
        teks:
          "Karena itu pemeriksaan penunjang tidak menuntut pasien pindah ke tempat lain.",
      },
      { jenis: "sub", teks: "Dua jalur pelayanan" },
      {
        jenis: "daftar",
        ikon: "bi-door-open",
        judul: "Rawat jalan",
        butir: [
          "Kunjungan sekali datang, mulai dari poliklinik sampai pemeriksaan kesehatan kerja.",
          "Poliklinik spesialis dibuka Senin sampai Jumat, pukul 07.30 sampai 14.00.",
        ],
      },
      {
        jenis: "daftar",
        ikon: "bi-hospital",
        judul: "Rawat inap",
        butir: [
          "Untuk pasien yang perlu tinggal lebih dari dua hari.",
          "Kelas perawatan dari perawatan intensif sampai perawatan biasa.",
        ],
      },
      { jenis: "sub", teks: "Sejarah singkat" },
      {
        jenis: "paragraf",
        teks:
          "Pembangunan dimulai dari sebuah puskesmas rawat inap yang kapasitasnya tidak lagi mencukupi. Pemerintah daerah kemudian menetapkannya sebagai rumah sakit daerah, dan status kelas B diperoleh setelah seluruh instalasi penunjang dinyatakan lengkap.",
      },
      {
        jenis: "paragraf",
        teks:
          "Sejak itu layanan bertambah bertahap: gawat darurat 24 jam, enam layanan prioritas terpadu, laboratorium dan radiologi mandiri, serta jalur pemeriksaan kesehatan berkala untuk perusahaan dan sekolah.",
      },
      { jenis: "sub", teks: "Visi" },
      {
        jenis: "paragraf",
        teks:
          "Menjadi rumah sakit daerah yang tepercaya, dengan layanan yang bermutu, terjangkau, dan berkesinambungan bagi seluruh warga.",
      },
      { jenis: "sub", teks: "Misi" },
      {
        jenis: "langkah",
        judul: "Lima komitmen kerja",
        butir: [
          "Memberi pelayanan yang selamat, bermutu, dan berpusat pada pasien.",
          "Menjamin keterjangkauan biaya tanpa membedakan latar belakang pasien.",
          "Mengembangkan layanan unggulan yang menjawab kebutuhan wilayah.",
          "Membina tenaga kesehatan lewat pendidikan dan penelitian yang berkelanjutan.",
          "Menjalankan tata kelola yang bersih, transparan, dan akuntabel.",
        ],
      },
      { jenis: "sub", teks: "Budaya kerja" },
      {
        jenis: "daftar-tebal",
        judul: "Nilai yang dipegang seluruh pegawai",
        butir: [
          {
            tebal: "Sigap.",
            isi: "Keadaan darurat ditangani lebih dulu, administrasi menyusul.",
          },
          {
            tebal: "Empati.",
            isi: "Pasien dan keluarga diberi penjelasan dengan bahasa yang dimengerti.",
          },
          {
            tebal: "Hemat.",
            isi: "Sumber daya dipakai seperlunya tanpa mengurangi mutu layanan.",
          },
          {
            tebal: "Akuntabel.",
            isi: "Setiap keputusan tercatat dan bisa dipertanggungjawabkan.",
          },
          {
            tebal: "Terbuka.",
            isi: "Kritik dan saran dibaca rutin dan ditindaklanjuti.",
          },
        ],
      },
      { jenis: "sub", teks: "Maklumat pelayanan" },
      {
        jenis: "paragraf",
        teks:
          "Dengan ini kami menyatakan sanggup memberikan pelayanan sesuai standar yang ditetapkan. Bila ternyata tidak menepati janji ini, kami siap menerima sanksi dan memberi kompensasi sesuai ketentuan yang berlaku.",
      },
      { jenis: "sub", teks: "Prinsip kerja" },
      {
        jenis: "daftar",
        ikon: "bi-check2-circle",
        butir: [
          "Prioritas ditentukan oleh kebutuhan medis, bukan oleh urutan datang.",
          "Tindakan invasif dijelaskan lebih dulu, termasuk risiko dan alternatifnya.",
          "Perkiraan biaya diberikan secara tertulis sebelum tindakan dimulai.",
          "Data pasien hanya dipakai untuk keperluan pelayanan.",
        ],
      },
      { jenis: "sub", teks: "Halaman di bagian ini" },
      { jenis: "tautan-anak" },
    ],
  },
};
