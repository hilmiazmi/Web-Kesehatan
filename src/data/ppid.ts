/**
 * Isi halaman PPID.
 *
 * Di situs referensi PPID punya satu halaman induk dengan sepuluh halaman
 * anak. Seluruh isi di sini dibuat sendiri, tidak ada data milik rumah sakit
 * asli (PRD bagian 12 dan 13).
 *
 * Isi ditulis sebagai `BlokHalaman`, bukan daftar subjudul dan butir, supaya
 * halaman PPID bisa memakai tabel waktu dan biaya, langkah bernomor, dan kotak
 * catatan seperti halaman generik lain. Kalau PPID memakai bentuk sendiri,
 * setiap jenis isi baru harus ditambahkan lagi di `pages.css` dan di
 * `PageBlocks`, padahal bentuk yang dibutuhkan sudah ada.
 *
 * Angka dan nama yang muncul di sini fiktif. Rincian layanan informasi pada
 * rumah sakit sebenarnya berlaku untuk publikasi resmi, sedangkan halaman ini
 * memakai angka yang masuk akal untuk convict rumah sakitounty pemerintah.
 */

import { CONTACT, FOOTER_ADDRESS } from "@/data/navigation";
import type { BlokHalaman } from "@/data/halaman/types";

export type PpidField = {
  label: string;
  type: "text" | "textarea";
  /** Penjelasan singkat di bawah kolom. */
  petunjuk?: string;
};

export type PpidSubpage = {
  slug: string;
  title: string;
  /** Kalimat pembuka, ditampilkan sendiri di bawah remah roti. */
  lead: string;
  blok: BlokHalaman[];
  form?: {
    submitLabel: string;
    note: string;
    fields: PpidField[];
    /**
     * Endpoint yang menerima isian halaman ini, kalau ada.
     *
     * Hanya diisi bila Route Handler-nya benar-benar ada. Dua formulir
     * permohonan informasi dan keberatan belum punya endpoint, jadi tombolnya
     * tetap dimatikan dan hanya menampilkan isiannya. Formulir WBS punya, dan
     * halaman itu merender `WbsForm`.
     *
     * Endpoint yang diisi tapi tidak ada Route Handler-nya lebih berbahaya
     * daripada tidak ada sama sekali: formulirnya kelihatan bisa dipakai lalu
     * gagal diam-diam.
     */
    endpoint?: string;
  };
};

/** Isi field formulir yang sama untuk dua halaman pemohon. */
const IDENTITAS: PpidField[] = [
  { label: "Nama lengkap", type: "text" },
  { label: "Nomor identitas", type: "text", petunjuk: "NIK atau paspor." },
  { label: "Alamat", type: "textarea" },
  { label: "Nomor telepon", type: "text" },
];

/** Alamat lengkap sebagai satu kalimat, supaya blok tabel tidak terpotong. */
const ALAMAT_SATU_BARIS = FOOTER_ADDRESS.join(", ");

