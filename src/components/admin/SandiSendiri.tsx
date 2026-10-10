"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ApiFailure } from "@/components/admin/types";

/**
 * Form "Sandi saya" untuk semua peran.
 *
 * Endpoint `POST /api/v1/admin/users/[id]/password` mengizinkan akun sendiri
 * dari peran apa pun (super_admin boleh akun mana pun), tapi selalu meminta
 * sandi lama. Berhasil mengganti berarti `session_version` naik dan sesi ini
 * ikut putus, jadi form tidak mencoba memuat ulang apa pun — pengguna masuk
 * lagi lewat tautan yang ditampilkan.
 */
export default function SandiSendiri({ akunId }: { akunId: string }) {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [gagal, setGagal] = useState("");
  const [berhasil, setBerhasil] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  async function simpan(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSibuk(true);
    setGalat({});
    setGagal("");
    try {
      const res = await fetch(`/api/v1/admin/users/${akunId}/password`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ current_password: lama, new_password: baru }),
      });
      const body = (await res.json().catch(() => ({}))) as ApiFailure & {
        data?: unknown;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setGalat({ current_password: "Sandi lama salah." });
        } else if (body.error?.fields) {
          setGalat(body.error.fields);
        } else {
          setGagal(body.error?.message ?? "Ganti sandi gagal.");
        }
        return;
      }
      setBerhasil(true);
      setLama("");
      setBaru("");
    } catch {
      setGagal("Jaringan bermasalah, sandi belum diganti.");
    } finally {
      setSibuk(false);
    }
  }

  if (berhasil) {
    return (
      <div className="admin-alert admin-alert-sukses" role="status">
        Sandi diganti. Sesi ini sudah berakhir,{" "}
        <Link href="/admin/login">masuk lagi dengan sandi baru</Link>.
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void simpan(e)} noValidate>
      {gagal ? (
        <div className="admin-alert admin-alert-gagal mb-3" role="alert">
          {gagal}
        </div>
      ) : null}
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="sandi-lama">
            Sandi lama
          </label>
          <input
            id="sandi-lama"
            name="sandi-lama"
            type="password"
            autoComplete="current-password"
            required
            className={`form-control${galat.current_password ? " is-invalid" : ""}`}
            value={lama}
            onChange={(e) => setLama(e.target.value)}
          />
          {galat.current_password ? (
            <div className="invalid-feedback d-block">{galat.current_password}</div>
          ) : null}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="sandi-baru">
            Sandi baru
          </label>
          <input
            id="sandi-baru"
            name="sandi-baru"
            type="password"
            autoComplete="new-password"
            required
            className={`form-control${galat.new_password ? " is-invalid" : ""}`}
            value={baru}
            onChange={(e) => setBaru(e.target.value)}
          />
          {galat.new_password ? (
            <div className="invalid-feedback d-block">{galat.new_password}</div>
          ) : (
            <div className="form-text">Panjang minimum sepuluh karakter.</div>
          )}
        </div>
        <div className="col-12">
          <button type="submit" className="btn btn-primary" disabled={sibuk}>
            {sibuk ? "Menyimpan..." : "Ganti Sandi"}
          </button>
        </div>
      </div>
    </form>
  );
}
