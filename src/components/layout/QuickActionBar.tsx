import Link from "next/link";
import { QUICK_ACTIONS } from "@/data/quick-action";

/**
 * Bilah aksi cepat, menempel di sisi bawah layar.
 *
 * PRD bagian 8.4 menyebut `QuickActionBar`. Isinya tidak ada di situs acuan,
 * jadi diambil dari komponen yang sudah ada dan bukan dikarang: dua tombol
 * dari `HEADER_CTAS`, ditambah WhatsApp dari `CONTACT`.
 *
 * Isinya ditulis sebagai data di `src/data/quick-action.ts` supaya bisa diuji
 * tanpa merender, dan supaya komponen ini tidak memuat daftar tautannya
 * sendiri. Kalau `HEADER_CTAS` berubah, isi bilah ini ikut berubah tanpa
 * perlu menyentuh berkas ini.
 *
 * Tautan WhatsApp memakai `rel="noopener noreferrer"` karena membuka tab baru
 * ke luar situs. Tautan internal memakai `Link` dari Next.js supaya navigasi
 * tetap di sisi peramban.
 *
 * Sengaja disembunyikan di layar kecil. Di bawah lebar 768px ruang vertikal
 * sempit, dan tombol `Daftar Online` sudah ada menapak di header.
 */
export default function QuickActionBar() {
  return (
    <nav className="quick-action" aria-label="Aksi cepat">
      <ul className="quick-action-list">
        {QUICK_ACTIONS.map((aksi) => (
          <li key={aksi.href}>
            {aksi.external ? (
              <a
                href={aksi.href}
                className="quick-action-item quick-action-wa"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className={`bi ${aksi.icon}`} aria-hidden="true" />
                <span>{aksi.label}</span>
              </a>
            ) : (
              <Link
                href={aksi.href}
                className={`quick-action-item ${aksi.className ?? "btn-primary"}`}
              >
                <i className={`bi ${aksi.icon}`} aria-hidden="true" />
                <span>{aksi.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}