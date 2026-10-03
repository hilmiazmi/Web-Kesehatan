"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol keluar sesi.
 *
 * Memakai `POST /api/v1/auth/logout` lalu pindah ke halaman login. Cookie sesi
 * dihapus oleh server, jadi keluar dari sini benar-benar mengakhiri sesi di
 * peramban, bukan hanya menyembunyikan panelnya.
 */
export default function LogoutButton() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  async function keluar() {
    setSibuk(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      // Tetap pindah ke login walau permintaan gagal: kalau cookie masih
      // ada, halaman login akan memeriksa sesi yang ada dan mengarahkan
      // kembali ke panel, jadi pengguna tidak terjebak di layar yang salah.
      router.replace("/admin/login");
      router.refresh();
      setSibuk(false);
    }
  }

  return (
    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={keluar} disabled={sibuk}>
      <i className="bi bi-box-arrow-right" aria-hidden="true" /> Keluar
    </button>
  );
}
