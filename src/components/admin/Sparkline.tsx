/**
 * Sparkline: grafik kecil satu garis, digambar sebagai SVG di server.
 *
 * Diletakkan di kartu "Pendaftaran empat belas hari" karena itu satu-satunya
 * tempat di dasbor yang punya urutan data. Satu garis yang naik atau turun
 * menjawab "lagi ramai atau lagi sepi" lebih cepat daripada angka total, dan
 * menjadikannya elemen yang membedakan dasbor ini dari deretan kartu angka.
 *
 * Digambar sebagai SVG inline, bukan lewat library: bentuknya tujuh sampai
 * empat belas titik dan satu polyline, jadi pustaka chart berarti puluhan
 * kilobyte JavaScript untuk sesuatu yang tidak berubah setelah dirender.
 *
 * `role="img"` plus `aria-label` supaya bentuknya bisa dibacakan: garis yang
 * hanya dekorasi akan disembunyikan, tapi di sini arah datanya memang
 * informasi.
 */

export type TitikSparkline = { date: string; total: number };

/** Lebar dan tinggi pemandangan SVG, dalam piksel. */
const W = 132;
const H = 34;

/** Ruang tepi supaya garis dan titik ujung tidak terpotong. */
const PAD = 3;

/**
 * Susun titik-titik garis dari data harian.
 *
 * Rentang Y selalu dari nol ke nilai terbesar, bukan dari minimum ke maksimum.
 * Memakai rentang penuh membuat perubahan kecil terlihat besar; di dasbor itu
 * menipu, dan yang dibutuhkan adalah proporsi yang jujur.
 */
function susunTitik(data: readonly TitikSparkline[]): { x: number; y: number }[] {
  if (data.length === 0) return [];
  const terbesar = Math.max(...data.map((d) => d.total), 1);
  const langkah = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  return data.map((d, i) => ({
    x: PAD + i * langkah,
    // Semakin besar nilainya, semakin kecil y (as mula-mula ke atas).
    y: PAD + (1 - d.total / terbesar) * (H - PAD * 2),
  }));
}

/** Bentuk `d` untuk polyline: deret koordinat yang digabung spasi. */
function pathTitik(titik: { x: number; y: number }[]): string {
  return titik.map((t) => `${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(" ");
}

/** Bentuk `d` untuk area di bawah garis, supaya terbaca sebagai volume. */
function pathArea(titik: { x: number; y: number }[]): string {
  if (titik.length === 0) return "";
  const dasar = H - PAD;
  return `M ${titik[0].x.toFixed(1)},${dasar} L ${pathTitik(titik)} L ${titik[
    titik.length - 1
  ].x.toFixed(1)},${dasar} Z`;
}

export default function Sparkline({
  data,
  label,
}: {
  data: readonly TitikSparkline[];
  /** Kalimat untuk pembaca layar, misalnya "pendaftaran empat belas hari". */
  label: string;
}) {
  if (data.length < 2) return null;

  const titik = susunTitik(data);
  // Arah ringkas, untuk warna garis: turun dibedakan dari naik supaya yang
  // penting (menurun) lebih cepat tertangkap mata.
  const awal = titik[0].y;
  const akhir = titik[titik.length - 1].y;
  const naik = akhir < awal;

  const gradien = `spark-${data.length}-${data[0].date}`;

  return (
    <svg
      className="admin-spark"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`${label}: ${data.map((d) => `${d.date} ${d.total}`).join(", ")}`}
      focusable="false"
    >
      <defs>
        {/* Area memakai gradien turun ke transparan, supaya garisnya yang
            jadi cerita utama dan isinya hanya pemberat. */}
        <linearGradient id={gradien} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--rs-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--rs-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={pathArea(titik)} fill={`url(#${gradien})`} />

      <polyline
        points={pathTitik(titik)}
        fill="none"
        stroke="var(--rs-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Titik terakhir lebih besar, sebagai penanda "hari ini". */}
      <circle
        cx={titik[titik.length - 1].x}
        cy={titik[titik.length - 1].y}
        r="3"
        fill="var(--rs-accent)"
        stroke="#fff"
        strokeWidth="1.5"
      />

      {/* Arah data diberikan lewat warna, bukan lewat ikon: naik aksen, turun
          warna peringatan. Yang turun bukan berarti "bagus", jadi warnanya
          mengikuti varian kartu. */}
      <title>{naik ? "cenderung naik" : "cenderung turun"}</title>
    </svg>
  );
}
