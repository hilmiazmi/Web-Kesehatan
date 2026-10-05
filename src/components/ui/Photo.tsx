import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Komponen foto tunggal untuk seluruh situs.
 *
 * Fatanya wrapper dan styling sekaligus, jadi pemanggil tidak perlu menulis
 * `<div className="img-...">` di setiap kali memakainya. Tinggi dan radius
 * diatur lewat CSS custom property.
 *
 * Aset foto ada di `src/data/images.ts` (Unsplash dan picsum), bukan dari
 * situs referensi.
 *
 * `preload` menggantikan `priority`, yang sejak Next.js 16 dianggap deprecated.
 * Propi-nya diekspos di sini supaya cukup satu tempat yang perlu diubah.
 *
 * `preload` saja belum cukup untuk LCP. `next/image` memang menuliskan
 * `<link rel="preload" as="image">`, tapi tanpa `fetchpriority="high"`, jadi
 * unduhan itu berjalan dengan prioritas normal dan Lighthouse menandai
 * `priorityHinted` sebagai gagal pada elemen LCP. Karena itu `fetchPriority`
 * ikut memakai `high` setiap kali foto di-preload.
 *
 * `unoptimized` dipakai untuk foto yang alamatnya datang dari database, bukan
 * dari `src/data/images.ts`.(next/image) menolak host yang tidak terdaftar di
 * `remotePatterns` pada `next.config.ts`, sedangkan admin boleh memasukkan host
 * apa pun yang diawali `http` atau `https`. Dengan `unoptimized`, komponen
 * menulis `src` apa adanya ke `img` dan permintaan ke `/_next/image` tidak pernah
 * dibuat, sehingga foto dari database tidak pernah gagal karena host-nya.
 */
export default function Photo({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 400px",
  preload = false,
  /** Tinggi wrapper dalam piksel. */
  height = 190,
  /** Sudut membulat: atas saja (dalam kartu) atau semua sudut (grid). */
  radius = "top",
  className = "",
  unoptimized = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  preload?: boolean;
  height?: number;
  /** Sudut: atas (kartu), semua sudut (grid), atau lingkaran (avatar). */
  radius?: "top" | "all" | "circle";
  className?: string;
  /** Lewati perkakas optimasi. Untuk foto yang URL-nya berasal dari database. */
  unoptimized?: boolean;
}) {
  const style = { "--photo-h": `${height}px` } as CSSProperties;

  return (
    <div
      className={`photo-box photo-box--${radius} ${className}`.trim()}
      style={style}
    >
      <Image
        src={src}
        alt={alt}
        width={800}
        height={500}
        sizes={sizes}
        preload={preload}
        fetchPriority={preload ? "high" : undefined}
        unoptimized={unoptimized}
      />
    </div>
  );
}