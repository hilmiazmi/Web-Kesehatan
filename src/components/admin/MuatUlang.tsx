"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Tombol muat ulang isi dasbor.
 *
 * Sengaja memakai `router.refresh()`, bukan `fetch` ke
 * `/api/v1/admin/stats`. Angka dasbor dirender di server oleh Server Component,
 * dan `refresh()` merender ulang komponen itu tanpa membuang keadaan sisi
 * klien. Kalau angkanya diambil lewat `fetch`, HTML hasil server dan yang
 * tampil di layar bisa berasal dari dua jalur berbeda, dan itu justru yang
 * membuat dasbor terasa tidak bisa dipercaya.
 *
 * Keadaan "sedang memuat" dibawa `useTransition`, bukan `useState` sendiri:
 * `isPending` sudah tahu kapan render ulang server selesai, jadi tidak ada
 * timer yang harus ditebak.
 */
export default function MuatUlang() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [terakhir, setTerakhir] = useState<Date | null>(null);

  function muat() {
    startTransition(() => {
      router.refresh();
      setTerakhir(new Date());
    });
  }

  const jam = terakhir?.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="admin-muat-ulang">
      {/* Wilayah hidup sopan: setelah muat ulang, pembaca layar mendengar jam
          terakhir data diperbarui tanpa harus mencari tombolnya lagi. */}
      <span className="admin-muat-ulang-waktu" role="status">
        {jam ? `Diperbarui ${jam}` : ""}
      </span>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={muat}
        disabled={pending}
        aria-busy={pending}
      >
        <i className={`bi ${pending ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} aria-hidden="true" />
        {pending ? " Memuat ulang…" : " Muat ulang"}
      </button>
    </div>
  );
}
