import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle, ok } from "@/server/api/respond";
import { ApiError } from "@/server/api/error";
import { limitRequest } from "@/server/api/rate-limit";
import { dbOrNull } from "@/server/db/client";
import {
  clearedSessionCookie,
  newClaims,
  readSession,
  sessionCookie,
  signSession,
} from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { credentialsByEmail, touchLogin } from "@/server/admin/accounts";
import { config } from "@/server/config";
import { Errors, email as validateEmail, isHoneypotTrap, readJsonBody } from "@/server/validation";

/**
 * Login admin.
 *
 * Balasannya tetap berhasil saat honeypot terisi, tapi tanpa token sesi.
 * Membalas 400 di sini akan memberi tahu bot persis field mana yang salah,
 * sehingga ia bisa mengabaikan field itu saja.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(async () => {
    const body = await readJsonBody(request);

    if (isHoneypotTrap(String(body.website ?? ""))) {
      return ok({ status: "received" });
    }

    // Rate limit per alamat dipasang sebelum menyentuh database. Tanpa itu,
    // daftar email dan kata sandi bisa dicoba ribuan kali per menit dari satu
    // mesin, dan setiap percobaan menampilkan halaman login tanpa satu pun
    // memberi tahu bahwa ada pembatas.
    limitRequest(request.headers, "login");

    const errors = new Errors();
    const surel = validateEmail(errors, "email", String(body.email ?? ""), true);

    const panjang = String(body.password ?? "").length;
    if (panjang < 8 || panjang > 200) {
      errors.add("password", "Panjang kata sandi tidak wajar.");
    }
    if (!errors.isEmpty) throw errors.toApiError();

    const db = dbOrNull();
    if (db === null) throw ApiError.internal("login butuh database");

    const kredensial = await credentialsByEmail(db, surel!);
    if (kredensial === null) throw ApiError.unauthorized();

    if (!(await verifyPassword(String(body.password ?? ""), kredensial.password_hash))) {
      // Pesan yang sama untuk surel yang tidak ada dan kata sandi yang salah.
      // Kalau bedanya dibedakan, endpoint ini bisa dipakai untuk mencari surel
      // mana saja yang punya akun di sini.
      throw ApiError.unauthorized();
    }

    await touchLogin(db, kredensial.id);

    const claims = newClaims({
      id: kredensial.id,
      email: kredensial.email,
      name: kredensial.name,
      role: kredensial.role,
    });

    const cookie = sessionCookie(signSession(claims, config().authSecret));

    const respons = ok({
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        role: claims.role,
      },
      expires_at: claims.exp,
    });

    respons.cookies.set(cookie.name, cookie.value, cookie.options);
    return respons;
  });
}