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
}: {
  src: string;
  alt: string;
  sizes?: string;
  preload?: boolean;
  height?: number;
  /** Sudut: atas (kartu), semua sudut (grid), atau lingkaran (avatar). */
  radius?: "top" | "all" | "circle";
  className?: string;
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
      />
    </div>
  );
}