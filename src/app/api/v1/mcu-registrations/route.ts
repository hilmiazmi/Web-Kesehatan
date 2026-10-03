import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { created, handle } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { angka, isi, isiOpsional, jalankanForm, selesaikan } from "@/server/api/form";
import {
  Errors,
  choice,
  dateIso,
  email,
  formatIsoDate,
  integerRange,
  phoneId,
  textOptional,
  textRequired,
} from "@/server/validation";
import { packageIdBySlug } from "@/server/db/repo/content";
import { insertMcuRegistration } from "@/server/db/repo/submissions";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const hasil = await jalankanForm(request, "mcu-registrations", "mcu", async (db, body) => {
      const errors = new Errors();

      const slugPaket = textRequired(errors, "package", isi(body, "package"), 2, 180);
      const nama = textRequired(errors, "name", isi(body, "name"), 3, 160);
      const telepon = phoneId(errors, "phone", isi(body, "phone"), true);
      const surel = email(errors, "email", isi(body, "email"), false);
      const perusahaan = textOptional(errors, "company_name", isi(body, "company_name"), 180);
      const catatan = textOptional(errors, "notes", isi(body, "notes"), 1000);

      // Tiga field tanggal dan jenis kelamin opsional: kosong berarti tidak
      // diisi, bukan berarti salah.
      const gender = isiOpsional(body, "gender");
      const lahir = isiOpsional(body, "birth_date");
      const bulan = isiOpsional(body, "preferred_date");

      // `choice` dipanggil sebelum `selesaikan`, kalau tidak galat yang
      // ditambahkan sesudahnya tidak akan pernah dilempar.
      const jenisKelamin =
        gender === null ? null : choice(errors, "gender", gender, ["male", "female"]);

      const tanggalLahir = lahir === null ? null : dateIso(errors, "birth_date", lahir, false);
      const tanggalDiinginkan =
        bulan === null ? null : dateIso(errors, "preferred_date", bulan, false);

      // Batas 50 peserta mengikuti CHECK di database. Divalidasi di sini juga
      // supaya pesan yang sampai ke pengguna menyebut batasnya, bukan nama
      // constraint yang tidak dibaca siapa pun.
      const jumlah = angka(body, "participant_count");
      const peserta =
        jumlah === null
          ? 1
          : integerRange(errors, "participant_count", jumlah, 1, 50);

      selesaikan(errors);

      if (slugPaket === null || nama === null || telepon === null || peserta === null) {
        throw ApiError.internal("validasi lolos tapi data kosong");
      }

      const paketId = await packageIdBySlug(db, slugPaket);
      if (paketId === null) throw ApiError.notFound("paket MCU");

      const kode = await insertMcuRegistration(db, {
        package_id: paketId,
        name: nama,
        phone: telepon,
        email: surel,
        gender: jenisKelamin,
        birth_date: tanggalLahir === null ? null : formatIsoDate(tanggalLahir),
        company_name: perusahaan,
        participant_count: peserta,
        preferred_date:
          tanggalDiinginkan === null ? null : formatIsoDate(tanggalDiinginkan),
        notes: catatan,
      });

      return {
        ticket_code: kode,
        package: slugPaket,
        participant_count: peserta,
        status: "received",
      };
    });

    return created(hasil);
  });
}
