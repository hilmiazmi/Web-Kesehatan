import Link from "next/link";

/** Halaman 404. */
export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="row justify-content-center text-center">
          <div className="col-lg-6">
            <p className="not-found-code">404</p>
            <h1 className="not-found-title">Halaman Tidak Ditemukan</h1>
            <p className="not-found-text">
              Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
              Periksa kembali tautannya, atau kembali ke halaman utama.
            </p>
            <div className="d-flex gap-2 justify-content-center flex-wrap mt-4">
              <Link href="/" className="btn btn-primary">
                Kembali ke Home
              </Link>
              <Link href="/daftar-online" className="btn btn-tertiary">
                Daftar Online
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}