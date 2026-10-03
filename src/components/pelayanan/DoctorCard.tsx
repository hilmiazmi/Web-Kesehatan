import type { Doctor } from "@/data/doctors";
import { sortSchedule } from "@/lib/poliklinik";

/** Kartu dokter dengan jadwal praktik per hari (server component). */
export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <article className="card doctor-card">
      <div className="card-content">
        <div className="poliklinik-icon" aria-hidden="true">
          <i className="bi bi-person-circle" />
        </div>
        <h3 className="card-title">{doctor.name}</h3>
        <p className="card-description">Spesialis {doctor.specialty}</p>

        <h4 className="doctor-schedule-title">Jadwal praktik</h4>
        <ul className="doctor-schedule">
          {sortSchedule(doctor.schedule).map((s) => (
            <li key={s.day}>
              <span className="doctor-schedule-day">{s.day}</span>
              <span>{s.time} WIB</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
