import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { benar, isi, isiOpsional, jalankanForm, selesaikan } from "@/server/api/form";
import {
  Errors,
  choice,
  dateIso,
  email,
  formatIsoDate,
  phoneId,
  textOptional,
  textRequired,
} from "@/server/validation";
import { insertWbsReport } from "@/server/db/repo/submissions";

/** Tingkat keparahan laporan, sesuai enum `wbs_severity`. */
const TINGKAT = ["low", "medium", "high"] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(request, "wbs-reports", "wbs", async (db, body) => {
      const errors = new Errors();

      const subjek = textRequired(errors, "subject", isi(body, "subject"), 5, 220);
      const kronologi = textRequired(errors, "description", isi(body, "description"), 20, 10000);
      const lokasi = textOptional(errors, "location", isi(body, "location"), 180);
      const unit = textOptional(errors, "involved_unit", isi(body, "involved_unit"), 160);
      const tingkat = choice(errors, "severity", isi(body, "severity") || "medium", TINGKAT);

      const tanggalKejadian = isiOpsional(body, "incident_date");
      const kejadian =
        tanggalKejadian === null ? null : dateIso(errors, "incident_date", tanggalKejadian, false);

      const anonim = benar(body, "is_anonymous");

      // Identitas hanya divalidasi kalau laporan tidak anonim. Laporan anonim
      // tetap diterima tanpa isian apa pun, jadi kolom identitas tidak boleh
      // menjadi syarat. Yang salah justru kalau identitas dijadikan syarat di
      // sini: formulir yang mencentang "anonim" akan ditolak, padahal itu
      // justru pilihannya.
      let namaPelapor: string | null = null;
      let surelPelapor: string | null = null;
      let teleponPelapor: string | null = null;

      if (!anonim) {
        namaPelapor = textOptional(errors, "reporter_name", isi(body, "reporter_name"), 160);
        surelPelapor = email(errors, "reporter_email", isi(body, "reporter_email"), false);
        teleponPelapor = phoneId(errors, "reporter_phone", isi(body, "reporter_phone"), false);
      }

      selesaikan(errors);

      if (subjek === null || kronologi === null || tingkat === null) {
        throw ApiError.internal("validasi lolos tapi data kosong");
      }

      const kode = await insertWbsReport(db, {
        subject: subjek,
        description: kronologi,
        incident_date: kejadian === null ? null : formatIsoDate(kejadian),
        location: lokasi,
        involved_unit: unit,
        is_anonymous: anonim,
        reporter_name: namaPelapor,
        reporter_email: surelPelapor,
        reporter_phone: teleponPelapor,
        severity: tingkat,
      });

      return { ticket_code: kode, status: "received", anonymous: anonim };
    });

    return created(hasil);
  });
}
