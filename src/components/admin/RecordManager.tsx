"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiFailure, FieldSummary, RecordPage } from "@/components/admin/types";
import {
  keNilaiApi,
  kosongkanNilai,
  keNilaiForm,
  type NilaiForm,
} from "@/components/admin/nilai-form";
import FormBaris from "@/components/admin/FormBaris";

/**
 * Kelola baris satu tabel: daftar, pencarian, pengurutan, tambah, ubah, hapus.
 *
 * Tidak ada kode per tabel. Bentuk formnya dibaca dari `fields` yang dikirim
 * halaman, dan specifikasi itu berasal dari registry yang sama dengan yang
 * dipakai Route Handler. Menambah kolom baru berarti menambah satu baris di
 * registry, tanpa menyentuh berkas ini.
 *
 * Daftar baris diambil lewat `GET /api/v1/admin/records/{table}`, bukan
 * langsung dari database, supaya panel memakai jalur yang sama dengan jalur
 * tempat data ditulis.
 */
export default function RecordManager({
  table,
  label,
  fields,
  deletable,
  defaultSort,
}: {
  table: string;
  label: string;
  fields: readonly FieldSummary[];
  deletable: boolean;
  defaultSort: string;
}) {
  const [halaman, setHalaman] = useState<RecordPage | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);
  const [desc, setDesc] = useState(true);
  const [cari, setCari] = useState("");
  const [kataKunci, setKataKunci] = useState("");

  const [sunting, setSunting] = useState<{ id: string | null; nilai: NilaiForm } | null>(null);
  const [galat, setGalat] = useState("");
  const [galatField, setGalatField] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const ambil = useCallback(async (): Promise<RecordPage> => {
    const qs = new URLSearchParams({ page: String(page), page_size: "25", sort });
    if (desc) qs.set("desc", "true");
    if (kataKunci !== "") qs.set("q", kataKunci);

    const res = await fetch(`/api/v1/admin/records/${table}?${qs.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    // Balasan sukses dibungkus `{ data }`, sedangkan balasan galat dibungkus
    // `{ error }`. Keduanya dibaca dari bentuk yang benar supaya `items` tidak
    // pernah `undefined` dan render tidak gagal di `halaman.items.length`.
    const body = (await res.json().catch(() => ({}))) as {
      data?: RecordPage;
    } & ApiFailure;
    if (!res.ok) {
      throw new Error(body.error?.message ?? "Daftar baris gagal dimuat.");
    }
    if (!body.data) {
      throw new Error("Daftar baris gagal dimuat.");
    }

    return body.data;
  }, [table, page, sort, desc, kataKunci]);

  // Daftar dibaca ulang setiap kali halaman, urutan, atau kata kunci berubah.
  // Penulisan state terjadi di dalam `.then()`, bukan langsung di dalam
  // effect, karena aturan `set-state-in-effect` melarang yang kedua.
  useEffect(() => {
    let hidup = true;

    ambil()
      .then((hal) => {
        if (!hidup) return;
        setGalat("");
        setHalaman(hal);
      })
      .catch((err: unknown) => {
        if (!hidup) return;
        setGalat(err instanceof Error ? err.message : "Daftar baris gagal dimuat.");
        setHalaman(null);
      });

    return () => {
      hidup = false;
    };
  }, [ambil]);

  /** Baca ulang daftar dan pasang hasilnya, untuk dipakai setelah simpan dan hapus. */
  async function segarkan() {
    try {
      const hal = await ambil();
      setGalat("");
      setHalaman(hal);
    } catch (err: unknown) {
      setGalat(err instanceof Error ? err.message : "Daftar baris gagal dimuat.");
      setHalaman(null);
    }
  }

  async function kirim(method: "POST" | "PATCH", id: string | null, nilai: NilaiForm) {
    setSibuk(true);
    setGalat("");
    setPesan("");

    try {
      const alamat =
        id === null
          ? `/api/v1/admin/records/${table}`
          : `/api/v1/admin/records/${table}/${id}`;

      const res = await fetch(alamat, {
        method,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(keNilaiApi(fields, nilai)),
      });

      const body = (await res.json().catch(() => ({}))) as ApiFailure;

      if (!res.ok) {
        // Pesan per field ditampilkan di samping input yang salah. Form
        // tetap terbuka supaya admin bisa memperbaiki tanpa mengisi ulang.
        setGalatField(body.error?.fields ?? {});
        setGalat(body.error?.message ?? "Perubahan gagal disimpan.");
        return false;
      }

      setGalatField({});

      setPesan(id === null ? "Baris baru tersimpan." : "Perubahan tersimpan.");
      setSunting(null);
      await segarkan();
      return true;
    } catch {
      setGalat("Tidak bisa menghubungi server.");
      return false;
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(id: string) {
    if (!window.confirm("Hapus baris ini? Tindakan ini tidak bisa dibatalkan.")) return;

    setSibuk(true);
    setGalat("");

    try {
      const res = await fetch(`/api/v1/admin/records/${table}/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiFailure;
        setGalat(body.error?.message ?? "Baris gagal dihapus.");
        return;
      }

      setPesan("Baris dihapus.");
      await segarkan();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  // Kolom yang ditampilkan di tabel: kolom yang punya label, supaya tabel
  // tidak menampilkan `id`, `created_at`, atau nilai teknis lain yang tidak
  // berarti bagi operator.
  const kolomTampil = fields.filter((f) => f.kind !== "boolean" || f.required);

  return (
    <div>
      <div className="admin-toolbar">
        <form
          className="d-flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setKataKunci(cari.trim());
          }}
        >
          <input
            className="form-control"
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={`Cari ${label.toLowerCase()}`}
            aria-label={`Cari ${label}`}
          />
          <button type="submit" className="btn btn-outline-primary">
            Cari
          </button>
        </form>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setGalat("");
            setGalatField({});
            setSunting({ id: null, nilai: kosongkanNilai(fields) });
          }}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Tambah {label}
        </button>
      </div>

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

      {sunting ? (
        <FormBaris
          key={sunting.id ?? "baru"}
          fields={fields}
          awal={sunting.nilai}
          galatField={galatField}
          sibuk={sibuk}
          onBatal={() => {
            setSunting(null);
            setGalatField({});
          }}
          onSimpan={(nilai) => kirim(sunting.id === null ? "POST" : "PATCH", sunting.id, nilai)}
        />
      ) : null}

      <div className="admin-table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              {kolomTampil.map((f) => (
                <th key={f.column} scope="col">
                  <button
                    type="button"
                    onClick={() => {
                      if (sort === f.column) {
                        setDesc((v) => !v);
                      } else {
                        setSort(f.column);
                        setDesc(false);
                      }
                      setPage(1);
                    }}
                  >
                    {f.label}
                    {sort === f.column ? (
                      <span className="admin-sort" aria-hidden="true">
                        <i
                          className={desc ? "bi bi-sort-down" : "bi bi-sort-up"}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {halaman === null ? (
              <tr>
                <td colSpan={kolomTampil.length + 1} className="admin-empty">
                  Memuat...
                </td>
              </tr>
            ) : halaman.items.length === 0 ? (
              <tr>
                <td colSpan={kolomTampil.length + 1} className="admin-empty">
                  {kataKunci === ""
                    ? "Belum ada baris."
                    : `Tidak ada baris yang cocok dengan "${kataKunci}".`}
                </td>
              </tr>
            ) : (
              halaman.items.map((baris, i) => (
                <tr key={String(baris.id ?? baris.ticket_code ?? `baris-${i}`)}>
                  {kolomTampil.map((f) => (
                    <td key={f.column} title={teksSingkat(baris[f.column])}>
                      {tampilNilai(baris[f.column], f.kind)}
                    </td>
                  ))}
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setGalat("");
                          setGalatField({});
                          setSunting({
                            id: String(baris.id),
                            nilai: keNilaiForm(fields, baris),
                          });
                        }}
                      >
                        Ubah
                      </button>
                      {deletable ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => hapus(String(baris.id))}
                          disabled={sibuk}
                        >
                          Hapus
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {halaman !== null && halaman.total > 0 ? (
        <div className="admin-pager">
          <span>
            Menampilkan {(halaman.page - 1) * halaman.page_size + 1}–
            {Math.min(halaman.page * halaman.page_size, halaman.total)} dari {halaman.total} baris
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={halaman.page <= 1}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={halaman.page * halaman.page_size >= halaman.total}
            >
              Berikutnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Nilai satu sel dibaca dari bentuk yang paling enak dibaca di tabel. */
function tampilNilai(nilai: unknown, kind: string): string {
  if (nilai === null || nilai === undefined || nilai === "") return "-";

  if (kind === "boolean") return nilai ? "ya" : "tidak";

  if (typeof nilai === "boolean") return nilai ? "ya" : "tidak";

  if (typeof nilai === "object") return JSON.stringify(nilai);

  return String(nilai);
}

/** Isi atribut `title`, supaya sel terpotong masih bisa dibaca seluruhnya. */
function teksSingkat(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  return typeof nilai === "object" ? JSON.stringify(nilai) : String(nilai);
}
