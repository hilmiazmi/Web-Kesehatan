-- Fungsi pemelihara updated_at.
--
-- Dipasang sebagai trigger ke setiap tabel yang punya kolom updated_at, supaya
-- aplikasi tidak perlu mengingat untuk selalu mengirim updated_at = now().
-- Gotcha yang dihindari: kalau diisi manual, satu jalur lupa update (mis. saat
-- panel admin memakai pembaruan massal) bisa membiarkan baris terlihat lebih
-- baru dari kenyataannya.
--
-- Migrasi ini dibuat dengan `drizzle-kit generate --custom`, karena trigger
-- tidak bisa ditulis di `src/server/db/schema.ts`.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER mcu_packages_set_updated_at BEFORE UPDATE ON mcu_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER articles_set_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER pages_set_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER management_members_set_updated_at BEFORE UPDATE ON management_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER hero_slides_set_updated_at BEFORE UPDATE ON hero_slides FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER awards_set_updated_at BEFORE UPDATE ON awards FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER gallery_items_set_updated_at BEFORE UPDATE ON gallery_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER testimonials_set_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER insurance_partners_set_updated_at BEFORE UPDATE ON insurance_partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER faqs_set_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER polyclinics_set_updated_at BEFORE UPDATE ON polyclinics FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER specialties_set_updated_at BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER doctors_set_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER doctor_schedules_set_updated_at BEFORE UPDATE ON doctor_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER doctor_visit_quotas_set_updated_at BEFORE UPDATE ON doctor_visit_quotas FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER mcu_registrations_set_updated_at BEFORE UPDATE ON mcu_registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER feedbacks_set_updated_at BEFORE UPDATE ON feedbacks FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER wbs_reports_set_updated_at BEFORE UPDATE ON wbs_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER survey_responses_set_updated_at BEFORE UPDATE ON survey_responses FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER bed_capacity_set_updated_at BEFORE UPDATE ON bed_capacity FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER job_vacancies_set_updated_at BEFORE UPDATE ON job_vacancies FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER site_settings_set_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
