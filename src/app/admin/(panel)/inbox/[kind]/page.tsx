import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InboxManager from "@/components/admin/InboxManager";
import { parseKind } from "@/server/admin/inbox";

type Konteks = { params: Promise<{ kind: string }> };

/** Nama jenis inbox yang tampil, bukan slug teknisnya. */
const INBOX_LABEL: Record<string, string> = {
  appointments: "Pendaftaran Pasien",
  "mcu-registrations": "Registrasi MCU",
  feedbacks: "Kritik dan Saran",
  "wbs-reports": "Laporan WBS",
  "survey-responses": "Respons Survei",
};

export async function generateMetadata({ params }: Konteks): Promise<Metadata> {
  const { kind } = await params;
  const label = INBOX_LABEL[kind] ?? kind;
  return {
    title: `Inbox ${label}`,
    description: `Daftar ${label.toLowerCase()} yang masuk di panel admin.`,
  };
}

/**
 * Satu halaman inbox untuk satu jenis pengajuan.
 *
 * Specnya dibaca dari `parseKind` yang sama dengan yang dipakai Route Handler
 * inbox, lalu dikirim ke `InboxManager`. Kolom yang ditampilkan adalah kolom
 * pencarian jenis itu, yaitu kolom yang menurut backend paling berarti.
 */
export default async function AdminInboxPage({ params }: Konteks) {
  const { kind } = await params;
  const jenis = parseKind(kind);
  if (jenis === undefined) notFound();

  const label = INBOX_LABEL[jenis.slug] ?? jenis.slug;

  return (
    <div>
      <h1 className="mb-3">Inbox {label}</h1>
      <InboxManager
        slug={jenis.slug}
        label={label}
        kolom={[...jenis.searchColumns]}
        statuses={[...jenis.statuses]}
        hasStatus={jenis.hasStatus}
      />
    </div>
  );
}
