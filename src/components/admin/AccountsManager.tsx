"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SweetAlertOptions } from "sweetalert2";
import type { ApiFailure } from "@/components/admin/types";

/**
 * Kelola akun panel: daftar, tambah, ubah peran, nonaktifkan, dan hapus.
 *
 * Bentuk layar ini bukan `RecordManager` generik. Akun bukan baris konten:
 * kolom `password_hash` tidak pernah boleh dibaca, peran menentukan apa yang
 * boleh diubah, dan sebagian perubahan tidak bisa dilakukan pada akun sendiri.
 * Form generik tidak tahu semua itu, jadi memaksanya berarti menambah
 * pengecualian di dalam komponen yang dipakai dua puluh tabel lain.
 *
 * API-nya sudah ada lengkap di `/api/v1/admin/users`: daftar, tambah, ubah,
 * dan hapus. Yang belum ada sebelumnya adalah layarnya, jadi tidak ada cara menambah
 * akun selain menulisnya langsung di database.
 */

/**
 * Tampilkan dialog SweetAlert2, dan kembalikan jawabannya.
 *
 * Nilai balik dipakai oleh konfirmasi hapus. `Swal.fire` mengembalikan
 * hasil bergipe `SweetAlertResult`, jadi yang dibaca adalah `isConfirmed`,
 * bukan objek itu sendiri karena setiap objek selalu benar.
 */
async function beriTahu(pilihan: SweetAlertOptions): Promise<boolean> {
  const { default: Swal } = await import("sweetalert2");
  const hasil = await Swal.fire(pilihan);
  return hasil.isConfirmed;
}

