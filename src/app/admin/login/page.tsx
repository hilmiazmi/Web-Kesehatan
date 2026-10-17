import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { readSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Masuk Panel Admin",
  description: "Masuk ke panel admin RSUD Contoh Sehat.",
};

/**
 * Halaman masuk panel admin.
 *
 * Kalau sesi masih ada, langsung diteruskan ke panel. Kalau tidak, cek sesi
 * lagi setelah `LoginForm` mengirim karena cookie-nya httpOnly dan React tidak
 * bisa membacanya dari peramban.
 */
export default async function AdminLoginPage() {
  const claims = await readSession();
  if (claims !== null) redirect("/admin");

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-mark" aria-hidden="true">
          <i className="bi bi-hospital" />
        </div>
        <h1>Masuk Panel Admin</h1>
        <p className="text-body-secondary mb-4">RSUD Contoh Sehat</p>
        <LoginForm />
      </div>
    </div>
  );
}
