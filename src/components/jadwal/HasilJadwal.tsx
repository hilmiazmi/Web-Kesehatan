/**
 * Jadwal dokter yang dipilih.
 *
 * Ditampilkan tepat di bawah tiga pilihan, supaya pengunjung tidak perlu
 * mencari di tabel panjang. Kalau hari sudah dipilih, hanya hari itu yang
 * ditampilkan.
 */

export type JadwalDokter = {
  slug: string;
  name: string;
  specialty: string;
  /** Satu entri per hari praktik, urut hari sudah sesuai. */
  schedule: { day: string; time: string }[];
};

export default function HasilJadwal({
  doctor,
  day,
}: {
  doctor: JadwalDokter;
  day: string;
}) {
  const baris = day
    ? doctor.schedule.filter((s) => s.day === day)
    : doctor.schedule;

  return (
    <div className="jadwal-hasil">
      <h3 className="jadwal-hasil-nama">{doctor.name}</h3>
      <p className="jadwal-hasil-spesialisasi">{doctor.specialty}</p>
      {baris.length === 0 ? (
        <p className="jadwal-hasil-kosong">
          Tidak ada jadwal pada hari itu. Pilih hari lain.
        </p>
      ) : (
        <ul className="jadwal-daftar">
          {baris.map((s) => (
            <li key={s.day}>
              <span>{s.day}</span>
              <span>{s.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}