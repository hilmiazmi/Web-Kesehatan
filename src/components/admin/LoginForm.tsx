"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Formulir masuk ke panel admin.
 *
 * Kirim ke `POST /api/v1/auth/login`. Pesan galat yang ditampilkan sama untuk
 * surel yang tidak terdaftar dan kata sandi yang salah, sama seperti balasan
 * server: membedakan keduanya akan membuat halaman ini bisa dipakai untuk
 * mencari surel mana saja yang punya akun.
 */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat("");
    setSibuk(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email, password, website }),
      });

      if (res.ok) {
        setPassword("");
        router.replace("/admin");
        router.refresh();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };

      // `website` terisi berarti honeypot menangkap, dan server membalas
      // berhasil tanpa memberi sesi. Menampilkan "gagal masuk" di sini
      // memberi tahu robot bahwa perangkapnya bekerja.
      if (body.error?.message) {
        setGalat(body.error.message);
      } else {
        setGalat("Sesi tidak dapat dibuka. Coba lagi.");
      }
    } catch {
      setGalat("Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate>
      {galat ? (
        <div className="admin-alert admin-alert-gagal mb-3" role="alert">
          {galat}
        </div>
      ) : null}

      <div className="mb-3">
        <label className="form-label" htmlFor="email">
          Surel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="password">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {/* Honeypot. `visually-hidden` menyembunyikannya dari mata dan dari
          urutan Tab, tapi tidak menghapus dari DOM. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary w-100" disabled={sibuk}>
        {sibuk ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
