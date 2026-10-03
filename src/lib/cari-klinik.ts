/**
 * Pencarian poliklinik.
 *
 * PRD bagian 8 butir 10 menyebut "pencarian poliklinik dan daftar dokter per
 * poliklinik". Sebelum ini, `/pelayanan/poliklinik` hanya punya tab per klinik
 * tanpa pencarian teks.
 *
 * Logikanya sengaja dipisah dari komponen ke sini supaya bisa diuji tanpa
 * merender apa pun, sama seperti `nav-path.ts` dan `format.ts`. Tidak ada
 * state, tidak ada DOM, tidak ada hook.
 */

/** Bentuk klinik yang dibutuhkan pencarian. Sama dengan `ClinicTab`. */
export type KlinikCari = {
  slug: string;
  name: string;
  description: string;
  services: string[];
  /** Jam praktik. Tidak dipakai untuk pencarian, tapi panel membutuhkannya. */
  hours: string;
};

/** Bentuk kartu detail yang dibutuhkan pencarian. */
export type DetailCari = {
  slug: string;
  name: string;
  clinicSlug: string;
  /** Spesialis kartu ini, kalau ada. Yang menghubungkan klinik ke dokter. */
  specialty?: string;
};

/** Bentuk dokter yang dibutuhkan pencarian. */
export type DokterCari = {
  slug: string;
  name: string;
  specialty: string;
};

export type HasilCari = {
  /** Klinik yang tersisa, urutannya sama seperti masukannya. */
  klinik: KlinikCari[];
  /** Kartu detail per `clinicSlug`, sudah disaring. */
  detail: Record<string, DetailCari[]>;
  /** Dokter per `clinicSlug`, sudah disaring. */
  dokter: Record<string, DokterCari[]>;
};

/**
 * Susun huruf kecil dan rapatkan spasi.
 *
 * `"  Anak  "` dan `"anak"` harus dianggap sama, karena spasi yang diketik
 * tidak sengaja tidak boleh mengubah hasil.
 */
function normalisasi(teks: string): string {
  return teks.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Saring klinik, kartu detail, dan doktornya dengan satu kata kunci.
 *
 * Empat aturan di sini perlu dijelaskan, karena bukan satu-satunya pilihan:
 *
 * - Kata kunci kosong mengembalikan semuanya. Komponen bergantung pada ini
 *   untuk menampilkan direktori utuh sebelum pengguna mengetik.
 * - Kata kunci dipecah menjadi beberapa kata, dan setiap kata harus ditemukan
 *   di dalam klinik itu. "konseling anak" menemukan klinik Anak, walaupun
 *   kata "konseling" ada di daftar layanannya dan "anak" ada di namanya.
 *   Kalau aturan ini disempitkan jadi "semua kata harus ada di kolom yang
 *   sama", pencarian multi kata akan hampir selalu nihil.
 * - Sebuah klinik tetap tampil kalau ada salah satu kata yang ditemukan di
 *   namanya, deskripsinya, layanannya, kartu detailnya, atau dokternya. Jadi
 *   mengetik nama dokter akan memunculkan klinik tempat dokter itu bekerja.
 * - Dokter hanya boleh tampil di klinik yang punya kartu detail dengan
 *   spesialis yang sama. `tests/poliklinik.test.ts` yang menjamin kedua
 *   tulisan itu identik.
 *
 * Setiap kata dibandingkan sebagai potongan, bukan sebagai kata utuh. "gizi"
 * menemukan "Gizi Klinik", dan "klinik" menemukan "klinik anak" maupun
 * "Konseling Pola Makan" di bagian "Pola".
 */
export function cariKlinik(
  clinics: KlinikCari[],
  details: DetailCari[],
  doctors: DokterCari[],
  query: string,
): HasilCari {
  const q = normalisasi(query);
  const tanpaSaring = q.length === 0;

  // Pecah lebih dulu supaya query kosong menghasilkan satu kata kosong, bukan
  // nol kata. `every` atas nol kata selalu benar, dan itu justru yang
  // dibutuhkan: tanpa kata kunci, semua klinik lolos.
  const kata = tanpaSaring ? [] : q.split(" ");

  // Kumpulkan teks milik satu klinik jadi satu potongan. Ini yang membuat
  // pencarian multi kata bekerja lintas kolom.
  const himpunanKlinik = (k: KlinikCari): string => {
    const milik = details.filter((d) => d.clinicSlug === k.slug);
    const spesialisKlinik = new Set(
      milik.map((d) => d.specialty).filter((s): s is string => Boolean(s)),
    );
    const dokterMilik = doctors.filter((d) => spesialisKlinik.has(d.specialty));
    return normalisasi(
      [
        k.name,
        k.description,
        k.hours,
        ...k.services,
        ...milik.map((d) => `${d.name} ${d.specialty ?? ""}`),
        ...dokterMilik.map((d) => `${d.name} ${d.specialty}`),
      ].join(" | "),
    );
  };

  const detailPerKlinik = new Map<string, DetailCari[]>();
  const dokterPerKlinik = new Map<string, DokterCari[]>();

  // Saring klinik lebih dulu, baru saring isi dari klinik yang tersisa.
  // Kalau isinya disaring lebih dulu, klinik yang gagal ikut disaring ikut
  // hilang padahal namanya sendiri cocok.
  for (const k of clinics) {
    const himpunan = himpunanKlinik(k);
    const lolos = tanpaSaring || kata.every((w) => himpunan.includes(w));
    if (!lolos) continue;

    const milik = details.filter((d) => d.clinicSlug === k.slug);
    const spesialisKlinik = new Set(
      milik.map((d) => d.specialty).filter((s): s is string => Boolean(s)),
    );

    const detailCocok = tanpaSaring
      ? milik
      : milik.filter((d) => {
          const teks = normalisasi(`${d.name} ${d.specialty ?? ""}`);
          return kata.every((w) => teks.includes(w));
        });

    const dokterCocok = tanpaSaring
      ? []
      : doctors
          .filter((d) => spesialisKlinik.has(d.specialty))
          .filter((d) => {
            const teks = normalisasi(`${d.name} ${d.specialty}`);
            return kata.every((w) => teks.includes(w));
          });

    detailPerKlinik.set(k.slug, detailCocok);
    dokterPerKlinik.set(k.slug, dokterCocok);
  }

  const klinik = clinics.filter((k) => detailPerKlinik.has(k.slug));
  const hasil: HasilCari = { klinik, detail: {}, dokter: {} };
  for (const k of klinik) {
    hasil.detail[k.slug] = detailPerKlinik.get(k.slug) ?? [];
    hasil.dokter[k.slug] = dokterPerKlinik.get(k.slug) ?? [];
  }

  return hasil;
}