export type Akun = {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

/** Peran yang boleh dipilih, sama dengan daftar di `ROLES`. */
const PERAN = [
  { nilai: "super_admin", label: "Super Admin" },
  { nilai: "editor", label: "Editor Konten" },
  { nilai: "front_office", label: "Front Office" },
] as const;

const LABEL_PERAN: Record<string, string> = {
  super_admin: "Super Admin",
  editor: "Editor Konten",
  front_office: "Front Office",
};

type FormAkun = {
  nama: string;
  surel: string;
  peran: string;
  sandi: string;
};

const KOSONG: FormAkun = { nama: "", surel: "", peran: "front_office", sandi: "" };

/** Waktu login terakhir, atau `-` kalau belum pernah masuk. */
export function loginTerakhir(nilai: string | null): string {
  if (nilai === null || nilai === "") return "-";
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
}

export default function AccountsManager({ akunSendiri }: { akunSendiri: string }) {
  const [daftar, setDaftar] = useState<Akun[]>([]);
  const [jumlahPeran, setJumlahPeran] = useState<Record<string, number>>({});
  const [form, setForm] = useState<FormAkun>(KOSONG);
  const [galatForm, setGalatForm] = useState<Partial<Record<keyof FormAkun, string>>>({});
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  /**
   * Baca daftar akun.
   *
   * Fungsi ini hanya mengembalikan data dan melempar galat, tidak menyentuh
   * state. Penulisan state dilakukan di pemanggilnya: dipanggil dari dalam
   * effect, state harus ditulis di callback promise supaya tidak jadi render
   * berantai.
   */
  const baca = useCallback(async (): Promise<{
    items: Akun[];
    counts: Record<string, number>;
  }> => {
    const res = await fetch("/api/v1/admin/users", {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as ApiFailure & {
      data?: { items?: Akun[]; counts_by_role?: Record<string, number> };
    };

    if (!res.ok) {
      throw new Error(body.error?.message ?? "Daftar akun gagal dimuat.");
    }
    return { items: body.data?.items ?? [], counts: body.data?.counts_by_role ?? {} };
  }, []);

  /** Terapkan hasil pembacaan ke state, dipakai setelah setiap perubahan. */
  const terapkan = useCallback(async (): Promise<void> => {
    const { items, counts } = await baca();
    setDaftar(items);
    setJumlahPeran(counts);
  }, [baca]);

  useEffect(() => {
    let hidup = true;

    baca()
      .then(({ items, counts }) => {
        if (!hidup) return;
        setDaftar(items);
        setJumlahPeran(counts);
      })
      .catch((err: unknown) => {
        if (hidup) setGalat(err instanceof Error ? err.message : "Daftar akun gagal dimuat.");
      });

    return () => {
      hidup = false;
    };
  }, [baca]);

  async function tambah(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat("");
    setPesan("");
    setGalatForm({});
    setSibuk(true);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: form.nama.trim(),
          email: form.surel.trim(),
          role: form.peran,
          password: form.sandi,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as ApiFailure & {
        error?: { fields?: Record<string, string> };
      };

      if (!res.ok) {
        const fields = body.error?.fields ?? {};
        // Nama field server memakai bahasa Indonesia untuk sebagian kolom dan
        // bahasa Inggris untuk sebagian lain. Dipetakan di sini supaya pesan
        // muncul di kolom yang benar, bukan menumpuk di bawah formulir.
        setGalatForm({
          nama: fields["name"] ?? fields["nama"],
          surel: fields["email"] ?? fields["surel"],
          peran: fields["role"] ?? fields["peran"],
          sandi: fields["password"] ?? fields["sandi"],
        });
        setGalat(body.error?.message ?? "Akun gagal dibuat.");
        return;
      }

      setPesan(`Akun ${form.surel.trim()} dibuat.`);
      setForm(KOSONG);
      await terapkan();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  async function ubah(id: string, perubahan: Record<string, unknown>, pesanBerhasil: string) {
    setGalat("");
    setPesan("");
    setSibuk(true);

    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(perubahan),
      });
      const body = (await res.json().catch(() => ({}))) as ApiFailure;

      if (!res.ok) {
        setGalat(body.error?.message ?? "Perubahan gagal disimpan.");
        return;
      }

      setPesan(pesanBerhasil);
      await terapkan();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(a: Akun) {
    const konfirmasi = await beriTahu({
      icon: "warning",
      title: "Hapus akun ini?",
      text: `Akun ${a.email} tidak bisa lagi masuk setelah dihapus. Akun sendiri tidak bisa dihapus dari layar ini.`,
      showCancelButton: true,
      confirmButtonColor: "#1977cc",
    });

    if (!konfirmasi) return;

    setGalat("");
    setPesan("");
    setSibuk(true);

    try {
      const res = await fetch(`/api/v1/admin/users/${a.id}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as ApiFailure;

      if (!res.ok) {
        setGalat(body.error?.message ?? "Akun gagal dihapus.");
        return;
      }

      setPesan(`Akun ${a.email} dihapus.`);
      await terapkan();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      {galat ? (
        <div className="admin-alert admin-alert-gagal mb-3" role="alert">
          {galat}
        </div>
      ) : null}
      {pesan ? (
        <div className="admin-alert admin-alert-sukses mb-3" role="status">
          {pesan}
        </div>
      ) : null}

      <div className="admin-toolbar">
        {PERAN.map((p) => (
          <span className="halaman-keterangan" key={p.nilai}>
            {p.label}: {jumlahPeran[p.nilai] ?? 0}
          </span>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Surel</th>
              <th scope="col">Peran</th>
              <th scope="col">Status</th>
              <th scope="col">Masuk terakhir</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftar.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  Belum ada akun.
                </td>
              </tr>
            ) : (
              daftar.map((a) => {
                const diri = a.id === akunSendiri;
                return (
                  <tr key={a.id}>
                    <th scope="row">
                      {a.name}
                      {diri ? (
                        <span className="text-body-secondary"> (akun Anda)</span>
                      ) : null}
                    </th>
                    <td>{a.email}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={a.role}
                        onChange={(e) =>
                          ubah(
                            a.id,
                            { role: e.target.value },
                            `Peran ${a.email} diubah menjadi ${LABEL_PERAN[e.target.value] ?? e.target.value}.`,
                          )
                        }
                        disabled={sibuk || diri}
                        aria-label={`Peran ${a.email}`}
                      >
                        {PERAN.map((p) => (
                          <option key={p.nilai} value={p.nilai}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {diri ? (
                        <span className="text-body-secondary">tidak bisa diubah</span>
                      ) : (
                        <div className="form-check form-switch mb-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            checked={a.is_active}
                            onChange={(e) =>
                              ubah(
                                a.id,
                                { is_active: e.target.checked },
                                `Akun ${a.email} ${e.target.checked ? "diaktifkan" : "dinonaktifkan"}.`,
                              )
                            }
                            disabled={sibuk}
                            aria-label={`Aktifkan akun ${a.email}`}
                          />
                        </div>
                      )}
                    </td>
                    <td>{loginTerakhir(a.last_login_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => hapus(a)}
                        disabled={sibuk || diri}
                        aria-label={`Hapus akun ${a.email}`}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 className="detail-subheading mt-4">Tambah akun</h2>
      <form onSubmit={tambah} noValidate>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="akun-nama">
              Nama lengkap
            </label>
            <input
              id="akun-nama"
              name="akun-nama"
              type="text"
              maxLength={160}
              className={`form-control${galatForm.nama ? " is-invalid" : ""}`}
              value={form.nama}
              onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
              required
            />
            {galatForm.nama ? (
              <div className="invalid-feedback d-block">{galatForm.nama}</div>
            ) : null}
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="akun-surel">
              Surel
            </label>
            <input
              id="akun-surel"
              name="akun-surel"
              type="email"
              className={`form-control${galatForm.surel ? " is-invalid" : ""}`}
              value={form.surel}
              onChange={(e) => setForm((p) => ({ ...p, surel: e.target.value }))}
              autoComplete="off"
              required
            />
            {galatForm.surel ? (
              <div className="invalid-feedback d-block">{galatForm.surel}</div>
            ) : null}
          </div>

          <div className="col-md-4">
            <label className="form-label" htmlFor="akun-peran">
              Peran
            </label>
            <select
              id="akun-peran"
              name="akun-peran"
              className={`form-select${galatForm.peran ? " is-invalid" : ""}`}
              value={form.peran}
              onChange={(e) => setForm((p) => ({ ...p, peran: e.target.value }))}
            >
              {PERAN.map((p) => (
                <option key={p.nilai} value={p.nilai}>
                  {p.label}
                </option>
              ))}
            </select>
            {galatForm.peran ? (
              <div className="invalid-feedback d-block">{galatForm.peran}</div>
            ) : null}
          </div>

          <div className="col-md-8">
            <label className="form-label" htmlFor="akun-sandi">
              Kata sandi
            </label>
            <input
              id="akun-sandi"
              name="akun-sandi"
              type="password"
              autoComplete="new-password"
              className={`form-control${galatForm.sandi ? " is-invalid" : ""}`}
              value={form.sandi}
              onChange={(e) => setForm((p) => ({ ...p, sandi: e.target.value }))}
              required
            />
            {galatForm.sandi ? (
              <div className="invalid-feedback d-block">{galatForm.sandi}</div>
            ) : (
              <div className="form-text">
                Panjang minimum sepuluh karakter. Sandi hanya dikirim sekali dan
                tidak pernah dibaca kembali oleh panel.
              </div>
            )}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={sibuk}>
              {sibuk ? "Menyimpan..." : "Tambah Akun"}
            </button>
          </div>
        </div>
      </form>

      <p className="form-footnote mt-3">
        <i className="bi bi-info-circle" aria-hidden="true" />
        Peran dan status akun sendiri tidak bisa diubah dari sini. Keduanya
        menaikkan nomor versi sesi, jadi perubahan itu akan memutus sesi yang
        sedang dipakai. Accounts dan kata sandinya ditangani lewat{" "}
        <code>POST /api/v1/auth/login</code> dan halaman login.
      </p>
    </div>
  );
}