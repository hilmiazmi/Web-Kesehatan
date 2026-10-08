"use client";

import { useEffect, useState } from "react";
import type { ApiFailure } from "@/components/admin/types";

/**
 * Ubah jumlah tempat tidur beberapa ruang sekaligus.
 *
 * Bentuk layar ini bukan CRUD umum seperti `RecordManager`, dan itu disengaja.
 * Kapasitas bed bukan isi konten yang bisa ditambah dan dihapus: ruang sudah
 * ada, yang berubah hanya berapa tempat tidur yang terisi dan dipesan. Menambah
 * baris baru lewat form generik membuat petugas bisa salah mengetik nama ruang
 * dan menghasilkan dua baris untuk ruang yang sama, karena `perbaruiTempatTidur`
 * mencocokkan berdasarkan `(ward_name, class_name)`, bukan id.
 *
 * Sisa tempat tidur tidak dikirim. Server yang menghitungnya, supaya panel dan
 * halaman publik tidak bisa menampilkan angka yang berbeda untuk baris yang
 * sama.
 */

/** Satu ruang dari `GET /api/v1/admin/beds`. */
type Ruang = {
  ward_name: string;
  class_name: string;
  room_code: string | null;
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  gender_policy: string | null;
  note: string | null;
  observed_at: string;
};

type Ringkasan = {
  total_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  available_beds: number;
  occupancy_percent: number;
  room_count: number;
};

/** Isi tiga angka yang boleh diubah untuk satu ruang. */
type Hitungan = { total: number; terisi: number; dipesan: number };

/**
 * Sisa tempat tidur dan kelebihan isi satu ruang.
 *
 * Kelebihan dihitung di sini, bukan di server, supaya panel bisa memberi
 * peringatan sebelum menyimpan. Sisa yang negatif tidak pernah ditampilkan:
 * `available_beds` di backend dijepit di nol, jadi kalau panel ikut menjepit,
 * ketidakcocokan ini akan tersembunyi tepat di tempat yang paling perlu dilihat
 * petugas.
 */
export function sisih(total: number, terisi: number, dipesan: number): {
  tersedia: number;
  berlebih: number;
} {
  return {
    tersedia: Math.max(0, total - terisi - dipesan),
    berlebih: Math.max(0, terisi + dipesan - total),
  };
}

/** Kunci baris, sama dengan yang dicocokkan `perbaruiTempatTidur`. */
const kunci = (r: { ward_name: string; class_name: string }): string =>
  `${r.ward_name}|${r.class_name}`;

/**
 * Baca daftar ruang dan ringkasannya.
 *
 * Fungsi ini hanya mengembalikan data dan melempar galat, tidak menyentuh
 * state. State ditulis di pemanggilnya: dipanggil dari dalam effect, penulisan
 * state harus berada di callback promise supaya tidak jadi render berantai.
 */
