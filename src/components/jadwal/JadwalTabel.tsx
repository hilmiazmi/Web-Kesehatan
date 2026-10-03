import { Fragment } from "react";
import type { JadwalDokter } from "@/components/jadwal/HasilJadwal";

/**
 * Tabel seluruh jadwal dokter.
 *
 * Halaman acuan `/jadwal-dokter` menampilkan tabelnya lewat permintaan
 * jaringan, jadi tabel itu baru ada setelah pengunjung memilih dokter. Di
 * sini semua jadwal dirender di server sekaligus. Manfaatnya nyata: jadwal
 * bisa dibaca tanpa menunggu, tetap tampil ketika JavaScript tidak berjalan,
 * dan bisa dicari dengan Ctrl+F.
 *
 * Satu baris per hari praktik, dengan `rowSpan` pada sel spesialis dan
 * dokter.
 *
 * Nilai `rowSpan` wajib sama dengan jumlah baris yang benar-benar ada untuk
 * dokter itu. Kalau satu dokter ditulis sebagai satu baris saja tapi
 * `rowSpan` memakai jumlah hari praktiknya, sel spesialis melompati baris yang
 * tidak ada padanya dan seluruh tabel bergeser.
 *
 * Dikelompokkan per spesialis supaya mudah dipindai. Jumlah barisnya
 * mengikuti `src/data/doctors.ts`, bukan ditulis tangan.
 */
export default function JadwalTabel({ doctors }: { doctors: JadwalDokter[] }) {
  const groups = [...new Set(doctors.map((d) => d.specialty))].sort();

  return (
    <div className="jadwal-tabel-wrap">
      <table className="table jadwal-tabel">
        <caption className="jadwal-tabel-judul">
          Jadwal praktik dokter di RSUD Contoh Sehat. Jam praktik Senin sampai
          Jumat, 07.30 sampai 14.00. Seluruh nama dan jam di halaman ini adalah
          data fiktif.
        </caption>
        <thead>
          <tr>
            <th scope="col">Spesialis</th>
            <th scope="col">Dokter</th>
            <th scope="col">Hari</th>
            <th scope="col">Jam</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((sp) =>
            doctors
              .filter((d) => d.specialty === sp)
              .map((d) => (
                <Fragment key={d.slug}>
                  {d.schedule.map((s, i) => (
                    <tr key={s.day} id={i === 0 ? `dokter-${d.slug}` : undefined}>
                      {i === 0 ? (
                        <>
                          <th scope="rowgroup" rowSpan={d.schedule.length}>
                            {sp}
                          </th>
                          <td
                            className="jadwal-tabel-dokter"
                            rowSpan={d.schedule.length}
                          >
                            {d.name}
                          </td>
                        </>
                      ) : null}
                      <td>{s.day}</td>
                      <td>{s.time}</td>
                    </tr>
                  ))}
                </Fragment>
              ))
          )}
        </tbody>
      </table>
    </div>
  );
}
