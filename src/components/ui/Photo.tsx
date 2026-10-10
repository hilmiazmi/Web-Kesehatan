import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Komponen foto tunggal untuk seluruh situs.
 *
 * Perannya sebagai wrapper dan styling sekaligus, jadi pemanggil tidak perlu menulis
 * `<div className="img-...">` di setiap kali memakainya. Tinggi dan radius
 * diatur lewat CSS custom property.
 *
 * Aset foto ada di `src/data/images.ts` (Unsplash dan picsum), bukan dari
 * situs referensi.
 *
 * ## Foto tanpa teks alternatif
 *
 * `alt=""` berarti "gambar ini dekoratif": nama atau keterangannya sudah
 * dibacakan dari tempat lain, seperti `<h3>` di samping atau `caption` di bawah
 * foto. Menulis ulang nama itu di `alt` membuat pembaca layar mengucapkannya
 * dua kali ("Farmasi Farmasi"), jadi mengosongkannya memang yang benar.
 *
 * Bedanya dengan gambar yang memang lupa diberi `alt` hanya satu: dekoratif
 * harus dinyatakan, bukan disimpulkan. Karena itu `alt` kosong di sini ikut
 * memakai `role="presentation"` dan `aria-hidden="true"`. Tanpa penanda itu,
 * `alt=""` dan "lupa mengisi" tampak sama dari luar, dan tidak ada tes yang
 * bisa membedakan keduanya. Dengan penanda itu, `e2e/a11y.test.ts` dapat
 * mewajibkan setiap gambar kosong benar-benar dinyatakan dekoratif.
 *
 * `preload` menggantikan `priority`, yang sejak Next.js 16 dianggap deprecated.
 * Prop-nya diekspos di sini supaya cukup satu tempat yang perlu diubah.
 *
 * `preload` saja belum cukup untuk LCP. `next/image` memang menuliskan
 * `<link rel="preload" as="image">`, tapi tanpa `fetchpriority="high"`, jadi
 * unduhan itu berjalan dengan prioritas normal dan Lighthouse menandai
 * `priorityHinted` sebagai gagal pada elemen LCP. Karena itu `fetchPriority`
 * ikut memakai `high` setiap kali foto di-preload.
 *
 * `unoptimized` dipakai untuk foto yang alamatnya berasal dari database, bukan
 * dari `src/data/images.ts`. `next/image` menolak host yang tidak terdaftar di
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
  /** Kosongkan hanya untuk foto dekoratif; namanya harus ada di tempat lain. */
  alt?: string;
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
        alt={alt ?? ""}
        width={800}
        height={500}
        sizes={sizes}
        preload={preload}
        fetchPriority={preload ? "high" : undefined}
        unoptimized={unoptimized}
        // Kedua atribut dipasang bersama: `role` mengeluarkan gambar dari
        // urutan pembacaan, `aria-hidden` memastikan ia tidak tersisa di
        // pohon aksesibilitas kalau salah satunya tidak dikenali.
        {...(dekoratif(alt) ? PROPS_DEKORATIF : {})}
      />
    </div>
  );
}

/**
 * Apakah teks alternatif ini berarti foto dekoratif.
 *
 * Dipakai bersama oleh `Photo` dan `GalleryLightbox` supaya satu aturan tidak
 * ditulis di dua tempat: `alt` yang tidak diisi atau hanya berisi spasi
 * berarti gambar itu dekoratif, dan pemanggilnya bertanggung jawab memastikan
 * namanya ada di tempat lain.
 */
export function dekoratif(alt: string | undefined): boolean {
  return alt === undefined || alt.trim() === "";
}

/**
 * Penanda HTML untuk foto dekoratif.
 *
 * Kedua atribut sengaja dipasang bersama, bukan salah satu: `role` mengeluarkan
 * gambar dari urutan pembacaan, sedangkan `aria-hidden` memastikan ia tidak
 * tersisa di pohon aksesibilitas kalau yang satu itu tidak dikenali. Bersama,
 * keduanya membuat gambar kosong bisa dibedakan dari gambar yang lupa diberi
 * alternatif teks.
 */
export const PROPS_DEKORATIF = {
  role: "presentation",
  "aria-hidden": true,
} as const;
