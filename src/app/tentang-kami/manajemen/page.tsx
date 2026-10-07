import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimeAvatar from "@/components/ui/AnimeAvatar";
import { MANAGEMENT } from "@/data/manajemen";

export const metadata: Metadata = {
  title: "Manajemen",
  description: "Susunan pimpinan RSUD Contoh Sehat.",
};

/** Tinggi kotak avatar, sama dengan tinggi foto kartu lain. */
const TINGGI_AVATAR = "200px";

/**
 * Halaman manajemen.
 *
 * Halaman acuan `/manajemen` di situs referensi hanya berupa deretan foto
 * tanpa teks jabatan, jadi struktur kelompok di bawah ini tambahan
 * kelompok di bawah ini tambahan untuk membuat halaman ini bisa dipindai.
 *
 * Tiga kelompok mengikuti pola rumah sakit pemerintah daerah: direksi,
 * kepala bagian, lalu kepala instalasi. Urutan di dalam `MANAGEMENT` sudah
 * seperti itu, jadi pengelompokannya cukup memotong larik dan tidak perlu
 * memindahkan datanya.
 *
 * Kartu di sini bisa diklik menuju profil masing-masing. Foto memakai avatar
 * anime yang digambar sendiri di dalam `src/components/ui/AnimeAvatar.tsx`,
 * bukan komponen `Photo`, karena `Photo` memakai `next/image` yang menolak
 * SVG.
 */
const KELOMPOK = [
  {
    judul: "Direksi",
    ket: "Menanggung arah rumah sakit dan menjadi penanggung jawab terakhir atas seluruh pelayanan.",
  },
  {
    judul: "Kepala Bagian",
    ket: "Menangani urusan yang memengaruhi seluruh unit, mulai dari pelayanan sampai keuangan.",
  },
  {
    judul: "Kepala Instalasi",
    ket: "Memimpin satu instalasi dan menjaga mutu pekerjaannya setiap hari.",
  },
];

export default function ManajemenPage() {
  // Jumlah anggota tiap kelompok dihitung dari MANAGEMENT, bukan ditulis
  // di sini, supaya menambah pimpinan baru tidak membuat judul ikut salah.
  const kelompok = KELOMPOK.map((k) => ({
    ...k,
    anggota: MANAGEMENT.filter((m) => termasuk(k.judul, m.role)),
  })).filter((k) => k.anggota.length > 0);

  return (
    <>
      <PageHeader
        title="Manajemen"
        subtitle="Susunan pimpinan RSUD Contoh Sehat."
        trail={[
          { label: "Tentang Kami", href: "/tentang-kami" },
          { label: "Manajemen" },
        ]}
      />

      <section className="section">
        <div className="container">
          <p className="halaman-teks">
            Seluruh nama dan jabatan di halaman ini dibuat untuk keperluan
            demo dan tidak merujuk ke rumah sakit mana pun. Setiap pimpinan
            punya halaman profil sendiri yang menjelaskan lingkup tanggung
            jawabnya.
          </p>

          {kelompok.map((k) => (
            <div key={k.judul} className="mb-5">
              <h2 className="halaman-sub-kecil">{k.judul}</h2>
              <p className="halaman-teks">{k.ket}</p>

              <div className="row g-4">
                {k.anggota.map((person) => (
                  <div className="col-lg-3 col-md-6" key={person.slug}>
                    {/* Seluruh kartu jadi tautan. Area kliknya jauh lebih
                        besar daripada kalau hanya nama yang diklik. */}
                    <Link
                      href={`/tentang-kami/manajemen/${person.slug}`}
                      className="card kartu-tautan"
                      aria-label={`Lihat profil ${person.name}`}
                    >
                      <div
                        className="photo-box photo-box--top"
                        style={{ "--photo-h": TINGGI_AVATAR } as CSSProperties}
                      >
                        <AnimeAvatar variant={MANAGEMENT.indexOf(person)} />
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{person.name}</h3>
                        <p className="kartu-jabatan">{person.role}</p>
                        <p className="card-description">{person.ringkas}</p>
                        <span className="kartu-baca">Lihat profil</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Apakah seorang pimpinan termasuk kelompok tertentu.
 *
 * Pencocokan berdasarkan kata pada jabatan, bukan daftar slug. Daftar slug
 * berarti setiap jabatan baru harus ditambahkan di dua tempat, dan kalau
 * lupa di salah satu, kepala bidang itu hilang dari halaman tanpa jejak.
 */
function termasuk(judulKelompok: string, role: string): boolean {
  if (judulKelompok === "Direksi") return /direktur/i.test(role);
  if (judulKelompok === "Kepala Bagian") return /bagian/i.test(role);
  return /instalasi/i.test(role);
}
