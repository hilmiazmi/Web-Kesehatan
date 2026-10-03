// Konten halaman /radiologi. Identitas fiktif (data demo/portofolio).

export type AlatRadiologi = {
  id: string;
  nama: string;
  ikon: string;
  fungsi: string[];
};

export const radInfo = {
  judul: "Layanan Radiologi",
  pengantar: [
    "Instalasi Radiologi RSUD Contoh Sehat merupakan pelayanan penunjang medis yang memberikan layanan pemeriksaan radiologi dengan hasil berupa foto atau gambar untuk membantu dokter merawat pasien dan menegakkan diagnosis.",
    "Instalasi Radiologi kami didukung peralatan yang canggih dan terbaru. Keunggulan kami antara lain CT Scan MSCT 128 Slices, USG Abdomen, serta pemeriksaan Magnetic Resonance Imaging (MRI).",
  ],
  fasilitasJudul:
    "Instalasi Radiologi RSUD Contoh Sehat menyediakan beberapa jenis fasilitas pemeriksaan, di antaranya:",
} as const;

export const fasilitasRadiologi: string[] = [
  "Rontgen Thorax",
  "Pemeriksaan Radiologi Tanpa Kontras",
  "Pemeriksaan Radiologi Kontras",
  "Pemeriksaan CT Scan",
  "Pemeriksaan Mammografi",
  "Panoramic",
];

export const alatRadiologi: AlatRadiologi[] = [
  {
    id: "fluoroscopy",
    nama: "Fluoroscopy",
    ikon: "bi-camera-video",
    fungsi: [
      "Pemeriksaan HSG (gangguan kesuburan wanita)",
      "Pemeriksaan appendix",
      "Pemeriksaan kelainan saluran pencernaan",
    ],
  },
  {
    id: "mri",
    nama: "Magnetic Resonance Imaging (MRI)",
    ikon: "bi-magnet",
    fungsi: [
      "Mendiagnosis penyakit",
      "Evaluasi jantung dan pembuluh darah",
      "Deteksi kanker",
      "Pemeriksaan jaringan lunak",
      "Memantau perkembangan penyakit dalam pengobatan",
    ],
  },
  {
    id: "usg",
    nama: "USG",
    ikon: "bi-soundwave",
    fungsi: [
      "Mendiagnosis kondisi yang memengaruhi organ dan jaringan lunak tubuh",
      "Digunakan dalam pemeriksaan Medical Check Up (MCU)",
    ],
  },
  {
    id: "panoramic",
    nama: "Panoramic",
    ikon: "bi-emoji-smile",
    fungsi: [
      "Pemeriksaan kelainan pada periodontal",
      "Pemeriksaan kista pada tulang rahang",
      "Pemeriksaan tumor rahang atau kanker mulut",
      "Pemeriksaan gigi geraham bagian belakang",
      "Pemeriksaan kelainan terkait daerah mulut lainnya",
    ],
  },
  {
    id: "cephalometri",
    nama: "Cephalometri",
    ikon: "bi-person-bounding-box",
    fungsi: [
      "Mengukur struktur kepala dan rahang",
      "Diagnosis kelainan kraniofasial",
      "Perencanaan perawatan ortodontis",
      "Pemantauan pertumbuhan kraniofasial",
    ],
  },
  {
    id: "ct-scan",
    nama: "CT-Scan 128 Slice",
    ikon: "bi-disc",
    fungsi: [
      "Mendeteksi masalah hati, ginjal, atau saluran kemih",
      "Membantu mendiagnosis atau memantau penyakit jantung arteri koroner atau dalam rangka operasi penggantian katup",
      "Mengidentifikasi tumor, pendarahan, trauma tulang, dan penyumbatan aliran darah pada kepala",
      "Mendiagnosis kelainan pada paru-paru",
      "Mendiagnosis cedera tulang atau kerusakan sendi",
    ],
  },
  {
    id: "mamografi",
    nama: "Mamografi",
    ikon: "bi-heart-pulse",
    fungsi: [
      "Mendeteksi kanker payudara",
      "Digunakan dalam pemeriksaan Medical Check Up (MCU)",
    ],
  },
  {
    id: "c-arm",
    nama: "C-Arm",
    ikon: "bi-bullseye",
    fungsi: ["Penunjang proses pelayanan medis dan diagnosis penyakit tertentu"],
  },
  {
    id: "konvensional",
    nama: "Radiologi Konvensional",
    ikon: "bi-file-medical",
    fungsi: [
      "Pemeriksaan organ tubuh bagian kepala",
      "Pemeriksaan paru-paru (thorax)",
      "Pemeriksaan abdomen (perut)",
      "Pemeriksaan tulang pada seluruh bagian tubuh",
    ],
  },
];
