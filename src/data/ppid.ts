/**
 * Isi halaman PPID.
 *
 * Di situs referensi PPID punya satu halaman induk dengan sepuluh halaman
 * anak. Seluruh isi di sini dibuat sendiri, tidak ada data milik rumah sakit
 * asli (PRD bagian 12 dan 13).
 */

export type PpidField = {
  label: string;
  type: "text" | "textarea";
};

export type PpidSubpage = {
  slug: string;
  title: string;
  lead: string;
  sections: { heading: string; points: string[] }[];
  form?: { submitLabel: string; note: string; fields: PpidField[] };
};

/** Isi field formulir yang sama untuk dua halaman pemohon. */
const IDENTITAS: PpidField[] = [
  { label: "Nama lengkap", type: "text" },
  { label: "Nomor identitas", type: "text" },
  { label: "Alamat", type: "textarea" },
  { label: "Nomor telepon", type: "text" },
];

export const PPID_SUBPAGES: PpidSubpage[] = [
  {
    slug: "badan-publik",
    title: "Badan Publik",
    lead: "Badan publik adalah setiap orang yang berhak memperoleh informasi.",
    sections: [
      {
        heading: "Siapa Saja",
        points: [
          "Setiap orang yang berkedudukan di wilayah kerja rumah sakit",
          "Warga negara asing yang tinggal di wilayah kerja",
          "Badan hukum yang berkedudukan di wilayah kerja",
        ],
      },
      {
        heading: "Hak yang Didapat",
        points: [
          "Meminta informasi publik yang tersedia",
          "Menerima informasi dalam bentuk yang bisa dibaca",
          "Mener penjelasan mengenai hak dan kewajiban badan publik",
        ],
      },
    ],
  },
  {
    slug: "cari-informasi",
    title: "Cari Informasi",
    lead: "Informasi publik tersedia melalui beberapa kanal.",
    sections: [
      {
        heading: "Kanal Penyampaian",
        points: [
          "Permintaan langsung di loket informasi",
          "Permintaan tertulis lewat formulir permohonan informasi",
          "Permintaan lewat kanal pengaduan",
        ],
      },
      {
        heading: "Ketentuan",
        points: [
          "Permintaan menyebut nama dan tujuan penggunaan informasi",
          "Informasi diperiksa dulu sebelum diberikan",
          "Informasi yang bersifat rahasia tidak dapat diberikan",
        ],
      },
    ],
  },
  {
    slug: "form-permohonan-informasi",
    title: "Formulir Permohonan Informasi",
    lead: "Isi formulir ini untuk mengajukan permintaan informasi publik.",
    sections: [],
    form: {
      submitLabel: "Kirim Permohonan",
      note: "Permohonan yang tidak lengkap dikembalikan untuk dilengkapi.",
      fields: [
        ...IDENTITAS,
        { label: "Jenis informasi yang diminta", type: "textarea" },
        { label: "Tujuan penggunaan informasi", type: "textarea" },
      ],
    },
  },
  {
    slug: "form-pengajuan-keberatan",
    title: "Formulir Pengajuan Keberatan",
    lead: "Keberatan diajukan bila jawaban yang diberikan tidak memuaskan.",
    sections: [],
    form: {
      submitLabel: "Kirim Keberatan",
      note: "Keberatan harus menyebut alasan dan keputusan yang dilampaui.",
      fields: [
        ...IDENTITAS,
        { label: "Keputusan yang dilampaui", type: "textarea" },
        { label: "Alasan keberatan", type: "textarea" },
      ],
    },
  },
  {
    slug: "form-whistle-blowing-system",
    title: "Form Whistle Blowing System",
    lead: "Laporkan dugaan penyimpangan yang terjadi di lingkungan rumah sakit.",
    sections: [],
    form: {
      submitLabel: "Kirim Laporan",
      note: "Identitas pelapor dapat dirahasiakan dan tidak dipublikasikan.",
      fields: [
        { label: "Nama pelapor, boleh dikosongkan", type: "text" },
        { label: "Nomor telepon, boleh dikosongkan", type: "text" },
        { label: "Uraian kejadian", type: "textarea" },
        { label: "Waktu dan tempat kejadian", type: "text" },
        { label: "Saksi yang mengetahui", type: "textarea" },
      ],
    },
  },
  {
    slug: "kanal-informasi",
    title: "Kanal Informasi",
    lead: "Kanal informasi menerima dan menjawab permintaan masyarakat.",
    sections: [
      {
        heading: "Kanal yang Tersedia",
        points: [
          "Loket informasi di lantai lobby",
          "Surel layanan",
          "Telepon call center",
          "Media sosial resmi rumah sakit",
        ],
      },
      {
        heading: "Jam Layanan",
        points: [
          "Senin sampai Jumat, 08.00 sampai 16.00",
          "Sabtu, 08.00 sampai 12.00",
          "Ahad dan hari libur nasional tutup",
        ],
      },
    ],
  },
  {
    slug: "kanal-pengaduan",
    title: "Kanal Pengaduan",
    lead: "Pengaduan diproses tim yang terpisah dari petugas pelayanan.",
    sections: [
      {
        heading: "Cara Menyampaikan",
        points: [
          "Mengisi formulir pada halaman pengaduan masyarakat",
          "Menyampaikan keluhan langsung ke loket pengaduan",
          "Mengirimkan surat atau surel ke alamat pengaduan",
        ],
      },
      {
        heading: "Tahapan",
        points: [
          "Penerimaan dan pencatatan pengaduan",
          "Penelitian oleh tim pengaduan",
          "Jawaban tertulis paling lama 30 hari kerja",
        ],
      },
    ],
  },
  {
    slug: "laporan-ppid",
    title: "Laporan PPID",
    lead: "Laporan tahunan memuat rekapitulasi permintaan dan penyelesaiannya.",
    sections: [
      {
        heading: "Isi Laporan",
        points: [
          "Jumlah permintaan informasi yang diterima",
          "Jumlah permintaan yang dijawab dan dikabulkan",
          "Jumlah keberatan yang diajukan dan diselesaikan",
          "Jumlah informasi yang tidak dapat diberikan beserta alasan",
        ],
      },
      {
        heading: "Periode",
        points: [
          "Laporan tahunan terbit pada bulan Januari tahun berikutnya",
          "Laporan dapat diminta melalui kanal informasi",
        ],
      },
    ],
  },
  {
    slug: "spo-ppid",
    title: "Standar Operasional Prosedur PPID",
    lead: "Prosedur kerja unit PPID dari penerimaan sampai jawaban.",
    sections: [
      {
        heading: "Tahapan",
        points: [
          "Penerimaan dan pencatatan permintaan",
          "Pemeriksaan kelengkapan berkas",
          "Penetapan petugas untuk menyusun jawaban",
          "Persetujuan jawaban oleh atasan langsung",
          "Pemberian jawaban dan pencatatan",
        ],
      },
      {
        heading: "Waktu Penyelesaian",
        points: [
          "Informasi yang sudah tersedia: paling lama 14 hari kerja",
          "Informasi yang perlu pemrosesan lebih lanjut: paling lama 30 hari kerja",
          "Perpanjangan satu kali dengan pemberitahuan tertulis",
        ],
      },
    ],
  },
  {
    slug: "waktu-dan-biaya-layanan",
    title: "Waktu dan Biaya Layanan",
    lead: "Layanan informasi tidak dipungut biaya, kecuali penggandaian.",
    sections: [
      {
        heading: "Waktu",
        points: [
          "Permintaan saat jam kerja diproses hari yang sama",
          "Permintaan di luar jam kerja diproses hari kerja berikutnya",
          "Jawaban tertulis paling lama 14 hari kerja",
        ],
      },
      {
        heading: "Biaya",
        points: [
          "Permintaan informasi tidak dipungut biaya",
          "Salinan dokumen dikenakan biaya penggandaian",
          "Biaya transport ditanggung pemohon",
        ],
      },
    ],
  },
];