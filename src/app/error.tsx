"use client";

import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";

/**
 * Halaman error untuk kesalahan runtime di sebuah route.
 *
 * Wajib client component karena memakai `reset()` dari React untuk mencoba
 * render ulang tanpa memuat ulang seluruh halaman.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nanti bisa diteruskan ke Sentry atau layanan pemantauan lain.
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader
        title="Terjadi Kesalahan"
        subtitle="Halaman ini gagal ditampilkan karena kesalahan di sisi server."
        trail={[{ label: "Kesalahan" }]}
      />

      <section className="section">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-lg-6">
              <p className="not-found-code">500</p>
              <h1 className="not-found-title">Halaman Gagal Dimuat</h1>
              <p className="not-found-text">
                Terjadi kesalahan yang tidak terduga saat memuat isi halaman.
                Anda dapat mencoba memuat ulang, atau kembali ke beranda.
              </p>

              {error.digest ? (
                <p className="error-digest">
                  Kode kesalahan: <code>{error.digest}</code>
                </p>
              ) : null}

              <div className="d-flex gap-2 justify-content-center flex-wrap mt-4">
                <button type="button" className="btn btn-primary" onClick={reset}>
                  Coba Lagi
                </button>
                <Link href="/" className="btn btn-tertiary">
                  Kembali ke Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
