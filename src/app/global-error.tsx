"use client";

/**
 * Penangkap error terakhir.
 *
 * Dipakai kalau error terjadi sampai di root layout, sehingga halaman ini
 * harus menyediakan elemen html dan body sendiri. Karena CSS dari layout
 * tidak bisa diandalkan di titik ini, gayanya ditulis inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f1f7fc",
          color: "#444",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p
            style={{
              fontSize: "4rem",
              fontWeight: 700,
              color: "#1977cc",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>
            Situs Tidak Dapat Dimuat
          </h1>
          <p style={{ lineHeight: 1.7, margin: "0 0 1.5rem" }}>
            Terjadi kesalahan mendasar saat memuat halaman. Silakan muat ulang.
            Bila kesalahan terus berlanjut, hubungi pengelola situs.
          </p>

          {error.digest ? (
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Kode kesalahan: <code>{error.digest}</code>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              backgroundColor: "#1977cc",
              color: "#ffffff",
              border: 0,
              borderRadius: 5,
              padding: "0.625rem 1.25rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
