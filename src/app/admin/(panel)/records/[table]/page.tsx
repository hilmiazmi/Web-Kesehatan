import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecordManager from "@/components/admin/RecordManager";
import type { FieldSummary } from "@/components/admin/types";
import { canEditContent, readSession } from "@/server/auth/session";
import { find } from "@/server/admin/registry";

type Konteks = { params: Promise<{ table: string }> };

export async function generateMetadata({ params }: Konteks): Promise<Metadata> {
  const { table } = await params;
  const spec = find(table);
  return {
    title: spec ? `Kelola ${spec.label}` : "Tabel tidak dikenal",
    description: spec
      ? `Tambah, ubah, dan hapus ${spec.label.toLowerCase()} di panel admin.`
      : "Tabel tidak dikenal.",
  };
}

/**
 * Satu halaman kelola untuk satu tabel.
 *
 * Tidak ada kode per tabel. Specnya dibaca dari registry yang sama dengan
 * yang dipakai Route Handler `records`, lalu dikirim ke `RecordManager` yang
 * merender daftar dan formnya. Menambah tabel baru di registry otomatis
 * menambah halaman di sini, tanpa menambah berkas.
 */
export default async function AdminRecordsPage({ params }: Konteks) {
  const { table } = await params;
  const spec = find(table);
  if (spec === undefined) notFound();

  const claims = await readSession();
  const bisaUbah = claims !== null && canEditContent(claims.role);

  const fields: FieldSummary[] = spec.fields.map((f) => ({
    column: f.column,
    label: f.label,
    kind: f.kind.type,
    required: f.required,
    max_len: f.maxLen,
    readonly: f.locked,
    default: f.default ?? null,
    choices: f.kind.type === "choice" ? [...f.kind.allowed] : null,
  }));

  return (
    <div>
      <h1 className="mb-3">{spec.label}</h1>
      {!bisaUbah ? (
        <div className="admin-alert admin-alert-info mb-3" role="status">
          Peranmu menangani pengajuan yang masuk, bukan isi situs. Buka menu
          Inbox di samping untuk melihat pendaftaran, kritik, dan laporan.
        </div>
      ) : (
        <RecordManager
          table={spec.table}
          label={spec.label}
          fields={fields}
          deletable={spec.deletable}
          defaultSort={spec.defaultOrder}
        />
      )}
    </div>
  );
}
