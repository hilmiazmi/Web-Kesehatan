import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { uuid } from "@/server/api/params";
import { canManageUsers, requireSession } from "@/server/auth/session";
import { dbOrNull } from "@/server/db/client";
import { changePassword } from "@/server/admin/accounts";
import { periksaKataSandi } from "@/server/auth/password";
import { Errors, readJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Konteks): Promise<NextResponse> {
  return handle(async () => {
    const sesi = await requireSession();

    const { id } = await context.params;

    // Ganti sandi boleh untuk akun sendiri dari peran apa pun, atau akun mana
    // pun oleh super_admin. Editor dan front_office tidak melihat daftar akun
    // (halaman akun hanya untuk super_admin), tapi sandinya sendiri tetap bisa
    // diganti lewat form "Sandi saya". Perbandingan huruf-kecil semua karena
    // `uuid()` mempertahankan huruf besar dari URL sedangkan `sub` selalu
    // huruf kecil dari database.
    if (!canManageUsers(sesi.role) && id.toLowerCase() !== sesi.sub.toLowerCase()) {
      throw ApiError.forbidden();
    }

    const db = dbOrNull();
    if (db === null) throw ApiError.readOnly();

    const body = await readJsonBody(request);
    const errors = new Errors();

    const baru = String(body.new_password ?? "");
    periksaKataSandi(errors, baru, "new_password");

    const lama = String(body.current_password ?? "");
    if (lama.trim() === "") errors.add("current_password", "Wajib diisi.");

    if (!errors.isEmpty) throw errors.toApiError();

    // Password lama selalu diminta, termasuk untuk akun sendiri. Sesi yang
    // masih hidup membuktikan dia sudah masuk, bukan bahwa dia sedang memegang
    // keyboard itu; tanpa password lama, siapa pun yang sempat menemukan
    // cookie sesi bisa mengunci akun orang lain.
    await changePassword(db, uuid(id, "id"), lama, baru);

    return ok({ password_updated: true });
  });
}