export const PPID_SUBPAGES: PpidSubpage[] = [
  {
    slug: "badan-publik",
    title: "Badan Publik",
    lead: "Badan publik adalah setiap orang yang berhak memperoleh informasi publik yangirerimaxai rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Setiap orang berhak memperoleh informasi publik. Rights itu tidak bergantung pada kewarganegaraan, pekerjaan, atau alasan yang dibawa, dan tidak perlu alasan yang kuat untuk meminta informasi yang memang terbuka untuk umum.",
      },
      {
        jenis: "daftar",
        judul: "Siapa saja yang termasuk badan publik",
        ikon: "bi-people",
        butir: [
          "Warga negara Indonesia yang berkedudukan atau tinggal di wilayah kerja rumah sakit",
          "Warga negara asing yang tinggal atau bekerja di wilayah kerja rumah sakit",
          "Badan hukum yang berkedudukan di wilayah kerja rumah sakit",
          "Perwakil yang ditunjuk secara sah untuk kepentingan tertentu",
        ],
      },
      {
        jenis: "sub",
        teks: "Hak yang bisa dipakai",
      },
      {
        jenis: "daftar-tebal",
        butir: [
          {
            tebal: "Meminta informasi",
            isi: "menggunakan nama resmi informasi yang diminta, disertai alasan singkat penggunaan informasi tersebut",
          },
          {
            tebal: "Menerima jawaban",
            isi: "dalam bentuk salinan, rekaman, atau cuplikan sesuai bentuk yang diminta",
          },
          {
            tebal: "Menerima penjelasan",
            isi: "mengenai hak dan kewajiban badan publik menurut peraturan perundang-undangan",
          },
          {
            tebal: "Mengajukan keberatan",
            isi: "bila jawaban yang diberikan tidak memuaskan, disertai alasan keberatannya",
          },
        ],
      },
      {
        jenis: "sub",
        teks: "Kewajiban pemohon",
      },
      {
        jenis: "daftar",
        ikon: "bi-exclamation-circle",
        butir: [
          "Menyebutkan nama dan tujuan penggunaan informasi yang diminta",
          "Menyertakan bukti identitas bagi pemohon yang meminta salinan berupa berkas",
          "Memberikan informasi yang diketahui pemohon dapat memperjelas permintaan, untuk menghindari permintaan berulang",
        ],
      },
      {
        jenis: "catatan",
        judul: "Informasi yang tidak dapat diberikan",
        teks: "Sebagian informasi tidak dapat diberikan karena ada pengecualian dalam peraturan perundang-undangan. Ini termasuk data pribadi pasien, rahasia profesi, dan informasi yang membuka ruang untuk_keamanan nasional. Setiap permintaan yang ditolak disertai alasan tertulisnya, supaya pemohon tahu bagian mana yang tidak bisa dibuka.",
      },
      {
        jenis: "sub",
        teks: "Langkah memakai hak informasi",
      },
      {
        jenis: "langkah",
        butir: [
          "Cek apakah informasinya sudah dipublikasikan di halaman publik.",
          "Pilih kanal: loket informasi, surel, atau media sosial resmi.",
          "Sampaikan permintaan dengan menyebut nama resmi informasi dan tujuan penggunaannya.",
          "Simpan bukti penyampaian sebagai nomor tiket.",
          "Terima jawaban sesuai jangka waktu, atau ajukan keberatan bila tidak memuaskan.",
        ],
      },
      {
        jenis: "tautan",
        judul: "Langkah berikutnya",
        label: "Lihat cara meminta informasi",
        href: "/ppid/cari-informasi",
        ket: "Kanal yang tersedia, langkah pengajuan, dan dokumen yang perlu disiapkan.",
      },
    ],
  },
  {
    slug: "cari-informasi",
    title: "Cari Informasi",
    lead: "Informasi publik tersedia melalui beberapa kanal, dan pemohon tidak perlu datang langsung untuk meminta yang sudah dipublikasikan.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Sebelum mengajukan permintaan, periksa apakah informasinya sudah tersedia. Datos yang sudah dipublikasikan, seperti jadwal dokter, layanan rawat jalan, dan laporan tahunan, diberikan tanpa perlu permohonan tertulis.",
      },
      {
        jenis: "sub",
        teks: "Informasi yang sudah terbuka",
      },
      {
        jenis: "tabel",
        judul: "Informasi yang bisa diakses tanpa permohonan",
        kolom: ["Informasi", "Tempat akses"],
        baris: [
          ["Profil rumah sakit dan unit pelayanan", "Halaman profil, visi dan misi, serta struktur manajemen"],
          ["Jadwal praktik dokter", "Halaman jadwal dokter dan widget pencarian di beranda"],
          ["Layanan rawat jalan dan diagnostik", "Halaman layanan, unit rawat jalan, dan Instalasi Gawat Darurat"],
          ["Kapasitas tempat tidur", "Halaman kapasitas bed beserta waktu peninjauan terakhir"],
          ["Laporan tahunan dan rekapitulasi", "Halaman laporan PPID"],
          ["Regulasi dan standar prosedur", "Halaman dokumen, termasuk prosedur baku PPID"],
        ],
        catatan: "Informasi di atas diperbarui sesuai keterangan waktu yang tercantum pada masing-masing halaman.",
      },
      {
        jenis: "sub",
        teks: "Kanal penyampaian",
      },
      {
        jenis: "langkah",
        judul: "Alur permintaan yang perlu deportivo",
        butir: [
          "Siapkan data diri: nama, nomor identitas, alamat, dan nomor telepon aktif.",
          "Tuliskan informasi yang diminta sedetail mungkin, beserta alasan penggunaan informasi tersebut.",
          "Sampaikan lewat loket informasi, surel layanan, atau formulir permohonan informasi di situs ini.",
          "Simpan bukti penyampaian. Nomor tiket dipakai untuk mengecek perkembangannya.",
          "Jawaban diberikan sesuai jangka waktu pada halaman waktu dan biaya layanan.",
        ],
      },
      {
        jenis: "sub",
        teks: "Ketentuan yang perlu dipenuhi",
      },
      {
        jenis: "daftar",
        ikon: "bi-check-circle",
        butir: [
          "Permintaan harus menyebut nama dan tujuan penggunaan informasi",
          "Informasi yang bersifat rahasia pribadi diperiksa lebih dulu sebelum diberikan",
          "Permintaan yang tidak dapat dipenuhi disertai alasan danipp-stage saran.notify setelah jawaban diberikan",
          "Permintaan yang sama berulang kali dalam satu bulan dapat digabungkan menjadi satu proses",
        ],
      },
      {
        jenis: "catatan",
        judul: "Kalau informasinya belum ada",
        teks: "Permintaan yang memerlukan pemrosesan lebih lanjut, misalnya data yang harus dihimpun dari beberapa unit, punya jangka waktu yang lebih panjang dan dapat diperpanjang satu kali dengan pemberitahuan tertulis.",
      },
      {
        jenis: "tautan",
        judul: "Formulir yang tersedia",
        label: "Formulir Permohonan Informasi",
        href: "/ppid/form-permohonan-informasi",
        ket: "Formulir yang bisa diisi di halaman ini untuk pengajuan yang sedangambles di tempat.",
      },
    ],
  },
  {
    slug: "form-permohonan-informasi",
    title: "Formulir Permohonan Informasi",
    lead: "Isi formulir ini untuk mengajukan permintaan informasi publik yang belum dipublikasikan.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Formulir di bawah dipakai untuk permintaan yang tidak sudah tersedia di halaman publik. Permintaan yang isinya sudah dipublikasikan, seperti jadwal dokter atau laporan tahunan, dilayani tanpa formulir ini.",
      },
      {
        jenis: "sub",
        teks: "Sebelum mengisi",
      },
      {
        jenis: "daftar",
        ikon: "bi-check-circle",
        butir: [
          "Cek dulu daftar informasi terbuka pada halaman cara mencari informasi.",
          "Tuliskan judul atau nama resmi informasi yang diminta, bukan hanya nomor rekomen",
          "Sebutkan tujuan penggunaan informasi, misalnya untuk penelitian, laporan, atau keperluan pribadi",
          "Siapkan pemohon yang dapat dihubungi selama proses berjalan",
        ],
      },
      {
        jenis: "catatan",
        judul: "Permohonan yang tidak lengkap",
        teks: "Permohonan yang tidak lengkap dikembalikan untuk dilengkapi, dan tenggang answering belum dihitung sampai kelengkapannya diterima.",
      },
    ],
    form: {
      submitLabel: "Kirim Permohonan",
      note: "Pengisian data PR hanya tersedia di loket informasi selama jam kerja.",
      fields: [
        ...IDENTITAS,
        { label: "Jenis informasi yang diminta", type: "textarea", petunjuk: "Tuliskan nama resmi informasinya, misalnya Rekapitulasi Belanja Modal Tahun 2026." },
        { label: "Tujuan penggunaan informasi", type: "textarea", petunjuk: "Satu kalimat sudah cukup." },
        { label: "Bentuk informasi yang diinginkan", type: "text", petunjuk: "Salinan, rekaman, atau cuplikan." },
      ],
    },
  },
  {
    slug: "form-pengajuan-keberatan",
    title: "Formulir Pengajuan Keberatan",
    lead: "Keberatan diajukan bila jawaban yang diberikan tidak memuaskan.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Keberatan bukan staging ulang permintaan. Formulir ini dipakai setelah ada jawaban resmi dan pemohon tetap merasa jawaban itu tidak benar, tidak lengkap, atau tidak memberikan alasan yang dapat diterima.",
      },
      {
        jenis: "sub",
        teks: "Alasan yang dapat diterima",
      },
      {
        jenis: "daftar",
        ikon: "bi-check-circle",
        butir: [
          "Jawaban yang diberikan tidak sesuai dengan peraturan perundang-undangan yang berlaku",
          "Jawaban tidak memberikan alasan atas/info yang ditolak",
          "Informasi yang diberikan tidak lengkap",
          "Jawaban diberikan melewati jangka waktu yang ditetapkan",
        ],
      },
      {
        jenis: "sub",
        teks: "Proses keberatan",
      },
      {
        jenis: "langkah",
        butir: [
          "Mohon keputusan yang dilampaui beserta alasan keberatan.",
          "Keberatan diperiksa kelengkapannya oleh unit PPID.",
          "Keberatan yang diterima dit Carne comedy weiter diverifikasi oleh tim yang sama denganUoUA pemeriksa jawaban asal.",
          "Keputusan atas keberatan disampaikan secara tertulis.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Setelah keputusan keberatan",
        teks: "Keputusan atas keberatan adalah jawaban terakhir. Bila tetap tidak memuaskan, pemohon dapat mengajukan Permintaan Informasi yang sama untuk kali kedua dengan menyertakan alasan keberatan sebelumnya.",
      },
    ],
    form: {
      submitLabel: "Kirim Keberatan",
      note: "Keberatan harus menyebut alasan dan keputusan yang dilampaui.",
      fields: [
        ...IDENTITAS,
        { label: "Nomor tiket jawaban yang dilampaui", type: "text", petunjuk: "Nomor tiket dari jawaban sebelumnya." },
        { label: "Keputusan yang dilampaui", type: "textarea" },
        { label: "Alasan keberatan", type: "textarea", petunjuk: "Uraikan alasan jawaban itu tidak mem satisfactorily." },
      ],
    },
  },
  {
    slug: "form-whistle-blowing-system",
    title: "Form Whistle Blowing System",
    lead: "Tuliskan dugaan penyimpangan yang terjadi di lingkungan rumah sakit ini.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Whistle Blowing System adalah kanal pelaporan yang bisa dipakai pegawai, pasien, reagen, suplier, dan masyarakat ketika melihat dugaan penyimpangan yang tidak bisa dilaporkan melalui jalur biasa tanpa takut terhadap akibatnya.",
      },
      {
        jenis: "sub",
        teks: "Apa saja yang dilaporkan",
      },
      {
        jenis: "daftar",
        ikon: "bi-flag",
        butir: [
          "Dugaan pemsndgrave penicillin yang tidak sesuai ketentuan",
          "Dugaan pemusyahan aset atau dana rumah sakit",
          "Keluhan pasien yang tidak ditangani sesuai standar",
          "Duhan terhadap pasien, keluarga pasien, atau sesama pegawai",
          "Dugaan pemungutan biaya yang di luar ketentuan",
        ],
      },
      {
        jenis: "sub",
        teks: "Jaminan bagi pelapor",
      },
      {
        jenis: "daftar-tebal",
        butir: [
          {
            tebal: "Identitas dirahasiakan",
            isi: "Nama, nomor telepon, dan surel pelapor tidak dipublikasikan dalam bentuk apa pun, termasuk dalam laporan yearly yang diberikan kepada masyarakat.",
          },
          {
            tebal: "Tidak ada pembalasKORBAN",
            isi: "Pemohon yang sudah menyampaikan laporan tidak boleh dirugikan, diperlakukan berbeda, atau disanskyat karena pelaporannya.",
          },
          {
            tebal: "Pelaporan dapat dilakukan anonim",
            isi: "Bagian identitas boleh dikosongkan. Isian yang dikosongkan tidak menghambat pemeriksaan.",
          },
        ],
      },
      {
        jenis: "sub",
        teks: "Setelah laporan dikirim",
      },
      {
        jenis: "langkah",
        butir: [
          "Laporan diterima dan dicatat lengkap dengan kode tiket.",
          "Tim khusus memeriksa laporan tanpa lebih dulu menyimpulkan apa pun terhadap pelapor.",
          "Hasil pemeriksaan menjadi dasar tindakan, termasuk referral kasus bila ada(indikasi Tempo)",
          "Pelapor diberi tahu hasil pemeriksaan lewat kontak yang dicantumkan, bila nama tidak dirahasiakan.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Laporan yang tidak diproses",
        teks: "Laporan tanpa kronologi, lokasi, atau indications kejadian yang jelas akan diminta kelengkapannya lebih dulu. Laporan yang tidak diperjelas dalam dua kali opportunityymm tidak ditindaklanjuti sebagai laporan formally.",
      },
    ],
    form: {
      submitLabel: "Kirim Laporan",
      note: "Identitas pelapor dapat dirahasiakan dan tidak dipublikasikan.",
      endpoint: "/api/v1/wbs-reports",
      fields: [
        { label: "Nama pelapor, boleh dikosongkan", type: "text" },
        { label: "Nomor telepon, boleh dikosongkan", type: "text" },
        { label: "Surel, boleh dikosongkan", type: "text" },
        { label: "Unit yang terlibat", type: "text" },
        { label: "Uraian kejadian", type: "textarea", petunjuk: "Apa yang terjadi, di mana, dan siapa yang terlibat." },
        { label: "Waktu kejadian", type: "text", petunjuk: "Tanggal dan perkiraan jam." },
        { label: "Bukti yang dimiliki", type: "textarea", petunjuk: "Dokumen, foto, atau keterangan saksi yang bisa diperiksa." },
      ],
    },
  },
  {
    slug: "kanal-informasi",
    title: "Kanal Informasi",
    lead: "Unit PPID menerima permintaan, meneruskan pemeriksaan, dan memberikan jawaban secara tertulis.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Semua kanal di bawah diterima oleh unit yang sama, jadi pilihan kanal tidak memengaruhi hak atau jangka waktu jawaban. Yang perlu diperhatikan hanya kapan permintaan itu masuk, karena hari kerja dihitung sejak tanggal penerimaan.",
      },
      {
        jenis: "tabel",
        judul: "Kanal danalamatnya",
        kolom: ["Kanal", "Alamat", "Jam layanan"],
        baris: [
          ["Loket informasi", ALAMAT_SATU_BARIS, "Senin sampai Jumat, 08.00 sampai 16.00"],
          ["Telepon", CONTACT.phone, "Senin sampai Jumat, jam kerja"],
          ["Surel", CONTACT.email, "Diterima kapan saja, dijawab pada jam kerja"],
          ["Media sosial resmi", "Akun resmi rumah sakit pada platform media sosial", "Senin sampai Jumat, jam kerja"],
        ],
      },
      {
        jenis: "sub",
        teks: "Jam layanan",
      },
      {
        jenis: "daftar",
        ikon: "bi-clock",
        butir: [
          "Senin sampai Jumat, 08.00 sampai 16.00 waktu setempat",
          "Sabtu, 08.00 sampai 12.00 waktu setempat",
          "Ahad dan hari libur nasional tutup",
        ],
      },
      {
        jenis: "sub",
        teks: "Yang sebaiknya disiapkan sebelum datang",
      },
      {
        jenis: "daftar-tebal",
        butir: [
          {
            tebal: "Nama resmi informasi",
            isi: "menyebutkan dokumen atau data yang dicari, misalnya laporan keuangan atau rekapitulasi Belanja Modal",
          },
          {
            tebal: "Bentuk yang diinginkan",
            isi: "salinan kertas, berkas digital, atau cuplikan sebagian",
          },
          {
            tebal: "Kontak aktif",
            isi: "nomor telepon atau surel yang bisa dihubungi selama proses berjalan",
          },
        ],
      },
      {
        jenis: "catatan",
        judul: "Beban pemohon",
        teks: "Permintaan yang disampaikan lewat surel atau media sosial tetap dihitung dari hari kerja berikutnya bila dikirim di luar jam layanan.",
      },
    ],
  },
  {
    slug: "kanal-pengaduan",
    title: "Kanal Pengaduan",
    lead: "Pengaduan diproses tim yang terpisah dari petugas pelayanan.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Pengaduan dipakai untuk keluhan terhadap pelayanan, sedangkan whistleblowing dipakai untuk dugaan penyimpangan. Pemeriksaannya dipisahkan supaya pengaduan tidak atolah ke petugas yang-kecewacean complained about.",
      },
      {
        jenis: "sub",
        teks: "Cara menyampaikan pengaduan",
      },
      {
        jenis: "daftar",
        ikon: "bi-chat-left-text",
        butir: [
          "Mengisi formulir kritik dan saran pada halaman kontak",
          "Menyampaikan keluhan langsung ke loket pengaduan pada jam kerja",
          "Mengirimkan surel atau surat bertulis ke alamat pengaduan",
        ],
      },
      {
        jenis: "langkah",
        judul: "Tahapan penanganan",
        butir: [
          "Penerimaan dan pencatatan pengaduan dengan kode tiket.",
          "Penelitian oleh tim pengaduan yang tidak terlibat dalam pelayanan yang dikeluhkan.",
          "Pemberian jawaban tertulis, disertai corrective action bila pengaduan_receive_matrix.",
          "Penegakan tindakan korektif bila pengaduan terbukti.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Jangka waktu penanganan",
        kolom: ["Jenis pengaduan", "Target jawaban", "Keterangan"],
        baris: [
          ["Keluhan pelayanan umum", "14 hari kerja", "Dihitung sejak pengaduan dicatat"],
          ["Keluhan yang memerlukan pemeriksaan", "30 hari kerja", "Dapat diperpanjang dengan pemberitahuan tertulis"],
          ["Dugaan penyimpangan lewat WBS", "30 hari kerja", "Diperiksa tim khusus, bukan tim pengaduan"],
        ],
      },
      {
        jenis: "catatan",
        judul: "Mengapa pengaduan dipisahkan",
        teks: "Pengaduan yang ditangani petugas yang sama dengan yang dikeluhkan cenderung dianggap selesai tanpa pemeriksaan. Pemisahan timCLOSED Record membuat pemeriksaan documented dan hasilnya dapat dilaporkan.",
      },
      {
        jenis: "tautan",
        judul: "Formulir pengaduan",
        label: "Kritik dan Saran",
        href: "/kontak",
        ket: "Formulir yang bisa diisi di halaman ini, lengkap dengan kode tiket.",
      },
    ],
  },
  {
    slug: "laporan-ppid",
    title: "Laporan PPID",
    lead: "Laporan tahunan memuat rekapitulasi permintaan dan penyelesaiannya.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Laporan tahunan adalah bentuk paling sederhana dari kewajiban keterbukaan informasi: memberitahu secara terbuka berapa permintaan yang masuk, berapa yang dijawab, dan berapa yang tidak dapat dipenuhi beserta alasannya.",
      },
      {
        jenis: "statistik",
        judul: "Rekapitulasi tahun berjalan",
        butir: [
          { label: "Permintaan diterima", nilai: "842", ket: "Dari semua kanal" },
          { label: "Dijawab sesuai jangka waktu", nilai: "799" },
          { label: "Dilampaui", nilai: "18", ket: "Dengan pemberitahuan tertulis" },
          { label: "Tidak dapat diberikan", nilai: "43", ket: "Disertai alasan tertulis" },
          { label: "Keberatan diajukan", nilai: "37" },
        ],
        catatan: "Angka pada halaman ini adalah data fiktif untuk demo dan tidak mewakili kinerja nyata.",
      },
      {
        jenis: "tabel",
        judul: "Penyelesaian menurut jenis informasi",
        kolom: ["Jenis informasi", "Diminta", "Diberikan", "Tidak dapat diberikan"],
        baris: [
          ["Layanan dan pelayanan", "312", "296", "16"],
          ["Keuangan dan aset", "164", "143", "21"],
          ["Pegawai", "142", "137", "5"],
          ["Regulasi dan SOP", "118", "117", "1"],
          ["Data lainnya", "106", "106", "0"],
        ],
        catatan: "Jumlah dapat berbeda karena satu permintaan dapat memuat lebih dari satu jenis informasi.",
      },
      {
        jenis: "sub",
        teks: "Isi laporan",
      },
      {
        jenis: "daftar",
        ikon: "bi-check-circle",
        butir: [
          "Jumlah permintaan informasi yang diterima pada periode tersebut",
          "Jumlah permintaan yang dijawab, dikabulkan, dan sebagian dikabulkan",
          "Jumlah keberatan yang diajukan dan diselesaikan",
          "Jumlah informasi yang tidak dapat diberikan beserta alasan setiap penolakan",
          "Rincian pengaduan dan hasil penanganannya",
        ],
      },
      {
        jenis: "sub",
        teks: "Periode dan cara memperolehnya",
      },
      {
        jenis: "daftar",
        ikon: "bi-download",
        butir: [
          "Laporan tahunan terbit pada bulan Januari tahun berikutnya.",
          "Laporan dapat diminta melalui kanal informasi tanpa medan biaya penggandaan untuk jumlah wajar.",
          "Rekapitulasi jangka pendek dapat diminta kapan saja untuk periode satu kuartal terakhir.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Kenapa ada informasi yang tidak dapat diberikan",
        teks: "Tidak dapat diberikan tidak selalu berarti disembunyikan. Sebagian besar permintaan ditolak karena termasuk data pribadi pasien atau rahasia profesi, dan setiap penolakan disertai alasan tertulis yang juga dihitung dalam laporan ini.",
      },
    ],
  },
  {
    slug: "spo-ppid",
    title: "Standar Operasional Prosedur PPID",
    lead: "Prosedur kerja unit PPID dari penerimaan sampai jawaban.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Prosedur ini berlaku untuk permintaan yang masuk lewat seluruh kanal, sehingga hasilnya seragam dan bisa ditelusuri dari satu tempat. Unit lain yang menerima permintaan meneruskannya ke unit PPID pada hari yang sama.",
      },
      {
        jenis: "langkah",
        judul: "Tahapan",
        butir: [
          "Penerimaan dan pencatatan permintaan dengan kode tiket.",
          "Pemeriksaan kelengkapan berkas; berkas tidak lengkap dikembalikan ke pemohon.",
          "Penetapan petugas pemeriksa untuk menyusun jawaban.",
          "Pemeriksaan jawaban: apakah memuat data pribadi, rahasia profesi, atau bagian yang perlu disensor.",
          "Persetujuan jawaban oleh atasan langsung unit.",
          "Pemberian jawaban, pencatatan waktu penyelesaian, dan penyimpanan bukti.",
        ],
      },
      {
        jenis: "tabel",
        judul: "Waktu penyelesaian tiap tahapan",
        kolom: ["Tahapan", "Target", "Penanggung jawab"],
        baris: [
          ["Pencatatan permintaan", "1 hari kerja", "Petugas loket informasi"],
          ["Pemeriksaan kelengkapan", "2 hari kerja", "Unit PPID"],
          ["Penyusunan jawaban", "7 hari kerja", "Petugas pemeriksa yang ditunjuk"],
          ["Persetujuan jawaban", "2 hari kerja", "Kepala unit PPID"],
          ["Pemberian jawaban", "1 hari kerja", "Petugas loket informasi"],
        ],
      },
      {
        jenis: "sub",
        teks: "Pedoman peny censoran",
      },
      {
        jenis: "daftar",
        ikon: "bi-check-circle",
        butir: [
          "Data pribadi pasien, termasuk nama, alamat, dan rekam medis, tidak dimuat dalam jawaban.",
          "Identitas pelapor whistleblower tidak dimuat dalam laporan yearly.",
          "Bagian yang tidak dapat diberikan ditandai dengan keterangan alasan, bukan dihapus tanpa penjelasan.",
          "Dokumen yang memuat data pribadi dan dokumen yang tidak memuatnya diperiksa terpisah agar tidak ikut tersensor seluruhnya.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Bila tenggang terlampaui",
        teks: "Permintaan yang belum selesai melewati target diberi perpanjangan satu kali disertai pemberitahuan tertulis. Perpanjangan kedua tidak diberikan, dan permintaan diteruskan ke atasan unit untuk penyelesaian.",
      },
    ],
  },
  {
    slug: "waktu-dan-biaya-layanan",
    title: "Waktu dan Biaya Layanan",
    lead: "Layanan informasi tidak dipungut biaya, kecuali penggandaian dan transport.",
    blok: [
      {
        jenis: "paragraf",
        teks: "Pengajuan informasi publik tidak dipungut biaya. Pemohon tidak perlu membayar atas pengajuan, pemeriksaan, maupun jawabannya. Biaya hanya muncul kalau pemohon meminta salinan fisik dalam jumlah besar atau meminta pengiriman.",
      },
      {
        jenis: "sub",
        teks: "Waktu penyelesaian",
      },
      {
        jenis: "tabel",
        judul: "Target waktu jawaban",
        kolom: ["Jenis permintaan", "Target", "Hitungan mulai"],
        baris: [
          ["Informasi yang sudah tersedia", "14 hari kerja", "Tanggal penerimaan berkas lengkap"],
          ["Informasi yang perlu pemrosesan lebih lanjut", "30 hari kerja", "Tanggal penerimaan berkas lengkap"],
          ["Keberatan terhadap jawaban", "14 hari kerja", "Tanggal penerimaan keberatan lengkap"],
          ["Permintaan perpanjangan", "7 hari kerja", "Tanggal pemberitahuan perpanjangan"],
        ],
        catatan: "Hari kerja tidak memasukkan Sabtu, Ahad, dan hari libur nasional.",
      },
      {
        jenis: "sub",
        teks: "Waktu Wiley Criticism",
      },
      {
        jenis: "daftar",
        ikon: "bi-clock-history",
        butir: [
          "Permintaan yang masuk pada jam kerja diproses pada hari kerja yang sama.",
          "Permintaan di luar jam kerja diproses pada hari kerja berikutnya.",
          "Permintaan yang diterima hari kerja terakhir dihitung pada hari kerja berikutnya.",
          "Waktu paling lama berlaku sejak berkas dinyatakan lengkap, bukan sejak tanggal pemohon mengirimkannya.",
        ],
      },
      {
        jenis: "sub",
        teks: "Biaya",
      },
      {
        jenis: "daftar",
        ikon: "bi-cash-coin",
        butir: [
          "Pengajuan informasi tidak dipungut biaya.",
          "Salinan berkas digital diberikan tanpa biaya.",
          "Penggandaian kertas dikenakan sesuai tarif fotokopi yang berlaku, dibayar di loket.",
          "Pengiriman dokumen atas permintaan pemohon dikenakan biaya transport sesuai tarif pengiriman yang berlaku.",
          "Biaya tidak pernah diminta sebelum jawaban diberikan.",
        ],
      },
      {
        jenis: "catatan",
        judul: "Biaya yang tidak Briefly",
        teks: "Petugas tidak meminta pembayaran apa pun di luar loket resmi. Permintaan pembayaran di luar kanal resmi dapat dilaporkan melalui formulir Whistle Blowing System.",
      },
    ],
  },
];
