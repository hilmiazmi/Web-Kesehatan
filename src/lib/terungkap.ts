/**
 * Aturan "sudah masuk viewport" untuk komponen `Terungkap`.
 *
 * Dipisah dari komponen supaya bisa diuji tanpa peramban:
 * IntersectionObserver adalah API peramban, sementara aturan keputusannya
 * murni perbandingan angka.
 *
 * Aturannya sengaja `> 0`, bukan ambang rasio: elemen yang lebih tinggi dari
 * viewport (kartu tinggi di ponsel pendek) tidak akan pernah mencapai rasio
 * tinggi, padahal sebagian besarnya jelas terlihat. Dengan ambang rasio,
 * elemen begini tidak pernah muncul — itu kegagalan fungsi, bukan cuma
 * animasi yang terlambat. Harga dari aturan ini: elemen yang baru menyentuh
 * tepi bawah satu piksel sudah dihitung tampil, dan itu selisih satu piksel
 * pada animasi 12px.
 */
export function sudahTampil(
  entries: { isIntersecting: boolean; intersectionRatio: number }[],
): boolean {
  return entries.some((e) => e.isIntersecting && e.intersectionRatio > 0);
}