async function ambilRuang(): Promise<{ items: Ruang[]; summary: Ringkasan | null }> {
  const res = await fetch("/api/v1/admin/beds", {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as ApiFailure & {
    data?: { items?: Ruang[]; summary?: Ringkasan };
  };
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Daftar ruang gagal dimuat.");
  }
  return { items: body.data.items ?? [], summary: body.data.summary ?? null };
}

/** Hitungan awal untuk satu ruang, apa adanya seperti yang ada di server. */
function hitunganAwal(r: Ruang): Hitungan {
  return { total: r.total_beds, terisi: r.occupied_beds, dipesan: r.reserved_beds };
}

/** Peta hitungan awal untuk seluruh baris, dipakai saat tabel dimuat. */
function petaAwal(items: Ruang[]): Record<string, Hitungan> {
  return Object.fromEntries(items.map((r) => [kunci(r), hitunganAwal(r)]));
}

export default function BedsManager() {
  const [ruang, setRuang] = useState<Ruang[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [hitungan, setHitungan] = useState<Record<string, Hitungan>>({});
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  /** Baris yang angkanya masih berbeda dari angka tersimpan. */
  const berubah: Ruang[] = ruang.filter((r) => {
    const h = hitungan[kunci(r)];
    if (h === undefined) return false;
    return (
      h.total !== r.total_beds || h.terisi !== r.occupied_beds || h.dipesan !== r.reserved_beds
    );
  });

  useEffect(() => {
    let hidup = true;

    ambilRuang()
      .then(({ items, summary }) => {
        if (!hidup) return;
        setRuang(items);
        setRingkasan(summary);
        setHitungan(petaAwal(items));
      })
      .catch((err: unknown) => {
        if (hidup) setGalat(err instanceof Error ? err.message : "Daftar ruang gagal dimuat.");
      });

    return () => {
      hidup = false;
    };
  }, []);

  function ubah(nama: string, bagian: keyof Hitungan, mentah: string): void {
    const angka = Number(mentah);
    const bersih = Number.isInteger(angka) && angka >= 0 ? angka : 0;
    setHitungan((prev) => ({
      ...prev,
      [nama]: { ...prev[nama], [bagian]: bersih } as Hitungan,
    }));
  }

  async function simpan(): Promise<void> {
    setSibuk(true);
    setGalat("");
    setPesan("");

    try {
      const res = await fetch("/api/v1/admin/beds", {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        // Hanya baris yang berubah yang dikirim. Endpoint menghitung ulang
        // `observed_at` per baris yang cocok, jadi mengirimi seluruh tabel
        // akan membuat waktu peninjauan semua ruang ikut berubah meski tidak
        // ada yang diisi.
        body: JSON.stringify({
          items: berubah.map((r) => {
            const h = hitungan[kunci(r)];
            return {
              ward_name: r.ward_name,
              class_name: r.class_name,
              total_beds: h?.total ?? r.total_beds,
              occupied_beds: h?.terisi ?? r.occupied_beds,
              reserved_beds: h?.dipesan ?? r.reserved_beds,
            };
          }),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as ApiFailure & {
        data?: { requested: number; updated: number };
      };

      if (!res.ok) {
        setGalat(body.error?.message ?? "Angka gagal disimpan.");
        return;
      }

      const tersimpan = body.data?.updated ?? 0;
      setPesan(`${tersimpan} ruang diperbarui.`);

      // Tabel dibaca ulang supaya angka di layar sama dengan yang baru saja
      // dihitung server, termasuk sisa tempat tidur dan waktu peninjauan.
      const { items, summary } = await ambilRuang();
      setRuang(items);
      setRingkasan(summary);
      setHitungan(petaAwal(items));
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      {ringkasan !== null ? (
        <p className="halaman-keterangan mb-3">
          Total {ringkasan.total_beds} tempat tidur, terisi {ringkasan.occupied_beds}, dipesan{" "}
          {ringkasan.reserved_beds}, tersedia {ringkasan.available_beds} di{" "}
          {ringkasan.room_count} ruang.
        </p>
      ) : null}

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

      <div className="admin-table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              <th scope="col">Ruang</th>
              <th scope="col">Kelas</th>
              <th scope="col">Kode</th>
              <th scope="col">Total</th>
              <th scope="col">Terisi</th>
              <th scope="col">Dipesan</th>
              <th scope="col">Tersedia</th>
            </tr>
          </thead>
          <tbody>
            {ruang.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty">
                  Belum ada ruang yang tercatat.
                </td>
              </tr>
            ) : (
              ruang.map((r) => {
                const id = kunci(r);
                const h = hitungan[id] ?? {
                  total: r.total_beds,
                  terisi: r.occupied_beds,
                  dipesan: r.reserved_beds,
                };
                const { tersedia, berlebih } = sisih(h.total, h.terisi, h.dipesan);

                return (
                  <tr key={id}>
                    <th scope="row">{r.ward_name}</th>
                    <td>{r.class_name}</td>
                    <td>{r.room_code ?? "-"}</td>
                    {(["total", "terisi", "dipesan"] as const).map((bagian) => (
                      <td key={bagian}>
                        <input
                          className="form-control form-control-sm"
                          type="number"
                          min={0}
                          max={5000}
                          value={h[bagian]}
                          onChange={(e) => ubah(id, bagian, e.target.value)}
                          disabled={sibuk}
                          aria-label={`${bagian} ${r.ward_name}`}
                        />
                      </td>
                    ))}
                    <td>
                      {berlebih > 0 ? (
                        <span className="text-danger">{berlebih} melebihi total</span>
                      ) : (
                        tersedia
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex gap-2 align-items-center mt-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={simpan}
          disabled={sibuk || berubah.length === 0}
        >
          {sibuk ? "Menyimpan..." : `Simpan ${berubah.length} ruang`}
        </button>
        {berubah.length === 0 ? (
          <span className="halaman-keterangan">Tidak ada angka yang belum disimpan.</span>
        ) : null}
      </div>
    </div>
  );
}