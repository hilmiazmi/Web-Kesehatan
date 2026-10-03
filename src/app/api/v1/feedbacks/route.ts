import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { isi, jalankanForm, selesaikan } from "@/server/api/form";
import {
  Errors,
  choice,
  email,
  phoneId,
  textOptional,
  textRequired,
} from "@/server/validation";
import { insertFeedback } from "@/server/db/repo/submissions";

/** Jenis pesan yang diterima, sesuai enum `feedback_type`. */
const JENIS_PESAN = ["suggestion", "complaint", "praise", "question"] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(request, "feedbacks", "feedback", async (db, body) => {
      const errors = new Errors();

      const pesan = textRequired(errors, "message", isi(body, "message"), 10, 5000);
      const nama = textOptional(errors, "name", isi(body, "name"), 160);
      const surel = email(errors, "email", isi(body, "email"), false);
      const telepon = phoneId(errors, "phone", isi(body, "phone"), false);
      const subjek = textOptional(errors, "subject", isi(body, "subject"), 220);
      const unit = textOptional(errors, "service_unit", isi(body, "service_unit"), 160);
      const jenis = choice(
        errors,
        "feedback_type",
        isi(body, "feedback_type") || "suggestion",
        JENIS_PESAN,
      );

      selesaikan(errors);

      if (pesan === null || jenis === null) {
        throw ApiError.internal("validasi lolos tapi data kosong");
      }

      const kode = await insertFeedback(db, {
        feedback_type: jenis,
        name: nama,
        email: surel,
        phone: telepon,
        subject: subjek,
        message: pesan,
        service_unit: unit,
      });

      return { ticket_code: kode, status: "received" };
    });

    return created(hasil);
  });
}
