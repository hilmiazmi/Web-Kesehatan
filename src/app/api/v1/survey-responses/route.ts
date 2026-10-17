import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle } from "@/server/api/respond";
import { angka, isi, jalankanForm, selesaikan } from "@/server/api/form";
import { Errors, email, integerRange, textOptional } from "@/server/validation";
import { insertSurveyResponse } from "@/server/db/repo/submissions";

/**
 * Skala seluruh pertanyaan, dari CHECK di database.
 *
 * Dipakai di dua tempat: rentang yang diterima `bersihkanJawaban` dan rentang
 * yang diterima `integerRange` untuk skor keseluruhan. Kalau keduanya berbeda,
 * orang bisa mengirim jawaban dalam skala 1 sampai 5 tapi ditolak karena
 * skornya di luar 1 sampai 5.
 */
const SKALA_MIN = 1;
const SKALA_MAKS = 5;

/** Batas jumlah pertanyaan satu isian, mengikuti CHECK `jsonb` di database. */
const JUMLAH_MAKS = 30;

/**
 * Batas panjang nama kunci jawaban.
 *
 * CHECK di database hanya memastikan isinya objek, jadi tanpa batas ini satu
 * kunci raksasa (sampai 256 KiB body limit) bisa tersimpan. 80 karakter cukup
 * untuk id pertanyaan yang wajar.
 */
const KUNCI_MAKS = 80;

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(
      request,
      "survey-responses",
      "survey",
      async (db, body) => {
        const errors = new Errors();

        const unit = textOptional(errors, "service_unit", isi(body, "service_unit"), 160);
        const nama = textOptional(errors, "respondent_name", isi(body, "respondent_name"), 160);
        const surel = email(errors, "respondent_email", isi(body, "respondent_email"), false);
        const komentar = textOptional(errors, "comment", isi(body, "comment"), 2000);

        const jawaban = bersihkanJawaban(errors, body.answers);

        // Nilai tidak dikirim berarti dihitung ulang dari jawaban. Ini bukan
        // fitur tambahan: tanpa ini, satu klien yang mengirim skor berbeda dari
        // isiannya akan membuat rata-rata per unit di panel menyesatkan.
        const dikirim = angka(body, "overall_score");
        const skor =
          dikirim === null
            ? rataDariJawaban(jawaban)
            : integerRange(errors, "overall_score", dikirim, SKALA_MIN, SKALA_MAKS);

        selesaikan(errors);

        if (skor === null) {
          errors.add("answers", "Isi setidaknya satu penilaian angka 1 sampai 5.");
          throw errors.toApiError();
        }

        const kode = await insertSurveyResponse(db, {
          service_unit: unit,
          respondent_name: nama,
          respondent_email: surel,
          answers: jawaban,
          overall_score: skor,
          comment: komentar,
        });

        return { ticket_code: kode, status: "received" };
      },
    );

    return created(hasil);
  });
}

/**
 * Terima hanya objek dengan nilai angka 1 sampai 5.
 *
 * Bentuk lain ditolak karena kolomnya `jsonb` dengan CHECK
 * `jsonb_typeof = 'object'`, dan karena agregasi di panel admin menghitung
 * rata-rata dari isinya. Larik atau teks tidak bisa dihitung.
 *
 * Nilai pecahan dibulatkan, bukan disimpan apa adanya: seluruh pertanyaan
 * memakai skala 1 sampai 5, jadi kontrol penggeser di peramban bisa mengirim
 * 4,4 yang harus disimpan sebagai 4.
 */
function bersihkanJawaban(errors: Errors, mentah: unknown): Record<string, number> {
  if (typeof mentah !== "object" || mentah === null || Array.isArray(mentah)) {
    errors.add("answers", "Isi jawaban harus berupa objek penilaian.");
    return {};
  }

  const masukan = mentah as unknown as Record<string, unknown>;
  const kunci = Object.keys(masukan);

  if (kunci.length === 0 || kunci.length > JUMLAH_MAKS) {
    errors.add("answers", `Jumlah jawaban harus antara 1 dan ${JUMLAH_MAKS}.`);
    return {};
  }

  const hasil: Record<string, number> = {};

  for (const nama of kunci) {
    const nilai = masukan[nama];

    if (nama.length > KUNCI_MAKS) {
      errors.add("answers", `Nama jawaban tidak boleh lebih dari ${KUNCI_MAKS} karakter.`);
      return {};
    }

    if (typeof nilai !== "number" || !Number.isFinite(nilai)) {
      errors.add("answers", `Jawaban '${nama}' harus berupa angka 1 sampai 5.`);
      return {};
    }

    if (nilai < SKALA_MIN || nilai > SKALA_MAKS) {
      errors.add("answers", `Jawaban '${nama}' harus antara ${SKALA_MIN} dan ${SKALA_MAKS}.`);
      return {};
    }

    hasil[nama] = Math.round(nilai);
  }

  return hasil;
}

/**
 * Rata-rata semua jawaban, dibulatkan ke bilangan bulat.
 *
 * Pembulatan ke bilangan bulat dilakukan karena kolomnya integer. 4,3 dan 4,4
 * sama-sama menjadi 4, dan itulah yang akan terlihat di panel.
 */
function rataDariJawaban(jawaban: Record<string, number>): number | null {
  const nilai = Object.values(jawaban);
  if (nilai.length === 0) return null;

  const jumlah = nilai.reduce((a, b) => a + b, 0);
  return Math.round(jumlah / nilai.length);
}
