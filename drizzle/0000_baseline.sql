CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('standar_pelayanan', 'kompensasi_pelayanan', 'pengaduan_masyarakat', 'regulasi_zona_integritas', 'ppid', 'brosur', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('suggestion', 'complaint', 'praise', 'question');--> statement-breakpoint
CREATE TYPE "public"."mcu_category" AS ENUM('reguler', 'health_meets_holiday');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('general', 'bpjs', 'insurance');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('priority', 'facility', 'diagnostic');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'in_progress', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'editor', 'front_office');--> statement-breakpoint
CREATE TYPE "public"."wbs_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"doctor_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"patient_name" varchar(160) NOT NULL,
	"nik" varchar(16) NOT NULL,
	"birth_date" date,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"address" text,
	"complaint" text,
	"visit_date" date NOT NULL,
	"schedule_id" uuid,
	"payment_type" "payment_type" NOT NULL,
	"queue_number" integer NOT NULL,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_nik_simulasi" CHECK ("appointments"."nik" ~ '^[0]{16}$'),
	CONSTRAINT "appointments_email_format" CHECK ("appointments"."email" IS NULL OR "appointments"."email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
	CONSTRAINT "appointments_queue_positive" CHECK ("appointments"."queue_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(220) NOT NULL,
	"category" varchar(80),
	"excerpt" text,
	"body" text,
	"cover_url" text,
	"author" varchar(160),
	"published_at" timestamp with time zone NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(220) NOT NULL,
	"issuer" varchar(180),
	"year" integer,
	"image_url" text,
	"link_url" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bed_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ward_name" varchar(160) NOT NULL,
	"class_name" varchar(80) NOT NULL,
	"room_code" varchar(40),
	"total_beds" integer DEFAULT 0 NOT NULL,
	"occupied_beds" integer DEFAULT 0 NOT NULL,
	"reserved_beds" integer DEFAULT 0 NOT NULL,
	"gender_policy" varchar(40),
	"note" varchar(200),
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bed_capacity_total_nonneg" CHECK ("bed_capacity"."total_beds" >= 0),
	CONSTRAINT "bed_capacity_occupied_nonneg" CHECK ("bed_capacity"."occupied_beds" >= 0),
	CONSTRAINT "bed_capacity_reserved_nonneg" CHECK ("bed_capacity"."reserved_beds" >= 0),
	CONSTRAINT "bed_capacity_within_total" CHECK ("bed_capacity"."occupied_beds" + "bed_capacity"."reserved_beds" <= "bed_capacity"."total_beds")
);
--> statement-breakpoint
CREATE TABLE "doctor_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"room" varchar(80),
	"quota" integer DEFAULT 50 NOT NULL,
	"note" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_schedules_day_range" CHECK ("doctor_schedules"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "doctor_schedules_time_order" CHECK ("doctor_schedules"."start_time" < "doctor_schedules"."end_time"),
	CONSTRAINT "doctor_schedules_quota_nonneg" CHECK ("doctor_schedules"."quota" >= 0)
);
--> statement-breakpoint
CREATE TABLE "doctor_visit_quotas" (
	"doctor_id" uuid NOT NULL,
	"visit_date" date NOT NULL,
	"taken" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_visit_quotas_doctor_id_visit_date_pk" PRIMARY KEY("doctor_id","visit_date"),
	CONSTRAINT "doctor_visit_quotas_taken_nonneg" CHECK ("doctor_visit_quotas"."taken" >= 0)
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"specialty_id" uuid,
	"full_name" varchar(200) NOT NULL,
	"title" varchar(120),
	"photo_url" text,
	"practice_number" varchar(60),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(220) NOT NULL,
	"category" "document_category" DEFAULT 'lainnya' NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"year" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_file_size_nonneg" CHECK ("documents"."file_size" IS NULL OR "documents"."file_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" varchar(300) NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(80),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"type" "feedback_type" DEFAULT 'suggestion' NOT NULL,
	"name" varchar(160),
	"email" varchar(255),
	"phone" varchar(30),
	"subject" varchar(220),
	"message" text NOT NULL,
	"service_unit" varchar(160),
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedbacks_email_format" CHECK ("feedbacks"."email" IS NULL OR "feedbacks"."email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
	CONSTRAINT "feedbacks_message_len" CHECK (length("feedbacks"."message") BETWEEN 10 AND 5000)
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"caption" text,
	"image_url" text NOT NULL,
	"category" varchar(80),
	"taken_at" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(255),
	"image_url" text,
	"link_url" varchar(300),
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_slides_link_internal" CHECK ("hero_slides"."link_url" IS NULL OR "hero_slides"."link_url" ~ '^/[a-z0-9/_-]*$')
);
--> statement-breakpoint
CREATE TABLE "insurance_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"logo_url" text,
	"website_url" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"department" varchar(160) NOT NULL,
	"employment_type" varchar(80),
	"quota" integer DEFAULT 1 NOT NULL,
	"requirements" text,
	"responsibilities" text,
	"deadline" date,
	"is_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_vacancies_quota_positive" CHECK ("job_vacancies"."quota" > 0 AND "job_vacancies"."quota" <= 500)
);
--> statement-breakpoint
CREATE TABLE "management_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"position" varchar(180) NOT NULL,
	"unit" varchar(120),
	"photo_url" text,
	"phone" varchar(30),
	"email" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcu_package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"group_name" varchar(120) NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcu_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"name" varchar(180) NOT NULL,
	"category" "mcu_category" DEFAULT 'reguler' NOT NULL,
	"summary" text,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"image_url" text,
	"preparation" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcu_packages_price_nonneg" CHECK ("mcu_packages"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mcu_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"package_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"gender" varchar(20),
	"birth_date" date,
	"company_name" varchar(180),
	"participant_count" integer DEFAULT 1 NOT NULL,
	"preferred_date" date,
	"notes" text,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcu_registrations_participants_positive" CHECK ("mcu_registrations"."participant_count" > 0 AND "mcu_registrations"."participant_count" <= 50),
	CONSTRAINT "mcu_registrations_email_format" CHECK ("mcu_registrations"."email" IS NULL OR "mcu_registrations"."email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(220) NOT NULL,
	"meta_description" varchar(320),
	"meta_keywords" varchar(320),
	"eyebrow" varchar(120),
	"summary" text,
	"body_markdown" text,
	"hero_image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polyclinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"location" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "service_type" NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(180) NOT NULL,
	"tagline" varchar(255),
	"summary" text,
	"body" text,
	"image_url" text,
	"section_key" varchar(60),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"service_unit" varchar(160),
	"respondent_name" varchar(160),
	"respondent_email" varchar(255),
	"answers" jsonb NOT NULL,
	"overall_score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_score_range" CHECK ("survey_responses"."overall_score" BETWEEN 1 AND 5),
	CONSTRAINT "survey_responses_answers_object" CHECK (jsonb_typeof("survey_responses"."answers") = 'object'),
	CONSTRAINT "survey_responses_email_format" CHECK ("survey_responses"."respondent_email" IS NULL OR "survey_responses"."respondent_email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"role_label" varchar(160),
	"quote" text NOT NULL,
	"photo_url" text,
	"rating" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_rating_range" CHECK ("testimonials"."rating" IS NULL OR "testimonials"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" "user_role" DEFAULT 'front_office' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wbs_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"subject" varchar(220) NOT NULL,
	"description" text NOT NULL,
	"incident_date" date,
	"location" varchar(180),
	"involved_unit" varchar(160),
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"reporter_name" varchar(160),
	"reporter_email" varchar(255),
	"reporter_phone" varchar(30),
	"severity" "wbs_severity" DEFAULT 'medium' NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wbs_reports_anonymous_no_identity" CHECK ("wbs_reports"."is_anonymous" = false OR ("wbs_reports"."reporter_name" IS NULL AND "wbs_reports"."reporter_email" IS NULL AND "wbs_reports"."reporter_phone" IS NULL)),
	CONSTRAINT "wbs_reports_description_len" CHECK (length("wbs_reports"."description") BETWEEN 20 AND 10000),
	CONSTRAINT "wbs_reports_email_format" CHECK ("wbs_reports"."reporter_email" IS NULL OR "wbs_reports"."reporter_email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_id_doctor_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."doctor_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_visit_quotas" ADD CONSTRAINT "doctor_visit_quotas_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcu_package_items" ADD CONSTRAINT "mcu_package_items_package_id_mcu_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."mcu_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcu_registrations" ADD CONSTRAINT "mcu_registrations_package_id_mcu_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."mcu_packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_ticket_code_unique" ON "appointments" USING btree ("ticket_code");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_queue_unique" ON "appointments" USING btree ("doctor_id","visit_date","queue_number");--> statement-breakpoint
CREATE INDEX "appointments_doctor_visit_idx" ON "appointments" USING btree ("doctor_id","visit_date");--> statement-breakpoint
CREATE INDEX "appointments_inbox_idx" ON "appointments" USING btree ("status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "appointments_visit_date_idx" ON "appointments" USING btree ("visit_date" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_unique" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_list_idx" ON "articles" USING btree ("is_published","published_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category","published_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "awards_sort_idx" ON "awards" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "bed_capacity_ward_class_unique" ON "bed_capacity" USING btree ("ward_name","class_name");--> statement-breakpoint
CREATE INDEX "bed_capacity_ward_idx" ON "bed_capacity" USING btree ("ward_name","class_name");--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_schedules_no_overlap" ON "doctor_schedules" USING btree ("doctor_id","day_of_week","start_time") WHERE "doctor_schedules"."is_active";--> statement-breakpoint
CREATE INDEX "doctor_schedules_doctor_day_idx" ON "doctor_schedules" USING btree ("doctor_id","day_of_week");--> statement-breakpoint
CREATE INDEX "doctor_schedules_polyclinic_day_idx" ON "doctor_schedules" USING btree ("polyclinic_id","day_of_week");--> statement-breakpoint
CREATE INDEX "doctor_schedules_active_idx" ON "doctor_schedules" USING btree ("doctor_id","is_active");--> statement-breakpoint
CREATE INDEX "doctors_specialty_id_idx" ON "doctors" USING btree ("specialty_id");--> statement-breakpoint
CREATE INDEX "doctors_is_active_idx" ON "doctors" USING btree ("is_active","full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_slug_unique" ON "documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "documents_category_idx" ON "documents" USING btree ("category","is_published","sort_order");--> statement-breakpoint
CREATE INDEX "faqs_sort_idx" ON "faqs" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "feedbacks_ticket_code_unique" ON "feedbacks" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "feedbacks_inbox_idx" ON "feedbacks" USING btree ("status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "feedbacks_type_idx" ON "feedbacks" USING btree ("type","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "gallery_items_sort_idx" ON "gallery_items" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "gallery_items_category_idx" ON "gallery_items" USING btree ("category","sort_order");--> statement-breakpoint
CREATE INDEX "hero_slides_sort_idx" ON "hero_slides" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "insurance_partners_sort_idx" ON "insurance_partners" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "job_vacancies_slug_unique" ON "job_vacancies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "job_vacancies_open_idx" ON "job_vacancies" USING btree ("is_open","deadline");--> statement-breakpoint
CREATE INDEX "management_members_sort_idx" ON "management_members" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "mcu_package_items_package_idx" ON "mcu_package_items" USING btree ("package_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "mcu_packages_slug_unique" ON "mcu_packages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "mcu_packages_category_sort_idx" ON "mcu_packages" USING btree ("category","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "mcu_registrations_ticket_code_unique" ON "mcu_registrations" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "mcu_registrations_inbox_idx" ON "mcu_registrations" USING btree ("status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_unique" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_published_idx" ON "pages" USING btree ("is_published","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "polyclinics_slug_unique" ON "polyclinics" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "polyclinics_sort_idx" ON "polyclinics" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_unique" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_type_sort_idx" ON "services" USING btree ("type","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "services_section_idx" ON "services" USING btree ("section_key","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_slug_unique" ON "specialties" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_name_unique" ON "specialties" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_responses_ticket_code_unique" ON "survey_responses" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "survey_responses_score_idx" ON "survey_responses" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "survey_responses_unit_score_idx" ON "survey_responses" USING btree ("service_unit","overall_score");--> statement-breakpoint
CREATE INDEX "testimonials_sort_idx" ON "testimonials" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "wbs_reports_ticket_code_unique" ON "wbs_reports" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "wbs_reports_inbox_idx" ON "wbs_reports" USING btree ("status","severity","created_at" DESC NULLS FIRST);