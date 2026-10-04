"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiFailure } from "@/components/admin/types";

/**
 * Daftar inbox satu jenis: pencarian, filter status, dan ubah status.
 *
 * Kolom yang ditampilkan diturunkan dari `searchColumns` jenisnya, yaitu kolom
 * yang menurut backend paling berarti untuk dicari. Tanpa itu, tabel harus
 * menampilkan seluruh kolom baris yang isinya puluhan dan tidak semuanya bisa
 * dibaca operator.
 *
 * Semua peran boleh mengubah status, karena itu pekerjaan front office.
 * Mengubah isi pesan tidak ada di endpoint mana pun, jadi komponen ini tidak
 * menyediakan suntingan isi.
 */
export default function InboxManager({
  slug,
  label,
  kolom,
  statuses,
  hasStatus,
}: {
  slug: string;
  label: string;
  kolom: readonly string[];
  statuses: readonly string[];
  hasStatus: boolean;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [cari, setCari] = useState("");
  const [kataKunci, setKataKunci] = useState("");
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const ambil = useCallback(async (): Promise<{
    items: Record<string, unknown>[];
    total: number;
  }> => {
    const qs = new URLSearchParams({ page: String(page), page_size: "25" });
    if (hasStatus && status !== "") qs.set("status", status);
    if (kataKunci !== "") qs.set("q", kataKunci);

    const res = await fetch(`/api/v1/admin/inbox/${slug}?${qs.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const body = (await res.json().catch(() => ({}))) as {
      data?: { items?: Record<string, unknown>[]; total?: number };
    } & ApiFailure;

    if (!res.ok) {
      throw new Error(body.error?.message ?? "Daftar inbox gagal dimuat.");
    }
    if (!body.data) {
      throw new Error("Daftar inbox gagal dimuat.");
    }

    return { items: body.data.items ?? [], total: body.data.total ?? 0 };
  }, [slug, page, status, hasStatus, kataKunci]);

  useEffect(() => {
    let hidup = true;

    ambil()
      .then(({ items: baris, total: jumlah }) => {
        if (!hidup) return;
        setGalat("");
        setItems(baris);
        setTotal(jumlah);
      })
      .catch((err: unknown) => {
        if (!hidup) return;
        setGalat(err instanceof Error ? err.message : "Daftar inbox gagal dimuat.");
        setItems([]);
        setTotal(0);
      });

    return () => {
      hidup = false;
    };
  }, [ambil]);

  async function ubahStatus(id: string, nilai: string) {
    setSibuk(true);
    setGalat("");
    setPesan("");

    try {
      const res = await fetch(`/api/v1/admin/inbox/${slug}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status: nilai, admin_note: catatan[id] ?? "" }),
      });

      const body = (await res.json().catch(() => ({}))) as ApiFailure;

      if (!res.ok) {
        setGalat(body.error?.message ?? "Status gagal diubah.");
        return;
      }

      setPesan("Status diperbarui.");
      const { items: baris, total: jumlah } = await ambil();
      setItems(baris);
      setTotal(jumlah);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

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

        {hasStatus ? (
          <select
            className="form-select"
            style={{ width: "auto" }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Saring menurut status"
          >
            <option value="">Semua status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        ) : null}
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

      <div className="admin-table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              <th scope="col">Kode tiket</th>
              {kolom
                .filter((c) => c !== "ticket_code")
                .map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              <th scope="col">Masuk</th>
              {hasStatus ? <th scope="col">Status</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={kolom.length + 3} className="admin-empty">
                  {kataKunci === "" && status === ""
                    ? "Belum ada pengajuan."
                    : "Tidak ada yang cocok dengan saringan."}
                </td>
              </tr>
            ) : (
              items.map((baris, i) => (
                <Baris
                  key={String(baris.id ?? baris.ticket_code ?? `baris-${i}`)}
                  baris={baris}
                  kolom={kolom}
                  statuses={statuses}
                  hasStatus={hasStatus}
                  catatan={catatan[String(baris.id)] ?? ""}
                  sibuk={sibuk}
                  onCatatan={(v) =>
                    setCatatan((prev) => ({ ...prev, [String(baris.id)]: v }))
                  }
                  onStatus={(v) => ubahStatus(String(baris.id), v)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div className="admin-pager">
          <span>Total {total} pengajuan</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 25 >= total}
            >
              Berikutnya
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Nama status yang tampil, bukan nilai enum-nya. */
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  no_show: "Tidak hadir",
  new: "Baru",
  in_progress: "Diproses",
  resolved: "Selesai",
  rejected: "Ditolak",
};

/** Satu baris inbox beserta pengubah statusnya. */
function Baris({
  baris,
  kolom,
  statuses,
  hasStatus,
  catatan,
  sibuk,
  onCatatan,
  onStatus,
}: {
  baris: Record<string, unknown>;
  kolom: readonly string[];
  statuses: readonly string[];
  hasStatus: boolean;
  catatan: string;
  sibuk: boolean;
  onCatatan: (v: string) => void;
  onStatus: (v: string) => void;
}) {
  const id = `inbox-${String(baris.id)}`;
  const statusSaatIni = String(baris.status ?? "");

  return (
    <tr>
      <td>
        <code>{String(baris.ticket_code ?? "-")}</code>
      </td>
      {kolom
        .filter((c) => c !== "ticket_code")
        .map((c) => (
          <td key={c} title={teksSel(baris[c])}>
            {tampilSel(baris[c])}
          </td>
        ))}
      <td>{tanggalSingkat(baris.created_at)}</td>
      {hasStatus ? (
        <td>
          <div className="d-flex gap-2 align-items-center">
            <select
              className="form-select form-select-sm"
              value={statusSaatIni}
              onChange={(e) => onStatus(e.target.value)}
              disabled={sibuk}
              aria-label={`Status ${baris.ticket_code}`}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <input
              className="form-control form-control-sm"
              type="text"
              value={catatan}
              onChange={(e) => onCatatan(e.target.value)}
              placeholder="Catatan (opsional)"
              aria-label={`Catatan untuk ${baris.ticket_code}`}
              id={`${id}-catatan`}
            />
          </div>
        </td>
      ) : null}
    </tr>
  );
}

/** Nilai satu sel, dipadatkan supaya tabel tetap bisa dibaca. */
function tampilSel(nilai: unknown): string {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  if (typeof nilai === "boolean") return nilai ? "ya" : "tidak";
  if (typeof nilai === "object") return JSON.stringify(nilai);
  const teks = String(nilai);
  return teks.length > 80 ? `${teks.slice(0, 80)}...` : teks;
}

/** Isi atribut `title`, supaya sel terpotong masih bisa dibaca seluruhnya. */
function teksSel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  return typeof nilai === "object" ? JSON.stringify(nilai) : String(nilai);
}

/** Tanggal masuk: hanya tanggalnya, tanpa jam. */
function tanggalSingkat(nilai: unknown): string {
  if (typeof nilai !== "string") return "-";
  return nilai.slice(0, 10);
}
